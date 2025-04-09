import { SigningStargateClient, StargateClient, GasPrice } from '@cosmjs/stargate';
import { OfflineSigner } from '@cosmjs/proto-signing';
import { Coin } from '@cosmjs/amino';
import { toUtf8 } from '@cosmjs/encoding';
import { sha256 } from '@cosmjs/crypto';
import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';

export interface CosmosConfig {
  chainId: string;
  rpcEndpoint: string;
  prefix: string;
  denom: string;
  gasPrice: string;
  contractAddress: string;
}

export class CosmosService {
  private signingClient: SigningStargateClient | null = null;
  private cosmWasmClient: CosmWasmClient | null = null;
  private signingCosmWasmClient: SigningCosmWasmClient | null = null;
  private signer: OfflineSigner | null = null;
  private address: string | null = null;
  private config: CosmosConfig;

  constructor(config: CosmosConfig) {
    this.config = config;
  }

  async connect(signer: OfflineSigner): Promise<void> {
    try {
      this.signer = signer;
      const [account] = await signer.getAccounts();
      this.address = account.address;

      this.signingClient = await SigningStargateClient.connectWithSigner(
        this.config.rpcEndpoint,
        signer
      );

      this.cosmWasmClient = await CosmWasmClient.connect(this.config.rpcEndpoint);
      this.signingCosmWasmClient = await SigningCosmWasmClient.connectWithSigner(
        this.config.rpcEndpoint,
        signer,
        {
          gasPrice: GasPrice.fromString(`${this.config.gasPrice}${this.config.denom}`),
        }
      );
    } catch (error) {
      console.error('Failed to connect:', error);
      throw new Error('Failed to connect to chain');
    }
  }

  async getBalance(): Promise<Coin> {
    if (!this.signingClient || !this.address) throw new Error('Not connected to chain');

    try {
      const balances = await this.signingClient.getAllBalances(this.address);
      const balance = balances.find(b => b.denom === this.config.denom) || {
        amount: '0',
        denom: this.config.denom
      };
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw new Error('Failed to get balance');
    }
  }

  async storeMessage(roomId: string, encryptedMessage: string): Promise<string> {
    if (!this.signingCosmWasmClient || !this.address) {
      throw new Error('Not connected to chain');
    }

    try {
      // Create message hash for reference
      const messageHash = sha256(toUtf8(encryptedMessage)).toString('hex');

      // Store message using CosmWasm contract
      const result = await this.signingCosmWasmClient.execute(
        this.address,
        this.config.contractAddress,
        {
          store_message: {
            room_id: roomId,
            message_hash: messageHash,
            encrypted_content: encryptedMessage,
          },
        },
        'auto'
      );

      if (!result.transactionHash) {
        throw new Error('Failed to get transaction hash');
      }

      return messageHash;
    } catch (error) {
      console.error('Failed to store message:', error);
      throw new Error('Failed to store message on chain');
    }
  }

  async queryMessages(roomId: string, startAfter?: string, limit = 50): Promise<any[]> {
    if (!this.cosmWasmClient) throw new Error('Not connected to chain');

    try {
      // Query messages from CosmWasm contract
      const messages = await this.cosmWasmClient.queryContractSmart(
        this.config.contractAddress,
        {
          get_messages: {
            room_id: roomId,
            start_after: startAfter,
            limit,
          },
        }
      );

      return messages;
    } catch (error) {
      console.error('Failed to query messages:', error);
      throw new Error('Failed to query messages from chain');
    }
  }

  async createRoom(roomId: string, metadata: any): Promise<string> {
    if (!this.signingCosmWasmClient || !this.address) {
      throw new Error('Not connected to chain');
    }

    try {
      // Create room using CosmWasm contract
      const result = await this.signingCosmWasmClient.execute(
        this.address,
        this.config.contractAddress,
        {
          create_room: {
            room_id: roomId,
            metadata: JSON.stringify(metadata),
          },
        },
        'auto'
      );

      if (!result.transactionHash) {
        throw new Error('Failed to get transaction hash');
      }

      return result.transactionHash;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw new Error('Failed to create room on chain');
    }
  }

  async verifyMessageHash(messageHash: string, roomId: string): Promise<boolean> {
    if (!this.cosmWasmClient) throw new Error('Not connected to chain');

    try {
      // Query the CosmWasm contract to verify message hash
      const result = await this.cosmWasmClient.queryContractSmart(
        this.config.contractAddress,
        {
          verify_message: {
            message_hash: messageHash,
            room_id: roomId,
          },
        }
      );

      return result.verified;
    } catch (error) {
      console.error('Failed to verify message hash:', error);
      return false;
    }
  }

  getAddress(): string | null {
    return this.address;
  }

  isConnected(): boolean {
    return !!this.signingClient && !!this.cosmWasmClient && !!this.address;
  }

  disconnect(): void {
    this.signingClient = null;
    this.cosmWasmClient = null;
    this.signingCosmWasmClient = null;
    this.signer = null;
    this.address = null;
  }
} 