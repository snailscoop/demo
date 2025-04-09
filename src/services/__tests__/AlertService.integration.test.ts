import { AlertService } from '../AlertService';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { MemoryManager } from '../MemoryManager';

describe('AlertService Integration Tests', () => {
  let alertService: AlertService;
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
    alertService = AlertService.getInstance();

    // Register services
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('performanceMonitor', performanceMonitor);
    serviceRegistry.register('memoryManager', memoryManager);
    serviceRegistry.register('alertService', alertService);

    // Initialize all services
    await serviceRegistry.initializeAll();
  });

  afterEach(async () => {
    // Cleanup
    await alertService.cleanup();
    serviceRegistry.clear();
  });

  it('should properly initialize with all required services', async () => {
    const registry = ServiceRegistry.getInstance();
    expect(registry.get('errorTracker')).toBeDefined();
    expect(registry.get('performanceMonitor')).toBeDefined();
    expect(registry.get('memoryManager')).toBeDefined();
  });

  it('should track alerts and update performance metrics', async () => {
    // Add multiple alerts
    alertService.addAlert('High CPU usage', 'warning', 'system', 3);
    alertService.addAlert('Memory pressure', 'error', 'system', 3);
    alertService.addAlert('Service started', 'info', 'system', 1);
    
    // Check performance metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
  });

  it('should handle memory pressure during alert operations', async () => {
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Add alerts
    for (let i = 0; i < 1000; i++) {
      alertService.addAlert(`Alert ${i}`, 'warning', 'system', 2);
    }
    
    // Check memory metrics
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should handle concurrent alert operations', async () => {
    // Perform concurrent operations
    const operations = [
      () => alertService.addAlert('Alert 1', 'warning', 'system', 2),
      () => alertService.addAlert('Alert 2', 'error', 'system', 3),
      () => alertService.addAlert('Alert 3', 'info', 'system', 1),
      () => alertService.acknowledgeAlert('1'),
      () => alertService.deleteAlert('2')
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
    await serviceRegistry.initializeAll();
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Initialization failed');
  });

  it('should maintain health status across operations', async () => {
    // Check initial health
    const initialHealth = await alertService.healthCheck();
    expect(initialHealth).toBe(true);
    
    // Add alerts
    alertService.addAlert('Test alert', 'warning', 'system', 2);
    
    // Check health after operation
    const healthAfterOperation = await alertService.healthCheck();
    expect(healthAfterOperation).toBe(true);
    
    // Simulate service failure
    jest.spyOn(alertService, 'addAlert').mockImplementation(() => {
      throw new Error('Service failed');
    });
    
    // Check health after error
    const healthAfterError = await alertService.healthCheck();
    expect(healthAfterError).toBe(false);
  });
}); 