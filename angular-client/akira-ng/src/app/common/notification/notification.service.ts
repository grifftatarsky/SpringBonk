import { Injectable, signal, WritableSignal } from '@angular/core';
import { Toast, ToastKind } from './toast.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // region State

  readonly toasts: WritableSignal<Toast[]> = signal<Toast[]>([]);
  private lastKey: string = '';
  private lastAt: number = 0;

  // endregion

  // region API
  private readonly defaultTimeout = 15000;

  success(message: string, ms: number = this.defaultTimeout): void {
    this.push('success', message, ms);
  }

  error(message: string, ms: number = this.defaultTimeout): void {
    this.push('error', message, ms);
  }

  info(message: string, ms: number = this.defaultTimeout): void {
    this.push('info', message, ms);
  }

  dismiss(id: string) {
    this.toasts.update((list: Toast[]): Toast[] => list.filter((t: Toast): boolean => t.id !== id));
  }

  // endregion

  // region Internals

  private push(kind: ToastKind, message: string, timeoutMs: number): void {
    const key: string = `${kind}:${message}`;
    const now: number = Date.now();

    if (key === this.lastKey && now - this.lastAt < 800) return;

    this.lastKey = key;
    this.lastAt = now;

    const id: string = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const toast: Toast = { id, kind, message, timeoutMs, createdAt: now };

    this.toasts.update((list: Toast[]): Toast[] => [toast, ...list]);

    window.setTimeout((): void => this.dismiss(id), timeoutMs);
  }

  // endregion
}
