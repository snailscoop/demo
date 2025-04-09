import { SecurityManager } from '../SecurityManager';
import { ServiceRegistry } from '../ServiceRegistry';
import { ErrorTracker } from '../ErrorTracker';
import { TrackedError } from '../../types/error';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;
  let registry: ServiceRegistry;
  let errorTracker: ErrorTracker;

  beforeEach(() => {
    registry = ServiceRegistry.getInstance();
    errorTracker = ErrorTracker.getInstance();
    securityManager = new SecurityManager();
    
    registry.register('errorTracker', errorTracker);
    registry.register('securityManager', securityManager);
  });

  afterEach(() => {
    registry.clear();
  });

  it('should initialize correctly', async () => {
    await securityManager.initialize();
    expect(securityManager).toBeDefined();
  });

  it('should enforce rate limits', async () => {
    await securityManager.initialize();
    
    // Test Nostr rate limit (100/min)
    for (let i = 0; i < 100; i++) {
      expect(securityManager.checkRateLimit('nostr')).toBe(true);
    }
    expect(securityManager.checkRateLimit('nostr')).toBe(false);

    // Test Gun rate limit (200/min)
    for (let i = 0; i < 200; i++) {
      expect(securityManager.checkRateLimit('gun')).toBe(true);
    }
    expect(securityManager.checkRateLimit('gun')).toBe(false);
  });

  it('should sanitize input', async () => {
    await securityManager.initialize();
    
    const input = '<script>alert("xss")</script><p>Hello</p><br><strong>World</strong>';
    const sanitized = securityManager.sanitizeInput(input);
    
    expect(sanitized).toBe('<p>Hello</p><br><strong>World</strong>');
  });

  it('should verify SSL', async () => {
    await securityManager.initialize();
    
    expect(securityManager.verifySSL('https://example.com')).toBe(true);
    expect(securityManager.verifySSL('http://example.com')).toBe(false);
  });

  it('should track errors in ErrorTracker', async () => {
    await securityManager.initialize();
    
    // Trigger rate limit error
    for (let i = 0; i < 101; i++) {
      securityManager.checkRateLimit('nostr');
    }
    
    const errors = errorTracker.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    const error = errors[0];
    if ('category' in error) {
      expect(error.category).toBe('security');
    }
  });
}); 