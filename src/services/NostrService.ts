import { SimplePool } from 'nostr-tools';
import type { Event } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TrackedError, NostrEvent, ContentItem } from '../types';

export interface RelayStats {
  url: string;
  status: 'connecting' | 'connected' | 'error';
  error?: string;
  eventCount: number;
  retryCount: number;
  lastAttempt: number;
}

export class NostrService {
  private static instance: NostrService;
  private pool: SimplePool;
  private activeSubscriptions: Map<string, { close: () => void }> = new Map();
  private relayStats: Map<string, RelayStats> = new Map();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();
  private connectionPool: Map<string, WebSocket> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private relays: string[] = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol'
  ];
  private connected: boolean = false;
  private performanceMetrics: {
    relayLatency: number;
    eventProcessingTime: number;
    subscriptionResponseTime: number;
  } = {
    relayLatency: 0,
    eventProcessingTime: 0,
    subscriptionResponseTime: 0
  };
  
  private currentPublicKey: string | null = null;
  private currentPrivateKey: string | null = null;

  // Primary and fallback relays
  private readonly PRIMARY_RELAYS = [
    'wss://relay.damus.io',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.snort.social'
  ];

  private readonly FALLBACK_RELAYS = [
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.current.fyi',
    'wss://nostr.mom'
  ];

  private readonly MAX_EVENTS = 100;
  private readonly CONNECTION_TIMEOUT = 10000;
  private readonly RETRY_DELAY = 3000;
  private readonly MAX_RETRIES = 3;

  private constructor() {
    this.pool = new SimplePool();
    this.initializeRelayStats();
  }

  public static getInstance(): NostrService {
    if (!NostrService.instance) {
      NostrService.instance = new NostrService();
    }
    return NostrService.instance;
  }

  private initializeRelayStats(): void {
    [...this.PRIMARY_RELAYS, ...this.FALLBACK_RELAYS].forEach(url => {
      this.relayStats.set(url, {
        url,
        status: 'connecting',
        eventCount: 0,
        retryCount: 0,
        lastAttempt: Date.now()
      });
    });
  }

  private updateRelayStatus(url: string, status: RelayStats['status'], error?: string): void {
    const current = this.relayStats.get(url) || { 
      url, 
      status: 'connecting', 
      eventCount: 0,
      retryCount: 0,
      lastAttempt: Date.now()
    };
    this.relayStats.set(url, { 
      ...current, 
      status, 
      ...(error ? { error } : {}),
      lastAttempt: Date.now()
    });

    if (status === 'error' && error) {
      this.trackError(new Error(`Relay ${url} error: ${error}`), 'nostr', 'medium');
    }
  }

  private incrementRelayEventCount(url: string): void {
    const current = this.relayStats.get(url);
    if (current) {
      this.relayStats.set(url, { 
        ...current, 
        eventCount: current.eventCount + 1,
        retryCount: 0 // Reset retry count on successful event
      });
    }
  }

  private scheduleRetry(url: string): void {
    const current = this.relayStats.get(url);
    if (!current) return;

    if (current.retryCount >= this.MAX_RETRIES) {
      this.trackError(new Error(`Max retries reached for ${url}`), 'nostr', 'high');
      return;
    }

    // Clear any existing retry timeout
    const existingTimeout = this.retryQueue.get(url);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new retry
    const timeout = setTimeout(() => {
      this.retryQueue.delete(url);
      this.connectToRelay(url);
    }, this.RETRY_DELAY * Math.pow(2, current.retryCount)); // Exponential backoff

    this.retryQueue.set(url, timeout);
    this.relayStats.set(url, {
      ...current,
      retryCount: current.retryCount + 1
    });
  }

  private async connectToRelay(url: string): Promise<void> {
    try {
      this.updateRelayStatus(url, 'connecting');
      // SimplePool doesn't have ensureRelay, we'll use subscribe to test connection
      const sub = this.pool.subscribe([url], { kinds: [30023], limit: 1 }, {
        onevent: () => {
          this.updateRelayStatus(url, 'connected');
          sub.close();
        },
        oneose: () => {
          this.updateRelayStatus(url, 'connected');
          sub.close();
        }
      });
      
      // Set timeout for connection attempt
      setTimeout(() => {
        if (this.relayStats.get(url)?.status === 'connecting') {
          this.updateRelayStatus(url, 'error', 'Connection timeout');
          sub.close();
          this.scheduleRetry(url);
        }
      }, this.CONNECTION_TIMEOUT);
    } catch (error) {
      this.updateRelayStatus(url, 'error', error instanceof Error ? error.message : 'Unknown error');
      this.scheduleRetry(url);
    }
  }

  public getRelayStats(): Map<string, RelayStats> {
    return new Map(this.relayStats);
  }

  private parseContent(event: NostrEvent): ContentItem | null {
    try {
      let type: 'video' | 'blog' = 'video';
      let title = 'Untitled';
      let content = '';

      const typeTag = event.tags.find(tag => tag[0] === 't');
      if (typeTag && typeTag[1] === 'blog') {
        type = 'blog';
      }

      if (type === 'video') {
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const urlMatch = event.content.match(urlRegex);
        
        if (!urlMatch) return null;

        content = urlMatch[0];
        const titleTag = event.tags.find(tag => tag[0] === 'title');
        if (titleTag && titleTag[1]) {
          title = titleTag[1];
        } else {
          const contentBeforeUrl = event.content.substring(0, urlMatch.index).trim();
          if (contentBeforeUrl) {
            title = contentBeforeUrl.replace(/[:\-|]/g, '').trim();
          }
        }
      } else {
        const [blogTitle, ...rest] = event.content.split(': ');
        if (blogTitle && rest.length > 0) {
          title = blogTitle;
          content = rest.join(': ');
        } else {
          content = event.content;
        }
      }

      return {
        id: event.id,
        type,
        title,
        content,
        pubkey: event.pubkey,
        created_at: event.created_at
      };
    } catch (err) {
      this.trackError(new Error('Error parsing content'), 'nostr', 'low');
      return null;
    }
  }

  public async subscribe(
    onEvent: (item: ContentItem) => void,
    onError: (error: Error) => void
  ): Promise<string> {
    try {
      // Connect to all relays first
      await Promise.all([
        ...this.PRIMARY_RELAYS.map(url => this.connectToRelay(url)),
        ...this.FALLBACK_RELAYS.map(url => this.connectToRelay(url))
      ]);

      const filter: Filter = {
        kinds: [30023],
        limit: this.MAX_EVENTS,
      };

      const sub = this.pool.subscribe(this.PRIMARY_RELAYS, filter, {
        onevent: (event: NostrEvent) => {
          try {
            const relay = event.relay || 'unknown';
            this.incrementRelayEventCount(relay);
            this.updateRelayStatus(relay, 'connected');

            const parsedContent = this.parseContent(event);
            if (parsedContent) {
              onEvent(parsedContent);
            }
          } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error processing event');
            this.trackError(err, 'nostr', 'medium');
            onError(err);
          }
        },
        oneose: () => {
          this.updateRelayStatus('unknown', 'connected');
        }
      });

      const subId = Math.random().toString(36).substring(7);
      this.activeSubscriptions.set(subId, sub);

      return subId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create subscription');
      this.trackError(err, 'nostr', 'high');
      onError(err);
      return '';
    }
  }

  public unsubscribe(subId: string): void {
    const sub = this.activeSubscriptions.get(subId);
    if (sub) {
      try {
        sub.close();
        this.activeSubscriptions.delete(subId);
      } catch (error) {
        this.trackError(new Error('Error unsubscribing'), 'nostr', 'low');
      }
    }
  }

  public cleanup(): void {
    try {
      // Clear all retry timeouts
      this.retryQueue.forEach(timeout => clearTimeout(timeout));
      this.retryQueue.clear();

      // Close all subscriptions
      this.activeSubscriptions.forEach(sub => {
        try {
          sub.close();
        } catch (error) {
          this.trackError(new Error('Error closing subscription'), 'nostr', 'low');
        }
      });
      this.activeSubscriptions.clear();

      // Close the pool
      this.pool.close();
    } catch (error) {
      this.trackError(new Error('Error during cleanup'), 'nostr', 'medium');
    }
    this.connected = false;
  }

  private trackError(error: Error, type: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    try {
      const serviceRegistry = ServiceRegistry.getInstance();
      if (serviceRegistry.has('errorTracker')) {
        const errorTracker = serviceRegistry.get('errorTracker');
        errorTracker.trackError(error, type, severity);
      } else {
        console.error(`[${type}] ${error.message}`);
      }
    } catch (err) {
      console.error('Error tracking failed:', err);
    }
  }

  public getRelays(): string[] {
    return [...this.relays];
  }

  public addRelay(relay: string): void {
    if (!this.relays.includes(relay)) {
      this.relays.push(relay);
    }
  }

  public removeRelay(relay: string): void {
    this.relays = this.relays.filter(r => r !== relay);
  }

  public async connect(): Promise<void> {
    try {
      // Connect to all relays
      await Promise.all([
        ...this.PRIMARY_RELAYS.map(url => this.connectToRelay(url)),
        ...this.FALLBACK_RELAYS.map(url => this.connectToRelay(url))
      ]);
      this.connected = true;
    } catch (error) {
      const errorTracker = ServiceRegistry.getInstance().get<ErrorTracker>('errorTracker');
      if (errorTracker && error instanceof Error) {
        errorTracker.trackError(error, 'nostr', 'high');
      }
      throw error;
    }
  }

  public async login(): Promise<string> {
    if (!window.nostr) {
      throw new Error('Nostr extension not found');
    }

    try {
      // Request public key from extension
      const publicKey = await window.nostr.getPublicKey();
      this.currentPublicKey = publicKey;

      // Connect to relays if not already connected
      if (!this.connected) {
        await this.connect();
      }

      return publicKey;
    } catch (error) {
      const errorTracker = ServiceRegistry.getInstance().get<ErrorTracker>('errorTracker');
      if (errorTracker && error instanceof Error) {
        errorTracker.trackError(error, 'nostr', 'high');
      }
      throw new Error('Failed to login with Nostr');
    }
  }

  public async logout(): Promise<void> {
    this.currentPublicKey = null;
    this.currentPrivateKey = null;
    this.cleanup();
  }

  public isAuthenticated(): boolean {
    return this.connected && !!this.currentPublicKey;
  }

  public getCurrentPublicKey(): string | null {
    return this.currentPublicKey;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  private updatePerformanceMetrics(metrics: Partial<typeof this.performanceMetrics>) {
    this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
    const performanceMonitor = ServiceRegistry.getInstance().get<PerformanceMonitor>('performanceMonitor');
    if (performanceMonitor) {
      if (metrics.relayLatency !== undefined) {
        performanceMonitor.trackRelayLatency(this.relays[0], metrics.relayLatency);
      }
      if (metrics.eventProcessingTime !== undefined) {
        performanceMonitor.trackEventProcessingTime(metrics.eventProcessingTime);
      }
      if (metrics.subscriptionResponseTime !== undefined) {
        performanceMonitor.trackSubscriptionResponseTime(metrics.subscriptionResponseTime);
      }
    }
  }

  public async initialize(): Promise<void> {
    try {
      // Test connection to relays
      await Promise.race([
        this.pool.get(this.relays, { kinds: [0], limit: 1 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
    } catch (error) {
      const trackedError = new TrackedError(
        'Failed to initialize NostrService',
        'nostr',
        error instanceof Error ? error : new Error('Unknown error')
      );
      ServiceRegistry.get<ErrorTracker>('ErrorTracker').trackError(trackedError);
      throw trackedError;
    }
  }

  public async publish(event: Event): Promise<void> {
    try {
      await this.pool.publish(this.relays, event);
    } catch (error) {
      const trackedError = new TrackedError(
        'Failed to publish Nostr event',
        'nostr',
        error instanceof Error ? error : new Error('Unknown error')
      );
      ServiceRegistry.get<ErrorTracker>('ErrorTracker').trackError(trackedError);
      throw trackedError;
    }
  }
}

// Export the singleton instance
export const nostrService = NostrService.getInstance(); 