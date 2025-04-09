import express from 'express';
import Gun from 'gun';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const port = 8765;

// Enable CORS
app.use(cors());

// Serve Gun
app.use(Gun.serve);

// Create HTTP server
const server = createServer(app);

// Create Gun instance
const gun = Gun({
  web: server,
  file: 'data.json',
  radisk: true, // Enable persistence
  localStorage: false, // Disable browser storage
  peers: [
    'https://gun-us.herokuapp.com/gun', // Fallback peer
    'https://gun-manhattan.herokuapp.com/gun' // Additional fallback
  ]
});

// Start server
server.listen(port, () => {
  console.log(`Gun server running on ws://localhost:${port}/gun`);
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down Gun server...');
  server.close(() => {
    console.log('Gun server closed');
    process.exit(0);
  });
}); 