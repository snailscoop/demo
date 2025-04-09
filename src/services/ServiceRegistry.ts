import { MemoryManager } from './MemoryManager';
import { CircuitBreaker } from './CircuitBreaker';
import { PerformanceMonitor } from './PerformanceMonitor';
import { SecurityManager } from './SecurityManager';
import { BaseService } from './BaseService';

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  public register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  public get<T>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  public has(name: string): boolean {
    return this.services.has(name);
  }

  public clear(): void {
    this.services.clear();
  }

  public getAllServices(): BaseService[] {
    return Array.from(this.services.values());
  }

  public async initializeAll(): Promise<void> {
    const registry = ServiceRegistry.getInstance();
    const memoryManager = new MemoryManager();
    const circuitBreaker = new CircuitBreaker();
    const performanceMonitor = new PerformanceMonitor();
    const securityManager = new SecurityManager();

    registry.register('memoryManager', memoryManager);
    registry.register('circuitBreaker', circuitBreaker);
    registry.register('performanceMonitor', performanceMonitor);
    registry.register('securityManager', securityManager);

    await memoryManager.initialize();
    await circuitBreaker.initialize();
    await performanceMonitor.initialize();
    await securityManager.initialize();
  }
} 