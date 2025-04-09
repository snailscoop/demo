import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { SecurityManager } from '../SecurityManager';
import { MemoryManager } from '../MemoryManager';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { KeplrService } from '../KeplrService';

describe('ServiceRegistry Integration Tests', () => {
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let securityManager: SecurityManager;
  let memoryManager: MemoryManager;
  let performanceMonitor: PerformanceMonitor;
  let keplrService: KeplrService;

  beforeEach(() => {
    // Clear any existing instances
    ServiceRegistry['instance'] = null;
    ErrorTracker['instance'] = null;
    SecurityManager['instance'] = null;
    MemoryManager['instance'] = null;
    PerformanceMonitor['instance'] = null;
    KeplrService['instance'] = null;

    // Initialize services
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    securityManager = SecurityManager.getInstance();
    memoryManager = MemoryManager.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    keplrService = KeplrService.getInstance();

    // Mock console.error to prevent noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup
    serviceRegistry.cleanup();
    jest.clearAllMocks();
  });

  it('should initialize all services in the correct order', async () => {
    // Mock service initialization
    const initOrder: string[] = [];
    jest.spyOn(ErrorTracker.prototype, 'initialize').mockImplementation(async () => {
      initOrder.push('ErrorTracker');
    });
    jest.spyOn(SecurityManager.prototype, 'initialize').mockImplementation(async () => {
      initOrder.push('SecurityManager');
    });
    jest.spyOn(MemoryManager.prototype, 'initialize').mockImplementation(async () => {
      initOrder.push('MemoryManager');
    });
    jest.spyOn(PerformanceMonitor.prototype, 'initialize').mockImplementation(async () => {
      initOrder.push('PerformanceMonitor');
    });
    jest.spyOn(KeplrService.prototype, 'initialize').mockImplementation(async () => {
      initOrder.push('KeplrService');
    });

    // Initialize services
    await serviceRegistry.initializeAll();

    // Verify initialization order
    expect(initOrder).toEqual([
      'ErrorTracker',
      'SecurityManager',
      'MemoryManager',
      'PerformanceMonitor',
      'KeplrService'
    ]);
  });

  it('should handle service initialization failures gracefully', async () => {
    // Mock KeplrService to fail initialization
    jest.spyOn(KeplrService.prototype, 'initialize').mockRejectedValue(new Error('Initialization failed'));

    // Initialize services
    await serviceRegistry.initializeAll();

    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Initialization failed');
  });

  it('should maintain service health status', async () => {
    // Initialize services
    await serviceRegistry.initializeAll();

    // Check health status
    const health = await serviceRegistry.checkHealth();
    expect(health.status).toBe('healthy');
    expect(health.details).toHaveProperty('ErrorTracker');
    expect(health.details).toHaveProperty('SecurityManager');
    expect(health.details).toHaveProperty('MemoryManager');
    expect(health.details).toHaveProperty('PerformanceMonitor');
    expect(health.details).toHaveProperty('KeplrService');
  });

  it('should handle service cleanup in reverse order', async () => {
    // Mock service cleanup
    const cleanupOrder: string[] = [];
    jest.spyOn(ErrorTracker.prototype, 'cleanup').mockImplementation(async () => {
      cleanupOrder.push('ErrorTracker');
    });
    jest.spyOn(SecurityManager.prototype, 'cleanup').mockImplementation(async () => {
      cleanupOrder.push('SecurityManager');
    });
    jest.spyOn(MemoryManager.prototype, 'cleanup').mockImplementation(async () => {
      cleanupOrder.push('MemoryManager');
    });
    jest.spyOn(PerformanceMonitor.prototype, 'cleanup').mockImplementation(async () => {
      cleanupOrder.push('PerformanceMonitor');
    });
    jest.spyOn(KeplrService.prototype, 'cleanup').mockImplementation(async () => {
      cleanupOrder.push('KeplrService');
    });

    // Initialize and cleanup services
    await serviceRegistry.initializeAll();
    await serviceRegistry.cleanup();

    // Verify cleanup order
    expect(cleanupOrder).toEqual([
      'KeplrService',
      'PerformanceMonitor',
      'MemoryManager',
      'SecurityManager',
      'ErrorTracker'
    ]);
  });

  it('should handle service dependencies correctly', async () => {
    // Initialize services
    await serviceRegistry.initializeAll();

    // Verify service dependencies
    expect(memoryManager['errorTracker']).toBe(errorTracker);
    expect(memoryManager['performanceMonitor']).toBe(performanceMonitor);
    expect(memoryManager['keplrService']).toBe(keplrService);
    expect(performanceMonitor['errorTracker']).toBe(errorTracker);
    expect(performanceMonitor['memoryManager']).toBe(memoryManager);
  });

  it('should handle concurrent service operations', async () => {
    // Initialize services
    await serviceRegistry.initializeAll();

    // Perform concurrent operations
    const operations = [
      () => memoryManager.cleanup(),
      () => performanceMonitor.checkHealth(),
      () => securityManager.checkPermissions('test-user', ['read']),
      () => keplrService.cleanupOldSessions()
    ];

    // Execute operations concurrently
    await Promise.all(operations.map(op => op()));

    // Verify no errors occurred
    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(0);
  });
}); 