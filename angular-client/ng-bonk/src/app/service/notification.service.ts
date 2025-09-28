import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private lastKey = '';
  private lastAt = 0;
  constructor(private readonly messages: MessageService) {}

  success(message: string): void {
    this.openDedupe('success', message, 3000);
  }

  error(message: string): void {
    this.openDedupe('error', message, 5000);
  }

  info(message: string): void {
    this.openDedupe('info', message, 3000);
  }

  private openDedupe(
    severity: 'success' | 'error' | 'info',
    message: string,
    duration: number
  ): void {
    const key = `${severity}:${message}`;
    const now = Date.now();
    if (key === this.lastKey && now - this.lastAt < 600) return;
    this.lastKey = key;
    this.lastAt = now;
    this.messages.add({
      severity,
      summary: this.summaryFor(severity),
      detail: message,
      life: duration,
    });
  }

  private summaryFor(severity: 'success' | 'error' | 'info'): string {
    switch (severity) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      default:
        return 'Notice';
    }
  }
}
