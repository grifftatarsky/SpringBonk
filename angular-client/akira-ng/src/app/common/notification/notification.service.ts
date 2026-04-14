import { Injectable, signal, WritableSignal } from '@angular/core';
import { Toast, ToastKind, ToastOptions } from './toast.model';

const DEFAULT_TIMEOUT_MS = 6000;
const DEDUPE_WINDOW_MS = 800;
const MAX_VISIBLE = 4;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts: WritableSignal<Toast[]> = signal<Toast[]>([]);

  private lastKey = '';
  private lastAt = 0;

  success(message: string, options?: ToastOptions | number): void {
    this.push('success', message, options);
  }

  error(message: string, options?: ToastOptions | number): void {
    this.push('error', message, options);
  }

  info(message: string, options?: ToastOptions | number): void {
    this.push('info', message, options);
  }

  dismiss(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  dismissAll(): void {
    this.toasts.set([]);
  }

  private push(kind: ToastKind, message: string, options?: ToastOptions | number): void {
    const resolved: ToastOptions =
      typeof options === 'number' ? { timeoutMs: options } : options ?? {};
    const timeoutMs = resolved.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const persistent = resolved.persistent ?? false;
    const action = resolved.action ?? null;

    const key = `${kind}:${message}`;
    const now = Date.now();
    if (key === this.lastKey && now - this.lastAt < DEDUPE_WINDOW_MS) {
      return;
    }
    this.lastKey = key;
    this.lastAt = now;

    const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const toast: Toast = {
      id,
      kind,
      message,
      timeoutMs,
      persistent,
      action,
      createdAt: now,
    };

    this.toasts.update((list) => {
      const next = [toast, ...list];
      // Cap visible stack — drop oldest non-persistent beyond the limit.
      if (next.length <= MAX_VISIBLE) return next;
      const keep: Toast[] = [];
      let dropped = 0;
      for (const t of next) {
        if (next.length - dropped <= MAX_VISIBLE) {
          keep.push(t);
        } else if (t.persistent) {
          keep.push(t);
        } else {
          dropped++;
        }
      }
      return keep;
    });

    if (!persistent && timeoutMs > 0) {
      window.setTimeout(() => this.dismiss(id), timeoutMs);
    }
  }
}
