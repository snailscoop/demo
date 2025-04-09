declare module 'nostr-tools' {
  export interface SimplePool {
    close(): void;
    subscribe(relays: string[], filters: Filter, handlers: {
      onevent: (event: NostrEvent) => void;
      oneose: () => void;
    }): { close: () => void };
  }

  export interface Filter {
    kinds?: number[];
    limit?: number;
  }

  export interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
    relay?: string;
  }

  export class SimplePool {
    constructor();
  }
} 