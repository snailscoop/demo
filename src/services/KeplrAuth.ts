import { Window as KeplrWindow } from '@keplr-wallet/types';
import { SigningStargateClient } from '@cosmjs/stargate';
import { ChainInfo } from '@keplr-wallet/types';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';
import { TrackedError, ServiceStatus } from '../types';
import { BaseService } from './BaseService';
import { SecurityManager } from './SecurityManager';

declare global {
  interface Window extends KeplrWindow {}
}

interface ExtendedChainInfo extends ChainInfo {
  gasPriceStep?: {
    low: number;
    average: number;
    high: number;
  };
}

export interface ChainConfig {
  chainId: string;
  rpcEndpoint: string;
  prefix: string;
  chainName: string;
  stakeCurrency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  };
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface KeplrError extends Error {
  type: 'extension' | 'connection' | 'rejection' | 'chain' | 'unknown';
  details?: string;
}

interface Session {
  address: string;
  publicKey: string;
  privateKey: string;
  createdAt: number;
  lastActive: number;
  permissions: string[];
}

declare global {
  interface Window {
    keplr: {
      enable: () => Promise<void>;
      getKey: () => Promise<{
        bech32Address: string;
        pubKey: Uint8Array;
      }>;
    };
  }
}

export class KeplrAuth extends BaseService {
  private static instance: KeplrAuth | null = null;
  private sessions: Map<string, Session> = new Map();
  private readonly sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private errorTracker: ErrorTracker;
  private securityManager: SecurityManager;
  private client: SigningStargateClient | null = null;
  private address: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private readonly maxRetries = 3;
  private retryCount = 0;
  private connectionListeners: ((status: ConnectionStatus) => void)[] = [];
  private errorListeners: ((error: KeplrError) => void)[] = [];

