import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Overlays } from './Overlays';
import { createInitialSession } from './session';

function renderOverlay(overlay: ReturnType<typeof createInitialSession>['overlay']) {
  const onToggleSetting = vi.fn();
  const state = {
    ...createInitialSession(),
    overlay,
  };

  render(
    <Overlays
      state={state}
      onClose={vi.fn()}
      onCloseOffer={vi.fn()}
      onOfferCta={vi.fn()}
      onExitConfirmed={vi.fn()}
      onOpenFeedback={vi.fn()}
      onToggleSetting={onToggleSetting}
      onClaimRegular={vi.fn()}
      onClaimGolden={vi.fn()}
    />,
  );

  return { onToggleSetting };
}

describe('supporting overlays', () => {
  it('exposes separate Music and Sound settings', async () => {
    const user = userEvent.setup();
    const { onToggleSetting } = renderOverlay('settings');

    expect(screen.getByRole('button', { name: 'Музыка' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Звук' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Музыка' }));
    await user.click(screen.getByRole('button', { name: 'Звук' }));
    expect(onToggleSetting).toHaveBeenNthCalledWith(1, 'music');
    expect(onToggleSetting).toHaveBeenNthCalledWith(2, 'sound');
  });

  it('shows the dynamic 500-character feedback counter', async () => {
    const user = userEvent.setup();
    renderOverlay('feedback');

    expect(screen.getByText('Как вам игра?')).toBeVisible();
    expect(screen.getByText('До 500 символов')).toBeVisible();
    await user.type(screen.getByLabelText('Ваш отзыв'), 'Тест');
    expect(screen.getByText('4/500')).toBeVisible();
  });

  it('renders the empty bonus-words state at zero progress', () => {
    renderOverlay('bonus-words');

    expect(screen.getByText('Пока бонусных слов нет')).toBeInTheDocument();
    expect(screen.getByText('На этом уровне найдено 0 из 4')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Закрыть', hidden: true })).toHaveLength(2);
  });
});
