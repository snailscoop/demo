import { PerformanceMonitor } from '../PerformanceMonitor';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { MemoryManager } from '../MemoryManager';

describe('PerformanceMonitor Integration Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let memoryManager: MemoryManager;

  beforeEach(() => {
    // Clear any existing instances
    ServiceRegistry['instance'] = null;
    ErrorTracker['instance'] = null;
    MemoryManager['instance'] = null;
    PerformanceMonitor['instance'] = null;

    // Initialize services
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    memoryManager = MemoryManager.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();

    // Mock console.error to prevent noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup
    performanceMonitor.cleanup();
    jest.clearAllMocks();
  });

  it('should properly initialize with all required services', async () => {
    await serviceRegistry.initializeAll();
    expect(performanceMonitor.isInitialized).toBe(true);
    expect(performanceMonitor['errorTracker']).toBeDefined();
    expect(performanceMonitor['memoryManager']).toBeDefined();
  });

  it('should track system metrics accurately', async () => {
    await serviceRegistry.initializeAll();
    
    // Perform some CPU-intensive operations
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }
    
    // Check CPU metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
    expect(metrics.disk.used).toBeGreaterThan(0);
    expect(metrics.network.latency).toBeGreaterThan(0);
  });

  it('should track relay metrics correctly', async () => {
    await serviceRegistry.initializeAll();
    
    // Simulate relay operations
    performanceMonitor.updateRelayMetrics('test-relay', {
      latency: 100,
      eventProcessingTime: 50,
      subscriptionResponseTime: 75,
      eventsProcessed: 1000
    });
    
    // Check relay metrics
    const relayMetrics = performanceMonitor.getRelayMetrics('test-relay');
    expect(relayMetrics).toBeDefined();
    expect(relayMetrics?.latency).toBe(100);
    expect(relayMetrics?.eventProcessingTime).toBe(50);
    expect(relayMetrics?.subscriptionResponseTime).toBe(75);
    expect(relayMetrics?.eventsProcessed).toBe(1000);
  });

  it('should trigger alerts when thresholds are exceeded', async () => {
    await serviceRegistry.initializeAll();
    
    // Simulate high CPU usage
    performanceMonitor['cpuUsage'] = 95;
    
    // Check health
    const health = await performanceMonitor.checkHealth();
    expect(health.status).toBe('degraded');
    expect(health.details).toContain('CPU usage');
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('CPU usage');
  });

  it('should handle memory pressure situations', async () => {
    await serviceRegistry.initializeAll();
    
    // Simulate high memory usage
    performanceMonitor['memoryUsage'] = 90;
    
    // Check if memory manager was notified
    const metrics = memoryManager.getMetrics();
    expect(metrics.memoryPressure).toBe(true);
  });

  it('should maintain historical metrics', async () => {
    await serviceRegistry.initializeAll();
    
    // Record multiple metric points
    for (let i = 0; i < 10; i++) {
      performanceMonitor.updateRelayMetrics('test-relay', {
        latency: i * 10,
        eventProcessingTime: i * 5,
        subscriptionResponseTime: i * 7,
        eventsProcessed: i * 100
      });
    }
    
    // Check historical metrics
    const history = performanceMonitor.getRelayMetricsHistory('test-relay');
    expect(history.length).toBe(10);
    expect(history[9].latency).toBe(90);
  });

  it('should handle service initialization failures gracefully', async () => {
    // Mock MemoryManager to fail initialization
    jest.spyOn(MemoryManager.prototype, 'initialize').mockRejectedValue(new Error('Initialization failed'));
    
    // Attempt initialization
    await serviceRegistry.initializeAll();
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Initialization failed');
  });
}); 