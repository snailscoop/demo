import React, { useState, useEffect, useRef } from 'react';
import { SecureChatRoom } from './SecureChatRoom';
import { Box, TextInput, Button, Text, Paper, Stack, Modal, Avatar, Group, ActionIcon, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { KeplrAuth } from '../services/KeplrAuth';
import Gun from 'gun';
import 'gun/sea';
import { IconDots, IconTrash, IconPencil, IconMessage } from '@tabler/icons-react';

interface ChatRoom {
  id: string;
  name: string;
  lastMessage?: string;
  lastActivity?: number;
  createdBy: string;
  createdAt: number;
  participants?: string[];
}

export const ChatPage: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [username, setUsername] = useState('Anonymous');
  const [opened, { open, close }] = useDisclosure(false);
  const [keplrConnected, setKeplrConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [loading, setLoading] = useState(true);
  
  const gunRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Gun with multiple fallback peers
    gunRef.current = new Gun({
      peers: [
        'http://localhost:8765/gun',
        'https://gun-manhattan.herokuapp.com/gun',
        'https://gun-us.herokuapp.com/gun'
      ]
    });

    // Subscribe to rooms
    const rooms = gunRef.current.get('snails-chat-rooms');
    rooms.map().on((room: any, id: string) => {
      if (room && room.name) {
        setRooms(prev => {
          const existingRoom = prev.find(r => r.id === id);
          if (existingRoom) {
            return prev.map(r => r.id === id ? { ...r, ...room } : r)
              .sort((a, b) => (b.lastActivity || b.createdAt) - (a.lastActivity || a.createdAt));
          } else {
            return [...prev, { ...room, id }]
              .sort((a, b) => (b.lastActivity || b.createdAt) - (a.lastActivity || a.createdAt));
          }
        });
      }
    });

    setLoading(false);
    return () => {
      if (gunRef.current) {
        rooms.off();
      }
    };
  }, []);

  useEffect(() => {
    const initializeKeplr = async () => {
      const keplrAuth = new KeplrAuth({
        chainId: 'osmosis-1',
        chainName: 'Osmosis',
        rpcEndpoint: 'https://rpc.osmosis.zone',
        prefix: 'osmo',
        stakeCurrency: {
          coinDenom: 'OSMO',
          coinMinimalDenom: 'uosmo',
          coinDecimals: 6
        }
      });

      try {
        await keplrAuth.connect();
        setKeplrConnected(true);
        const address = keplrAuth.getAddress();
        if (address) {
          setUserAddress(address);
          setUsername(address.slice(0, 8) + '...' + address.slice(-6));
        }
      } catch (error) {
        console.error('Failed to connect to Keplr:', error);
      }
    };

    initializeKeplr();
  }, []);

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || !gunRef.current || !userAddress) return;
    
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRoom = {
      id: roomId,
      name: newRoomName.trim(),
      createdBy: userAddress,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: [userAddress]
    };

    // Store room in Gun
    const roomNode = gunRef.current.get('snails-chat-rooms').get(roomId);
    roomNode.put(newRoom, (ack: any) => {
      if (ack.err) {
        console.error('Failed to create room:', ack.err);
      } else {
        console.log('Room created successfully:', roomId);
        setNewRoomName('');
        close();
        setSelectedRoom(roomId);
      }
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!gunRef.current || !userAddress) return;

    const roomNode = gunRef.current.get('snails-chat-rooms').get(roomId);
    roomNode.once((room: any) => {
      if (room && room.createdBy === userAddress) {
        roomNode.put(null);
        if (selectedRoom === roomId) {
          setSelectedRoom(null);
        }
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastActivity = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Box p="md">
      <Stack>
        <Paper shadow="sm" p="md" withBorder>
          <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text size="xl" fw={700}>Secure Chat Rooms</Text>
            <Button 
              onClick={open} 
              disabled={!keplrConnected}
              leftSection={<IconMessage size={20} />}
            >
              New Chat
            </Button>
          </Box>

          {!keplrConnected && (
            <Text color="red" mt="md">
              Please connect your Keplr wallet to access secure chat rooms.
            </Text>
          )}

          {loading ? (
            <Text c="dimmed" mt="md">Loading chat rooms...</Text>
          ) : (
            <Box mt="md">
              {rooms.length === 0 ? (
                <Text c="dimmed">No chat rooms available. Create one to get started!</Text>
              ) : (
                <Stack gap="xs">
                  {rooms.map(room => (
                    <Paper
                      key={room.id}
                      p="sm"
                      withBorder
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedRoom === room.id ? '#e3f2fd' : undefined
                      }}
                      onClick={() => setSelectedRoom(room.id)}
                    >
                      <Group justify="apart" align="start">
                        <Group align="start" style={{ flex: 1 }}>
                          <Avatar 
                            size="md" 
                            color="blue" 
                            radius="xl"
                          >
                            {getInitials(room.name)}
                          </Avatar>
                          <Box style={{ flex: 1 }}>
                            <Group justify="apart">
                              <Text fw={500}>{room.name}</Text>
                              <Text size="xs" c="dimmed">
                                {formatLastActivity(room.lastActivity || room.createdAt)}
                              </Text>
                            </Group>
                            {room.lastMessage && (
                              <Text size="sm" c="dimmed" truncate>
                                {room.lastMessage}
                              </Text>
                            )}
                          </Box>
                        </Group>
                        {room.createdBy === userAddress && (
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon>
                                <IconDots size={20} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconPencil size={14} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement room editing
                                }}
                              >
                                Edit Room
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRoom(room.id);
                                }}
                              >
                                Delete Room
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Paper>

        {selectedRoom && (
          <SecureChatRoom
            roomId={selectedRoom}
            username={username}
            onMessageSent={(message) => {
              // Update last message and activity for the room
              const roomNode = gunRef.current.get('snails-chat-rooms').get(selectedRoom);
              roomNode.get('lastMessage').put(message.content);
              roomNode.get('lastActivity').put(Date.now());
            }}
          />
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title="Create New Chat Room">
        <Stack>
          <TextInput
            label="Room Name"
            placeholder="Enter room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
          />
          <Button onClick={handleCreateRoom} disabled={!newRoomName.trim()}>
            Create Room
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}; 