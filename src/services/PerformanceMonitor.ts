import { BaseService } from './BaseService';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';
import { TrackedError, ErrorCategory } from '../types/error';

interface SystemMetrics {
  cpu: {
    usage: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    free: number;
  };
  network: {
    latency: number;
    throughput: number;
    packetLoss: number;
  };
}

interface RelayMetrics {
  latency: number;
  eventProcessingTime: number;
  subscriptionResponseTime: number;
  lastUpdated: number;
}

export class PerformanceMonitor extends BaseService {
  private static instance: PerformanceMonitor;
  private metrics: SystemMetrics;
  private relayMetrics: Map<string, RelayMetrics>;
  private readonly checkInterval: number;
  private checkIntervalId: number | null = null;
  private readonly maxMetricsHistory: number = 1000;
  private readonly cpuThreshold: number = 80;
  private readonly memoryThreshold: number = 85;
  private readonly networkLatencyThreshold: number = 1000;
  private lastCPUUsage: number = 0;
  private lastCPUTime: number = performance.now();

  private constructor() {
    super();
    this.metrics = {
      cpu: { usage: 0, temperature: 0 },
      memory: { used: 0, total: 0, free: 0 },
      network: { latency: 0, throughput: 0, packetLoss: 0 }
    };
    this.relayMetrics = new Map();
    this.checkInterval = 5000; // 5 seconds
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public async initialize(): Promise<void> {
    try {
      await this.startMonitoring();
      this.status = 'healthy';
    } catch (error) {
      this.status = 'degraded';
      throw error;
    }
  }

  private async startMonitoring(): Promise<void> {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
    }

    this.checkIntervalId = window.setInterval(async () => {
      try {
        await this.updateMetrics();
        await this.checkThresholds();
      } catch (error) {
        const trackedError: TrackedError = {
          message: 'Failed to update performance metrics',
          category: 'performance',
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
          originalError: error instanceof Error ? error : new Error(String(error))
        };
        await this.trackError(trackedError);
      }
    }, this.checkInterval);
  }

  private async updateMetrics(): Promise<void> {
    await Promise.all([
      this.updateCPUMetrics(),
      this.updateMemoryMetrics(),
      this.updateNetworkMetrics()
    ]);
  }

  private async updateCPUMetrics(): Promise<void> {
    const now = performance.now();
    const timeDiff = now - this.lastCPUTime;
    
    if (timeDiff > 0) {
      const cpuUsage = (performance.now() - this.lastCPUTime) / timeDiff * 100;
      this.metrics.cpu.usage = Math.min(100, Math.max(0, cpuUsage));
    }
    
    this.lastCPUTime = now;
    this.lastCPUUsage = this.metrics.cpu.usage;
  }

  private async updateMemoryMetrics(): Promise<void> {
    if (performance.memory) {
      const memory = performance.memory;
      this.metrics.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        free: memory.totalJSHeapSize - memory.usedJSHeapSize
      };
    }
  }

  private async updateNetworkMetrics(): Promise<void> {
    try {
      const start = performance.now();
      await fetch('/api/health').then(() => {
        this.metrics.network.latency = performance.now() - start;
      });
    } catch (error) {
      this.metrics.network.latency = -1;
    }
  }

  private async checkThresholds(): Promise<void> {
    if (this.metrics.cpu.usage > this.cpuThreshold) {
      await this.handleHighCPUUsage();
    }

    if (this.metrics.memory.used / this.metrics.memory.total * 100 > this.memoryThreshold) {
      await this.handleHighMemoryUsage();
    }

    if (this.metrics.network.latency > this.networkLatencyThreshold) {
      await this.handleHighNetworkLatency();
    }
  }

  private async handleHighCPUUsage(): Promise<void> {
    const error: TrackedError = {
      message: 'High CPU usage detected',
      category: 'performance',
      severity: 'medium',
      timestamp: Date.now(),
      resolved: false,
      context: { cpuUsage: this.metrics.cpu.usage }
    };
    await this.trackError(error);
  }

  private async handleHighMemoryUsage(): Promise<void> {
    const error: TrackedError = {
      message: 'High memory usage detected',
      category: 'memory',
      severity: 'medium',
      timestamp: Date.now(),
      resolved: false,
      context: { 
        used: this.metrics.memory.used,
        total: this.metrics.memory.total
      }
    };
    await this.trackError(error);
  }

  private async handleHighNetworkLatency(): Promise<void> {
    const error: TrackedError = {
      message: 'High network latency detected',
      category: 'network',
      severity: 'medium',
      timestamp: Date.now(),
      resolved: false,
      context: { latency: this.metrics.network.latency }
    };
    await this.trackError(error);
  }

  private async trackError(error: TrackedError): Promise<void> {
    const errorTracker = ServiceRegistry.getInstance().getService<ErrorTracker>('ErrorTracker');
    if (errorTracker) {
      await errorTracker.trackError(error);
    }
  }

  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public getRelayMetrics(relayUrl: string): RelayMetrics | undefined {
    return this.relayMetrics.get(relayUrl);
  }

  public updateRelayMetrics(relayUrl: string, metrics: Partial<RelayMetrics>): void {
    const current = this.relayMetrics.get(relayUrl) || {
      latency: 0,
      eventProcessingTime: 0,
      subscriptionResponseTime: 0,
      lastUpdated: Date.now()
    };

    this.relayMetrics.set(relayUrl, {
      ...current,
      ...metrics,
      lastUpdated: Date.now()
    });
  }

  public async cleanup(): Promise<void> {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
} 