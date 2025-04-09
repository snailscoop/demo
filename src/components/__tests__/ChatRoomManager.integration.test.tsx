import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatRoomManager } from '../ChatRoomManager';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { NostrService } from '../../services/NostrService';
import { AuthService } from '../../services/AuthService';
import { ErrorTracker } from '../../services/ErrorTracker';
import { ContentItem } from '../../services/NostrService';

// Mock services
jest.mock('../../services/ServiceRegistry');
jest.mock('../../services/NostrService');
jest.mock('../../services/AuthService');
jest.mock('../../services/ErrorTracker');

describe('ChatRoomManager Integration', () => {
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

  it('initializes and loads rooms', async () => {
    const onRoomSelect = jest.fn();
    render(<ChatRoomManager onRoomSelect={onRoomSelect} />);

    await waitFor(() => {
      expect(mockNostrService.subscribe).toHaveBeenCalled();
    });
  });

  it('creates a new room', async () => {
    const onRoomSelect = jest.fn();
    render(<ChatRoomManager onRoomSelect={onRoomSelect} />);

    // Open create room form
    fireEvent.click(screen.getByTestId('create-room-button'));

    // Fill in room details
    const roomName = 'Test Room';
    fireEvent.change(screen.getByTestId('room-name-input'), { target: { value: roomName } });
    fireEvent.click(screen.getByTestId('private-room-checkbox'));

    // Create room
    fireEvent.click(screen.getByTestId('submit-create-room'));

    await waitFor(() => {
      expect(mockNostrService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 30023,
          content: expect.stringContaining(roomName),
          pubkey: mockPublicKey,
          tags: expect.arrayContaining([['t', 'room']])
        })
      );
      expect(onRoomSelect).toHaveBeenCalled();
    });
  });

  it('joins a public room', async () => {
    const onRoomSelect = jest.fn();
    const roomId = 'test-room-1';
    const mockRoom = {
      id: roomId,
      name: 'Test Room',
      createdBy: 'other-user',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: ['other-user'],
      messages: [],
      isPrivate: false
    };

    // Simulate room data being received
    const subscribeCallback = jest.fn();
    mockNostrService.subscribe.mockImplementation((callback) => {
      subscribeCallback.mockImplementation(callback);
      return Promise.resolve(mockSubscriptionId);
    });

    render(<ChatRoomManager onRoomSelect={onRoomSelect} />);

    await waitFor(() => {
      expect(mockNostrService.subscribe).toHaveBeenCalled();
    });

    // Simulate receiving room data
    act(() => {
      subscribeCallback({
        type: 'blog',
        content: JSON.stringify(mockRoom),
        id: roomId,
        pubkey: 'other-user',
        created_at: Math.floor(Date.now() / 1000)
      } as ContentItem);
    });

    // Join room
    const joinButton = await screen.findByTestId(`join-room-${roomId}`);
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockNostrService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 30023,
          content: expect.stringContaining(roomId),
          pubkey: mockPublicKey,
          tags: expect.arrayContaining([['t', 'room']])
        })
      );
      expect(onRoomSelect).toHaveBeenCalledWith(roomId);
    });
  });

  it('cannot join a private room if not a participant', async () => {
    const onRoomSelect = jest.fn();
    const roomId = 'test-room-2';
    const mockRoom = {
      id: roomId,
      name: 'Private Room',
      createdBy: 'other-user',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: ['other-user'],
      messages: [],
      isPrivate: true
    };

    // Simulate room data being received
    const subscribeCallback = jest.fn();
    mockNostrService.subscribe.mockImplementation((callback) => {
      subscribeCallback.mockImplementation(callback);
      return Promise.resolve(mockSubscriptionId);
    });

    render(<ChatRoomManager onRoomSelect={onRoomSelect} />);

    await waitFor(() => {
      expect(mockNostrService.subscribe).toHaveBeenCalled();
    });

    // Simulate receiving room data
    act(() => {
      subscribeCallback({
        type: 'blog',
        content: JSON.stringify(mockRoom),
        id: roomId,
        pubkey: 'other-user',
        created_at: Math.floor(Date.now() / 1000)
      } as ContentItem);
    });

    // Try to join room
    const joinButton = await screen.findByTestId(`join-room-${roomId}`);
    expect(joinButton).toBeDisabled();
    expect(joinButton).toHaveTextContent('Private');
  });

  it('leaves a room', async () => {
    const onRoomSelect = jest.fn();
    const roomId = 'test-room-3';
    const mockRoom = {
      id: roomId,
      name: 'Test Room',
      createdBy: 'other-user',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: ['other-user', mockPublicKey],
      messages: [],
      isPrivate: false
    };

    // Simulate room data being received
    const subscribeCallback = jest.fn();
    mockNostrService.subscribe.mockImplementation((callback) => {
      subscribeCallback.mockImplementation(callback);
      return Promise.resolve(mockSubscriptionId);
    });

    render(<ChatRoomManager onRoomSelect={onRoomSelect} selectedRoomId={roomId} />);

    await waitFor(() => {
      expect(mockNostrService.subscribe).toHaveBeenCalled();
    });

    // Simulate receiving room data
    act(() => {
      subscribeCallback({
        type: 'blog',
        content: JSON.stringify(mockRoom),
        id: roomId,
        pubkey: 'other-user',
        created_at: Math.floor(Date.now() / 1000)
      } as ContentItem);
    });

    // Leave room
    const leaveButton = await screen.findByTestId(`leave-room-${roomId}`);
    fireEvent.click(leaveButton);

    await waitFor(() => {
      expect(mockNostrService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 30023,
          content: expect.stringContaining(roomId),
          pubkey: mockPublicKey,
          tags: expect.arrayContaining([['t', 'room']])
        })
      );
      expect(onRoomSelect).toHaveBeenCalledWith('');
    });
  });

  it('handles errors gracefully', async () => {
    const onRoomSelect = jest.fn();
    const error = new Error('Failed to connect');
    mockNostrService.subscribe.mockRejectedValue(error);

    render(<ChatRoomManager onRoomSelect={onRoomSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load chat rooms')).toBeInTheDocument();
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to load chat rooms',
          category: 'nostr',
          severity: 'high',
          originalError: error
        })
      );
    });
  });

  it('cleans up subscriptions on unmount', () => {
    const onRoomSelect = jest.fn();
    const { unmount } = render(<ChatRoomManager onRoomSelect={onRoomSelect} />);

    unmount();

    expect(mockNostrService.unsubscribe).toHaveBeenCalledWith(mockSubscriptionId);
  });
}); 