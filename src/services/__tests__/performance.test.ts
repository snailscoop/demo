import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { SecurityManager } from '../SecurityManager';
import { MemoryManager } from '../MemoryManager';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { KeplrService } from '../KeplrService';

describe('Service Performance Tests', () => {
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let securityManager: SecurityManager;
  let memoryManager: MemoryManager;
  let performanceMonitor: PerformanceMonitor;
  let keplrService: KeplrService;

  beforeEach(async () => {
    // Initialize services
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    securityManager = SecurityManager.getInstance();
    memoryManager = MemoryManager.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    keplrService = KeplrService.getInstance();

    // Initialize all services
    await serviceRegistry.initializeAll();
  });

  afterEach(() => {
    // Cleanup
    serviceRegistry.cleanup();
  });

  it('should handle high error tracking load', async () => {
    const startTime = performance.now();
    const errorCount = 1000;

    // Generate errors
    for (let i = 0; i < errorCount; i++) {
      errorTracker.trackError({
        message: `Test error ${i}`,
        category: 'test',
        severity: 'warning'
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify performance
    expect(duration).toBeLessThan(1000); // Should process 1000 errors in under 1 second
    expect(errorTracker.getErrors().length).toBe(errorCount);
  });

  it('should handle concurrent security checks', async () => {
    const startTime = performance.now();
    const checkCount = 100;
    const concurrentChecks = 10;

    // Perform concurrent security checks
    const checks = Array(concurrentChecks).fill(null).map(async () => {
      for (let i = 0; i < checkCount; i++) {
        await securityManager.checkPermissions(`user-${i}`, ['read', 'write']);
      }
    });

    await Promise.all(checks);
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify performance
    expect(duration).toBeLessThan(2000); // Should process 1000 checks in under 2 seconds
  });

  it('should handle memory-intensive operations', async () => {
    const startTime = performance.now();
    const operationCount = 100;
    const dataSize = 1000000; // 1MB per operation

    // Perform memory-intensive operations
    for (let i = 0; i < operationCount; i++) {
      const data = new Array(dataSize).fill('test');
      await memoryManager.trackResource(`resource-${i}`, data);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify performance
    expect(duration).toBeLessThan(5000); // Should process operations in under 5 seconds
    expect(memoryManager.getMetrics().memoryPressure).toBe(false);
  });

  it('should handle high-frequency metric updates', async () => {
    const startTime = performance.now();
    const updateCount = 10000;

    // Update metrics frequently
    for (let i = 0; i < updateCount; i++) {
      performanceMonitor.updateRelayMetrics('test-relay', {
        latency: Math.random() * 100,
        eventProcessingTime: Math.random() * 50,
        subscriptionResponseTime: Math.random() * 75,
        eventsProcessed: i
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify performance
    expect(duration).toBeLessThan(1000); // Should process 10000 updates in under 1 second
    const metrics = performanceMonitor.getRelayMetrics('test-relay');
    expect(metrics).toBeDefined();
  });

  it('should handle concurrent session management', async () => {
    const startTime = performance.now();
    const sessionCount = 1000;
    const concurrentOperations = 10;

    // Create sessions concurrently
    const operations = Array(concurrentOperations).fill(null).map(async (_, index) => {
      for (let i = 0; i < sessionCount / concurrentOperations; i++) {
        const sessionId = `session-${index}-${i}`;
        await keplrService.createSession({
          address: sessionId,
          publicKey: `pubkey-${sessionId}`,
          privateKey: `privkey-${sessionId}`,
          createdAt: Date.now(),
          lastActive: Date.now(),
          permissions: ['read', 'write']
        });
      }
    });

    await Promise.all(operations);
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify performance
    expect(duration).toBeLessThan(2000); // Should process 1000 sessions in under 2 seconds
    expect(keplrService.getSessionCount()).toBe(sessionCount);
  });

  it('should maintain performance under sustained load', async () => {
    const testDuration = 10000; // 10 seconds
    const startTime = performance.now();
    let operationCount = 0;

    // Perform operations for the test duration
    while (performance.now() - startTime < testDuration) {
      // Mix of different operations
      await Promise.all([
        errorTracker.trackError({
          message: `Sustained load error ${operationCount}`,
          category: 'test',
          severity: 'warning'
        }),
        securityManager.checkPermissions(`user-${operationCount}`, ['read']),
        memoryManager.trackResource(`resource-${operationCount}`, new Array(1000).fill('test')),
        performanceMonitor.updateRelayMetrics('test-relay', {
          latency: Math.random() * 100,
          eventProcessingTime: Math.random() * 50,
          subscriptionResponseTime: Math.random() * 75,
          eventsProcessed: operationCount
        })
      ]);

      operationCount++;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify performance
    expect(duration).toBeLessThan(testDuration * 1.1); // Should complete within 10% of target duration
    expect(operationCount).toBeGreaterThan(0);
    
    // Check system health
    const health = await serviceRegistry.checkHealth();
    expect(health.status).toBe('healthy');
  });
}); 