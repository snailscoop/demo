import React, { useState, useEffect } from 'react';
import { ServiceRegistry } from '../services/ServiceRegistry';
import { NostrService, ContentItem } from '../services/NostrService';
import { AuthService } from '../services/AuthService';
import { ErrorTracker } from '../services/ErrorTracker';
import { ChatRoom, Message, NostrEvent } from '../types/chat';
import { TrackedError } from '../types/error';
import './ChatRoomManager.css';

interface ChatRoomManagerProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string;
}

export const ChatRoomManager: React.FC<ChatRoomManagerProps> = ({
  onRoomSelect,
  selectedRoomId
}) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const serviceRegistry = ServiceRegistry.getInstance();
  const nostrService = serviceRegistry.get<NostrService>('nostrService');
  const authService = serviceRegistry.get<AuthService>('authService');
  const errorTracker = serviceRegistry.get<ErrorTracker>('errorTracker');

  useEffect(() => {
    const loadRooms = async () => {
      if (!nostrService || !authService) {
        setError('Required services not available');
        setLoading(false);
        return;
      }

      try {
        // Subscribe to room events
        const subId = await nostrService.subscribe(
          (item: ContentItem) => {
            if (item.type === 'blog') {
              try {
                const roomData = JSON.parse(item.content);
                if (roomData && roomData.id && roomData.name) {
                  setRooms(prev => {
                    const existingRoom = prev.find(r => r.id === roomData.id);
                    if (existingRoom) {
                      return prev.map(r => r.id === roomData.id ? { ...r, ...roomData } : r)
                        .sort((a, b) => b.lastActivity - a.lastActivity);
                    }
                    return [...prev, roomData].sort((a, b) => b.lastActivity - a.lastActivity);
                  });
                }
              } catch (parseError) {
                console.error('Failed to parse room data:', parseError);
              }
            }
          },
          (error) => {
            setError('Failed to load chat rooms');
            if (errorTracker) {
              const trackedError: TrackedError = {
                message: 'Failed to load chat rooms',
                category: 'nostr',
                severity: 'high',
                timestamp: Date.now(),
                resolved: false,
                originalError: error
              };
              errorTracker.trackError(trackedError);
            }
          }
        );

        return () => {
          if (subId) {
            nostrService.unsubscribe(subId);
          }
        };
      } catch (error) {
        setError('Failed to load chat rooms');
        if (errorTracker) {
          const trackedError: TrackedError = {
            message: 'Failed to load chat rooms',
            category: 'nostr',
            severity: 'high',
            timestamp: Date.now(),
            resolved: false,
            originalError: error instanceof Error ? error : new Error('Unknown error')
          };
          errorTracker.trackError(trackedError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [nostrService, authService, errorTracker]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !nostrService || !authService) return;

    try {
      const currentUser = nostrService.getCurrentPublicKey();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newRoom: ChatRoom = {
        id: roomId,
        name: newRoomName.trim(),
        createdBy: currentUser,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        participants: [currentUser],
        messages: [],
        isPrivate
      };

      const event: NostrEvent = {
        kind: 30023,
        content: JSON.stringify(newRoom),
        created_at: Math.floor(Date.now() / 1000),
        tags: [['t', 'room'], ['room', roomId]],
        pubkey: currentUser,
        id: '',
        sig: ''
      };

      await nostrService.publish(event);
      setNewRoomName('');
      setIsPrivate(false);
      setIsCreatingRoom(false);
      onRoomSelect(roomId);
    } catch (error) {
      setError('Failed to create room');
      if (errorTracker) {
        const trackedError: TrackedError = {
          message: 'Failed to create room',
          category: 'nostr',
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
          originalError: error instanceof Error ? error : new Error('Failed to create room')
        };
        errorTracker.trackError(trackedError);
      }
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!nostrService || !authService) return;

    try {
      const currentUser = nostrService.getCurrentPublicKey();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const room = rooms.find(r => r.id === roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      if (room.isPrivate && !room.participants.includes(currentUser)) {
        throw new Error('This is a private room');
      }

      if (!room.participants.includes(currentUser)) {
        const updatedRoom = {
          ...room,
          participants: [...room.participants, currentUser],
          lastActivity: Date.now()
        };

        const event: NostrEvent = {
          kind: 30023,
          content: JSON.stringify(updatedRoom),
          created_at: Math.floor(Date.now() / 1000),
          tags: [['t', 'room'], ['room', roomId]],
          pubkey: currentUser,
          id: '',
          sig: ''
        };

        await nostrService.publish(event);
      }

      onRoomSelect(roomId);
    } catch (error) {
      setError('Failed to join room');
      if (errorTracker) {
        const trackedError: TrackedError = {
          message: 'Failed to join room',
          category: 'nostr',
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
          originalError: error instanceof Error ? error : new Error('Failed to join room')
        };
        errorTracker.trackError(trackedError);
      }
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (!nostrService || !authService) return;

    try {
      const currentUser = nostrService.getCurrentPublicKey();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const room = rooms.find(r => r.id === roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const updatedRoom = {
        ...room,
        participants: room.participants.filter(p => p !== currentUser),
        lastActivity: Date.now()
      };

      const event: NostrEvent = {
        kind: 30023,
        content: JSON.stringify(updatedRoom),
        created_at: Math.floor(Date.now() / 1000),
        tags: [['t', 'room'], ['room', roomId]],
        pubkey: currentUser,
        id: '',
        sig: ''
      };

      await nostrService.publish(event);
      if (selectedRoomId === roomId) {
        onRoomSelect('');
      }
    } catch (error) {
      setError('Failed to leave room');
      if (errorTracker) {
        const trackedError: TrackedError = {
          message: 'Failed to leave room',
          category: 'nostr',
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
          originalError: error instanceof Error ? error : new Error('Failed to leave room')
        };
        errorTracker.trackError(trackedError);
      }
    }
  };

  if (loading) {
    return <div className="chat-room-manager-loading">Loading rooms...</div>;
  }

  return (
    <div className="chat-room-manager">
      {error && <div className="error-message">{error}</div>}
      
      <div className="room-list-header">
        <h3>Chat Rooms</h3>
        <button
          className="create-room-button"
          onClick={() => setIsCreatingRoom(true)}
          data-testid="create-room-button"
        >
          Create Room
        </button>
      </div>

      {isCreatingRoom && (
        <div className="create-room-form">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            data-testid="room-name-input"
          />
          <label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              data-testid="private-room-checkbox"
            />
            Private Room
          </label>
          <div className="create-room-actions">
            <button
              onClick={handleCreateRoom}
              disabled={!newRoomName.trim()}
              data-testid="submit-create-room"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreatingRoom(false);
                setNewRoomName('');
                setIsPrivate(false);
              }}
              data-testid="cancel-create-room"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="room-list" data-testid="room-list">
        {rooms.map(room => {
          const currentUser = nostrService?.getCurrentPublicKey();
          const isParticipant = currentUser && room.participants.includes(currentUser);
          
          return (
            <div
              key={room.id}
              className={`room-item ${selectedRoomId === room.id ? 'selected' : ''}`}
              data-testid={`room-${room.id}`}
            >
              <div className="room-info">
                <span className="room-name">{room.name}</span>
                <span className="room-meta">
                  {room.isPrivate && <span className="private-badge">Private</span>}
                  <span className="participant-count">
                    {room.participants.length} participant(s)
                  </span>
                </span>
                <div className="room-actions">
                  {isParticipant ? (
                    <>
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={selectedRoomId === room.id}
                        data-testid={`join-room-${room.id}`}
                      >
                        {selectedRoomId === room.id ? 'Current' : 'Join'}
                      </button>
                      <button
                        onClick={() => handleLeaveRoom(room.id)}
                        data-testid={`leave-room-${room.id}`}
                      >
                        Leave
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.isPrivate}
                      data-testid={`join-room-${room.id}`}
                    >
                      {room.isPrivate ? 'Private' : 'Join'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 