  private constructor() {
    super('KeplrAuth');
    this.errorTracker = ErrorTracker.getInstance();
    this.securityManager = SecurityManager.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(): KeplrAuth {
    if (!KeplrAuth.instance) {
      KeplrAuth.instance = new KeplrAuth();
    }
    return KeplrAuth.instance;
  }

  private setupEventListeners() {
    window.addEventListener('keplr_keystorechange', () => {
      this.handleAccountChange();
    });
  }

  private async handleAccountChange() {
    if (this.status === 'connected') {
      try {
        await this.reconnect();
      } catch (error) {
        this.setStatus('error');
        this.handleError(error, 'connection');
      }
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.connectionListeners.forEach(listener => listener(status));
  }

  private handleError(error: unknown, type: KeplrError['type'], details?: string) {
    const keplrError: KeplrError = {
      name: 'KeplrError',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      type,
      details
    };
    this.errorListeners.forEach(listener => listener(keplrError));
    console.error(`Keplr ${type} error:`, error);
  }

  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  onError(listener: (error: KeplrError) => void) {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }

  async connect(): Promise<string> {
    if (this.status === 'connected' && this.address) {
      return this.address;
    }

    this.setStatus('connecting');

    if (!window.keplr) {
      this.setStatus('error');
      this.handleError(new Error('Keplr wallet not found'), 'extension');
      throw new Error('Keplr wallet not found. Please install Keplr extension.');
    }

    try {
      await this.suggestChain();
      await window.keplr.enable();

      const offlineSigner = window.keplr.getOfflineSigner(this.chainConfig.chainId);
      const accounts = await offlineSigner.getAccounts();
      this.address = accounts[0].address;

      this.client = await SigningStargateClient.connectWithSigner(
        this.chainConfig.rpcEndpoint,
        offlineSigner
      );

      this.setStatus('connected');
      this.retryCount = 0;
      return this.address;
    } catch (error) {
      this.setStatus('error');
      
      if (error instanceof Error) {
        if (error.message.includes('Request rejected')) {
          this.handleError(error, 'rejection', 'User rejected the connection request');
          throw new Error('Connection request was rejected. Please approve the request in your Keplr wallet.');
        } else if (error.message.includes('chain')) {
          this.handleError(error, 'chain', 'Failed to configure chain settings');
          throw new Error('Failed to configure chain settings. Please check your network connection.');
        } else {
          this.handleError(error, 'connection', 'Failed to establish connection');
          throw new Error(`Failed to connect to Keplr wallet: ${error.message}`);
        }
      }

      this.handleError(error, 'unknown');
      throw new Error('An unknown error occurred while connecting to Keplr');
    }
  }

  private async suggestChain() {
    const keplr = window.keplr;
    if (!keplr) {
      throw new Error('Keplr extension not found');
    }

    const chainInfo: ExtendedChainInfo = {
      chainId: this.chainConfig.chainId,
      chainName: this.chainConfig.chainName,
      rpc: this.chainConfig.rpcEndpoint,
      rest: '', // Add REST endpoint if needed
      bip44: {
        coinType: 118,
      },
      bech32Config: {
        bech32PrefixAccAddr: this.chainConfig.prefix,
        bech32PrefixAccPub: `${this.chainConfig.prefix}pub`,
        bech32PrefixValAddr: `${this.chainConfig.prefix}valoper`,
        bech32PrefixValPub: `${this.chainConfig.prefix}valoperpub`,
        bech32PrefixConsAddr: `${this.chainConfig.prefix}valcons`,
        bech32PrefixConsPub: `${this.chainConfig.prefix}valconspub`,
      },
      currencies: [{
        coinDenom: this.chainConfig.stakeCurrency.coinDenom,
        coinMinimalDenom: this.chainConfig.stakeCurrency.coinMinimalDenom,
        coinDecimals: this.chainConfig.stakeCurrency.coinDecimals,
      }],
      feeCurrencies: [{
        coinDenom: this.chainConfig.stakeCurrency.coinDenom,
        coinMinimalDenom: this.chainConfig.stakeCurrency.coinMinimalDenom,
        coinDecimals: this.chainConfig.stakeCurrency.coinDecimals,
      }],
      stakeCurrency: this.chainConfig.stakeCurrency,
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    };

    try {
      await keplr.experimentalSuggestChain(chainInfo);
    } catch (error) {
      console.error('Failed to suggest chain:', error);
      throw error;
    }
  }

  private async reconnect(): Promise<string> {
    this.disconnect();
    return this.connect();
  }

  async generatePermit(roomId: string): Promise<string> {
    if (!window.keplr) {
      this.handleError(new Error('Keplr extension not found'), 'extension');
      throw new Error('Keplr extension not found');
    }

    if (!this.client || !this.address) {
      this.handleError(new Error('Not connected to Keplr'), 'connection');
      throw new Error('Not connected to Keplr');
    }

    try {
      // Create permit data
      const permitData = {
        room_id: roomId,
        user_address: this.address,
        timestamp: Date.now(),
        action: 'chat_access'
      };

      // Get the signing data
      const signData = new TextEncoder().encode(JSON.stringify(permitData));

      // Sign the permit data
      const signature = await window.keplr.signArbitrary(
        this.chainConfig.chainId,
        this.address,
        JSON.stringify(permitData)
      );

      // Return the complete permit
      return JSON.stringify({
        ...permitData,
        signature: signature.signature
      });
    } catch (error) {
      this.handleError(error, 'connection', 'Failed to generate permit');
      throw new Error('Failed to generate permit');
    }
  }

  async verifyPermit(permit: string): Promise<boolean> {
    try {
      const permitData = JSON.parse(permit);
      const { signature, ...data } = permitData;

      // Verify the signature
      const isValid = await window.keplr.verifyArbitrary(
        this.chainConfig.chainId,
        permitData.user_address,
        JSON.stringify(data),
        signature
      );

      // Check if permit is expired (24 hours)
      const isExpired = Date.now() - permitData.timestamp > 24 * 60 * 60 * 1000;

      return isValid && !isExpired;
    } catch (error) {
      console.error('Failed to verify permit:', error);
      return false;
    }
  }

  getAddress(): string | null {
    return this.address;
  }

  isConnected(): boolean {
    return !!this.client && !!this.address;
  }

  disconnect(): void {
    this.client = null;
    this.address = null;
  }

  protected async doInitialize(): Promise<void> {
    if (!window.keplr) {
      throw new Error('Keplr extension not found');
    }
    await this.cleanupOldSessions();
  }

  public async login(): Promise<Session> {
    try {
      await window.keplr.enable();
      const { bech32Address, pubKey } = await window.keplr.getKey();

      const session: Session = {
        address: bech32Address,
        publicKey: Buffer.from(pubKey).toString('hex'),
        privateKey: '', // Keplr doesn't expose private keys
        createdAt: Date.now(),
        lastActive: Date.now(),
        permissions: ['read', 'write']
      };

      this.sessions.set(bech32Address, session);
      return session;
    } catch (error) {
      const trackedError = new TrackedError(
        'KeplrAuth',
        'login',
        error instanceof Error ? error.message : 'Unknown error during login',
        'auth'
      );
      ErrorTracker.getInstance().trackError(trackedError);
      throw error;
    }
  }

  public async logout(address: string): Promise<void> {
    try {
      const securityManager = SecurityManager.getInstance();
      await securityManager.revokePermissions(address);
      this.sessions.delete(address);
    } catch (error) {
      const trackedError = new TrackedError(
        'KeplrAuth',
        'logout',
        error instanceof Error ? error.message : 'Unknown error during logout',
        'auth'
      );
      ErrorTracker.getInstance().trackError(trackedError);
      throw error;
    }
  }

  public getSession(address: string): Session | undefined {
    const session = this.sessions.get(address);
    if (session) {
      session.lastActive = Date.now();
    }
    return session;
  }

  public async cleanupOldSessions(): Promise<void> {
    const now = Date.now();
    for (const [address, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.sessionTimeout) {
        await this.logout(address);
      }
    }
  }

  protected async doHealthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: string }> {
    if (!window.keplr) {
      return { status: 'unhealthy', details: 'Keplr extension not found' };
    }

    const securityManager = SecurityManager.getInstance();
    for (const session of this.sessions.values()) {
      const hasPermissions = await securityManager.checkPermissions(session.address, session.permissions);
      if (!hasPermissions) {
        return { status: 'degraded', details: 'Session permissions mismatch' };
      }
    }

    return { status: 'healthy' };
  }

  protected async doCleanup(): Promise<void> {
    for (const session of this.sessions.values()) {
      await this.logout(session.address);
    }
    this.sessions.clear();
  }
}

// Export the singleton instance
export const keplrAuth = KeplrAuth.getInstance(); 