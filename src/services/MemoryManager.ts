import { BaseService } from './BaseService';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';
import { KeplrService } from './KeplrService';
import { TrackedError, ErrorCategory } from '../types/error';

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export class MemoryManager extends BaseService {
  private static instance: MemoryManager;
  private readonly memoryLimit: number;
  private readonly cleanupThreshold: number;
  private readonly checkInterval: number;
  private metrics: MemoryMetrics;
  private checkIntervalId: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.memoryLimit = 1024 * 1024 * 1024; // 1GB
    this.cleanupThreshold = 0.85; // 85% of memory limit
    this.checkInterval = 60000; // 1 minute
    this.metrics = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0
    };
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  protected async doInitialize(): Promise<void> {
    try {
      this.startMonitoring();
      await this.triggerCleanup(); // Initial cleanup
    } catch (error) {
      const trackedError: TrackedError = {
        message: 'Failed to initialize MemoryManager',
        category: 'PERFORMANCE' as ErrorCategory,
        severity: 'high',
        timestamp: Date.now(),
        resolved: false,
        originalError: error as Error
      };
      this.trackError(trackedError);
      throw trackedError;
    }
  }

  protected async doHealthCheck(): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapUsed + memoryUsage.external;
    return totalMemory / this.memoryLimit < this.cleanupThreshold;
  }

  protected async doCleanup(): Promise<void> {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  private startMonitoring(): void {
    this.checkIntervalId = setInterval(async () => {
      try {
        await this.checkMemoryUsage();
      } catch (error) {
        const trackedError: TrackedError = {
          message: 'Memory monitoring error',
          category: 'PERFORMANCE' as ErrorCategory,
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
          originalError: error as Error
        };
        this.trackError(trackedError);
      }
    }, this.checkInterval);
  }

  private async checkMemoryUsage(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    this.metrics = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    };

    const totalMemory = this.metrics.heapUsed + this.metrics.external;
    const memoryUsagePercentage = totalMemory / this.memoryLimit;

    if (memoryUsagePercentage > this.cleanupThreshold) {
      await this.triggerCleanup();
    }
  }

  private async triggerCleanup(): Promise<void> {
    try {
      // Get services
      const registry = ServiceRegistry.getInstance();
      const errorTracker = registry.get<ErrorTracker>('ErrorTracker');
      const keplrService = registry.get<KeplrService>('KeplrService');

      if (!errorTracker || !keplrService) {
        throw new Error('Required services not available');
      }

      // Cleanup old sessions
      await keplrService.cleanupOldSessions();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Clear error history if too large
      const errors = errorTracker.getErrors();
      if (errors.length > 1000) {
        errorTracker.clearErrors();
      }

      // Log cleanup
      console.log('Memory cleanup completed:', {
        heapUsed: this.metrics.heapUsed,
        heapTotal: this.metrics.heapTotal,
        external: this.metrics.external
      });
    } catch (error) {
      const trackedError: TrackedError = {
        message: 'Memory cleanup failed',
        category: 'PERFORMANCE' as ErrorCategory,
        severity: 'high',
        timestamp: Date.now(),
        resolved: false,
        originalError: error as Error
      };
      this.trackError(trackedError);
    }
  }

  public getMetrics(): MemoryMetrics {
    return { ...this.metrics };
  }

  public getMemoryUsagePercentage(): number {
    const totalMemory = this.metrics.heapUsed + this.metrics.external;
    return totalMemory / this.memoryLimit;
  }

  private trackError(error: TrackedError): void {
    const registry = ServiceRegistry.getInstance();
    const errorTracker = registry.get<ErrorTracker>('ErrorTracker');
    if (errorTracker) {
      errorTracker.trackError(error);
    }
  }
} 