import { test, expect } from 'vitest';
import { VideoList } from '../src/components/VideoList';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the nostr-tools module
vi.mock('nostr-tools', () => ({
  SimplePool: class {
    constructor() {
      this.relays = new Set();
    }
    ensureRelay(url) {
      this.relays.add(url);
      return Promise.resolve();
    }
    subscribe(relays, filters, handlers) {
      // Simulate receiving a video event
      handlers.onevent({
        id: 'test-id',
        content: 'Test Video: https://example.com/video',
        pubkey: 'test-pubkey',
        created_at: Date.now(),
        relay: 'wss://test-relay'
      });
      handlers.oneose();
      return {
        close: () => {}
      };
    }
    close() {}
  }
}));

test('VideoList component renders loading state initially', () => {
  render(<VideoList />);
  expect(screen.getByText('Loading videos...')).toBeInTheDocument();
});

test('VideoList displays error state when connection fails', async () => {
  render(<VideoList />);
  await waitFor(() => {
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});

test('VideoList displays videos when successfully loaded', async () => {
  render(<VideoList />);
  await waitFor(() => {
    expect(screen.getByText('Test Video')).toBeInTheDocument();
  });
});

test('VideoList handles relay connection status correctly', async () => {
  render(<VideoList />);
  await waitFor(() => {
    expect(screen.getByText('wss://test-relay')).toBeInTheDocument();
  });
}); 