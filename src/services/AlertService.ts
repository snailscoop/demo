import { ServiceRegistry } from './ServiceRegistry';
import { BaseService } from './BaseService';

export class AlertService extends BaseService {
  private static instance: AlertService | null = null;
  private alerts: Array<{
    id: string;
    message: string;
    type: string;
    category: string;
    priority: number;
    timestamp: Date;
    acknowledged: boolean;
  }> = [];

  private constructor() {
    super();
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  protected async doInitialize(): Promise<void> {
    console.log('Initializing AlertService...');
  }

  protected async doHealthCheck(): Promise<boolean> {
    return true; // Service is healthy if it can process alerts
  }

  protected async doCleanup(): Promise<void> {
    this.clearAlerts();
  }

  public addAlert(message: string, type: string, category: string, priority: number = 1): string {
    const id = Math.random().toString(36).substring(7);
    this.alerts.push({
      id,
      message,
      type,
      category,
      priority,
      timestamp: new Date(),
      acknowledged: false
    });
    return id;
  }

  public getAlerts() {
    return [...this.alerts];
  }

  public getAlertsByType(type: string) {
    return this.alerts.filter(alert => alert.type === type);
  }

  public getAlertsByCategory(category: string) {
    return this.alerts.filter(alert => alert.category === category);
  }

  public acknowledgeAlert(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  public deleteAlert(id: string) {
    this.alerts = this.alerts.filter(a => a.id !== id);
  }

  public clearAlerts() {
    this.alerts = [];
  }
} 