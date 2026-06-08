import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { buildFaces, pointsOf, shapeOf } from './dice-geometry';

/** Outline tone — neutral, or the green/red of advantage/disadvantage. */
export type DieTone = 'default' | 'adv' | 'dis';

/**
 * A real 3D polyhedral die: HTML face divs placed in 3D space (see
 * dice-geometry) inside a `preserve-3d` container that tumbles while
 * {@link rolling}. Rendered as a wireframe (stroked faces, back edges visible).
 * Uses only CSS 3D transforms, so it works across Chrome, Firefox and Safari —
 * unlike 3D transforms on SVG elements, which only Chrome honours.
 */
@Component({
  selector: 'ooze-die-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './die-3d.html',
  styleUrl: './die-3d.css',
})
export class Die3d {
  readonly die = input.required<number>();
  readonly rolling = input(false);
  readonly tone = input<DieTone>('default');
  /** Edge length of the die's bounding box, in pixels. */
  readonly size = input(92);

  protected readonly faces = computed(() => buildFaces(this.die(), this.size()));
  protected readonly shape = computed(() => shapeOf(this.die()));
  protected readonly points = computed(() => pointsOf(this.die()));
}
