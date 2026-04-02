// src/main/__tests__/windowBoundsStore.test.ts
import { describe, it, expect } from 'vitest';
import { getRestoredBounds, isWithinDisplays } from '../windowBoundsStore';

describe('windowBoundsStore', () => {
  const DEFAULT_BOUNDS = { width: 960, height: 640 };

  describe('getRestoredBounds', () => {
    it('returns default bounds when no saved bounds', () => {
      const result = getRestoredBounds(undefined, [
        { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      ] as any);
      expect(result).toEqual(DEFAULT_BOUNDS);
    });

    it('returns saved bounds when within display', () => {
      const saved = { x: 100, y: 100, width: 960, height: 640 };
      const displays = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }] as any;
      const result = getRestoredBounds(saved, displays);
      expect(result).toEqual(saved);
    });

    it('returns default bounds when saved position is off-screen', () => {
      const saved = { x: 5000, y: 5000, width: 960, height: 640 };
      const displays = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }] as any;
      const result = getRestoredBounds(saved, displays);
      expect(result).toEqual(DEFAULT_BOUNDS);
    });

    it('handles multi-monitor setup', () => {
      const saved = { x: 2000, y: 100, width: 960, height: 640 };
      const displays = [
        { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
        { bounds: { x: 1920, y: 0, width: 2560, height: 1440 } },
      ] as any;
      const result = getRestoredBounds(saved, displays);
      expect(result).toEqual(saved);
    });
  });

  describe('isWithinDisplays', () => {
    it('returns true when point is within a display', () => {
      const displays = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }] as any;
      expect(isWithinDisplays(100, 100, displays)).toBe(true);
    });

    it('returns false when point is outside all displays', () => {
      const displays = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }] as any;
      expect(isWithinDisplays(5000, 5000, displays)).toBe(false);
    });
  });
});
