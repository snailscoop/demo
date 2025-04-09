import { SimplePool } from 'nostr-tools';
import { RELAYS } from '../components/VideoList';

async function testRelayConnections() {
  const pool = new SimplePool();
  const results = new Map<string, { status: string; error?: string; time?: number }>();

  console.log('Testing relay connections...');
  
  for (const relay of RELAYS) {
    try {
      console.log(`Testing ${relay}...`);
      const startTime = Date.now();
      
      // Test connection
      const sub = pool.subscribe(
        [relay],
        { kinds: [30023], limit: 1 },
        {
          onevent: () => {
            const endTime = Date.now();
            results.set(relay, { 
              status: 'connected', 
              time: endTime - startTime 
            });
            sub.close();
          },
          oneose: () => {
            if (!results.has(relay)) {
              results.set(relay, { 
                status: 'timeout', 
                error: 'No events received within timeout period' 
              });
            }
          }
        }
      );

      // Set timeout
      setTimeout(() => {
        if (!results.has(relay)) {
          results.set(relay, { 
            status: 'timeout', 
            error: 'Connection timeout' 
          });
          sub.close();
        }
      }, 10000);

    } catch (error) {
      results.set(relay, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Wait for all tests to complete
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Print results
  console.log('\nRelay Test Results:');
  console.log('------------------');
  for (const [relay, result] of results) {
    console.log(`${relay}:`);
    console.log(`  Status: ${result.status}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.time) console.log(`  Response Time: ${result.time}ms`);
    console.log('------------------');
  }

  pool.close();
}

testRelayConnections().catch(console.error); 