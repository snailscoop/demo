import { KeplrAuth } from '../KeplrAuth';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { MemoryManager } from '../MemoryManager';
import { SecurityManager } from '../SecurityManager';

describe('KeplrAuth Integration Tests', () => {
  let keplrAuth: KeplrAuth;
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let performanceMonitor: PerformanceMonitor;
  let memoryManager: MemoryManager;
  let securityManager: SecurityManager;

  const mockChainConfig = {
    chainId: 'osmosis-1',
    rpcEndpoint: 'https://rpc.osmosis.zone',
    prefix: 'osmo',
    chainName: 'Osmosis',
    stakeCurrency: {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6
    }
  };

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
    keplrAuth = KeplrAuth.getInstance();

    // Register services
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('performanceMonitor', performanceMonitor);
    serviceRegistry.register('memoryManager', memoryManager);
    serviceRegistry.register('securityManager', securityManager);
    serviceRegistry.register('keplrAuth', keplrAuth);

    // Mock window.keplr
    (window as any).keplr = {
      enable: jest.fn().mockResolvedValue(true),
      getKey: jest.fn().mockResolvedValue({
        name: 'Test',
        algo: 'secp256k1',
        pubKey: new Uint8Array([1, 2, 3]),
        address: 'osmo1234567890abcdef',
        bech32Address: 'osmo1234567890abcdef'
      }),
      signArbitrary: jest.fn().mockResolvedValue({
        signature: new Uint8Array([1, 2, 3]),
        pub_key: new Uint8Array([4, 5, 6])
      })
    };

    // Initialize all services
    await serviceRegistry.initializeAll();
  });

  afterEach(async () => {
    // Cleanup
    await keplrAuth.cleanup();
    serviceRegistry.clear();
    delete (window as any).keplr;
  });

  it('should properly initialize with all required services', async () => {
    const registry = ServiceRegistry.getInstance();
    expect(registry.get('errorTracker')).toBeDefined();
    expect(registry.get('performanceMonitor')).toBeDefined();
    expect(registry.get('memoryManager')).toBeDefined();
    expect(registry.get('securityManager')).toBeDefined();
  });

  it('should handle wallet connection and track performance metrics', async () => {
    // Connect wallet
    await keplrAuth.connect();
    
    // Verify connection
    const isConnected = keplrAuth.isConnected();
    expect(isConnected).toBe(true);
    
    // Check performance metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
  });

  it('should handle memory pressure during authentication', async () => {
    // Simulate high memory usage
    const largeArray = new Array(1000000).fill('test');
    
    // Attempt connection
    await keplrAuth.connect();
    
    // Check memory metrics
    const memoryUsage = memoryManager.getMemoryUsagePercentage();
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should handle concurrent authentication operations', async () => {
    // Perform concurrent operations
    const operations = [
      () => keplrAuth.connect(),
      () => keplrAuth.disconnect(),
      () => keplrAuth.connect()
    ];
    
    // Execute operations concurrently
    await Promise.all(operations.map(async (op) => {
      try {
        await op();
      } catch (error) {
        // Ignore errors in concurrent operations
      }
    }));
    
    // Verify no errors occurred
    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(0);
  });

  it('should handle service initialization failures gracefully', async () => {
    // Mock SecurityManager to fail initialization
    jest.spyOn(SecurityManager.prototype, 'initialize').mockRejectedValue(new Error('Initialization failed'));
    
    // Attempt initialization
    await expect(serviceRegistry.initializeAll()).rejects.toThrow('Initialization failed');
    
    // Verify error was tracked
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Initialization failed');
  });

  it('should maintain health status across operations', async () => {
    // Check initial health
    expect(await keplrAuth.healthCheck()).toBe(true);
    
    // Perform connection
    await keplrAuth.connect();
    
    // Check health after connection
    expect(await keplrAuth.healthCheck()).toBe(true);
    
    // Simulate Keplr failure
    (window as any).keplr.enable = jest.fn().mockRejectedValue(new Error('Keplr not responding'));
    
    // Attempt connection with failed Keplr
    await expect(keplrAuth.connect()).rejects.toThrow('Keplr not responding');
    
    // Check health after failure
    expect(await keplrAuth.healthCheck()).toBe(false);
  });

  it('should handle rate limiting', async () => {
    // Attempt multiple rapid connection cycles
    for (let i = 0; i < 6; i++) {
      if (i < 5) {
        await keplrAuth.connect();
        keplrAuth.disconnect();
      } else {
        // The 6th attempt should be rate limited
        expect(securityManager.checkRateLimit('nostr')).toBe(false);
      }
    }
  });

  it('should track connection metrics', async () => {
    // Connect wallet
    await keplrAuth.connect();
    
    // Wait for a short period
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check metrics
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.cpu.usage).toBeGreaterThan(0);
    expect(metrics.memory.used).toBeGreaterThan(0);
    
    // Disconnect
    keplrAuth.disconnect();
    
    // Verify metrics updated
    const updatedMetrics = performanceMonitor.getMetrics();
    expect(updatedMetrics.cpu.usage).toBeGreaterThanOrEqual(0);
    expect(updatedMetrics.memory.used).toBeGreaterThanOrEqual(0);
  });
}); 