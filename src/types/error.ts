export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory = 
  | 'nostr'
  | 'keplr' 
  | 'performance'
  | 'security'
  | 'system'
  | 'circuit-breaker'
  | 'memory'
  | 'network';

export interface TrackedError {
  id?: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity; 
  timestamp: number;
  resolved: boolean;
  originalError?: Error;
  stack?: string;
  context?: Record<string, any>;
}

export interface ErrorMetrics {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  unresolved: number;
  recent: number;
  errorRate: number;
}

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
  errorRate: number; // errors per second
  errorTypes: Map<string, number>;
  recentErrors: ErrorEvent[];
  unresolvedErrors: ErrorEvent[];
} 