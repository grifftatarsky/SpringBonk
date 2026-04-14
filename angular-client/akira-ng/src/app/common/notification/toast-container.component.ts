import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { NotificationService } from './notification.service';
import { Toast } from './toast.model';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6 pb-[max(env(safe-area-inset-bottom),1rem)]"
      aria-live="polite"
      aria-label="Notifications">
      @for (t of toasts(); track t.id) {
        <div
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-rule bg-bg px-4 py-3 shadow-lg">
          <!-- Icon -->
          <span
            class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            [class]="iconClasses(t.kind)">
            {{ iconGlyph(t.kind) }}
          </span>

          <!-- Message -->
          <div class="min-w-0 flex-1 text-sm text-fg">
            {{ t.message }}
          </div>

          <!-- Optional action -->
          @if (t.action) {
            <button
              type="button"
              class="shrink-0 rounded-md border border-rule px-2 py-0.5 text-xs font-semibold text-accent transition-colors hover:bg-bg-subtle"
              (click)="runAction(t)">
              {{ t.action.label }}
            </button>
          }

          <!-- Dismiss -->
          <button
            type="button"
            class="shrink-0 rounded-md p-0.5 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg"
            aria-label="Dismiss notification"
            (click)="close(t.id)">
            <svg viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
              <path
                d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"></path>
            </svg>
          </button>
        </div>
      }
    </section>
  `,
})
export class ToastContainerComponent {
  private readonly notify: NotificationService = inject(NotificationService);
  readonly toasts: Signal<Toast[]> = computed(() => this.notify.toasts());

  iconGlyph(kind: Toast['kind']): string {
    return kind === 'success' ? '✓' : kind === 'error' ? '!' : 'i';
  }

  iconClasses(kind: Toast['kind']): string {
    switch (kind) {
      case 'success':
        return 'bg-success text-success-subtle';
      case 'error':
        return 'bg-danger text-danger-fg';
      case 'info':
      default:
        return 'bg-accent text-accent-fg';
    }
  }

  close(id: string): void {
    this.notify.dismiss(id);
  }

  runAction(toast: Toast): void {
    try {
      toast.action?.onClick();
    } finally {
      this.notify.dismiss(toast.id);
    }
  }
}
