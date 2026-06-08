import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Flat per-type die silhouette for the small per-result chips — a recognizable
 * little glyph (hexagon for d20, square for d6, …), not the full 3D model.
 * Strokes with currentColor and fills its container.
 */
@Component({
  selector: 'ooze-die-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './die-icon.html',
})
export class DieIcon {
  readonly die = input.required<number>();
}
