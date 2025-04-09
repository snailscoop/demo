import type { NostrEvent as BaseNostrEvent } from 'nostr-tools';

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'text' | 'image' | 'video';
}

export interface NostrEvent extends BaseNostrEvent {
  relay?: string;
  // Add any additional properties needed for chat functionality
  chatRoomId?: string;
  messageType?: 'text' | 'image' | 'video';
}

export interface ChatRoom {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  lastActivity: number;
  participants: string[];
  messages: Message[];
  isPrivate: boolean;
} 