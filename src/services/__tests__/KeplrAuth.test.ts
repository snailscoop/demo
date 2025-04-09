import { KeplrAuth } from '../KeplrAuth';
import { ErrorTracker } from '../ErrorTracker';
import { SecurityManager } from '../SecurityManager';
import { TrackedError } from '../../types/error';

// Mock window.keplr
declare global {
  interface Window {
    keplr: {
      enable: () => Promise<void>;
      getKey: () => Promise<{
        bech32Address: string;
        pubKey: Uint8Array;
      }>;
    };
  }
}

// Create a mock SecurityManager class
class MockSecurityManager extends SecurityManager {
  public checkRateLimit(): boolean {
    return true;
  }
  public sanitizeInput(input: string): string {
    return input;
  }
  public verifySSL(): boolean {
    return true;
  }
}

describe('KeplrAuth', () => {
  let keplrAuth: KeplrAuth;
  let mockErrorTracker: jest.Mocked<ErrorTracker>;
  let mockSecurityManager: MockSecurityManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup window.keplr mock
    window.keplr = {
      enable: jest.fn().mockResolvedValue(undefined),
      getKey: jest.fn().mockResolvedValue({
        bech32Address: 'cosmos1...',
        pubKey: new Uint8Array([1, 2, 3])
      })
    };

    // Setup service mocks
    mockErrorTracker = {
      trackError: jest.fn(),
      getErrors: jest.fn().mockReturnValue([]),
      clearErrors: jest.fn()
    } as unknown as jest.Mocked<ErrorTracker>;

    mockSecurityManager = new MockSecurityManager();

    // Mock static getInstance methods
    jest.spyOn(ErrorTracker, 'getInstance').mockReturnValue(mockErrorTracker);
    jest.spyOn(SecurityManager, 'getInstance').mockReturnValue(mockSecurityManager);

    keplrAuth = KeplrAuth.getInstance();
  });

  describe('initialization', () => {
    it('should initialize successfully when Keplr is available', async () => {
      await expect(keplrAuth.initialize()).resolves.not.toThrow();
    });

    it('should throw error when Keplr is not available', async () => {
      window.keplr = undefined as any;
      await expect(keplrAuth.initialize()).rejects.toThrow('Keplr extension not found');
    });
  });

  describe('login', () => {
    it('should create a new session on successful login', async () => {
      const session = await keplrAuth.login();
      expect(session).toBeDefined();
      expect(session.address).toBe('cosmos1...');
      expect(session.publicKey).toBe('010203');
      expect(session.permissions).toEqual(['read', 'write']);
    });

    it('should track error when login fails', async () => {
      (window.keplr.enable as jest.Mock).mockRejectedValue(new Error('Login failed'));
      await expect(keplrAuth.login()).rejects.toThrow('Login failed');
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'KeplrAuth',
          operation: 'login',
          message: 'Login failed',
          category: 'auth'
        })
      );
    });
  });

  describe('logout', () => {
    it('should remove session', async () => {
      const session = await keplrAuth.login();
      await keplrAuth.logout(session.address);
      expect(keplrAuth.getSession(session.address)).toBeUndefined();
    });

    it('should track error when logout fails', async () => {
      await expect(keplrAuth.logout('test-address')).rejects.toThrow('Session not found');
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'KeplrAuth',
          operation: 'logout',
          message: 'Session not found',
          category: 'auth'
        })
      );
    });
  });

  describe('session management', () => {
    it('should update lastActive when getting session', async () => {
      const session = await keplrAuth.login();
      const initialLastActive = session.lastActive;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrievedSession = keplrAuth.getSession(session.address);
      expect(retrievedSession?.lastActive).toBeGreaterThan(initialLastActive);
    });

    it('should cleanup old sessions', async () => {
      const session = await keplrAuth.login();
      // Set lastActive to be older than timeout
      session.lastActive = Date.now() - (24 * 60 * 60 * 1000 + 1);
      
      await keplrAuth.cleanupOldSessions();
      expect(keplrAuth.getSession(session.address)).toBeUndefined();
    });
  });

  describe('health checks', () => {
    it('should return unhealthy when Keplr is not available', async () => {
      window.keplr = undefined as any;
      const health = await keplrAuth.checkHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.details).toBe('Keplr extension not found');
    });

    it('should return healthy when everything is working', async () => {
      await keplrAuth.login();
      const health = await keplrAuth.checkHealth();
      expect(health.status).toBe('healthy');
    });
  });
}); 