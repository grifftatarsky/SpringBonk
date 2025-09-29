import { Component, computed, inject, Signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService } from './notification.service';
import { Toast } from './toast.model';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgClass],
  template: `
    <section
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex flex-col
         items-center sm:items-end gap-2 p-4 sm:p-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
      @for (t of toasts(); track t.id) {
        <div
          class="pointer-events-auto w-full max-w-sm rounded-2xl border border-black/5 bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-md
             dark:border-white/10 dark:bg-gray-900/95 dark:ring-white/10 transition ease-out duration-200
             data-[state=enter]:translate-y-2 data-[state=enter]:opacity-0 data-[state=show]:translate-y-0 data-[state=show]:opacity-100
             self-center sm:self-end">
          <div class="flex items-start gap-3">
            <div>
              <span [ngClass]="iconClass(t.kind)"
                    class="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold">
                {{ iconGlyph(t.kind) }}
              </span>
            </div>

            <div class="min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100">
              {{ t.message }}
            </div>

            <button
              type="button"
              class="rounded-md p-1 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20 dark:text-gray-400 dark:hover:text-white dark:focus:ring-white/20"
              aria-label="Close notification"
              (click)="close(t.id)">
              ✕
            </button>
          </div>
        </div>
      }
    </section>
  `,
})
export class ToastContainerComponent {
  // region DI
  private readonly notify: NotificationService = inject(NotificationService);
  // endregion

  // region Viewmodel

  readonly toasts: Signal<Toast[]> = computed((): Toast[] => this.notify.toasts());

  iconGlyph(kind: 'success' | 'error' | 'info') {
    return kind === 'success' ? '✓' : kind === 'error' ? '!' : 'i';
  }

  iconClass(kind: 'success' | 'error' | 'info') {
    return {
      'bg-green-600 text-white': kind === 'success',
      'bg-red-600 text-white': kind === 'error',
      'bg-blue-600 text-white': kind === 'info',
    };
  }

  // endregion

  // region Actions

  close(id: string): void {
    this.notify.dismiss(id);
  }

  // endregion
}
