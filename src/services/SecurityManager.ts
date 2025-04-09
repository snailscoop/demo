import { BaseService } from './BaseService';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';

interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number;
}

export class SecurityManager extends BaseService {
  private rateLimits: Map<string, {
    config: RateLimitConfig;
    requests: { timestamp: number }[];
  }> = new Map();

  private allowedTags = ['p', 'br', 'strong'];

  protected async doInitialize(): Promise<void> {
    console.log('Initializing SecurityManager...');
    
    // Set up rate limits
    this.rateLimits.set('nostr', {
      config: { maxRequests: 100, timeWindow: 60000 },
      requests: []
    });

    this.rateLimits.set('gun', {
      config: { maxRequests: 200, timeWindow: 60000 },
      requests: []
    });
  }

  protected async doHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async doCleanup(): Promise<void> {
    this.rateLimits.clear();
  }

  public checkRateLimit(service: string): boolean {
    const limit = this.rateLimits.get(service);
    if (!limit) return true;

    const now = Date.now();
    limit.requests = limit.requests.filter(
      req => now - req.timestamp <= limit.config.timeWindow
    );

    if (limit.requests.length >= limit.config.maxRequests) {
      return false;
    }

    limit.requests.push({ timestamp: now });
    return true;
  }

  public sanitizeInput(input: string): string {
    // Remove all HTML tags except allowed ones
    const sanitized = input.replace(/<[^>]*>/g, (match) => {
      const tag = match.toLowerCase();
      if (this.allowedTags.some(allowed => tag.startsWith(`<${allowed}`))) {
        return match;
      }
      return '';
    });

    return sanitized;
  }

  public verifySSL(url: string): boolean {
    try {
      return url.startsWith('https://');
    } catch (error) {
      const errorTracker = ServiceRegistry.getInstance().get<ErrorTracker>('errorTracker');
      if (errorTracker) {
        errorTracker.trackError(error as Error, 'security', 'high');
      }
      return false;
    }
  }
} 