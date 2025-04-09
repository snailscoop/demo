import pkg from 'panic-client';
const { Client } = pkg;
import Gun from 'gun';

const client = new Client();

// Connect to panic server
client.connect('ws://localhost:8080');

// Test scenario 1: Create and join a chat room
client.run(function() {
  const gun = Gun('http://localhost:8765/gun'); // Connect to your GUN server

  console.log('Test 1: Creating and joining a chat room');
  
  const rooms = gun.get('snails-chat-rooms');
  const roomId = `test-room-${Date.now()}`;
  
  // Create a room
  rooms.get(roomId).put({
    id: roomId,
    name: 'Test Room',
    messages: [],
    users: ['user1'],
    createdAt: Date.now()
  }, (ack) => {
    if (ack.err) {
      console.error('Failed to create room:', ack.err);
    } else {
      console.log('Room created successfully');
    }
  });

  // Subscribe to room updates
  rooms.get(roomId).on((room) => {
    console.log('Room update:', room);
  });
});

// Test scenario 2: Multiple users sending messages
client.run(function() {
  const gun = Gun('http://localhost:8765/gun');

  console.log('Test 2: Multiple users sending messages');

  const rooms = gun.get('snails-chat-rooms');
  const roomId = `test-room-${Date.now()}`;
  
  // User 1 sends a message
  setTimeout(() => {
    const messageId = `msg-${Date.now()}`;
    rooms.get(roomId).get('messages').get(messageId).put({
      id: messageId,
      text: 'Hello from user 1!',
      sender: 'user1',
      timestamp: Date.now()
    });
    console.log('User 1 sent message');
  }, 1000);

  // User 2 sends a message
  setTimeout(() => {
    const messageId = `msg-${Date.now()}`;
    rooms.get(roomId).get('messages').get(messageId).put({
      id: messageId,
      text: 'Hello from user 2!',
      sender: 'user2',
      timestamp: Date.now()
    });
    console.log('User 2 sent message');
  }, 2000);

  // Subscribe to messages
  rooms.get(roomId).get('messages').map().on((message) => {
    if (message && message.text) {
      console.log('New message:', message);
    }
  });
});

// Test scenario 3: Test concurrent user list updates
client.run(function() {
  const gun = Gun('http://localhost:8765/gun');

  console.log('Test 3: Testing concurrent user list updates');

  const rooms = gun.get('snails-chat-rooms');
  const roomId = `test-room-${Date.now()}`;

  // Simulate multiple users joining/leaving quickly
  const users = ['user1', 'user2', 'user3'];
  users.forEach((userId, index) => {
    setTimeout(() => {
      rooms.get(roomId).once((room) => {
        const currentUsers = room.users || [];
        if (!currentUsers.includes(userId)) {
          currentUsers.push(userId);
          rooms.get(roomId).get('users').put(currentUsers);
          console.log(`${userId} joined the room`);
        }
      });
    }, index * 500);
  });

  // Monitor user list changes
  rooms.get(roomId).get('users').on((users) => {
    console.log('Updated user list:', users);
  });
});

// Cleanup after tests
setTimeout(() => {
  console.log('Tests completed');
  process.exit(0);
}, 10000); 