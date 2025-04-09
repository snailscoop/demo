import { render, screen, waitFor } from '@testing-library/react';
import { PerformanceDashboard } from '../PerformanceDashboard';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { PerformanceMonitor } from '../../services/PerformanceMonitor';
import { AlertService } from '../../services/AlertService';

jest.mock('../../services/PerformanceMonitor');
jest.mock('../../services/AlertService');

describe('PerformanceDashboard', () => {
  let serviceRegistry: ServiceRegistry;
  let performanceMonitor: PerformanceMonitor;
  let alertService: AlertService;

  beforeEach(() => {
    serviceRegistry = ServiceRegistry.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    alertService = AlertService.getInstance();

    serviceRegistry.register('performanceMonitor', performanceMonitor);
    serviceRegistry.register('alertService', alertService);
  });

  afterEach(() => {
    serviceRegistry.clear();
  });

  test('displays performance metrics', async () => {
    const mockMetrics = [{
      serviceName: 'testService',
      initializationTime: 100,
      memoryUsage: 50,
      relayLatency: 200,
      eventProcessingTime: 50,
      subscriptionResponseTime: 100
    }];

    (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockMetrics);
    render(<PerformanceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('testService')).toBeInTheDocument();
      expect(screen.getByText('100ms')).toBeInTheDocument();
      expect(screen.getByText('50MB')).toBeInTheDocument();
    });
  });

  test('updates metrics in real-time', async () => {
    const initialMetrics = [{
      serviceName: 'testService',
      initializationTime: 100
    }];

    const updatedMetrics = [{
      serviceName: 'testService',
      initializationTime: 150
    }];

    (performanceMonitor.getMetrics as jest.Mock)
      .mockReturnValueOnce(initialMetrics)
      .mockReturnValueOnce(updatedMetrics);

    render(<PerformanceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('100ms')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('150ms')).toBeInTheDocument();
    });
  });

  test('displays alerts for high latency', async () => {
    const mockMetrics = [{
      serviceName: 'testService',
      relayLatency: 1000
    }];

    (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockMetrics);
    render(<PerformanceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('High latency detected')).toBeInTheDocument();
    });
  });

  test('handles missing metrics', async () => {
    (performanceMonitor.getMetrics as jest.Mock).mockReturnValue([]);
    render(<PerformanceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No metrics available')).toBeInTheDocument();
    });
  });
}); 