# SNAILS Documentation 🐌

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services](#services)
4. [Testing](#testing)
5. [Monitoring](#monitoring)
6. [Deployment](#deployment)

## Overview

SNAILS is a decentralized video sharing platform built with React, TypeScript, and Gun.js. It provides a secure, scalable, and performant solution for video content distribution.

## Architecture

### Core Components
- **ServiceRegistry**: Central service management
- **NostrService**: Decentralized communication
- **ErrorTracker**: Error monitoring and reporting
- **AlertService**: Real-time notifications
- **PerformanceMonitor**: System metrics tracking

### Data Flow
1. User actions trigger service calls
2. Services communicate through ServiceRegistry
3. Performance metrics are tracked
4. Errors are logged and alerts are generated
5. UI updates reflect system state

## Services

### ServiceRegistry
- Singleton pattern for service management
- Type-safe service registration and retrieval
- Service lifecycle management

### NostrService
- WebSocket-based communication
- Relay management
- Event handling
- Performance tracking

### ErrorTracker
- Error categorization
- Severity levels
- Error correlation
- Automated reporting

### AlertService
- Real-time notifications
- Priority-based alerts
- Category filtering
- Alert management

### PerformanceMonitor
- Resource monitoring
- Latency tracking
- Memory usage
- Performance alerts

## Testing

### Test Suite
- Unit tests for all services
- Integration tests for service interactions
- Performance benchmarks
- Error scenario testing

### Running Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

## Monitoring

### Metrics
- Service initialization time
- Memory usage
- Relay latency
- Event processing time
- Error rates

### Alerts
- High latency notifications
- Error alerts
- Resource usage warnings
- System status updates

## Deployment

### Requirements
- Node.js 16+
- npm 7+
- Redis (optional, for caching)

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start services: `npm run start:gun`
5. Start the application: `npm start`

### Environment Variables
```env
REACT_APP_GUN_SERVER=ws://localhost:8765/gun
REACT_APP_NOSTR_RELAYS=wss://relay.damus.io,wss://nostr.bitcoiner.social
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details 