import { AlertService } from './AlertService';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorCategory, ErrorSeverity, TrackedError } from '../types/error';

export type AlertPriority = 1 | 2 | 3; // 1: low, 2: medium, 3: high

export interface ErrorEvent {
  timestamp: number;
  type: string;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  resolved: boolean;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  errorTypes: Map<string, number>;
  recentErrors: ErrorEvent[];
  unresolvedErrors: ErrorEvent[];
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: TrackedError[];
  private maxErrors: number;
  private analyticsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.errors = [];
    this.maxErrors = 1000;
  }

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  public async initialize(): Promise<void> {
    // No initialization needed
  }

  private getSeverityPriority(severity: ErrorSeverity): AlertPriority {
    switch (severity) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
      default:
        return 1;
    }
  }

  public trackError(error: TrackedError): void {
    this.errors.push(error);
    
    // Remove oldest error if we've reached the limit
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Alert for high severity errors
    if (error.severity === 'high') {
      const alertService = ServiceRegistry.getInstance().get<AlertService>('alertService');
      if (alertService) {
        alertService.addAlert(
          error.message,
          'error',
          error.category,
          this.getSeverityPriority(error.severity)
        );
      }
    }
  }

  public getErrors(): TrackedError[] {
    return [...this.errors];
  }

  public getErrorsByCategory(category: string): TrackedError[] {
    return this.errors.filter(error => error.category === category);
  }

  public getErrorsBySeverity(severity: ErrorSeverity): TrackedError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  public getRecentErrors(timeWindowMs: number = 3600000): TrackedError[] {
    const now = Date.now();
    return this.errors.filter(error => now - error.timestamp <= timeWindowMs);
  }

  public getUnresolvedErrors(): TrackedError[] {
    return this.errors.filter(error => !error.resolved);
  }

  public getStatistics() {
    return {
      total: this.errors.length,
      byCategory: {
        nostr: this.getErrorsByCategory('nostr').length,
        gun: this.getErrorsByCategory('gun').length,
        keplr: this.getErrorsByCategory('keplr').length,
        'circuit-breaker': this.getErrorsByCategory('circuit-breaker').length,
        'performance-monitor': this.getErrorsByCategory('performance-monitor').length,
        security: this.getErrorsByCategory('security').length,
        performance: this.getErrorsByCategory('performance').length
      },
      bySeverity: {
        low: this.getErrorsBySeverity('low').length,
        medium: this.getErrorsBySeverity('medium').length,
        high: this.getErrorsBySeverity('high').length
      },
      unresolved: this.getUnresolvedErrors().length,
      recent: this.getRecentErrors().length
    };
  }

  public clearErrors(): void {
    this.errors = [];
  }

  public resolveError(index: number) {
    if (index >= 0 && index < this.errors.length) {
      this.errors[index].resolved = true;
    }
  }

  public getAnalytics(): ErrorAnalytics {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentErrors = this.getErrors().map(e => ({
      timestamp: e.timestamp,
      type: e.category,
      severity: e.severity,
      message: e.message,
      stack: e.stack,
      context: undefined,
      resolved: e.resolved
    })) as ErrorEvent[];
    const unresolvedErrors = this.errors.filter(e => !e.resolved).map(e => ({
      timestamp: e.timestamp,
      type: e.category,
      severity: e.severity,
      message: e.message,
      stack: e.stack,
      context: undefined,
      resolved: e.resolved
    }));

    const errorTypes = new Map<string, number>();
    this.errors.forEach(error => {
      const count = errorTypes.get(error.category) || 0;
      errorTypes.set(error.category, count + 1);
    });

    return {
      totalErrors: this.errors.length,
      errorRate: recentErrors.length / 3600, // errors per second
      errorTypes,
      recentErrors,
      unresolvedErrors
    };
  }

  public startAnalytics(interval: number = 60000): void {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }
    this.analyticsInterval = setInterval(() => {
      this.getAnalytics();
    }, interval);
  }

  public stopAnalytics(): void {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
  }

  public cleanup(): void {
    this.clearErrors();
  }
}

// Export the singleton instance
export const errorTracker = ErrorTracker.getInstance(); 