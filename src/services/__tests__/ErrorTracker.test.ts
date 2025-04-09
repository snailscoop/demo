import { ErrorTracker } from '../ErrorTracker';
import { ServiceRegistry } from '../ServiceRegistry';
import { AlertService } from '../AlertService';

describe('ErrorTracker', () => {
  let errorTracker: ErrorTracker;
  let serviceRegistry: ServiceRegistry;
  let alertService: AlertService;

  beforeEach(() => {
    serviceRegistry = ServiceRegistry.getInstance();
    alertService = AlertService.getInstance();
    errorTracker = ErrorTracker.getInstance();

    serviceRegistry.register('alertService', alertService);
  });

  afterEach(() => {
    errorTracker.clearErrors();
    serviceRegistry.clear();
  });

  test('should be a singleton', () => {
    const instance1 = ErrorTracker.getInstance();
    const instance2 = ErrorTracker.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should track errors with categories', () => {
    const error = new Error('Test error');
    errorTracker.trackError(error, 'network', 'high');
    
    const errors = errorTracker.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].category).toBe('network');
    expect(errors[0].severity).toBe('high');
  });

  test('should clear errors', () => {
    errorTracker.trackError(new Error('Test error'), 'system', 'low');
    errorTracker.clearErrors();
    expect(errorTracker.getErrors()).toHaveLength(0);
  });

  test('should get errors by category', () => {
    errorTracker.trackError(new Error('Network error'), 'network', 'high');
    errorTracker.trackError(new Error('System error'), 'system', 'low');

    const networkErrors = errorTracker.getErrorsByCategory('network');
    expect(networkErrors).toHaveLength(1);
    expect(networkErrors[0].category).toBe('network');
  });

  test('should get errors by severity', () => {
    errorTracker.trackError(new Error('Critical error'), 'system', 'high');
    errorTracker.trackError(new Error('Minor error'), 'system', 'low');

    const highSeverityErrors = errorTracker.getErrorsBySeverity('high');
    expect(highSeverityErrors).toHaveLength(1);
    expect(highSeverityErrors[0].severity).toBe('high');
  });

  test('should trigger alerts for errors', () => {
    const error = new Error('Test error');
    errorTracker.trackError(error, 'system', 'high');
    
    const alerts = alertService.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('Test error');
  });
}); 