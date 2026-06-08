import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shown when the federated Oozengine remote can't be loaded (the micro-frontend
 * is down or unreachable). Routed in as a fallback by app.routes when
 * loadRemoteModule rejects.
 */
@Component({
  selector: 'app-ooze-unavailable',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-[60vh] place-items-center px-4 py-16 text-center text-fg">
      <div class="max-w-md">
        <span class="mx-auto grid size-14 place-items-center rounded-xl border border-rule bg-bg-subtle text-fg-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round" class="size-7" aria-hidden="true">
            <path d="M9 3h6M10 3v4.5L5.2 17a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 7.5V3" />
            <path d="M7.5 13h9" />
          </svg>
        </span>
        <h1 class="mt-6 text-2xl font-semibold tracking-tight">Oozengine is currently unavailable</h1>
        <p class="mt-2 text-sm text-fg-muted">
          …but it’ll return soon! The DM tools are taking a short rest.
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
export class OozeUnavailable {}
