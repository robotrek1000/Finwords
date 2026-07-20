import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton depth', () => {
  it('uses raised depth for Surface buttons', () => {
    render(<IconButton icon="settings" label="Surface" />);
    const button = screen.getByRole('button', { name: 'Surface' });
    expect(button.className).toContain('surface');
    expect(button.className).toContain('raised');
  });

  it('keeps Ghost buttons flat', () => {
    render(<IconButton icon="close" label="Ghost" variant="ghost" />);
    const button = screen.getByRole('button', { name: 'Ghost' });
    expect(button.className).toContain('ghost');
    expect(button.className).toContain('flat');
  });
});
