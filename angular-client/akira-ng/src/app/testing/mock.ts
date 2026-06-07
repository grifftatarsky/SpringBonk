import { vi, type Mock } from 'vitest';

/**
 * Vitest equivalents of Jasmine's `jasmine.SpyObj<T>` / `jasmine.createSpyObj`.
 * Each listed method becomes a `vi.fn()`; non-method members keep their type.
 */
export type SpyObj<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : T[K];
};

export function createSpyObj<T>(methods: Array<keyof T>): SpyObj<T> {
  const spy = {} as Record<PropertyKey, unknown>;
  for (const method of methods) {
    spy[method as PropertyKey] = vi.fn();
  }
  return spy as SpyObj<T>;
}
