// Error types
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

// Service types
export type ServiceStatus = 'initializing' | 'healthy' | 'degraded' | 'error';

export interface ServiceHealthDetails {
  cpuUsage: number;
  memoryUsage: number;
  latency: number;
  errorRate: number;
}

export interface ServiceHealth {
  status: ServiceStatus;
  details: ServiceHealthDetails;
  lastChecked: number;
}

// Chat types
export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  roomId: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: Message;
  createdAt: number;
}

// Nostr types
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

// Performance types
export interface SystemMetrics {
  cpu: {
    usage: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    free: number;
  };
  network: {
    latency: number;
    throughput: number;
    packetLoss: number;
  };
}

export interface RelayMetrics {
  latency: number;
  eventProcessingTime: number;
  subscriptionResponseTime: number;
  lastUpdated: number;
} 