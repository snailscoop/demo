import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { NostrEvent, ContentItem as ChatContentItem } from '../../types/chat';
import { NostrChat } from '../NostrChat';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { NostrService } from '../../services/NostrService';
import { AuthService } from '../../services/AuthService';
import { ErrorTracker } from '../../services/ErrorTracker';
import type { Event } from 'nostr-tools/core';

// Mock services
jest.mock('../../services/ServiceRegistry');
jest.mock('../../services/NostrService');
jest.mock('../../services/AuthService');
jest.mock('../../services/ErrorTracker');

describe('NostrChat Integration', () => {
  let mockNostrService: jest.Mocked<NostrService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockErrorTracker: jest.Mocked<ErrorTracker>;
  let mockServiceRegistry: {
    get: jest.Mock;
    getInstance: jest.Mock;
  };

  const mockPublicKey = 'npub1test123';
  const mockSubscriptionId = 'test-sub-id';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock services
    mockNostrService = {
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(mockSubscriptionId),
      unsubscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
      getCurrentPublicKey: jest.fn().mockReturnValue(mockPublicKey),
      isConnected: jest.fn().mockReturnValue(true)
    } as unknown as jest.Mocked<NostrService>;

    mockAuthService = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      loginWithNostr: jest.fn().mockResolvedValue({
        provider: 'nostr',
        address: mockPublicKey,
        publicKey: mockPublicKey,
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
      }),
      getInstance: jest.fn().mockReturnThis()
    };

    (ServiceRegistry.getInstance as jest.Mock).mockReturnValue(mockServiceRegistry);
  });

  it('initializes and connects to Nostr network', async () => {
    render(<NostrChat />);

    await waitFor(() => {
      expect(mockNostrService.connect).toHaveBeenCalled();
      expect(mockNostrService.subscribe).toHaveBeenCalled();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('handles authentication flow correctly', async () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    
    render(<NostrChat />);

    await waitFor(() => {
      expect(mockAuthService.loginWithNostr).toHaveBeenCalled();
      expect(mockNostrService.connect).toHaveBeenCalled();
    });
  });

  it('sends messages successfully', async () => {
    render(<NostrChat />);

    const message = 'Hello, Nostr!';
    const input = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: message } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockNostrService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 30023,
          content: message,
          pubkey: mockPublicKey,
          tags: [['t', 'blog']]
        })
      );
    });

    expect(input).toHaveValue('');
  });

  it('receives and displays messages', async () => {
    render(<NostrChat />);

    const mockMessage: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-sender',
      content: 'Test message',
      created_at: Math.floor(Date.now() / 1000),
      kind: 30023,
      sig: 'test-sig',
      tags: [['t', 'blog']],
      relay: 'wss://relay.damus.io'
    };

    // Get the subscribe callback
    const subscribeCallback = (mockNostrService.subscribe as jest.Mock).mock.calls[0][0];
    
    act(() => {
      subscribeCallback(mockMessage);
    });

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('handles emoji picker interactions', async () => {
    render(<NostrChat />);

    const openEmojiButton = screen.getByText('😊');
    fireEvent.click(openEmojiButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const input = screen.getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'Hello ' } });

    const emojiPickerButton = screen.getByRole('dialog').querySelector('button[data-unified="1f44b"]');
    if (emojiPickerButton) {
      fireEvent.click(emojiPickerButton);
    }

    expect(input).toHaveValue('Hello 👋');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles connection errors gracefully', async () => {
    const connectionError = new Error('Failed to connect');
    mockNostrService.connect.mockRejectedValue(connectionError);

    render(<NostrChat />);

    await waitFor(() => {
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to connect to Nostr network',
          category: 'nostr',
          severity: 'high',
          originalError: connectionError
        })
      );
      expect(screen.getByText('Failed to connect to Nostr network')).toBeInTheDocument();
    });
  });

  it('handles message sending errors', async () => {
    render(<NostrChat />);

    const sendError = new Error('Failed to send message');
    mockNostrService.publish.mockRejectedValue(sendError);

    const message = 'Test message';
    const input = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: message } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to send message',
          category: 'nostr',
          severity: 'medium',
          originalError: sendError
        })
      );
      expect(screen.getByText('Failed to send message')).toBeInTheDocument();
    });
  });

  it('cleans up subscriptions on unmount', () => {
    const { unmount } = render(<NostrChat />);
    unmount();

    expect(mockNostrService.unsubscribe).toHaveBeenCalledWith(mockSubscriptionId);
  });

  it('handles typing indicators', async () => {
    render(<NostrChat />);

    const input = screen.getByTestId('message-input');
    fireEvent.keyPress(input, { key: 'a', code: 'KeyA' });

    await waitFor(() => {
      expect(screen.getByText(`${mockPublicKey.slice(0, 6)}...${mockPublicKey.slice(-4)} typing...`)).toBeInTheDocument();
    });

    // Wait for typing indicator to disappear
    await waitFor(() => {
      expect(screen.queryByText(`${mockPublicKey.slice(0, 6)}...${mockPublicKey.slice(-4)} typing...`)).not.toBeInTheDocument();
    }, { timeout: 3500 });
  });

  it('groups messages by sender', async () => {
    render(<NostrChat />);

    const subscribeCallback = (mockNostrService.subscribe as jest.Mock).mock.calls[0][0];
    
    // Send multiple messages from the same sender
    const messages = [
      {
        id: 'msg1',
        pubkey: 'sender1',
        content: 'First message',
        created_at: Date.now() / 1000,
        type: 'blog',
        title: 'First Message Title'
      },
      {
        id: 'msg2',
        pubkey: 'sender1',
        content: 'Second message',
        created_at: (Date.now() / 1000) + 1,
        type: 'blog',
        title: 'Second Message Title'
      }
    ];

    act(() => {
      messages.forEach(msg => subscribeCallback(msg));
    });

    await waitFor(() => {
      const messageGroups = screen.getAllByText('sender1').length;
      expect(messageGroups).toBe(1); // Messages should be grouped under one sender header
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });
  });

  it('should render chat messages and handle emoji reactions', async () => {
    const mockMessage: ContentItem = {
      id: '123',
      type: 'blog',
      title: 'Test Message',
      content: 'Hello World',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000)
    };

    const mockEvent: Event = {
      id: '123',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [['t', 'blog']],
      content: JSON.stringify(mockMessage),
      sig: 'test-signature'
    };

    jest.spyOn(mockNostrService, 'subscribe').mockImplementation((onEvent, onError) => {
      onEvent(mockMessage);
      return Promise.resolve('test-subscription-id');
    });

    const { container } = render(<NostrChat />);
    
    const messageElement = await screen.findByText('Hello World');
    expect(messageElement).toBeInTheDocument();

    const reactionButton = screen.getByTestId('emoji-button');
    fireEvent.click(reactionButton);

    const emojiPicker = screen.getByTestId('emoji-picker');
    expect(emojiPicker).toBeInTheDocument();
  });
}); 