import { SimplePool } from 'nostr-tools';
import WebSocket from 'ws';

// Define relays to test
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostr.wine',
  'wss://relay.snort.social',
  'wss://relay.primal.net'
];

const TIMEOUT = 30000; // 30 seconds
const KINDS = [30023, 1]; // Test both video and text events

async function testWebSocketConnection(url) {
  return new Promise((resolve) => {
    console.log(`Testing direct WebSocket connection to ${url}...`);
    const ws = new WebSocket(url);
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ status: 'timeout', error: 'WebSocket connection timeout' });
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`WebSocket connection successful to ${url}`);
      
      // Send a REQ message to test the Nostr protocol
      const req = JSON.stringify([
        "REQ",
        "test-subscription",
        { kinds: KINDS, limit: 1 }
      ]);
      console.log(`Sending REQ to ${url}:`, req);
      ws.send(req);

      // Wait for response
      const messageTimeout = setTimeout(() => {
        ws.close();
        resolve({ status: 'connected', note: 'No response to REQ message' });
      }, 5000);

      ws.on('message', (data) => {
        clearTimeout(messageTimeout);
        console.log(`Received message from ${url}:`, data.toString());
        ws.close();
        resolve({ status: 'connected', hasResponse: true });
      });
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`WebSocket error for ${url}:`, error.message);
      resolve({ status: 'error', error: error.message });
    });
  });
}

async function testRelayConnections() {
  const pool = new SimplePool();
  const results = new Map();

  console.log('Testing relay connections...\n');
  
  // First test direct WebSocket connections
  console.log('Phase 1: Testing WebSocket connections');
  console.log('=====================================');
  for (const relay of RELAYS) {
    const wsResult = await testWebSocketConnection(relay);
    console.log(`${relay}: ${wsResult.status}${wsResult.error ? ' - ' + wsResult.error : ''}${wsResult.note ? ' - ' + wsResult.note : ''}\n`);
  }

  console.log('\nPhase 2: Testing Nostr protocol');
  console.log('==============================');
  
  for (const relay of RELAYS) {
    try {
      console.log(`\nTesting ${relay}...`);
      const startTime = Date.now();
      
      console.log('Attempting to subscribe...');
      const sub = pool.subscribe(
        [relay],
        { kinds: KINDS, limit: 1 },
        {
          onevent: (event) => {
            console.log(`Received event from ${relay}:`, event);
            const endTime = Date.now();
            results.set(relay, { 
              status: 'connected', 
              time: endTime - startTime,
              event: {
                kind: event.kind,
                created_at: event.created_at,
                id: event.id
              }
            });
            try {
              sub.close();
            } catch (error) {
              console.log(`Error closing subscription for ${relay}:`, error);
            }
          },
          oneose: () => {
            console.log(`End of stored events from ${relay}`);
            if (!results.has(relay)) {
              results.set(relay, { 
                status: 'timeout', 
                error: 'No events received within timeout period' 
              });
            }
          },
          onerror: (error) => {
            console.log(`Error from ${relay}:`, error);
          }
        }
      );

      // Set timeout
      setTimeout(() => {
        if (!results.has(relay)) {
          console.log(`Timeout for ${relay}`);
          results.set(relay, { 
            status: 'timeout', 
            error: 'Connection timeout' 
          });
          try {
            sub.close();
          } catch (error) {
            console.log(`Error closing subscription for ${relay}:`, error);
          }
        }
      }, TIMEOUT);

    } catch (error) {
      console.log(`Caught error for ${relay}:`, error);
      results.set(relay, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Wait for all tests to complete
  await new Promise(resolve => setTimeout(resolve, TIMEOUT + 5000));

  // Print final results
  console.log('\nFinal Results:');
  console.log('=============');
  for (const [relay, result] of results) {
    console.log(`\n${relay}:`);
    console.log(`  Status: ${result.status}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.time) console.log(`  Response Time: ${result.time}ms`);
    if (result.event) console.log(`  Event: ${JSON.stringify(result.event, null, 2)}`);
  }

  try {
    pool.close();
  } catch (error) {
    console.log('Error closing pool:', error);
  }
}

testRelayConnections().catch(console.error); 