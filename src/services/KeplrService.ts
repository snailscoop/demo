import { BaseService } from './BaseService';
import { ServiceRegistry } from './ServiceRegistry';
import { ErrorTracker } from './ErrorTracker';
import { ErrorCategory, ErrorSeverity } from '../types/error';

interface Session {
  id: string;
  userId: string;
  lastActive: number;
  data: any;
}

export class KeplrService extends BaseService {
  private static instance: KeplrService;
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_SESSIONS = 1000;

  private constructor() {
    super();
  }

  public static getInstance(): KeplrService {
    if (!KeplrService.instance) {
      KeplrService.instance = new KeplrService();
    }
    return KeplrService.instance;
  }

  protected async doInitialize(): Promise<void> {
    try {
      // Initialize session cleanup interval
      setInterval(() => this.cleanupOldSessions(), this.SESSION_TIMEOUT);
      console.log('KeplrService initialized');
    } catch (error) {
      console.error('Failed to initialize KeplrService:', error);
      throw error;
    }
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      // Check if we have too many sessions
      if (this.sessions.size > this.MAX_SESSIONS) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  protected async doCleanup(): Promise<void> {
    await this.cleanup();
  }

  public async cleanupOldSessions(): Promise<void> {
    try {
      const now = Date.now();
      const registry = ServiceRegistry.getInstance();
      const errorTracker = registry.get<ErrorTracker>('ErrorTracker');

      // Remove expired sessions
      for (const [id, session] of this.sessions.entries()) {
        if (now - session.lastActive > this.SESSION_TIMEOUT) {
          this.sessions.delete(id);
        }
      }

      // If still too many sessions, remove oldest ones
      if (this.sessions.size > this.MAX_SESSIONS) {
        const sessionsArray = Array.from(this.sessions.entries());
        sessionsArray.sort((a, b) => a[1].lastActive - b[1].lastActive);
        
        const sessionsToRemove = sessionsArray.slice(0, this.sessions.size - this.MAX_SESSIONS);
        for (const [id] of sessionsToRemove) {
          this.sessions.delete(id);
        }

        if (errorTracker) {
          errorTracker.trackError(
            new Error('Maximum session limit reached, removed oldest sessions'),
            'performance' as ErrorCategory,
            'medium' as ErrorSeverity
          );
        }
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      const registry = ServiceRegistry.getInstance();
      const errorTracker = registry.get<ErrorTracker>('ErrorTracker');
      if (errorTracker) {
        errorTracker.trackError(error as Error, 'authentication' as ErrorCategory, 'medium' as ErrorSeverity);
      }
    }
  }

  public createSession(userId: string, data: any): string {
    const sessionId = Math.random().toString(36).substring(2);
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      lastActive: Date.now(),
      data
    });
    return sessionId;
  }

  public getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
    }
    return session;
  }

  public removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public async cleanup(): Promise<void> {
    this.sessions.clear();
  }
} 