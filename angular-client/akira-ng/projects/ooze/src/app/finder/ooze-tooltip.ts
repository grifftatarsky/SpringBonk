import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Wraps any trigger content and shows a small hover/focus tooltip beneath it.
 * The bubble is `w-max` + `max-w-xs` and centered, so it sizes to its text and
 * isn't clipped the way a fixed-width one is near a container edge.
 */
@Component({
  selector: 'ooze-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="group/tt relative inline-flex">
      <ng-content />
      <span
        role="tooltip"
        class="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-xs -translate-x-1/2 rounded-md border border-rule bg-bg px-2.5 py-1.5 text-center text-xs leading-snug text-fg-muted opacity-0 shadow-md transition-opacity group-hover/tt:opacity-100 group-focus-within/tt:opacity-100"
      >
        {{ text() }}
      </span>
    </span>
  `,
})
export class OozeTooltip {
  readonly text = input.required<string>();
}
