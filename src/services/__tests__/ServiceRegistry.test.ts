import { ServiceRegistry } from '../ServiceRegistry';
import { NostrService } from '../NostrService';
import { ErrorTracker } from '../ErrorTracker';
import { AlertService } from '../AlertService';
import { BaseService } from '../BaseService';

class TestService extends BaseService {
  protected async doInitialize(): Promise<void> {
    console.log('Initializing TestService');
  }

  protected async doHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async doCleanup(): Promise<void> {
    console.log('Cleaning up TestService');
  }
}

describe('ServiceRegistry', () => {
  let serviceRegistry: ServiceRegistry;
  let nostrService: NostrService;
  let errorTracker: ErrorTracker;
  let alertService: AlertService;

  beforeEach(() => {
    serviceRegistry = ServiceRegistry.getInstance();
    nostrService = NostrService.getInstance();
    errorTracker = ErrorTracker.getInstance();
    alertService = AlertService.getInstance();
    serviceRegistry.clear();
  });

  afterEach(() => {
    serviceRegistry.clear();
  });

  test('should be a singleton', () => {
    const instance1 = ServiceRegistry.getInstance();
    const instance2 = ServiceRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should register and retrieve services', () => {
    serviceRegistry.register('nostrService', nostrService);
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('alertService', alertService);

    expect(serviceRegistry.get('nostrService')).toBe(nostrService);
    expect(serviceRegistry.get('errorTracker')).toBe(errorTracker);
    expect(serviceRegistry.get('alertService')).toBe(alertService);
  });

  test('should check if service exists', () => {
    serviceRegistry.register('nostrService', nostrService);
    expect(serviceRegistry.has('nostrService')).toBe(true);
    expect(serviceRegistry.has('nonExistentService')).toBe(false);
  });

  test('should clear all services', () => {
    serviceRegistry.register('nostrService', nostrService);
    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.clear();

    expect(serviceRegistry.has('nostrService')).toBe(false);
    expect(serviceRegistry.has('errorTracker')).toBe(false);
  });

  test('should handle type safety', () => {
    serviceRegistry.register('nostrService', nostrService);
    const retrievedService = serviceRegistry.get<NostrService>('nostrService');
    expect(retrievedService).toBeInstanceOf(NostrService);
  });

  test('should throw error for non-existent service', () => {
    expect(() => serviceRegistry.get('nonExistentService')).toThrow(
      'Service nonExistentService not found'
    );
  });

  it('should initialize services in correct order', async () => {
    const service1 = new TestService();
    const service2 = new TestService();
    
    serviceRegistry.register('service1', service1);
    serviceRegistry.register('service2', service2, ['service1']);

    await serviceRegistry.initializeAll();

    expect(service1.initialized).toBe(true);
    expect(service2.initialized).toBe(true);
  });

  it('should handle service cleanup', async () => {
    const service = new TestService();
    serviceRegistry.register('test', service);
    
    await service.initialize();
    await service.cleanup();
    
    expect(service.initialized).toBe(false);
  });

  it('should handle health checks', async () => {
    const service = new TestService();
    serviceRegistry.register('test', service);
    
    await service.initialize();
    const health = await service.healthCheck();
    
    expect(health).toBe(true);
  });
}); 