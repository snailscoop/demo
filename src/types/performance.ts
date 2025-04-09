export interface PerformanceMetrics {
  eventProcessingTime: number[];
  subscriptionResponseTime: number[];
  messageDeliveryTime: number[];
  relayLatency: Record<string, number[]>;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

export interface PerformanceMonitor {
  trackEventProcessingTime(duration: number): void;
  trackSubscriptionResponseTime(duration: number): void;
  trackMessageDeliveryTime(duration: number): void;
  trackRelayLatency(relayUrl: string, latency: number): void;
  getMetrics(): PerformanceMetrics;
  clearMetrics(): void;
} 