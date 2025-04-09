import React, { useEffect, useRef, useState } from 'react';
import { ServiceRegistry } from '../services/ServiceRegistry';
import { NostrService } from '../services/NostrService';
import { ErrorTracker } from '../services/ErrorTracker';
import { AuthService } from '../services/AuthService';
import { TrackedError } from '../types/error';
import { Message } from '../types/chat';
import type { ContentItem } from '../services/NostrService';
import type { Event } from 'nostr-tools/core';
import { formatDistanceToNow, format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import './NostrChat.css';

interface NostrMessage extends Message {
  signature?: string;
  pubkey: string;
}

interface ChatError {
  message: string;
  type: 'connection' | 'authentication' | 'message' | 'subscription';
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
}

interface GroupedMessage {
  pubkey: string;
  messages: NostrMessage[];
}

interface MessageGroup {
  pubkey: string;
  messages: Message[];
  isSelf: boolean;
}

const MESSAGE_PAGE_SIZE = 50;

export const NostrChat: React.FC = () => {
  const [messages, setMessages] = useState<NostrMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserPubkey = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const serviceRegistry = ServiceRegistry.getInstance();
  const nostrService = serviceRegistry.get<NostrService>('nostrService');
  const authService = serviceRegistry.get<AuthService>('authService');
  const errorTracker = serviceRegistry.get<ErrorTracker>('errorTracker');

  useEffect(() => {
    const setupNostrChat = async () => {
      if (!nostrService || !authService || !errorTracker) {
        handleError('Required services not available', 'connection', 'high');
        return;
      }

      try {
        if (!authService.isAuthenticated()) {
          await authService.loginWithNostr();
        }

        await nostrService.connect();
        setIsConnected(true);
        currentUserPubkey.current = nostrService.getCurrentPublicKey();

        const subId = await nostrService.subscribe(
          (item: ContentItem) => {
            if (item.type === 'blog') {
              setMessages(prev => {
                const message: NostrMessage = {
                  id: item.id,
                  text: item.content,
                  sender: item.pubkey,
                  timestamp: item.created_at * 1000,
                  pubkey: item.pubkey
                };
                
                if (!isMessageDuplicate(message, prev)) {
                  return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
                }
                return prev;
              });
            }
          },
          (error: Error) => {
            handleError('Failed to receive message', 'message', 'medium', error);
          }
        );

        setSubscriptionId(subId);
        setIsLoading(false);
      } catch (err) {
        handleError(
          'Failed to connect to Nostr network',
          'connection',
          'high',
          err instanceof Error ? err : new Error('Unknown error')
        );
        setIsLoading(false);
      }
    };

    setupNostrChat();

    return () => {
      if (subscriptionId && nostrService) {
        nostrService.unsubscribe(subscriptionId);
      }
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleError = (errorMessage: string, type: ChatError['type'], severity: ChatError['severity'], originalError?: Error) => {
    const chatError: ChatError = {
      message: errorMessage,
      type,
      severity,
      timestamp: Date.now()
    };
    setError(chatError);

    if (errorTracker) {
      const trackedError: TrackedError = {
        message: errorMessage,
        category: 'nostr',
        severity,
        timestamp: Date.now(),
        stack: originalError?.stack,
        resolved: false,
        originalError: originalError || new Error(errorMessage)
      };
      errorTracker.trackError(trackedError);
    }
  };

  const isMessageDuplicate = (newMsg: NostrMessage, existingMsgs: NostrMessage[]): boolean => {
    return existingMsgs.some(msg => 
      msg.id === newMsg.id || 
      (msg.pubkey === newMsg.pubkey && 
       Math.abs(msg.timestamp - newMsg.timestamp) < 1000 && 
       msg.text === newMsg.text)
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected || !nostrService) return;

    setIsLoading(true);
    try {
      const pubkey = nostrService.getCurrentPublicKey();
      if (!pubkey) {
        throw new Error('Not authenticated');
      }

      const event: Event = {
        kind: 30023,
        content: newMessage.trim(),
        created_at: Math.floor(Date.now() / 1000),
        tags: [['t', 'blog']],
        pubkey,
        id: '',
        sig: ''
      };

      await nostrService.publish(event);
      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (err) {
      handleError(
        'Failed to send message',
        'message',
        'medium',
        err instanceof Error ? err : new Error('Failed to send message')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTyping = () => {
    if (!nostrService) return;
    const pubkey = nostrService.getCurrentPublicKey();
    if (!pubkey) return;

    setTypingUsers(prev => new Set(prev).add(pubkey));
    setTimeout(() => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(pubkey);
        return newSet;
      });
    }, 3000);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = newMessage.slice(0, cursorPosition);
    const textAfterCursor = newMessage.slice(cursorPosition);
    setNewMessage(textBeforeCursor + emoji + textAfterCursor);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const formatPubkey = (pubkey: string) => {
    return `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const groupMessages = (messages: NostrMessage[]): GroupedMessage[] => {
    return messages.reduce<GroupedMessage[]>((groups, message) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.pubkey === message.pubkey) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ pubkey: message.pubkey, messages: [message] });
      }
      return groups;
    }, []);
  };

  const groupedMessages = groupMessages(messages);

  const messageGroups = groupMessages(messages);

  if (isLoading) {
    return (
      <div className="nostr-chat-container" data-testid="nostr-chat-container">
        <div className="loading-spinner">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="nostr-chat-container" data-testid="nostr-chat-container">
      <div className="chat-header">
        <h2>Nostr Chat</h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {error && <div className="error-message">{error.message}</div>}

      <div className="messages-container">
        {messageGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={`message-group ${
              group.pubkey === currentUserPubkey.current ? 'message-group-self' : ''
            }`}
          >
            <div className="message-group-header">
              <span className="sender">{formatPubkey(group.pubkey)}</span>
            </div>
            {group.messages.map((message, messageIndex) => (
              <div
                key={message.id}
                className={`message ${
                  message.pubkey === currentUserPubkey.current ? 'message-self' : ''
                }`}
              >
                <div className="message-content">{message.text}</div>
                {messageIndex === group.messages.length - 1 && (
                  <div className="message-footer">
                    <span className="timestamp">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            {Array.from(typingUsers).map(formatPubkey).join(', ')} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <div className="message-input-container">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleTyping}
            placeholder="Type a message..."
            disabled={!isConnected}
            data-testid="message-input"
          />
          <button
            type="button"
            className="emoji-button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
        <button 
          type="submit" 
          disabled={!isConnected || !newMessage.trim()}
          data-testid="send-button"
        >
          {isLoading ? (
            <div className="loading-spinner" />
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  );
}; 