import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

describe('Results Field Review history', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.__FINWORDS_ANALYTICS__ = [];
  });

  it('opens from Results without starting the level again and hides back to Results', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?screen=results&level=1');
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Показать поле' }));
    expect(screen.getByLabelText('Просмотр поля уровня 1')).toBeInTheDocument();
    expect(
      window.__FINWORDS_ANALYTICS__?.some((event) => event.name === 'level_started'),
    ).toBe(false);
    expect(
      window.__FINWORDS_ANALYTICS__?.some(
        (event) => event.name === 'results_field_opened',
      ),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Скрыть поле' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible(),
    );
    expect(
      window.__FINWORDS_ANALYTICS__?.find(
        (event) => event.name === 'results_field_closed',
      )?.payload,
    ).toMatchObject({ closeMethod: 'hide_button', levelId: 1 });
  });

  it('system Back closes an offer first and Field Review second', async () => {
    window.history.replaceState(
      {},
      '',
      '/?screen=results-field&level=1&overlay=course',
    );
    render(<App />);

    expect(screen.getByRole('heading', { name: 'АКЦИЯ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Вернуться к полю' })).toBeInTheDocument();

    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'АКЦИЯ' })).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Просмотр поля уровня 1')).toBeInTheDocument();

    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible(),
    );

    expect(
      window.__FINWORDS_ANALYTICS__?.find(
        (event) => event.name === 'word_offer_closed',
      )?.payload,
    ).toMatchObject({ closeMethod: 'return_to_field', levelId: 1 });
    expect(
      window.__FINWORDS_ANALYTICS__?.find(
        (event) => event.name === 'results_field_closed',
      )?.payload,
    ).toMatchObject({ closeMethod: 'system_back', levelId: 1 });
  });
});
