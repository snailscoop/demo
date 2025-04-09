import Gun from 'gun';
import 'gun/sea';
import { IGunInstance } from 'gun/types';
import { KeplrAuth } from './KeplrAuth';

interface KeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
}

interface ChatMessage {
  content: string;
  sender: string;
  timestamp: number;
  signature: string;
  ephemeralPub?: string;
  permit?: string;
}

interface RoomKeys {
  currentKey: string;
  previousKeys: string[];
  keyTimestamp: number;
  keyRotationInterval: number;
}

interface RoomMember {
  address: string;
  permit: string;
  joinedAt: number;
}

export class SecureChat {
  private gun: IGunInstance;
  private sea: any;
  private user: any;
  private rooms: any;
  private keys: Map<string, RoomKeys>;
  private keplrAuth: KeplrAuth;
  private readonly KEY_ROTATION_INTERVAL = 1000 * 60 * 60; // 1 hour
  private readonly MAX_STORED_KEYS = 5;
  private readonly PERMIT_REFRESH_INTERVAL = 1000 * 60 * 60 * 12; // 12 hours

  constructor(chainConfig: { chainId: string; rpcEndpoint: string; prefix: string }) {
    // Initialize Gun with secure configuration
    this.gun = Gun({
      peers: [
        'http://localhost:8765/gun', // Local Gun server
      ],
      axe: false, // Disable automatic peer discovery
      multicast: false, // Disable local network discovery
      localStorage: false, // Don't store data in localStorage
    });

    this.sea = Gun.SEA;
    this.user = this.gun.user();
    this.rooms = this.gun.get('secure-chat-rooms');
    this.keys = new Map();
    this.keplrAuth = new KeplrAuth(chainConfig);

    // Set up secure storage for keys
    this.initializeSecureStorage();
  }

  private async initializeSecureStorage() {
    if (!this.keplrAuth.isConnected()) {
      throw new Error('Please connect your Keplr wallet first');
    }

    const address = this.keplrAuth.getAddress();
    if (!address) throw new Error('No wallet address found');

    // Initialize secure storage for keys and metadata
    const secureStore = await this.sea.secret(address, this.user._.sea);
    this.gun.get('secure-storage').get(address).secret(secureStore);
  }

  async connect(): Promise<string> {
    const address = await this.keplrAuth.connect();
    await this.initializeSecureStorage();
    return address;
  }

  async createRoom(roomId: string): Promise<void> {
    if (!this.keplrAuth.isConnected()) {
      throw new Error('Please connect your Keplr wallet first');
    }

    try {
      // Generate room permit
      const permit = await this.keplrAuth.generatePermit(roomId);

      // Generate initial room key pair
      const roomKeyPair = await this.sea.pair();
      const initialKey = await this.generateRoomKey();
      
      const roomKeys: RoomKeys = {
        currentKey: initialKey,
        previousKeys: [],
        keyTimestamp: Date.now(),
        keyRotationInterval: this.KEY_ROTATION_INTERVAL,
      };

      // Store room keys securely
      await this.storeRoomKeys(roomId, roomKeys);

      // Initialize room with metadata
      await this.rooms.get(roomId).put({
        id: roomId,
        created: Date.now(),
        publicKey: roomKeyPair.pub,
        creator: this.keplrAuth.getAddress(),
        metadata: await this.sea.encrypt({
          type: 'metadata',
          created: Date.now(),
        }, initialKey),
      });

      // Add creator as first member
      await this.addRoomMember(roomId, {
        address: this.keplrAuth.getAddress()!,
        permit,
        joinedAt: Date.now(),
      });

      // Set up key rotation and permit refresh
      this.setupKeyRotation(roomId);
      this.setupPermitRefresh(roomId);
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error('Failed to create secure room');
    }
  }

  private async addRoomMember(roomId: string, member: RoomMember): Promise<void> {
    await this.rooms
      .get(roomId)
      .get('members')
      .get(member.address)
      .put(member);
  }

  private setupPermitRefresh(roomId: string): void {
    setInterval(async () => {
      try {
        if (!this.keplrAuth.isConnected()) return;

        const address = this.keplrAuth.getAddress();
        if (!address) return;

        // Generate new permit
        const newPermit = await this.keplrAuth.generatePermit(roomId);

        // Update member permit
        await this.addRoomMember(roomId, {
          address,
          permit: newPermit,
          joinedAt: Date.now(),
        });
      } catch (error) {
        console.error('Error refreshing permit:', error);
      }
    }, this.PERMIT_REFRESH_INTERVAL);
  }

  private async generateRoomKey(): Promise<string> {
    // Generate a secure 256-bit key
    const key = await this.sea.random(32);
    return this.sea.work(key, null, null, { name: 'SHA-256' });
  }

