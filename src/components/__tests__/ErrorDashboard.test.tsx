import { render, screen, waitFor } from '@testing-library/react';
import { ErrorDashboard } from '../ErrorDashboard';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { ErrorTracker } from '../../services/ErrorTracker';
import { AlertService } from '../../services/AlertService';

jest.mock('../../services/ErrorTracker');
jest.mock('../../services/AlertService');

describe('ErrorDashboard', () => {
  let serviceRegistry: ServiceRegistry;
  let errorTracker: ErrorTracker;
  let alertService: AlertService;

  beforeEach(() => {
    serviceRegistry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    alertService = AlertService.getInstance();

    serviceRegistry.register('errorTracker', errorTracker);
    serviceRegistry.register('alertService', alertService);
  });

  afterEach(() => {
    serviceRegistry.clear();
  });

  test('displays errors', async () => {
    const mockErrors = [{
      id: '1',
      message: 'Test error',
      category: 'network',
      severity: 'high',
      timestamp: new Date()
    }];

    (errorTracker.getErrors as jest.Mock).mockReturnValue(mockErrors);
    render(<ErrorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('network')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });
  });

  test('filters errors by category', async () => {
    const mockErrors = [
      { id: '1', message: 'Network error', category: 'network', severity: 'high' },
      { id: '2', message: 'System error', category: 'system', severity: 'low' }
    ];

    (errorTracker.getErrors as jest.Mock).mockReturnValue(mockErrors);
    (errorTracker.getErrorsByCategory as jest.Mock).mockReturnValue([mockErrors[0]]);
    
    render(<ErrorDashboard />);
    
    const categoryFilter = screen.getByLabelText('Category');
    categoryFilter.value = 'network';
    categoryFilter.dispatchEvent(new Event('change'));
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.queryByText('System error')).not.toBeInTheDocument();
    });
  });

  test('filters errors by severity', async () => {
    const mockErrors = [
      { id: '1', message: 'Critical error', category: 'system', severity: 'high' },
      { id: '2', message: 'Minor error', category: 'system', severity: 'low' }
    ];

    (errorTracker.getErrors as jest.Mock).mockReturnValue(mockErrors);
    (errorTracker.getErrorsBySeverity as jest.Mock).mockReturnValue([mockErrors[0]]);
    
    render(<ErrorDashboard />);
    
    const severityFilter = screen.getByLabelText('Severity');
    severityFilter.value = 'high';
    severityFilter.dispatchEvent(new Event('change'));
    
    await waitFor(() => {
      expect(screen.getByText('Critical error')).toBeInTheDocument();
      expect(screen.queryByText('Minor error')).not.toBeInTheDocument();
    });
  });

  test('handles no errors', async () => {
    (errorTracker.getErrors as jest.Mock).mockReturnValue([]);
    render(<ErrorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No errors to display')).toBeInTheDocument();
    });
  });

  test('displays error statistics', async () => {
    const mockStats = {
      total: 10,
      byCategory: { network: 5, system: 5 },
      bySeverity: { high: 3, medium: 4, low: 3 }
    };

    (errorTracker.getStatistics as jest.Mock).mockReturnValue(mockStats);
    render(<ErrorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Errors: 10')).toBeInTheDocument();
      expect(screen.getByText('Network: 5')).toBeInTheDocument();
      expect(screen.getByText('High: 3')).toBeInTheDocument();
    });
  });
}); 