import React, { useEffect, useState, useRef } from 'react';
import { SecureChat } from '../services/SecureChat';
import { Box, TextInput, Button, Text, Paper, ScrollArea, Stack, Avatar, Group, ActionIcon } from '@mantine/core';
import { IconSend, IconPaperclip } from '@tabler/icons-react';

interface Message {
  content: string;
  sender: string;
  timestamp: number;
  id: string;
}

interface SecureChatRoomProps {
  roomId: string;
  username: string;
  onMessageSent?: (message: Message) => void;
}

export const SecureChatRoom: React.FC<SecureChatRoomProps> = ({ roomId, username, onMessageSent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatService = useRef<SecureChat>(new SecureChat());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        await chatService.current.createRoom(roomId);

        await chatService.current.receiveMessages(roomId, (message) => {
          const newMessage = {
            content: message.content,
            sender: message.sender,
            timestamp: message.timestamp,
            id: `${message.timestamp}-${Math.random().toString(36).substr(2, 9)}`
          };
          
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      }
    };

    initializeChat();

    return () => {
      chatService.current.leaveRoom(roomId);
    };
  }, [roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const timestamp = Date.now();
      const message: Message = {
        content: messageContent,
        sender: username,
        timestamp,
        id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`
      };

      await chatService.current.sendMessage(roomId, messageContent);
      onMessageSent?.(message);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // TODO: Implement typing indicator
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // TODO: Clear typing indicator
    }, 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Box p="md">
      <Paper shadow="sm" p="md" withBorder>
        <Box mb="md">
          <Group>
            <Avatar size="md" color="blue" radius="xl">
              {getInitials(roomId)}
            </Avatar>
            <Box>
              <Text fw={700} size="lg">
                {roomId}
              </Text>
              {isTyping && (
                <Text size="sm" c="dimmed">
                  typing...
                </Text>
              )}
            </Box>
          </Group>
        </Box>

        {error && (
          <Text color="red" mb="md">
            Error: {error}
          </Text>
        )}

        <ScrollArea h={400} mb="md">
          <Stack gap="xs">
            {messages.map((msg) => (
              <Paper
                key={msg.id}
                p="xs"
                withBorder
                style={{
                  alignSelf: msg.sender === username ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: msg.sender === username ? '#e3f2fd' : '#fff',
                  borderRadius: '12px',
                  margin: msg.sender === username ? '4px 0 4px auto' : '4px auto 4px 0',
                }}
              >
                {msg.sender !== username && (
                  <Text fw={500} size="sm" mb={4}>
                    {msg.sender}
                  </Text>
                )}
                <Text style={{ wordBreak: 'break-word' }}>{msg.content}</Text>
                <Text size="xs" c="dimmed" style={{ textAlign: 'right' }}>
                  {formatMessageTime(msg.timestamp)}
                </Text>
              </Paper>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
        </ScrollArea>

        <form onSubmit={handleSendMessage}>
          <Group gap="xs">
            <ActionIcon 
              variant="subtle" 
              size="lg"
              color="gray"
              title="Attach file (coming soon)"
              disabled
            >
              <IconPaperclip size={20} />
            </ActionIcon>
            <TextInput
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              style={{ flex: 1 }}
              radius="xl"
            />
            <ActionIcon 
              type="submit" 
              variant="filled" 
              size="lg" 
              color="blue"
              disabled={!newMessage.trim()}
            >
              <IconSend size={20} />
            </ActionIcon>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}; 