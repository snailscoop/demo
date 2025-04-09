import { NostrService } from '../NostrService';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { MemoryManager } from '../MemoryManager';
import { SecurityManager } from '../SecurityManager';
import { ErrorCategory, ErrorSeverity, TrackedError } from '../../types/error';

describe('NostrService Integration Tests', () => {
  let nostrService: NostrService;
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
    nostrService = NostrService.getInstance();

    // Register services
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('performanceMonitor', performanceMonitor);
    serviceRegistry.register('memoryManager', memoryManager);
    serviceRegistry.register('securityManager', securityManager);
    serviceRegistry.register('nostrService', nostrService);

    // Initialize all services
    await serviceRegistry.initializeAll();
  });

  afterEach(async () => {
    // Cleanup
    await nostrService.cleanup();
    serviceRegistry.clear();
  });

  it('should properly initialize with all required services', async () => {
    const registry = ServiceRegistry.getInstance();
    expect(registry.get('errorTracker')).toBeDefined();
    expect(registry.get('performanceMonitor')).toBeDefined();
    expect(registry.get('memoryManager')).toBeDefined();
    expect(registry.get('securityManager')).toBeDefined();
  });

  it('should handle rate limiting for Nostr operations', async () => {
    // Perform multiple operations
    for (let i = 0; i < 100; i++) {
      expect(securityManager.checkRateLimit('nostr')).toBe(true);
    }
    
    // Verify rate limit is enforced
    expect(securityManager.checkRateLimit('nostr')).toBe(false);
    
    // Check performance metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
  });

  it('should handle memory pressure during Nostr operations', async () => {
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Perform Nostr operations
    for (let i = 0; i < 1000; i++) {
      const error = new Error(`Test error ${i}`);
      const trackedError: TrackedError = {
        message: error.message,
        category: 'nostr' as ErrorCategory,
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

  it('should handle concurrent Nostr operations', async () => {
    // Perform concurrent operations
    const operations = Array(10).fill(null).map((_, i) => {
      const error = new Error(`Concurrent error ${i}`);
      const trackedError: TrackedError = {
        message: error.message,
        category: 'nostr' as ErrorCategory,
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

  it('should track Nostr-specific errors', async () => {
    // Track errors with different categories
    const categories: ErrorCategory[] = ['nostr', 'security', 'system'];
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

  it('should handle large Nostr payloads', async () => {
    // Create a large payload
    const largePayload = new Array(10000).fill('test').join('');
    const error = new Error(largePayload);
    const trackedError: TrackedError = {
      message: error.message,
      category: 'nostr' as ErrorCategory,
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

  it('should handle SSL verification for Nostr connections', async () => {
    // Verify SSL for Nostr relays
    expect(securityManager.verifySSL('https://relay.nostr.com')).toBe(true);
    expect(securityManager.verifySSL('http://relay.nostr.com')).toBe(false);
    
    // Check performance metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
  });

  it('should handle Nostr authentication', async () => {
    // Mock window.nostr for testing
    (global as any).window = {
      nostr: {
        getPublicKey: jest.fn().mockResolvedValue('test-public-key')
      }
    };

    // Test login
    const publicKey = await nostrService.login();
    expect(publicKey).toBe('test-public-key');
    expect(nostrService.isAuthenticated()).toBe(true);
    expect(nostrService.getCurrentPublicKey()).toBe('test-public-key');

    // Test logout
    await nostrService.logout();
    expect(nostrService.isAuthenticated()).toBe(false);
    expect(nostrService.getCurrentPublicKey()).toBeNull();
  });

  it('should handle relay connections', async () => {
    // Test initial connection state
    expect(nostrService.isConnected()).toBe(false);

    // Test connecting to relays
    await nostrService.connect();
    expect(nostrService.isConnected()).toBe(true);

    // Test getting relays
    const relays = nostrService.getRelays();
    expect(relays.length).toBeGreaterThan(0);

    // Test adding and removing relays
    const newRelay = 'wss://new-relay.nostr.com';
    nostrService.addRelay(newRelay);
    expect(nostrService.getRelays()).toContain(newRelay);

    nostrService.removeRelay(newRelay);
    expect(nostrService.getRelays()).not.toContain(newRelay);
  });

  it('should handle subscriptions', async () => {
    // Mock pool.subscribe for testing
    const mockSub = {
      close: jest.fn()
    };
    (nostrService as any).pool = {
      subscribe: jest.fn().mockReturnValue(mockSub)
    };

    // Test subscription
    const onEvent = jest.fn();
    const onError = jest.fn();
    const subId = await nostrService.subscribe(onEvent, onError);
    expect(subId).toBeDefined();
    expect((nostrService as any).activeSubscriptions.has(subId)).toBe(true);

    // Test unsubscribe
    nostrService.unsubscribe(subId);
    expect((nostrService as any).activeSubscriptions.has(subId)).toBe(false);
    expect(mockSub.close).toHaveBeenCalled();
  });
}); 