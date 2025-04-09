import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor() {}
  send() {}
  close() {}
} as any;

// Mock crypto
global.crypto = {
  getRandomValues: (array: any) => array,
  subtle: {
    digest: async () => new ArrayBuffer(32),
  },
} as any;

// Mock TextEncoder/Decoder
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock performance
global.performance = {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  },
} as any;

// Mock window.performance.memory
Object.defineProperty(window.performance, 'memory', {
  value: {
    usedJSHeapSize: 10 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 1000 * 1024 * 1024
  }
});

// Mock services
jest.mock('./services/AlertService', () => ({
  AlertService: jest.fn().mockImplementation(() => ({
    getAlerts: jest.fn().mockReturnValue([]),
    addAlert: jest.fn(),
    acknowledgeAlert: jest.fn(),
    deleteAlert: jest.fn(),
    getAlertsByType: jest.fn(),
    getAlertsByCategory: jest.fn()
  }))
}));

jest.mock('./services/ErrorTracker', () => ({
  ErrorTracker: jest.fn().mockImplementation(() => ({
    getErrors: jest.fn().mockReturnValue([]),
    trackError: jest.fn(),
    getErrorsByCategory: jest.fn(),
    getErrorsBySeverity: jest.fn(),
    getStatistics: jest.fn()
  }))
}));

jest.mock('./services/PerformanceMonitor', () => ({
  PerformanceMonitor: jest.fn().mockImplementation(() => ({
    getMetrics: jest.fn().mockReturnValue([]),
    trackInitialization: jest.fn(),
    trackRelayLatency: jest.fn(),
    trackEventProcessingTime: jest.fn(),
    trackSubscriptionResponseTime: jest.fn(),
    clearMetrics: jest.fn()
  }))
}));

jest.mock('./services/NostrService', () => ({
  NostrService: jest.fn().mockImplementation(() => ({
    getRelays: jest.fn().mockReturnValue([]),
    addRelay: jest.fn(),
    removeRelay: jest.fn(),
    connect: jest.fn(),
    cleanup: jest.fn(),
    isConnected: jest.fn(),
    getPerformanceMetrics: jest.fn()
  }))
})); 