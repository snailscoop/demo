import { MemoryManager } from '../MemoryManager';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { KeplrService } from '../KeplrService';

describe('MemoryManager Integration Tests', () => {
  let memoryManager: MemoryManager;
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let performanceMonitor: PerformanceMonitor;
  let keplrService: KeplrService;

  beforeEach(() => {
    // Clear any existing instances
    ServiceRegistry['instance'] = null;
    ErrorTracker['instance'] = null;
    PerformanceMonitor['instance'] = null;
    KeplrService['instance'] = null;

    // Initialize services
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    keplrService = KeplrService.getInstance();
    memoryManager = MemoryManager.getInstance();

    // Mock console.error to prevent noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup
    memoryManager.cleanup();
    jest.clearAllMocks();
  });

  it('should properly initialize with all required services', async () => {
    await serviceRegistry.initialize();
    expect(memoryManager.isInitialized).toBe(true);
    expect(memoryManager['errorTracker']).toBeDefined();
    expect(memoryManager['performanceMonitor']).toBeDefined();
    expect(memoryManager['keplrService']).toBeDefined();
  });

  it('should track memory usage and trigger cleanup when thresholds are exceeded', async () => {
    await serviceRegistry.initialize();
    
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Force garbage collection
    global.gc?.();
    
    // Check if cleanup was triggered
    expect(memoryManager['lastCleanup']).toBeDefined();
    expect(errorTracker.getErrors().length).toBeGreaterThan(0);
  });

  it('should handle session cleanup through KeplrService', async () => {
    await serviceRegistry.initialize();
    
    // Create a test session
    const session = {
      address: 'test-address',
      publicKey: 'test-public-key',
      privateKey: 'test-private-key',
      createdAt: Date.now(),
      lastActive: Date.now(),
      permissions: ['read', 'write']
    };
    
    // Add session
    keplrService['sessions'].set(session.address, session);
    
    // Trigger cleanup
    await memoryManager.cleanup();
    
    // Verify session was cleaned up
    expect(keplrService['sessions'].has(session.address)).toBe(false);
  });

  it('should handle errors during cleanup gracefully', async () => {
    await serviceRegistry.initialize();
    
    // Mock KeplrService to throw an error during cleanup
    jest.spyOn(keplrService, 'cleanup').mockRejectedValue(new Error('Cleanup failed'));
    
    // Trigger cleanup
    await memoryManager.cleanup();
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Cleanup failed');
  });

  it('should maintain performance metrics during operation', async () => {
    await serviceRegistry.initialize();
    
    // Perform some operations
    for (let i = 0; i < 1000; i++) {
      const temp = new Array(1000).fill('test');
    }
    
    // Force garbage collection
    global.gc?.();
    
    // Check performance metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.memory.used).toBeGreaterThan(0);
    expect(metrics.memory.total).toBeGreaterThan(0);
  });

  it('should handle service initialization failures gracefully', async () => {
    // Mock KeplrService to fail initialization
    jest.spyOn(KeplrService.prototype, 'initialize').mockRejectedValue(new Error('Initialization failed'));
    
    // Attempt initialization
    await serviceRegistry.initialize();
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Initialization failed');
  });
}); 