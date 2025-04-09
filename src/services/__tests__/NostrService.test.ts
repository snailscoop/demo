import { NostrService } from '../NostrService';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { AlertService } from '../AlertService';

describe('NostrService', () => {
  let nostrService: NostrService;
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let alertService: AlertService;

  beforeEach(() => {
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    alertService = AlertService.getInstance();
    nostrService = NostrService.getInstance();

    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('alertService', alertService);
  });

  afterEach(() => {
    nostrService.cleanup();
    serviceRegistry.clear();
  });

  test('should be a singleton', () => {
    const instance1 = NostrService.getInstance();
    const instance2 = NostrService.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should initialize with default relays', () => {
    expect(nostrService.getRelays()).toHaveLength(3);
    expect(nostrService.getRelays()[0]).toBe('wss://relay.damus.io');
  });

  test('should add and remove relays', () => {
    const newRelay = 'wss://new.relay';
    nostrService.addRelay(newRelay);
    expect(nostrService.getRelays()).toContain(newRelay);

    nostrService.removeRelay(newRelay);
    expect(nostrService.getRelays()).not.toContain(newRelay);
  });

  test('should handle connection errors', async () => {
    const invalidRelay = 'wss://invalid.relay';
    nostrService.addRelay(invalidRelay);

    await expect(nostrService.connect()).rejects.toThrow();
    expect(errorTracker.getErrors()).toHaveLength(1);
  });

  test('should cleanup connections', async () => {
    await nostrService.connect();
    nostrService.cleanup();
    expect(nostrService.isConnected()).toBe(false);
  });

  test('should track performance metrics', () => {
    const metrics = nostrService.getPerformanceMetrics();
    expect(metrics).toHaveProperty('relayLatency');
    expect(metrics).toHaveProperty('eventProcessingTime');
    expect(metrics).toHaveProperty('subscriptionResponseTime');
  });
}); 