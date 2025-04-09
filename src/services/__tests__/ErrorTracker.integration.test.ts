import { ErrorTracker } from '../ErrorTracker';
import { ServiceRegistry } from '../ServiceRegistry';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { MemoryManager } from '../MemoryManager';
import { AlertService } from '../AlertService';
import { ErrorCategory, ErrorSeverity, TrackedError } from '../../types/error';

describe('ErrorTracker Integration Tests', () => {
  let errorTracker: ErrorTracker;
  let serviceRegistry: ServiceRegistry;
  let performanceMonitor: PerformanceMonitor;
  let memoryManager: MemoryManager;
  let alertService: AlertService;

  beforeEach(async () => {
    // Clear any existing instances
    (ServiceRegistry as any).instance = null;
    (ErrorTracker as any).instance = null;
    (PerformanceMonitor as any).instance = null;
    (MemoryManager as any).instance = null;
    (AlertService as any).instance = null;

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
    errorTracker.cleanup();
    serviceRegistry.clear();
  });

  it('should properly initialize with all required services', async () => {
    const registry = ServiceRegistry.getInstance();
    expect(registry.get('performanceMonitor')).toBeDefined();
    expect(registry.get('memoryManager')).toBeDefined();
    expect(registry.get('alertService')).toBeDefined();
  });

  it('should track errors and update performance metrics', async () => {
    // Track multiple errors
    for (let i = 0; i < 100; i++) {
      const error = new Error(`Test error ${i}`);
      const trackedError: TrackedError = {
        message: error.message,
        category: 'performance' as ErrorCategory,
        severity: 'high' as ErrorSeverity,
        timestamp: Date.now(),
        resolved: false,
        originalError: error
      };
      errorTracker.trackError(trackedError);
    }
    
    // Check performance metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
    
    // Verify errors were tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should handle memory pressure during error tracking', async () => {
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Track errors
    for (let i = 0; i < 1000; i++) {
      const error = new Error(`Test error ${i}`);
      const trackedError: TrackedError = {
        message: error.message,
        category: 'performance' as ErrorCategory,
        severity: 'high' as ErrorSeverity,
        timestamp: Date.now(),
        resolved: false,
        originalError: error
      };
      errorTracker.trackError(trackedError);
    }
    
    // Check memory metrics
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should handle concurrent error tracking', async () => {
    // Perform concurrent operations
    const operations = Array(10).fill(null).map((_, i) => {
      const error = new Error(`Concurrent error ${i}`);
      const trackedError: TrackedError = {
        message: error.message,
        category: 'performance' as ErrorCategory,
        severity: 'high' as ErrorSeverity,
        timestamp: Date.now(),
        resolved: false,
        originalError: error
      };
      return () => errorTracker.trackError(trackedError);
    });
    
    // Execute operations concurrently
    await Promise.all(operations.map(op => op()));
    
    // Verify errors were tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
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

  it('should track errors with different categories and severities', async () => {
    // Track errors with different categories
    const categories: ErrorCategory[] = ['performance', 'security', 'system'];
    const severities: ErrorSeverity[] = ['low', 'medium', 'high'];
    
    categories.forEach(category => {
      severities.forEach(severity => {
        const error = new Error(`Test error for ${category} with ${severity} severity`);
        const trackedError: TrackedError = {
          message: error.message,
          category,
          severity,
          timestamp: Date.now(),
          resolved: false,
          originalError: error
        };
        errorTracker.trackError(trackedError);
      });
    });
    
    // Check metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
    
    // Verify error tracking
    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(categories.length * severities.length);
    
    // Verify error categorization
    categories.forEach(category => {
      const categoryErrors = errorTracker.getErrorsByCategory(category);
      expect(categoryErrors.length).toBe(severities.length);
    });
    
    // Verify error severity
    severities.forEach(severity => {
      const severityErrors = errorTracker.getErrorsBySeverity(severity);
      expect(severityErrors.length).toBe(categories.length);
    });
  });

  it('should handle large error payloads', async () => {
    // Create a large error payload
    const largePayload = new Array(10000).fill('test').join('');
    const error = new Error(largePayload);
    const trackedError: TrackedError = {
      message: error.message,
      category: 'performance' as ErrorCategory,
      severity: 'high' as ErrorSeverity,
      timestamp: Date.now(),
      resolved: false,
      originalError: error
    };
    
    // Track error
    errorTracker.trackError(trackedError);
    
    // Check memory usage
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(1);
  });

  it('should generate alerts for high severity errors', async () => {
    // Track high severity error
    const error = new Error('Critical system error');
    const trackedError: TrackedError = {
      message: error.message,
      category: 'security' as ErrorCategory,
      severity: 'high' as ErrorSeverity,
      timestamp: Date.now(),
      resolved: false,
      originalError: error
    };
    errorTracker.trackError(trackedError);
    
    // Verify alert was generated
    const alerts = alertService.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].message).toContain('Critical system error');
    expect(alerts[0].type).toBe('error');
    expect(alerts[0].category).toBe('security');
  });
}); 