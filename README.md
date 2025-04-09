# SNAILS - Decentralized Video Platform

A decentralized video platform built with React, Vite, and TypeScript, featuring Nostr integration and Keplr authentication.

## Features

- Decentralized video playback
- Real-time chat using Nostr protocol
- Keplr wallet integration
- Performance monitoring
- Error tracking and reporting
- Circuit breaker pattern for fault tolerance
- Memory management
- Service health monitoring

## Prerequisites

- Node.js 16+
- npm 7+
- Keplr wallet browser extension

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/snails.git
cd snails
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
KEPLR_API_KEY=your_api_key
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`.

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Building for Production

Build the application:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Architecture

The application follows a service-oriented architecture with the following components:

- `BaseService`: Abstract base class for all services
- `NostrService`: Handles Nostr protocol integration
- `KeplrAuth`: Manages Keplr wallet authentication
- `PerformanceMonitor`: Tracks application performance
- `ErrorTracker`: Manages error tracking and reporting
- `CircuitBreaker`: Implements circuit breaker pattern
- `MemoryManager`: Handles memory management
- `ServiceRegistry`: Manages service registration and health checks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
