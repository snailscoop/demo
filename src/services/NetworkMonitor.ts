import { EventEmitter } from 'events';

export type NetworkStatus = 'online' | 'offline' | 'degraded';
export type ConnectionType = 'nostr' | 'gun' | 'keplr';

interface ConnectionStats {
  lastSuccess: number;
  lastFailure: number;
  failureCount: number;
  retryCount: number;
}

export class NetworkMonitor extends EventEmitter {
  private static instance: NetworkMonitor;
  private status: NetworkStatus = 'online';
  private connectionStats: Map<ConnectionType, ConnectionStats> = new Map();
  private retryTimeouts: Map<ConnectionType, NodeJS.Timeout> = new Map();
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds

  private constructor() {
    super();
    this.setupNetworkListeners();
  }

  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => this.handleNetworkChange('online'));
    window.addEventListener('offline', () => this.handleNetworkChange('offline'));
  }

  private handleNetworkChange(status: 'online' | 'offline') {
    this.status = status;
    this.emit('statusChange', status);
  }

  public trackConnection(type: ConnectionType, success: boolean) {
    const stats = this.connectionStats.get(type) || {
      lastSuccess: 0,
      lastFailure: 0,
      failureCount: 0,
      retryCount: 0
    };

    if (success) {
      stats.lastSuccess = Date.now();
      stats.failureCount = 0;
      stats.retryCount = 0;
      this.clearRetryTimeout(type);
    } else {
      stats.lastFailure = Date.now();
      stats.failureCount++;
      this.scheduleRetry(type, stats);
    }

    this.connectionStats.set(type, stats);
    this.emit('connectionUpdate', { type, success, stats });
  }

  private scheduleRetry(type: ConnectionType, stats: ConnectionStats) {
    if (stats.retryCount >= this.maxRetries) {
      this.emit('maxRetriesReached', type);
      return;
    }

    this.clearRetryTimeout(type);
    const timeout = setTimeout(() => {
      stats.retryCount++;
      this.emit('retry', type);
    }, this.retryDelay * (stats.retryCount + 1));

    this.retryTimeouts.set(type, timeout);
  }

  private clearRetryTimeout(type: ConnectionType) {
    const timeout = this.retryTimeouts.get(type);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(type);
    }
  }

  public getStatus(): NetworkStatus {
    return this.status;
  }

  public getConnectionStats(type: ConnectionType): ConnectionStats | undefined {
    return this.connectionStats.get(type);
  }

  public resetConnectionStats(type: ConnectionType) {
    this.connectionStats.delete(type);
    this.clearRetryTimeout(type);
  }

  public isOnline(): boolean {
    return this.status === 'online';
  }

  public getRetryCount(type: ConnectionType): number {
    return this.connectionStats.get(type)?.retryCount || 0;
  }
} 