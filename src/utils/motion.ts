/**
 * Whether the user has asked for reduced motion.
 *
 * CSS cannot override a JavaScript-initiated smooth scroll, so callers that pass
 * `behavior: 'smooth'` must consult this first (design spec 23.3, 27).
 * Returns `false` where `matchMedia` is unavailable, e.g. some test environments.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scroll behaviour honouring the reduced-motion preference. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
