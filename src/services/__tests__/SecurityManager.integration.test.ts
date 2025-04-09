import { SecurityManager } from '../SecurityManager';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { MemoryManager } from '../MemoryManager';

describe('SecurityManager Integration Tests', () => {
  let securityManager: SecurityManager;
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let performanceMonitor: PerformanceMonitor;
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    // Clear any existing instances
    (ServiceRegistry as any).instance = null;
    (ErrorTracker as any).instance = null;
    (PerformanceMonitor as any).instance = null;
    (MemoryManager as any).instance = null;

    // Initialize services
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    memoryManager = MemoryManager.getInstance();
    securityManager = new SecurityManager();

    // Register services
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('performanceMonitor', performanceMonitor);
    serviceRegistry.register('memoryManager', memoryManager);
    serviceRegistry.register('securityManager', securityManager);

    // Initialize all services
    await serviceRegistry.initializeAll();
  });

  afterEach(async () => {
    // Cleanup
    await securityManager.cleanup();
    serviceRegistry.clear();
  });

  it('should properly initialize with all required services', async () => {
    const registry = ServiceRegistry.getInstance();
    expect(registry.get('errorTracker')).toBeDefined();
    expect(registry.get('performanceMonitor')).toBeDefined();
    expect(registry.get('memoryManager')).toBeDefined();
  });

  it('should enforce rate limits and track performance', async () => {
    // Perform multiple requests
    const startTime = performance.now();
    
    for (let i = 0; i < 100; i++) {
      securityManager.checkRateLimit('nostr');
    }
    
    // Check performance metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
    
    // Verify rate limit is enforced
    expect(securityManager.checkRateLimit('nostr')).toBe(false);
  });

  it('should handle memory pressure during security operations', async () => {
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Perform security operations
    for (let i = 0; i < 1000; i++) {
      securityManager.sanitizeInput('<script>alert("test")</script>');
    }
    
    // Check memory metrics
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should handle concurrent security operations', async () => {
    // Perform concurrent operations
    const operations = [
      () => securityManager.checkRateLimit('nostr'),
      () => securityManager.sanitizeInput('<script>test</script>'),
      () => securityManager.verifySSL('https://example.com'),
      () => securityManager.checkRateLimit('gun')
    ];
    
    // Execute operations concurrently
    await Promise.all(operations.map(op => op()));
    
    // Verify no errors occurred
    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(0);
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

  it('should maintain health status across operations', async () => {
    // Check initial health
    expect(await securityManager.healthCheck()).toBe(true);
    
    // Perform security operations
    securityManager.sanitizeInput('<script>test</script>');
    securityManager.verifySSL('https://example.com');
    
    // Check health after operations
    expect(await securityManager.healthCheck()).toBe(true);
    
    // Simulate memory pressure
    const largeArray = new Array(1000000).fill('test');
    
    // Check health under pressure
    expect(await securityManager.healthCheck()).toBe(true);
  });

  it('should track security metrics', async () => {
    // Perform security operations
    for (let i = 0; i < 100; i++) {
      securityManager.checkRateLimit('nostr');
      securityManager.sanitizeInput('<script>test</script>');
      securityManager.verifySSL('https://example.com');
    }
    
    // Check metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
    
    // Verify error tracking
    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(0);
  });

  it('should handle input sanitization with memory constraints', async () => {
    // Create a large malicious input
    const largeInput = '<script>'.repeat(10000) + 'alert("xss")' + '</script>'.repeat(10000);
    
    // Sanitize input
    const sanitized = securityManager.sanitizeInput(largeInput);
    
    // Verify sanitization
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
    
    // Check memory usage
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
  });
}); 