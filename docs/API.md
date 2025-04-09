# SNAILS API Documentation

## Core Services

### ServiceRegistry
```typescript
// Get service instance
const service = ServiceRegistry.getInstance().get<ServiceType>('serviceName');

// Register new service
ServiceRegistry.getInstance().register('serviceName', serviceInstance, ['dependency1', 'dependency2']);

// Initialize all services
await ServiceRegistry.getInstance().initializeAll();
```

### ErrorTracker
```typescript
// Track an error
errorTracker.trackError(error, 'category', 'severity');

// Get recent errors
const errors = errorTracker.getErrors();

// Clear error history
errorTracker.clearErrors();
```

### MemoryManager
```typescript
// Get memory history
const history = memoryManager.getMemoryHistory();

// Check current memory usage
const usage = process.memoryUsage();
```

### CircuitBreaker
```typescript
// Register a circuit
circuitBreaker.registerCircuit('serviceName', {
  maxFailures: 3,
  resetTimeout: 60000,
  fallback: async () => { /* fallback logic */ }
});

// Execute with circuit breaker
const result = await circuitBreaker.execute('serviceName', async () => {
  // operation logic
});
```

### PerformanceMonitor
```typescript
// Get current metrics
const metrics = performanceMonitor.getMetrics();

// Check thresholds
if (metrics.cpu > 0.8) {
  // Handle high CPU
}
```

### SecurityManager
```typescript
// Check rate limit
if (securityManager.checkRateLimit('serviceName')) {
  // Proceed with operation
}

// Sanitize input
const safeInput = securityManager.sanitizeInput(userInput);

// Verify SSL
if (securityManager.verifySSL(url)) {
  // Proceed with secure connection
}
```

## Nostr Integration
```typescript
// Publish event
await nostrService.publishEvent(kind, content, tags);

// Subscribe to events
const unsubscribe = await nostrService.subscribeToEvents(filters, callback);
```

## Gun Integration
```typescript
// Put data
await gunService.put(key, data);

// Get data
const data = await gunService.get(key);

// Subscribe to changes
const unsubscribe = gunService.subscribe(key, callback);
```

## Keplr Integration
```typescript
// Connect wallet
const address = await keplrService.connect();

// Sign message
const signature = await keplrService.signMessage(message);

// Get current address
const currentAddress = keplrService.getAddress();
```

## Error Categories
- nostr
- gun
- keplr
- circuit-breaker
- performance-monitor
- security
- performance

## Error Severity Levels
- low
- medium
- high

## Rate Limits
- Nostr: 100 requests per minute
- Gun: 200 requests per minute

## Performance Thresholds
- CPU: 80%
- Memory: 85%
- Network Latency: 1000ms 