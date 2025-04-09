export class TrackedError extends Error {
  constructor(
    message: string,
    public readonly category: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'TrackedError';
  }
}

export interface ErrorDetails {
  message: string;
  category: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  stack?: string;
} 