import { BaseService } from './BaseService';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';

interface CircuitBreakerConfig {
  maxFailures: number;
  resetTimeout: number;
  fallback?: () => Promise<any>;
}

export class CircuitBreaker extends BaseService {
  private circuits: Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
    config: CircuitBreakerConfig;
  }> = new Map();

  protected async doInitialize(): Promise<void> {
    console.log('Initializing CircuitBreaker...');
  }

  protected async doHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async doCleanup(): Promise<void> {
    this.circuits.clear();
  }

  public registerCircuit(name: string, config: CircuitBreakerConfig): void {
    this.circuits.set(name, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      config
    });
  }

  public async execute<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const circuit = this.circuits.get(name);
    if (!circuit) {
      throw new Error(`Circuit ${name} not registered`);
    }

    if (circuit.state === 'open') {
      if (Date.now() - circuit.lastFailure >= circuit.config.resetTimeout) {
        circuit.state = 'half-open';
      } else if (circuit.config.fallback) {
        return circuit.config.fallback();
      } else {
        throw new Error(`Circuit ${name} is open`);
      }
    }

    try {
      const result = await operation();
      if (circuit.state === 'half-open') {
        circuit.state = 'closed';
        circuit.failures = 0;
      }
      return result;
    } catch (error) {
      circuit.failures++;
      circuit.lastFailure = Date.now();

      if (circuit.failures >= circuit.config.maxFailures) {
        circuit.state = 'open';
      }

      const errorTracker = ServiceRegistry.getInstance().get<ErrorTracker>('errorTracker');
      errorTracker.trackError(error as Error, 'circuit-breaker', 'high');

      if (circuit.config.fallback) {
        return circuit.config.fallback();
      }

      throw error;
    }
  }
} 