import { KeplrService } from '../KeplrService';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { MemoryManager } from '../MemoryManager';
import { SecurityManager } from '../SecurityManager';
import { Session } from '../../types/auth';

describe('KeplrService Integration Tests', () => {
  let keplrService: KeplrService;
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
    (KeplrService as any).instance = null;

    // Initialize services
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    memoryManager = MemoryManager.getInstance();
    securityManager = new SecurityManager();
    keplrService = KeplrService.getInstance();

    // Register services
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('performanceMonitor', performanceMonitor);
    serviceRegistry.register('memoryManager', memoryManager);
    serviceRegistry.register('securityManager', securityManager);
    serviceRegistry.register('keplrService', keplrService);

    // Initialize all services
    await serviceRegistry.initializeAll();
  });

  afterEach(async () => {
    // Cleanup
    await keplrService.cleanup();
    serviceRegistry.clear();
  });

  it('should properly initialize with all required services', async () => {
    const registry = ServiceRegistry.getInstance();
    expect(registry.get('errorTracker')).toBeDefined();
    expect(registry.get('performanceMonitor')).toBeDefined();
    expect(registry.get('memoryManager')).toBeDefined();
    expect(registry.get('securityManager')).toBeDefined();
    expect(registry.get('keplrService')).toBeDefined();
  });

  it('should handle session management', async () => {
    // Mock window.keplr
    (global as any).window = {
      keplr: {
        enable: jest.fn().mockResolvedValue(true),
        getKey: jest.fn().mockResolvedValue({
          name: 'test',
          pubKey: new Uint8Array([1, 2, 3]),
          address: 'test-address',
          bech32Address: 'test-bech32-address'
        })
      }
    };

    // Initialize service
    await keplrService.initialize();
    expect(keplrService).toBeDefined();
  });

  it('should handle session cleanup', async () => {
    // Mock window.keplr
    (global as any).window = {
      keplr: {
        enable: jest.fn().mockResolvedValue(true),
        getKey: jest.fn().mockResolvedValue({
          name: 'test',
          pubKey: new Uint8Array([1, 2, 3]),
          address: 'test-address',
          bech32Address: 'test-bech32-address'
        })
      }
    };

    // Initialize service
    await keplrService.initialize();
    
    // Fast forward time
    jest.useFakeTimers();
    jest.advanceTimersByTime(31 * 60 * 1000); // 31 minutes
    
    // Check if service is healthy
    await keplrService.healthCheck();
    expect(await keplrService.healthCheck()).toBe(true);

    jest.useRealTimers();
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

  it('should track Keplr-specific errors', async () => {
    // Mock window.keplr to fail
    (global as any).window = {
      keplr: {
        enable: jest.fn().mockRejectedValue(new Error('Keplr not available'))
      }
    };

    // Attempt initialization
    await expect(keplrService.initialize()).rejects.toThrow();
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Keplr not available');
  });

  it('should handle memory pressure during session management', async () => {
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Mock window.keplr
    (global as any).window = {
      keplr: {
        enable: jest.fn().mockResolvedValue(true),
        getKey: jest.fn().mockResolvedValue({
          name: 'test',
          pubKey: new Uint8Array([1, 2, 3]),
          address: 'test-address',
          bech32Address: 'test-bech32-address'
        })
      }
    };

    // Initialize service
    await keplrService.initialize();
    
    // Check memory metrics
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should handle concurrent operations', async () => {
    // Mock window.keplr
    (global as any).window = {
      keplr: {
        enable: jest.fn().mockResolvedValue(true),
        getKey: jest.fn().mockResolvedValue({
          name: 'test',
          pubKey: new Uint8Array([1, 2, 3]),
          address: 'test-address',
          bech32Address: 'test-bech32-address'
        })
      }
    };

    // Attempt concurrent initializations
    const initPromises = Array(5).fill(null).map(() => keplrService.initialize());
    await Promise.all(initPromises);
    
    // Service should be healthy
    expect(await keplrService.healthCheck()).toBe(true);
  });
}); 