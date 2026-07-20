import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getLevel } from '../content/levels';
import { createInitialSession } from './session';
import { GameScreen } from './Screens';

const screenCallbacks = {
  onBack: vi.fn(),
  onSubmit: vi.fn(),
  onOpenTarget: vi.fn(),
  onUseHint: vi.fn(),
  onOpenBonusWords: vi.fn(),
};

describe('GameScreen status slot', () => {
  it('shows a banner before a queued mentor message', () => {
    const state = {
      ...createInitialSession('?screen=game&level=1'),
      toast: {
        id: 1,
        message: 'Попробуйте собрать слово по-другому',
        kind: 'info' as const,
      },
    };

    render(
      <GameScreen
        {...screenCallbacks}
        state={state}
        level={getLevel(1)}
        mentor={{ id: 'mentor', message: 'Сообщение наставника' }}
      />,
    );

    expect(screen.getByText('Попробуйте собрать слово по-другому')).toBeInTheDocument();
    expect(screen.queryByText('Сообщение наставника')).not.toBeInTheDocument();
  });

  it('shows the mentor when the status slot has no selection or banner', () => {
    render(
      <GameScreen
        {...screenCallbacks}
        state={createInitialSession('?screen=game&level=1')}
        level={getLevel(1)}
        mentor={{ id: 'mentor', message: 'Сообщение наставника' }}
      />,
    );

    expect(screen.getByText('Сообщение наставника')).toBeInTheDocument();
  });
});
