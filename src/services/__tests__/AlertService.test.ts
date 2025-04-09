import { AlertService } from '../AlertService';
import { ServiceRegistry } from '../ServiceRegistry';

describe('AlertService', () => {
  let alertService: AlertService;
  let serviceRegistry: ServiceRegistry;

  beforeEach(() => {
    serviceRegistry = ServiceRegistry.getInstance();
    alertService = AlertService.getInstance();
  });

  afterEach(() => {
    alertService.clearAlerts();
    serviceRegistry.clear();
  });

  test('should be a singleton', () => {
    const instance1 = AlertService.getInstance();
    const instance2 = AlertService.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should add alerts with different types', () => {
    alertService.addAlert('info', 'Info message', 'system', 'low');
    alertService.addAlert('warning', 'Warning message', 'network', 'medium');
    alertService.addAlert('error', 'Error message', 'database', 'high');

    const alerts = alertService.getAlerts();
    expect(alerts).toHaveLength(3);
    expect(alerts[0].type).toBe('info');
    expect(alerts[1].type).toBe('warning');
    expect(alerts[2].type).toBe('error');
  });

  test('should acknowledge alerts', () => {
    alertService.addAlert('info', 'Test message', 'system', 'low');
    const alert = alertService.getAlerts()[0];
    
    alertService.acknowledgeAlert(alert.id);
    const updatedAlert = alertService.getAlerts()[0];
    expect(updatedAlert.acknowledged).toBe(true);
  });

  test('should delete alerts', () => {
    alertService.addAlert('info', 'Test message', 'system', 'low');
    const alert = alertService.getAlerts()[0];
    
    alertService.deleteAlert(alert.id);
    expect(alertService.getAlerts()).toHaveLength(0);
  });

  test('should get alerts by type', () => {
    alertService.addAlert('info', 'Info message', 'system', 'low');
    alertService.addAlert('warning', 'Warning message', 'system', 'low');
    
    const infoAlerts = alertService.getAlertsByType('info');
    expect(infoAlerts).toHaveLength(1);
    expect(infoAlerts[0].type).toBe('info');
  });

  test('should get alerts by category', () => {
    alertService.addAlert('info', 'System message', 'system', 'low');
    alertService.addAlert('warning', 'Network message', 'network', 'low');
    
    const systemAlerts = alertService.getAlertsByCategory('system');
    expect(systemAlerts).toHaveLength(1);
    expect(systemAlerts[0].category).toBe('system');
  });

  test('should clear all alerts', () => {
    alertService.addAlert('info', 'Test message 1', 'system', 'low');
    alertService.addAlert('warning', 'Test message 2', 'system', 'low');
    
    alertService.clearAlerts();
    expect(alertService.getAlerts()).toHaveLength(0);
  });
}); 