const Gun = require('gun');

// Create two GUN instances to simulate different users
const gun1 = Gun('http://localhost:8765/gun');
const gun2 = Gun('http://localhost:8765/gun');

console.log('Starting chat tests...');

// Test scenario 1: Create and join a chat room
console.log('\nTest 1: Creating and joining a chat room');
const rooms = gun1.get('snails-chat-rooms');
const roomId = `test-room-${Date.now()}`;

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

// Test scenario 2: Send and receive messages
console.log('\nTest 2: Sending and receiving messages');

// Subscribe to messages with the second gun instance
rooms.get(roomId).get('messages').map().on((message) => {
  if (message && message.text) {
    console.log('Received message:', message);
  }
});

// Send messages from both instances
setTimeout(() => {
  const messageId1 = `msg-${Date.now()}`;
  rooms.get(roomId).get('messages').get(messageId1).put({
    id: messageId1,
    text: 'Hello from user 1!',
    sender: 'user1',
    timestamp: Date.now()
  });
  console.log('User 1 sent message');
}, 1000);

setTimeout(() => {
  const messageId2 = `msg-${Date.now()}`;
  rooms.get(roomId).get('messages').get(messageId2).put({
    id: messageId2,
    text: 'Hello from user 2!',
    sender: 'user2',
    timestamp: Date.now()
  });
  console.log('User 2 sent message');
}, 2000);

// Test scenario 3: User list updates
console.log('\nTest 3: Testing user list updates');

// Subscribe to user list changes
rooms.get(roomId).get('users').on((users) => {
  console.log('Updated user list:', users);
});

// Add users to the room
setTimeout(() => {
  rooms.get(roomId).once((room) => {
    const currentUsers = room.users || [];
    if (!currentUsers.includes('user2')) {
      currentUsers.push('user2');
      rooms.get(roomId).get('users').put(currentUsers);
      console.log('User 2 joined the room');
    }
  });
}, 3000);

// Cleanup and exit
setTimeout(() => {
  console.log('\nTests completed');
  process.exit(0);
}, 5000); 