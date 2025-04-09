import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

interface GunData {
  [key: string]: any;
}

interface GunMessage {
  err?: string;
  [key: string]: any;
}

interface GunAck {
  err?: string;
  ok?: number;
}

class GunService {
  private gun: any; // Using any as a temporary workaround for Gun type issues
  private isRecovering: boolean = false;

  constructor() {
    this.gun = new Gun({
      peers: [
        'ws://localhost:8765/gun', // Local server
        'https://gun-us.herokuapp.com/gun', // Fallback peer
        'https://gun-manhattan.herokuapp.com/gun' // Additional fallback
      ],
      localStorage: false
    });

    // Handle connection events
    this.gun.on('out', { get: { '#': { '*': '' } } }, (msg: GunMessage) => {
      if (msg.err) {
        console.error('Gun connection error:', msg.err);
        this.handlePanic();
      }
    });

    // Handle recovery
    this.gun.on('in', { get: { '#': { '*': '' } } }, (msg: GunMessage) => {
      if (!msg.err && this.isRecovering) {
        this.handleRecover();
      }
    });
  }

  private handlePanic(): void {
    if (!this.isRecovering) {
      this.isRecovering = true;
      console.warn('Gun connection lost, attempting recovery...');
      this.attemptRecovery();
    }
  }

  private handleRecover(): void {
    if (this.isRecovering) {
      this.isRecovering = false;
      console.info('Gun connection recovered');
    }
  }

  private async attemptRecovery(): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      this.gun.opt({ peers: ['ws://localhost:8765/gun'] });
    } catch (error) {
      console.error('Recovery attempt failed:', error);
    }
  }

  public put<T extends GunData>(key: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      this.gun.get(key).put(data, (ack: GunAck) => {
        if (ack.err) {
          reject(new Error(`Failed to put data: ${ack.err}`));
        } else {
          resolve();
        }
      });
    });
  }

  public get<T extends GunData>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.gun.get(key).once((data: T | null) => {
        if (data) {
          resolve(data);
        } else {
          resolve(null);
        }
      });
    });
  }

  public subscribe<T extends GunData>(
    key: string,
    callback: (data: T) => void
  ): () => void {
    const subscription = this.gun.get(key).on(callback);
    return () => subscription.off();
  }
}

export const gunService = new GunService(); 