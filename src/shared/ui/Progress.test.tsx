import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CircularProgress } from './Progress';

describe('CircularProgress responsive size', () => {
  it('accepts a CSS length for responsive rings', () => {
    render(
      <CircularProgress
        current={1}
        max={2}
        size="var(--responsive-ring-size)"
      />,
    );

    expect(screen.getByRole('progressbar').style.getPropertyValue('--ring-size')).toBe(
      'var(--responsive-ring-size)',
    );
  });
});
