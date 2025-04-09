import { PerformanceMonitor } from '../PerformanceMonitor';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';

jest.mock('../ServiceRegistry');
jest.mock('../ErrorTracker');

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockErrorTracker: jest.Mocked<ErrorTracker>;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor = PerformanceMonitor.getInstance();
    
    // Setup mock services
    mockErrorTracker = {
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
      trackError: jest.fn(),
      getErrors: jest.fn().mockReturnValue([])
    } as unknown as jest.Mocked<ErrorTracker>;

    // Mock ServiceRegistry
    const mockGetInstance = ServiceRegistry.getInstance as jest.MockedFunction<typeof ServiceRegistry.getInstance>;
    const mockRegistry = {
      get: jest.fn().mockImplementation((serviceName: string) => {
        if (serviceName === 'ErrorTracker') return mockErrorTracker;
        return null;
      })
    };
    mockGetInstance.mockReturnValue(mockRegistry as any);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(performanceMonitor.initialize()).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await expect(performanceMonitor.cleanup()).resolves.not.toThrow();
    });
  });

  describe('metrics monitoring', () => {
    it('should track CPU usage', async () => {
      const metrics = await (performanceMonitor as any).getCurrentMetrics();
      expect(metrics.cpu).toBeDefined();
      expect(typeof metrics.cpu).toBe('number');
    });

    it('should track memory usage', async () => {
      const metrics = await (performanceMonitor as any).getCurrentMetrics();
      expect(metrics.memory).toBeDefined();
      expect(typeof metrics.memory).toBe('number');
      expect(metrics.memory).toBeGreaterThanOrEqual(0);
      expect(metrics.memory).toBeLessThanOrEqual(1);
    });

    it('should track disk metrics', async () => {
      const metrics = await (performanceMonitor as any).getCurrentMetrics();
      expect(metrics.disk).toBeDefined();
      expect(metrics.disk.freeSpace).toBeDefined();
      expect(typeof metrics.disk.freeSpace).toBe('number');
      expect(metrics.disk.freeSpace).toBeGreaterThanOrEqual(0);
      expect(metrics.disk.freeSpace).toBeLessThanOrEqual(1);
    });

    it('should track network metrics', async () => {
      const metrics = await (performanceMonitor as any).getCurrentMetrics();
      expect(metrics.network).toBeDefined();
      expect(metrics.network.latency).toBeDefined();
      expect(typeof metrics.network.latency).toBe('number');
      expect(metrics.network.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('threshold checks', () => {
    it('should trigger error when CPU threshold is exceeded', async () => {
      // Mock high CPU usage
      const originalCPUUsage = process.cpuUsage;
      process.cpuUsage = jest.fn().mockReturnValue({ user: 900000, system: 100000 });

      await (performanceMonitor as any).checkMetrics({
        cpu: 0.9,
        memory: 0.5,
        disk: { readSpeed: 100, writeSpeed: 50, freeSpace: 0.5 },
        network: { latency: 100, throughput: 2000000 },
        timestamp: Date.now()
      });

      expect(mockErrorTracker.trackError).toHaveBeenCalled();

      process.cpuUsage = originalCPUUsage;
    });

    it('should trigger error when memory threshold is exceeded', async () => {
      await (performanceMonitor as any).checkMetrics({
        cpu: 0.5,
        memory: 0.9,
        disk: { readSpeed: 100, writeSpeed: 50, freeSpace: 0.5 },
        network: { latency: 100, throughput: 2000000 },
        timestamp: Date.now()
      });

      expect(mockErrorTracker.trackError).toHaveBeenCalled();
    });

    it('should trigger error when disk space threshold is exceeded', async () => {
      await (performanceMonitor as any).checkMetrics({
        cpu: 0.5,
        memory: 0.5,
        disk: { readSpeed: 100, writeSpeed: 50, freeSpace: 0.05 },
        network: { latency: 100, throughput: 2000000 },
        timestamp: Date.now()
      });

      expect(mockErrorTracker.trackError).toHaveBeenCalled();
    });

    it('should trigger error when network latency threshold is exceeded', async () => {
      await (performanceMonitor as any).checkMetrics({
        cpu: 0.5,
        memory: 0.5,
        disk: { readSpeed: 100, writeSpeed: 50, freeSpace: 0.5 },
        network: { latency: 2000, throughput: 2000000 },
        timestamp: Date.now()
      });

      expect(mockErrorTracker.trackError).toHaveBeenCalled();
    });
  });

  describe('relay metrics', () => {
    it('should update relay metrics', () => {
      const relayId = 'test-relay';
      const metrics = {
        latency: 100,
        eventProcessingTime: 50,
        subscriptionResponseTime: 200
      };

      performanceMonitor.updateRelayMetrics(relayId, metrics);
      const storedMetrics = performanceMonitor.getRelayMetrics(relayId);

      expect(storedMetrics).toBeDefined();
      expect(storedMetrics?.latency).toBe(metrics.latency);
      expect(storedMetrics?.eventProcessingTime).toBe(metrics.eventProcessingTime);
      expect(storedMetrics?.subscriptionResponseTime).toBe(metrics.subscriptionResponseTime);
    });
  });
}); 