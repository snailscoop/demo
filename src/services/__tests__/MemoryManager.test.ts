import { MemoryManager } from '../MemoryManager';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { KeplrService } from '../KeplrService';

jest.mock('../ServiceRegistry');
jest.mock('../ErrorTracker');
jest.mock('../KeplrService');

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockErrorTracker: jest.Mocked<ErrorTracker>;
  let mockKeplrService: jest.Mocked<KeplrService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock services
    mockErrorTracker = {
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
      trackError: jest.fn(),
      getErrors: jest.fn().mockReturnValue([]),
      clearErrors: jest.fn()
    } as unknown as jest.Mocked<ErrorTracker>;

    mockKeplrService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
      cleanupOldSessions: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<KeplrService>;

    // Mock ServiceRegistry
    const mockGetInstance = ServiceRegistry.getInstance as jest.MockedFunction<typeof ServiceRegistry.getInstance>;
    const mockRegistry = {
      get: jest.fn().mockImplementation((serviceName: string) => {
        if (serviceName === 'ErrorTracker') return mockErrorTracker;
        if (serviceName === 'KeplrService') return mockKeplrService;
        return null;
      })
    };
    mockGetInstance.mockReturnValue(mockRegistry as any);

    // Get instance
    memoryManager = MemoryManager.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = MemoryManager.getInstance();
    const instance2 = MemoryManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize successfully', async () => {
    await expect(memoryManager['doInitialize']()).resolves.not.toThrow();
  });

  it('should cleanup successfully', async () => {
    await memoryManager['doInitialize']();
    await expect(memoryManager['doCleanup']()).resolves.not.toThrow();
  });

  it('should trigger cleanup when memory usage exceeds threshold', async () => {
    // Mock process.memoryUsage to simulate high memory usage
    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 900 * 1024 * 1024, // 900MB
      heapTotal: 1000 * 1024 * 1024, // 1GB
      external: 100 * 1024 * 1024, // 100MB
      arrayBuffers: 50 * 1024 * 1024, // 50MB
      rss: 1000 * 1024 * 1024 // 1GB
    }) as any;

    await memoryManager['doInitialize']();
    await (memoryManager as any).checkMemoryUsage();

    // Verify cleanup was triggered
    expect(mockKeplrService.cleanupOldSessions).toHaveBeenCalled();

    // Restore original memoryUsage
    process.memoryUsage = originalMemoryUsage;
  });

  it('should track errors during cleanup', async () => {
    // Mock keplrService.cleanupOldSessions to throw an error
    mockKeplrService.cleanupOldSessions.mockRejectedValue(new Error('Cleanup failed'));

    await memoryManager['doInitialize']();
    await (memoryManager as any).triggerCleanup();

    expect(mockErrorTracker.trackError).toHaveBeenCalled();
  });

  it('should clear error history when too large', async () => {
    // Mock errorTracker.getErrors to return a large array
    mockErrorTracker.getErrors.mockReturnValue(new Array(1001));

    await memoryManager['doInitialize']();
    await (memoryManager as any).triggerCleanup();

    expect(mockErrorTracker.clearErrors).toHaveBeenCalled();
  });

  it('should get correct memory metrics', async () => {
    const mockMetrics = {
      heapUsed: 500 * 1024 * 1024,
      heapTotal: 1000 * 1024 * 1024,
      external: 100 * 1024 * 1024,
      arrayBuffers: 50 * 1024 * 1024,
      rss: 1000 * 1024 * 1024
    };

    // Mock process.memoryUsage
    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue(mockMetrics) as any;

    await memoryManager['doInitialize']();
    await (memoryManager as any).checkMemoryUsage();

    const metrics = memoryManager.getMetrics();
    expect(metrics).toEqual({
      heapUsed: mockMetrics.heapUsed,
      heapTotal: mockMetrics.heapTotal,
      external: mockMetrics.external,
      arrayBuffers: mockMetrics.arrayBuffers
    });

    // Restore original memoryUsage
    process.memoryUsage = originalMemoryUsage;
  });

  it('should calculate correct memory usage percentage', async () => {
    const mockMetrics = {
      heapUsed: 800 * 1024 * 1024,
      heapTotal: 1000 * 1024 * 1024,
      external: 200 * 1024 * 1024,
      arrayBuffers: 50 * 1024 * 1024,
      rss: 1000 * 1024 * 1024
    };

    // Mock process.memoryUsage
    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue(mockMetrics) as any;

    await memoryManager['doInitialize']();
    await (memoryManager as any).checkMemoryUsage();

    const usagePercentage = memoryManager.getMemoryUsagePercentage();
    expect(usagePercentage).toBeCloseTo(1.0, 2); // 100% usage

    // Restore original memoryUsage
    process.memoryUsage = originalMemoryUsage;
  });
}); 