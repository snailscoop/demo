import express from 'express';
import Gun from 'gun';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8765;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static('public'));

// Create HTTP server
const server = createServer(app);

// Create Gun server
const gun = Gun({
  file: 'data.json', // Save data to a file
  web: server,
  peers: [], // Don't connect to other peers by default
  multicast: false, // Disable multicast
});

// Export Gun instance
export const gunDB = gun;

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
server.listen(port, () => {
  console.log(`Gun server running at http://localhost:${port}/gun`);
  console.log('Press Ctrl+C to stop the server');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down Gun server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 