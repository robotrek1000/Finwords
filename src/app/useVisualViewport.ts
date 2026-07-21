import { useEffect, useState } from 'react';

export type ViewportDensity = 'regular' | 'compact' | 'condensed';

export function getViewportDensity(height: number): ViewportDensity {
  if (height >= 700) {
    return 'regular';
  }
  if (height >= 640) {
    return 'compact';
  }
  return 'condensed';
}

export function readVisualViewportHeight(): number {
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
}

export function useVisualViewport() {
  const [height, setHeight] = useState(readVisualViewportHeight);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setHeight((current) => {
          const next = readVisualViewportHeight();
          return current === next ? current : next;
        });
      });
    };

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    update();

    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return {
    height,
    density: getViewportDensity(height),
  };
}
