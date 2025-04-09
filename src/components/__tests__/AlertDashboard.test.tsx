import { render, screen, waitFor } from '@testing-library/react';
import { AlertDashboard } from '../AlertDashboard';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { AlertService } from '../../services/AlertService';

jest.mock('../../services/AlertService');

describe('AlertDashboard', () => {
  let serviceRegistry: ServiceRegistry;
  let alertService: AlertService;

  beforeEach(() => {
    serviceRegistry = ServiceRegistry.getInstance();
    alertService = AlertService.getInstance();
    serviceRegistry.register('alertService', alertService);
  });

  afterEach(() => {
    serviceRegistry.clear();
  });

  test('displays alerts', async () => {
    const mockAlerts = [{
      id: '1',
      type: 'warning',
      message: 'Test alert',
      category: 'system',
      priority: 'high',
      timestamp: new Date()
    }];

    (alertService.getAlerts as jest.Mock).mockReturnValue(mockAlerts);
    render(<AlertDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Test alert')).toBeInTheDocument();
      expect(screen.getByText('warning')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });
  });

  test('filters alerts by type', async () => {
    const mockAlerts = [
      { id: '1', type: 'warning', message: 'Warning alert', category: 'system', priority: 'high' },
      { id: '2', type: 'error', message: 'Error alert', category: 'system', priority: 'high' }
    ];

    (alertService.getAlerts as jest.Mock).mockReturnValue(mockAlerts);
    (alertService.getAlertsByType as jest.Mock).mockReturnValue([mockAlerts[0]]);
    
    render(<AlertDashboard />);
    
    const typeFilter = screen.getByLabelText('Type');
    typeFilter.value = 'warning';
    typeFilter.dispatchEvent(new Event('change'));
    
    await waitFor(() => {
      expect(screen.getByText('Warning alert')).toBeInTheDocument();
      expect(screen.queryByText('Error alert')).not.toBeInTheDocument();
    });
  });

  test('filters alerts by category', async () => {
    const mockAlerts = [
      { id: '1', type: 'warning', message: 'System alert', category: 'system', priority: 'high' },
      { id: '2', type: 'warning', message: 'Network alert', category: 'network', priority: 'high' }
    ];

    (alertService.getAlerts as jest.Mock).mockReturnValue(mockAlerts);
    (alertService.getAlertsByCategory as jest.Mock).mockReturnValue([mockAlerts[0]]);
    
    render(<AlertDashboard />);
    
    const categoryFilter = screen.getByLabelText('Category');
    categoryFilter.value = 'system';
    categoryFilter.dispatchEvent(new Event('change'));
    
    await waitFor(() => {
      expect(screen.getByText('System alert')).toBeInTheDocument();
      expect(screen.queryByText('Network alert')).not.toBeInTheDocument();
    });
  });

  test('acknowledges alerts', async () => {
    const mockAlert = {
      id: '1',
      type: 'warning',
      message: 'Test alert',
      category: 'system',
      priority: 'high'
    };

    (alertService.getAlerts as jest.Mock).mockReturnValue([mockAlert]);
    render(<AlertDashboard />);
    
    const acknowledgeButton = screen.getByText('Acknowledge');
    acknowledgeButton.click();
    
    await waitFor(() => {
      expect(alertService.acknowledgeAlert).toHaveBeenCalledWith('1');
    });
  });

  test('deletes alerts', async () => {
    const mockAlert = {
      id: '1',
      type: 'warning',
      message: 'Test alert',
      category: 'system',
      priority: 'high'
    };

    (alertService.getAlerts as jest.Mock).mockReturnValue([mockAlert]);
    render(<AlertDashboard />);
    
    const deleteButton = screen.getByText('Delete');
    deleteButton.click();
    
    await waitFor(() => {
      expect(alertService.deleteAlert).toHaveBeenCalledWith('1');
    });
  });

  test('handles no alerts', async () => {
    (alertService.getAlerts as jest.Mock).mockReturnValue([]);
    render(<AlertDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No alerts to display')).toBeInTheDocument();
    });
  });
}); 