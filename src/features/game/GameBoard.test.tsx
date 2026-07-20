import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getLevel } from '../../content/levels';
import { GameBoard } from './GameBoard';

const callbacks = {
  onSubmit: vi.fn(),
  onOpenTarget: vi.fn(),
  onSelectionChange: vi.fn(),
};

describe('GameBoard hints', () => {
  const level = getLevel(1);
  const target = level.targets.find((candidate) => candidate.id === 'income')!;

  it('shows only the first yellow cell after the first hint', () => {
    const { container } = render(
      <GameBoard
        {...callbacks}
        level={level}
        foundTargetIds={[]}
        hintTarget={target}
        hintRevealedCount={1}
      />,
    );

    expect(container.querySelector('svg')).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Д, строка 4, столбец 4').className,
    ).toContain('hintCurrent');
    expect(container.querySelector('[class*="hintPrevious"]')).not.toBeInTheDocument();
  });

  it('shows previous dashed cells and arrows only between revealed cells', () => {
    const { container } = render(
      <GameBoard
        {...callbacks}
        level={level}
        foundTargetIds={[]}
        hintTarget={target}
        hintRevealedCount={3}
      />,
    );

    expect(container.querySelectorAll('svg line')).toHaveLength(2);
    expect(
      screen.getByLabelText('Д, строка 4, столбец 4').className,
    ).toContain('hintPrevious');
    expect(
      screen.getByLabelText('Х, строка 4, столбец 2').className,
    ).toContain('hintCurrent');
  });
});
