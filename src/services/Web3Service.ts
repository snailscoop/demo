import Gun from 'gun';
import 'gun/sea';
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { OfflineSigner } from '@cosmjs/proto-signing';
import { CosmosService } from './CosmosService';

declare global {
  interface Window extends KeplrWindow {}
}

export class Web3Service {
  private gun: any;
  private cosmosService: CosmosService;
  private static instance: Web3Service;

  private constructor() {
    // Initialize Gun with peers
    this.gun = Gun({
      peers: [
        'http://localhost:8765/gun',  // Local Gun server
        'https://gun-manhattan.herokuapp.com/gun'  // Backup peer
      ],
      localStorage: false,
    });

    // Initialize CosmosService with default config
    this.cosmosService = new CosmosService({
      chainId: 'osmosis-1',
      rpcEndpoint: 'https://rpc.osmosis.zone',
      prefix: 'osmo',
      denom: 'uosmo',
      gasPrice: '0.025',
      contractAddress: '',
    });
  }

  public static getInstance(): Web3Service {
    if (!Web3Service.instance) {
      Web3Service.instance = new Web3Service();
    }
    return Web3Service.instance;
  }

  // Gun methods
  public async storeData(key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.gun.get(key).put(data, (ack: any) => {
        if (ack.err) {
          reject(ack.err);
        } else {
          resolve();
        }
      });
    });
  }

  public async getData(key: string): Promise<any> {
    return new Promise((resolve) => {
      this.gun.get(key).once((data: any) => {
        resolve(data);
      });
    });
  }

  // Keplr methods
  public async connectKeplr(): Promise<void> {
    if (!window.keplr) {
      throw new Error('Please install Keplr extension');
    }

    try {
      // Request permission to connect
      await window.keplr.enable('osmosis-1');
      
      // Get offline signer
      const offlineSigner = window.keplr.getOfflineSigner('osmosis-1');
      
      // Connect to CosmosService
      await this.cosmosService.connect(offlineSigner);
    } catch (error) {
      console.error('Failed to connect Keplr:', error);
      throw new Error('Failed to connect Keplr wallet');
    }
  }

  public async getBalance(): Promise<string> {
    if (!this.cosmosService.isConnected()) {
      throw new Error('Not connected to wallet');
    }
    const balance = await this.cosmosService.getBalance();
    return balance.amount;
  }

  public getAddress(): string | null {
    return this.cosmosService.getAddress();
  }

  public isConnected(): boolean {
    return this.cosmosService.isConnected();
  }
} 