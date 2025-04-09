import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NostrChat } from '../NostrChat';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { NostrService } from '../../services/NostrService';
import { AuthService } from '../../services/AuthService';
import { ErrorTracker } from '../../services/ErrorTracker';
import type { ContentItem } from '../../services/NostrService';

// Mock services
jest.mock('../../services/ServiceRegistry', () => ({
  getInstance: jest.fn()
}));
jest.mock('../../services/NostrService');
jest.mock('../../services/AuthService');
jest.mock('../../services/ErrorTracker');

describe('NostrChat', () => {
  let mockNostrService: jest.Mocked<NostrService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockErrorTracker: jest.Mocked<ErrorTracker>;
  let mockServiceRegistry: {
    get: jest.Mock;
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock services
    mockNostrService = {
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue('test-sub-id'),
      unsubscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
      getCurrentPublicKey: jest.fn().mockReturnValue('test-pubkey'),
      isConnected: jest.fn().mockReturnValue(true)
    } as unknown as jest.Mocked<NostrService>;

    mockAuthService = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      loginWithNostr: jest.fn().mockResolvedValue({
        provider: 'nostr',
        address: 'test-pubkey',
        publicKey: 'test-pubkey',
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        permissions: ['chat']
      })
    } as unknown as jest.Mocked<AuthService>;

    mockErrorTracker = {
      trackError: jest.fn()
    } as unknown as jest.Mocked<ErrorTracker>;

    mockServiceRegistry = {
      get: jest.fn().mockImplementation((service: string) => {
        switch (service) {
          case 'nostrService':
            return mockNostrService;
          case 'authService':
            return mockAuthService;
          case 'errorTracker':
            return mockErrorTracker;
          default:
            return null;
        }
      })
    };

    // Setup ServiceRegistry mock
    (ServiceRegistry.getInstance as jest.Mock).mockReturnValue(mockServiceRegistry);
  });

  it('renders chat container and connects to Nostr', async () => {
    render(<NostrChat />);

    // Check if chat container is rendered
    expect(screen.getByTestId('nostr-chat-container')).toBeInTheDocument();

    // Verify service initialization
    await waitFor(() => {
      expect(mockNostrService.connect).toHaveBeenCalled();
    });
  });

  it('handles message sending', async () => {
    render(<NostrChat />);

    // Type a message
    const input = screen.getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'Hello, Nostr!' } });

    // Send the message
    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);

    // Verify message was published
    await waitFor(() => {
      expect(mockNostrService.publish).toHaveBeenCalledWith(expect.objectContaining({
        kind: 30023,
        content: 'Hello, Nostr!',
        pubkey: 'test-pubkey',
        tags: [['t', 'blog']]
      }));
    });

    // Input should be cleared
    expect(input).toHaveValue('');
  });

  it('handles emoji picker functionality', async () => {
    render(<NostrChat />);

    // Open emoji picker
    const emojiButton = screen.getByText('😊');
    fireEvent.click(emojiButton);

    // Verify emoji picker is visible
    const emojiPicker = screen.getByRole('dialog');
    expect(emojiPicker).toBeInTheDocument();

    // Simulate emoji selection
    const emojiData = {
      emoji: '👋',
      names: ['wave'],
      unified: '1f44b',
      originalUnified: '1f44b',
      activeSkinTone: 'neutral'
    };

    // Get input and simulate emoji click
    const input = screen.getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'Hello ' } });
    
    // Trigger emoji click event
    const onEmojiClick = screen.getByRole('dialog').querySelector('button[data-unified="1f44b"]');
    fireEvent.click(onEmojiClick);

    // Verify emoji is added to input
    expect(input).toHaveValue('Hello 👋');

    // Verify emoji picker is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles multiple emoji selections', async () => {
    render(<NostrChat />);

    // Open emoji picker
    const emojiButton = screen.getByText('😊');
    fireEvent.click(emojiButton);

    // Select multiple emojis
    const emojis = ['👋', '😊', '❤️'];
    const input = screen.getByTestId('message-input');

    for (const emoji of emojis) {
      const emojiData = {
        emoji,
        names: ['test'],
        unified: '1f44b',
        originalUnified: '1f44b',
        activeSkinTone: 'neutral'
      };

      // Trigger emoji click event
      const onEmojiClick = screen.getByRole('dialog').querySelector(`button[data-unified="${emojiData.unified}"]`);
      fireEvent.click(onEmojiClick);
      fireEvent.click(emojiButton); // Reopen picker
    }

    // Verify all emojis are in input
    expect(input.value).toContain('👋');
    expect(input.value).toContain('😊');
    expect(input.value).toContain('❤️');
  });

  it('displays received messages', async () => {
    render(<NostrChat />);

    // Simulate receiving a message
    const mockContentItem: ContentItem = {
      id: 'test-id',
      type: 'blog',
      title: 'Chat Message',
      content: 'Hello from another user!',
      pubkey: 'other-pubkey',
      created_at: Math.floor(Date.now() / 1000)
    };

    // Get the subscribe callback and call it with the mock message
    await waitFor(() => {
      const subscribeCall = mockNostrService.subscribe.mock.calls[0];
      const onEvent = subscribeCall[0];
      onEvent(mockContentItem);
    });

    // Verify message is displayed
    expect(screen.getByText('Hello from another user!')).toBeInTheDocument();
  });

  it('handles authentication failure', async () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.loginWithNostr.mockRejectedValue(new Error('Auth failed'));

    render(<NostrChat />);

    // Verify error is displayed
    await waitFor(() => {
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to setup Nostr chat',
          category: 'nostr',
          severity: 'high'
        })
      );
    });

    expect(screen.getByText('Failed to connect to Nostr network')).toBeInTheDocument();
  });

  it('handles connection failure', async () => {
    mockNostrService.connect.mockRejectedValue(new Error('Connection failed'));

    render(<NostrChat />);

    // Verify error is displayed
    await waitFor(() => {
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to setup Nostr chat',
          category: 'nostr',
          severity: 'high'
        })
      );
    });

    expect(screen.getByText('Failed to connect to Nostr network')).toBeInTheDocument();
  });

  it('cleans up subscription on unmount', () => {
    const { unmount } = render(<NostrChat />);

    // Unmount component
    unmount();

    // Verify subscription is cleaned up
    expect(mockNostrService.unsubscribe).toHaveBeenCalledWith('test-sub-id');
  });
}); 