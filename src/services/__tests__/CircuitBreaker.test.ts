import { CircuitBreaker } from '../CircuitBreaker';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let registry: ServiceRegistry;
  let errorTracker: ErrorTracker;

  beforeEach(() => {
    registry = ServiceRegistry.getInstance();
    errorTracker = new ErrorTracker();
    circuitBreaker = new CircuitBreaker();
    
    registry.register('errorTracker', errorTracker);
    registry.register('circuitBreaker', circuitBreaker);
  });

  afterEach(() => {
    registry.clear();
  });

  it('should register circuits', () => {
    circuitBreaker.registerCircuit('test', {
      maxFailures: 3,
      resetTimeout: 1000
    });
    
    expect(circuitBreaker).toBeDefined();
  });

  it('should execute successful operations', async () => {
    circuitBreaker.registerCircuit('test', {
      maxFailures: 3,
      resetTimeout: 1000
    });

    const result = await circuitBreaker.execute('test', async () => 'success');
    expect(result).toBe('success');
  });

  it('should handle failed operations', async () => {
    circuitBreaker.registerCircuit('test', {
      maxFailures: 3,
      resetTimeout: 1000
    });

    await expect(
      circuitBreaker.execute('test', async () => {
        throw new Error('Operation failed');
      })
    ).rejects.toThrow('Operation failed');
  });

  it('should use fallback when circuit is open', async () => {
    circuitBreaker.registerCircuit('test', {
      maxFailures: 1,
      resetTimeout: 1000,
      fallback: async () => 'fallback'
    });

    // First failure
    await expect(
      circuitBreaker.execute('test', async () => {
        throw new Error('Operation failed');
      })
    ).rejects.toThrow('Operation failed');

    // Second attempt should use fallback
    const result = await circuitBreaker.execute('test', async () => {
      throw new Error('Operation failed');
    });
    expect(result).toBe('fallback');
  });

  it('should reset circuit after timeout', async () => {
    circuitBreaker.registerCircuit('test', {
      maxFailures: 1,
      resetTimeout: 100
    });

    // First failure
    await expect(
      circuitBreaker.execute('test', async () => {
        throw new Error('Operation failed');
      })
    ).rejects.toThrow('Operation failed');

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should try operation again
    await expect(
      circuitBreaker.execute('test', async () => {
        throw new Error('Operation failed');
      })
    ).rejects.toThrow('Operation failed');
  });

  it('should track errors in ErrorTracker', async () => {
    circuitBreaker.registerCircuit('test', {
      maxFailures: 3,
      resetTimeout: 1000
    });

    await expect(
      circuitBreaker.execute('test', async () => {
        throw new Error('Operation failed');
      })
    ).rejects.toThrow('Operation failed');

    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].category).toBe('circuit-breaker');
  });
}); 