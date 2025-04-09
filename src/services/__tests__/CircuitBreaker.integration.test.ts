import { CircuitBreaker } from '../CircuitBreaker';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { MemoryManager } from '../MemoryManager';
import { SecurityManager } from '../SecurityManager';

describe('CircuitBreaker Integration Tests', () => {
  let circuitBreaker: CircuitBreaker;
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let performanceMonitor: PerformanceMonitor;
  let memoryManager: MemoryManager;
  let securityManager: SecurityManager;

  beforeEach(async () => {
    // Clear any existing instances
    (ServiceRegistry as any).instance = null;
    (ErrorTracker as any).instance = null;
    (PerformanceMonitor as any).instance = null;
    (MemoryManager as any).instance = null;
    (SecurityManager as any).instance = null;

    // Initialize services
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    memoryManager = MemoryManager.getInstance();
    securityManager = new SecurityManager();
    circuitBreaker = new CircuitBreaker();

    // Register services
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('performanceMonitor', performanceMonitor);
    serviceRegistry.register('memoryManager', memoryManager);
    serviceRegistry.register('securityManager', securityManager);
    serviceRegistry.register('circuitBreaker', circuitBreaker);

    // Initialize all services
    await serviceRegistry.initializeAll();
  });

  afterEach(async () => {
    // Cleanup
    await circuitBreaker.cleanup();
    serviceRegistry.clear();
  });

  it('should properly initialize with all required services', async () => {
    const registry = ServiceRegistry.getInstance();
    expect(registry.get('errorTracker')).toBeDefined();
    expect(registry.get('performanceMonitor')).toBeDefined();
    expect(registry.get('memoryManager')).toBeDefined();
    expect(registry.get('securityManager')).toBeDefined();
    expect(registry.get('circuitBreaker')).toBeDefined();
  });

  it('should handle circuit registration and execution', async () => {
    // Register a circuit
    const circuitConfig = {
      maxFailures: 3,
      resetTimeout: 1000,
      fallback: async () => 'fallback' as const
    };

    circuitBreaker.registerCircuit('test-circuit', circuitConfig);

    // Execute successful operation
    const result = await circuitBreaker.execute<string>('test-circuit', async () => 'success');
    expect(result).toBe('success');
  });

  it('should handle circuit failures and fallback', async () => {
    // Register a circuit with fallback
    const circuitConfig = {
      maxFailures: 2,
      resetTimeout: 1000,
      fallback: async () => 'fallback' as const
    };

    circuitBreaker.registerCircuit('test-circuit', circuitConfig);

    // Execute failing operations
    const failingOperation = async () => { throw new Error('Operation failed'); };

    // First failure
    let result = await circuitBreaker.execute<string>('test-circuit', failingOperation);
    expect(result).toBe('fallback');

    // Second failure - should trip the circuit
    result = await circuitBreaker.execute<string>('test-circuit', failingOperation);
    expect(result).toBe('fallback');

    // Circuit is now open, should immediately return fallback
    result = await circuitBreaker.execute<string>('test-circuit', async () => 'success');
    expect(result).toBe('fallback');

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Circuit should be half-open now, successful operation should close it
    result = await circuitBreaker.execute<string>('test-circuit', async () => 'success');
    expect(result).toBe('success');
  });

  it('should handle memory pressure during circuit operations', async () => {
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Register and execute circuits under memory pressure
    const circuitConfig = {
      maxFailures: 3,
      resetTimeout: 1000
    };

    circuitBreaker.registerCircuit('test-circuit', circuitConfig);
    
    // Execute multiple operations
    const operations = Array(100).fill(null).map(() => 
      circuitBreaker.execute<string>('test-circuit', async () => 'success')
    );
    
    await Promise.all(operations);
    
    // Check memory metrics
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should handle concurrent circuit operations', async () => {
    // Register a circuit
    const circuitConfig = {
      maxFailures: 3,
      resetTimeout: 1000
    };

    circuitBreaker.registerCircuit('test-circuit', circuitConfig);
    
    // Execute concurrent operations
    const operations = Array(10).fill(null).map((_, i) => 
      circuitBreaker.execute<string>('test-circuit', async () => `success-${i}`)
    );
    
    const results = await Promise.all(operations);
    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result).toBe(`success-${i}`);
    });
  });

  it('should handle service initialization failures gracefully', async () => {
    // Mock PerformanceMonitor to fail initialization
    jest.spyOn(PerformanceMonitor.prototype, 'initialize').mockRejectedValue(new Error('Initialization failed'));
    
    // Attempt initialization
    await expect(serviceRegistry.initializeAll()).rejects.toThrow('Initialization failed');
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Initialization failed');
  });

  it('should track circuit-specific errors', async () => {
    // Register a circuit without fallback
    const circuitConfig = {
      maxFailures: 2,
      resetTimeout: 1000
    };

    circuitBreaker.registerCircuit('test-circuit', circuitConfig);

    // Execute failing operation
    const failingOperation = async () => { throw new Error('Circuit operation failed'); };
    
    try {
      await circuitBreaker.execute<string>('test-circuit', failingOperation);
    } catch (error: unknown) {
      // Error should be thrown since no fallback is provided
      expect((error as Error).message).toContain('Circuit operation failed');
    }
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Circuit operation failed');
  });

  it('should handle circuit state transitions through operation results', async () => {
    // Register a circuit
    const circuitConfig = {
      maxFailures: 2,
      resetTimeout: 1000
    };

    circuitBreaker.registerCircuit('test-circuit', circuitConfig);
    
    // Initially should execute successfully
    const result1 = await circuitBreaker.execute<string>('test-circuit', async () => 'success');
    expect(result1).toBe('success');
    
    // Fail twice to open the circuit
    const failingOperation = async () => { throw new Error('Operation failed'); };
    
    try { await circuitBreaker.execute<void>('test-circuit', failingOperation); } catch (e) {}
    try { await circuitBreaker.execute<void>('test-circuit', failingOperation); } catch (e) {}
    
    // Circuit should be open, operation should fail
    try {
      await circuitBreaker.execute<string>('test-circuit', async () => 'success');
      fail('Should have thrown error');
    } catch (error: unknown) {
      expect((error as Error).message).toContain('Circuit test-circuit is open');
    }
    
    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Circuit should be half-open, successful operation should close it
    const result2 = await circuitBreaker.execute<string>('test-circuit', async () => 'success');
    expect(result2).toBe('success');
    
    // Circuit should be closed, operation should succeed
    const result3 = await circuitBreaker.execute<string>('test-circuit', async () => 'success');
    expect(result3).toBe('success');
  });

  it('should handle multiple circuits independently', async () => {
    // Register two circuits
    const circuitConfig1 = {
      maxFailures: 2,
      resetTimeout: 1000
    };

    const circuitConfig2 = {
      maxFailures: 3,
      resetTimeout: 2000
    };

    circuitBreaker.registerCircuit('circuit-1', circuitConfig1);
    circuitBreaker.registerCircuit('circuit-2', circuitConfig2);
    
    // Fail circuit 1
    const failingOperation = async () => { throw new Error('Operation failed'); };
    
    try { await circuitBreaker.execute<void>('circuit-1', failingOperation); } catch (e) {}
    try { await circuitBreaker.execute<void>('circuit-1', failingOperation); } catch (e) {}
    
    // Circuit 1 should be open, operation should fail
    try {
      await circuitBreaker.execute<string>('circuit-1', async () => 'success');
      fail('Should have thrown error');
    } catch (error: unknown) {
      expect((error as Error).message).toContain('Circuit circuit-1 is open');
    }
    
    // Circuit 2 should still execute successfully
    const result = await circuitBreaker.execute<string>('circuit-2', async () => 'success');
    expect(result).toBe('success');
  });
}); 