  private async storeRoomKeys(roomId: string, keys: RoomKeys): Promise<void> {
    // Encrypt room keys with user's keys
    const encryptedKeys = await this.sea.encrypt(keys, this.user._.sea);
    await this.gun.get('secure-storage')
      .get(this.user.is.pub)
      .get(`room-keys-${roomId}`)
      .secret(encryptedKeys);
    
    this.keys.set(roomId, keys);
  }

  private setupKeyRotation(roomId: string): void {
    setInterval(async () => {
      try {
        const keys = this.keys.get(roomId);
        if (!keys) return;

        // Generate new key
        const newKey = await this.generateRoomKey();
        
        // Update key history
        const updatedKeys: RoomKeys = {
          currentKey: newKey,
          previousKeys: [
            keys.currentKey,
            ...keys.previousKeys.slice(0, this.MAX_STORED_KEYS - 1),
          ],
          keyTimestamp: Date.now(),
          keyRotationInterval: this.KEY_ROTATION_INTERVAL,
        };

        // Store updated keys
        await this.storeRoomKeys(roomId, updatedKeys);

        // Notify room members of key rotation
        await this.notifyKeyRotation(roomId, newKey);
      } catch (error) {
        console.error('Error rotating keys:', error);
      }
    }, this.KEY_ROTATION_INTERVAL);
  }

  private async notifyKeyRotation(roomId: string, newKey: string): Promise<void> {
    const notification = await this.sea.encrypt({
      type: 'key_rotation',
      timestamp: Date.now(),
    }, newKey);

    await this.rooms.get(roomId).get('notifications').set(notification);
  }

  async sendMessage(roomId: string, content: string): Promise<void> {
    if (!this.keplrAuth.isConnected()) {
      throw new Error('Please connect your Keplr wallet first');
    }

    try {
      const keys = this.keys.get(roomId);
      if (!keys) throw new Error('Room keys not found');

      // Generate new permit if needed
      const permit = await this.keplrAuth.generatePermit(roomId);

      // Generate ephemeral key pair for perfect forward secrecy
      const ephemeralKeys = await this.sea.pair();

      // Create and encrypt message
      const message: ChatMessage = {
        content,
        sender: this.keplrAuth.getAddress()!,
        timestamp: Date.now(),
        signature: await this.sea.sign(content, this.user._.sea),
        ephemeralPub: ephemeralKeys.epub,
        permit,
      };

      // Encrypt message with current room key and ephemeral key
      const encryptedMessage = await this.sea.encrypt(
        message,
        await this.sea.secret(ephemeralKeys.epub, keys.currentKey)
      );

      // Store message
      await this.rooms
        .get(roomId)
        .get('messages')
        .set(encryptedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  async receiveMessages(roomId: string, callback: (message: ChatMessage) => void): Promise<void> {
    if (!this.keplrAuth.isConnected()) {
      throw new Error('Please connect your Keplr wallet first');
    }

    const keys = this.keys.get(roomId);
    if (!keys) throw new Error('Room keys not found');

    this.rooms
      .get(roomId)
      .get('messages')
      .map()
      .on(async (encryptedMessage: string, messageId: string) => {
        try {
          // Try decrypting with current and previous keys
          const allKeys = [keys.currentKey, ...keys.previousKeys];
          let decryptedMessage: ChatMessage | null = null;

          for (const key of allKeys) {
            try {
              const message = await this.sea.decrypt(encryptedMessage, key);
              if (message) {
                decryptedMessage = message;
                break;
              }
            } catch {
              continue;
            }
          }

          if (!decryptedMessage) {
            console.warn('Could not decrypt message');
            return;
          }

          // Verify message signature
          const isValid = await this.sea.verify(
            decryptedMessage.content,
            decryptedMessage.signature,
            decryptedMessage.sender
          );

          if (!isValid) {
            console.warn('Invalid message signature');
            return;
          }

          // Verify sender's permit
          if (!decryptedMessage.permit || !await this.keplrAuth.verifyPermit(decryptedMessage.permit)) {
            console.warn('Invalid or expired permit');
            return;
          }

          callback(decryptedMessage);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.keplrAuth.isConnected()) return;

    const address = this.keplrAuth.getAddress();
    if (!address) return;

    // Remove member from room
    await this.rooms
      .get(roomId)
      .get('members')
      .get(address)
      .put(null);

    // Clean up room keys
    this.keys.delete(roomId);
    await this.gun
      .get('secure-storage')
      .get(address)
      .get(`room-keys-${roomId}`)
      .put(null);
  }

  disconnect(): void {
    this.keplrAuth.disconnect();
  }
} 