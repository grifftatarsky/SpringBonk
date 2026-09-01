/**
 * Whether the viewer has asked for less motion.
 *
 * Read once at module load rather than subscribed to: everything gated on it
 * here is decided at mount — whether the globe starts turning, whether the
 * basemap cross-fades — and changing the OS setting mid-session is not worth a
 * listener that would have to unwind an animation already in flight.
 */
export const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
