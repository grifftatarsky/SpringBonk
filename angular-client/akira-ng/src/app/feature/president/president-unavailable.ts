import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shown when the federated President remote can't be loaded (the micro-frontend
 * is down or unreachable). Routed in as a fallback by app.routes when
 * loadRemoteModule rejects.
 */
@Component({
  selector: 'app-president-unavailable',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-[60vh] place-items-center px-4 py-16 text-center text-fg">
      <div class="max-w-md">
        <span class="mx-auto grid size-14 place-items-center rounded-xl border border-rule bg-bg-subtle text-2xl">
          🃏
        </span>
        <h1 class="mt-6 text-2xl font-semibold tracking-tight">President is currently unavailable</h1>
        <p class="mt-2 text-sm text-fg-muted">
          …but it’ll deal you in soon! The table is being reshuffled.
        </p>
        <a routerLink="/"
           class="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Return home
        </a>
      </div>
    </div>
  `,
})
export class PresidentUnavailable {}
