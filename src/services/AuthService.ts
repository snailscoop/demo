import { BaseService } from './BaseService';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';
import { KeplrAuth, ConnectionStatus, KeplrError, ChainConfig } from './KeplrAuth';
import { NostrService } from './NostrService';

export type AuthProvider = 'nostr' | 'keplr';
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'authenticating' | 'error';

export interface AuthSession {
  provider: AuthProvider;
  address: string;
  publicKey: string;
  timestamp: number;
  expiresAt: number;
  permissions: string[];
}

export interface AuthError extends Error {
  provider: AuthProvider;
  code: string;
  details?: string;
}

export class AuthService extends BaseService {
  private static instance: AuthService | null = null;
  private keplrAuth: KeplrAuth;
  private nostrService: NostrService;
  private currentSession: AuthSession | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  private constructor(chainConfig: ChainConfig) {
    super();
    this.keplrAuth = new KeplrAuth(chainConfig);
    this.nostrService = NostrService.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(chainConfig?: ChainConfig): AuthService {
    if (!AuthService.instance) {
      if (!chainConfig) {
        throw new Error('ChainConfig required for AuthService initialization');
      }
      AuthService.instance = new AuthService(chainConfig);
    }
    return AuthService.instance;
  }

  protected async doInitialize(): Promise<void> {
    console.log('Initializing AuthService...');
    await this.startSessionCleanup();
  }

  protected async doHealthCheck(): Promise<boolean> {
    return this.isAuthenticated();
  }

  protected async doCleanup(): Promise<void> {
    this.stopSessionCleanup();
    await this.logout();
  }

  private setupEventListeners(): void {
    // Listen for Keplr connection status changes
    this.keplrAuth.onStatusChange((status: ConnectionStatus) => {
      if (status === 'error') {
        this.handleAuthError({
          name: 'KeplrConnectionError',
          message: 'Keplr connection error',
          provider: 'keplr',
          code: 'CONNECTION_ERROR'
        });
      }
    });

    // Listen for Keplr errors
    this.keplrAuth.onError((error: KeplrError) => {
      this.handleAuthError({
        name: error.name,
        message: error.message,
        provider: 'keplr',
        code: error.type.toUpperCase(),
        details: error.details
      });
    });
  }

  private handleAuthError(error: AuthError): void {
    const errorTracker = ServiceRegistry.getInstance().get<ErrorTracker>('errorTracker');
    if (errorTracker) {
      errorTracker.trackError(error, 'security', 'high');
    }
    this.currentSession = null;
  }

  private async startSessionCleanup(): Promise<void> {
    this.cleanupExpiredSessions();
    setInterval(() => this.cleanupExpiredSessions(), this.CLEANUP_INTERVAL);
  }

  private stopSessionCleanup(): void {
    if (this.sessionTimeout) {
      clearInterval(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    if (this.currentSession && Date.now() >= this.currentSession.expiresAt) {
      await this.logout();
    }
  }

  public async loginWithKeplr(): Promise<AuthSession> {
    try {
      const address = await this.keplrAuth.connect();
      const permit = await this.keplrAuth.generatePermit('global');
      
      this.currentSession = {
        provider: 'keplr',
        address,
        publicKey: address,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_DURATION,
        permissions: ['chat', 'video', 'profile']
      };

      return this.currentSession;
    } catch (error) {
      this.handleAuthError({
        name: 'KeplrLoginError',
        message: error instanceof Error ? error.message : 'Failed to login with Keplr',
        provider: 'keplr',
        code: 'LOGIN_ERROR'
      });
      throw error;
    }
  }

  public async loginWithNostr(): Promise<AuthSession> {
    try {
      const publicKey = await this.nostrService.login();
      
      this.currentSession = {
        provider: 'nostr',
        address: publicKey,
        publicKey,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_DURATION,
        permissions: ['chat', 'video', 'profile']
      };

      return this.currentSession;
    } catch (error) {
      this.handleAuthError({
        name: 'NostrLoginError',
        message: error instanceof Error ? error.message : 'Failed to login with Nostr',
        provider: 'nostr',
        code: 'LOGIN_ERROR'
      });
      throw error;
    }
  }

  public async logout(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      if (this.currentSession.provider === 'keplr') {
        this.keplrAuth.disconnect();
      } else if (this.currentSession.provider === 'nostr') {
        await this.nostrService.logout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.currentSession = null;
    }
  }

  public getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    return !!this.currentSession && Date.now() < this.currentSession.expiresAt;
  }

  public async refreshSession(): Promise<AuthSession | null> {
    if (!this.currentSession) {
      return null;
    }

    try {
      if (this.currentSession.provider === 'keplr') {
        return this.loginWithKeplr();
      } else {
        return this.loginWithNostr();
      }
    } catch (error) {
      this.handleAuthError({
        name: 'SessionRefreshError',
        message: 'Failed to refresh session',
        provider: this.currentSession.provider,
        code: 'REFRESH_ERROR'
      });
      return null;
    }
  }

  public hasPermission(permission: string): boolean {
    return !!this.currentSession?.permissions.includes(permission);
  }
} 