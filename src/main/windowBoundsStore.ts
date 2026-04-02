// src/main/windowBoundsStore.ts
import type { Display } from 'electron';

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_BOUNDS: Pick<WindowBounds, 'width' | 'height'> = {
  width: 960,
  height: 640,
};

/**
 * Check if a point (x, y) is within any of the given displays.
 */
export function isWithinDisplays(x: number, y: number, displays: Display[]): boolean {
  return displays.some((display) => {
    const { x: dx, y: dy, width, height } = display.bounds;
    return x >= dx && x < dx + width && y >= dy && y < dy + height;
  });
}

/**
 * Get bounds to use for window creation.
 * Returns saved bounds if they're within visible display area,
 * otherwise returns default size (centered by OS).
 */
export function getRestoredBounds(
  saved: WindowBounds | undefined,
  displays: Display[],
): WindowBounds | Pick<WindowBounds, 'width' | 'height'> {
  if (!saved) return DEFAULT_BOUNDS;
  if (!isWithinDisplays(saved.x, saved.y, displays)) return DEFAULT_BOUNDS;
  return saved;
}
