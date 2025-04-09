import React, { useState, useEffect, useRef } from 'react';
import { ServiceRegistry } from '../services/ServiceRegistry';
import { GunService } from '../services/GunService';
import { ErrorTracker } from '../services/ErrorTracker';
import { TrackedError } from '../types/error';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  formatted?: boolean;
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const gunService = ServiceRegistry.get<GunService>('GunService');
  const errorTracker = ServiceRegistry.get<ErrorTracker>('ErrorTracker');

  useEffect(() => {
    const setupChat = async () => {
      try {
        // Initialize chat room
        const chat = gunService.getGun().get('chat-room');
        
        // Listen for new messages
        chat.map().on((data: any, key: string) => {
          if (data && typeof data === 'object') {
            setMessages(prev => {
              const message: Message = {
                id: key,
                text: data.text,
                sender: data.sender,
                timestamp: data.timestamp,
                formatted: data.formatted
              };
              
              // Check if message already exists
              if (!prev.some(m => m.id === key)) {
                return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
              }
              return prev;
            });
          }
        });

        // Check connection status
        gunService.getGun().on('hi', () => {
          setIsConnected(true);
          setError(null);
        });

        gunService.getGun().on('bye', () => {
          setIsConnected(false);
          setError('Disconnected from chat server');
        });

      } catch (err) {
        const error = new TrackedError(
          'Failed to setup chat',
          'chat',
          err instanceof Error ? err : new Error('Unknown error')
        );
        errorTracker.trackError(error);
        setError('Failed to connect to chat server');
      }
    };

    setupChat();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;

    try {
      const chat = gunService.getGun().get('chat-room');
      const message = {
        text: newMessage,
        sender: 'user', // TODO: Replace with actual user ID
        timestamp: Date.now(),
        formatted: false
      };

      chat.set(message);
      setNewMessage('');
    } catch (err) {
      const error = new TrackedError(
        'Failed to send message',
        'chat',
        err instanceof Error ? err : new Error('Unknown error')
      );
      errorTracker.trackError(error);
      setError('Failed to send message');
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat Room</h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className="message">
            <div className="message-header">
              <span className="sender">{message.sender}</span>
              <span className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div 
              className="message-content"
              dangerouslySetInnerHTML={{
                __html: message.formatted ? formatMessage(message.text) : message.text
              }}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button type="submit" disabled={!isConnected || !newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}; 