import { ServiceHealth, ServiceHealthDetails, ServiceStatus } from '../types/service';

export abstract class BaseService {
  protected initialized: boolean = false;
  protected status: ServiceStatus = 'healthy';
  protected healthDetails: ServiceHealthDetails = {
    status: 'healthy',
    details: '',
    metrics: {
      cpu: 0,
      memory: 0,
      latency: 0,
      errorRate: 0
    }
  };

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.doInitialize();
      this.initialized = true;
      this.status = 'healthy';
    } catch (error: unknown) {
      this.status = 'unhealthy';
      console.error(`Failed to initialize ${this.constructor.name}:`, error);
      throw error;
    }
  }

  public async healthCheck(): Promise<ServiceHealthDetails> {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        details: 'Service not initialized',
        metrics: this.healthDetails.metrics
      };
    }

    try {
      const details = await this.doHealthCheck();
      this.healthDetails = details;
      this.status = details.status;
      return details;
    } catch (error: unknown) {
      this.status = 'unhealthy';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        status: 'unhealthy',
        details: `Health check failed: ${errorMessage}`,
        metrics: this.healthDetails.metrics
      };
    }
  }

  public async cleanup(): Promise<void> {
    if (!this.initialized) return;
    
    try {
      await this.doCleanup();
      this.initialized = false;
      this.status = 'healthy';
    } catch (error: unknown) {
      this.status = 'unhealthy';
      console.error(`Failed to clean up ${this.constructor.name}:`, error);
      throw error;
    }
  }

  public getStatus(): ServiceStatus {
    return this.status;
  }

  protected abstract doInitialize(): Promise<void>;
  protected abstract doHealthCheck(): Promise<ServiceHealthDetails>;
  protected abstract doCleanup(): Promise<void>;
} 