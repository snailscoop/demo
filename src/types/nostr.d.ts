export interface NostrWindow {
  getPublicKey(): Promise<string>;
  signEvent(event: any): Promise<any>;
  getRelays(): Promise<{ [url: string]: { read: boolean; write: boolean } }>;
}

declare global {
  interface Window {
    nostr?: NostrWindow;
  }
} 