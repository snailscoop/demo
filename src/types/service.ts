import { ErrorMetrics } from './error';
import { PerformanceMetrics } from './performance';

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ServiceHealthDetails {
  status: ServiceStatus;
  details?: string;
  metrics?: {
    cpu?: number;
    memory?: number;
    latency?: number;
    errorRate?: number;
  };
}

export interface ServiceHealth {
  status: ServiceStatus;
  details: Record<string, ServiceHealthDetails>;
  lastCheckTimestamp: number;
  errors: ErrorMetrics;
  performance: PerformanceMetrics;
}

export interface BaseService {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  healthCheck(): Promise<boolean | ServiceHealthDetails>;
  isInitialized(): boolean;
  doInitialize(): Promise<void>;
  doHealthCheck(): Promise<boolean | ServiceHealthDetails>;
  doCleanup(): Promise<void>;
}

export interface ServiceConfig {
  maxRetries?: number;
  timeoutMs?: number;
  maxConcurrentOperations?: number;
  memoryThresholdMb?: number;
  healthCheckIntervalMs?: number;
  cleanupThreshold?: number;
}

export interface ServiceRegistry {
  register<T>(name: string, service: T): void;
  get<T>(name: string): T;
  has(name: string): boolean;
  clear(): void;
  getAllServices(): BaseService[];
  initializeAll(): Promise<void>;
  checkHealth(): Promise<ServiceHealth>;
  cleanup(): Promise<void>;
} 