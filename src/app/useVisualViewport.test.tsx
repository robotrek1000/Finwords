import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getViewportDensity,
  readVisualViewportHeight,
  useVisualViewport,
} from './useVisualViewport';

class ViewportStub extends EventTarget {
  height: number;

  constructor(height: number) {
    super();
    this.height = height;
  }
}

const originalViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');

afterEach(() => {
  vi.restoreAllMocks();
  if (originalViewport) {
    Object.defineProperty(window, 'visualViewport', originalViewport);
  } else {
    Reflect.deleteProperty(window, 'visualViewport');
  }
  if (originalInnerHeight) {
    Object.defineProperty(window, 'innerHeight', originalInnerHeight);
  }
});

describe('visual viewport sizing', () => {
  it('uses innerHeight when visualViewport is unavailable', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 612,
    });

    expect(readVisualViewportHeight()).toBe(612);
    expect(getViewportDensity(readVisualViewportHeight())).toBe('condensed');
  });

  it('switches density when the visible browser viewport resizes', () => {
    const viewport = new ViewportStub(716);
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { result } = renderHook(() => useVisualViewport());
    expect(result.current).toEqual({ height: 716, density: 'regular' });

    act(() => {
      viewport.height = 663;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ height: 663, density: 'compact' });

    act(() => {
      viewport.height = 568;
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toEqual({ height: 568, density: 'condensed' });
  });
});
