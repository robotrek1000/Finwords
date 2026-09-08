import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducedMotion } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  BoardView,
  FoundTarget,
} from '../../infra/api/generated/data-contracts';
import { CellViewStateEnum } from '../../infra/api/generated/data-contracts';
import { BoardViewGameBoard } from './BoardViewGameBoard';

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

function makeBoard(size: number): BoardView {
  const cells = Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    return {
      row,
      col,
      letter: String.fromCharCode(1040 + index),
      state: CellViewStateEnum.Letter,
      belongsToFoundWord: false,
    };
  });
  return { size, cells: cells.reverse() };
}

const target: FoundTarget = {
  targetId: '8f8fad5b-d9cb-469f-a165-808677289523',
  word: 'АБ',
  definition: 'Тестовое найденное слово.',
  foundAt: '2026-08-21T12:00:00.000Z',
  foundSequence: 1,
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  ],
};

const callbacks = {
  onOpenTarget: vi.fn(),
  onSelectionChange: vi.fn(),
  onSelectionEnd: vi.fn(),
};

describe('BoardViewGameBoard', () => {
  let pointedElement: Element | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => pointedElement),
    });
  });

  afterEach(() => {
    pointedElement = null;
  });

  it.each([3, 4, 5, 6])('renders a shuffled %sx%s BoardView by coordinates', (size) => {
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(size)}
        foundTargets={[]}
      />,
    );

    const gameBoard = screen.getByLabelText('Игровое поле');
    expect(gameBoard).toHaveAttribute('data-size', String(size));
    expect(withinBoardButtons(gameBoard)).toHaveLength(size * size);
    expect(screen.getByLabelText('А, строка 1, столбец 1')).toBeVisible();
  });

  it('extends orthogonally, rejects reuse, and backtracks to the previous cell', () => {
    const board = makeBoard(3);
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={board}
        foundTargets={[]}
      />,
    );

    const first = screen.getByLabelText('А, строка 1, столбец 1');
    const second = screen.getByLabelText('Б, строка 1, столбец 2');
    const gameBoard = screen.getByLabelText('Игровое поле');

    fireEvent.pointerDown(first, { pointerId: 7 });
    pointedElement = second;
    fireEvent.pointerMove(gameBoard, { pointerId: 7, clientX: 10, clientY: 10 });
    pointedElement = first;
    fireEvent.pointerMove(gameBoard, { pointerId: 7, clientX: 11, clientY: 11 });
    fireEvent.pointerUp(gameBoard, { pointerId: 7 });

    expect(callbacks.onSelectionChange).toHaveBeenLastCalledWith('А', ['1:1']);
    expect(callbacks.onSelectionEnd).toHaveBeenCalledWith(['1:1']);
  });

  it('shows previous and current hint letters with connectors but no filled hint cells', () => {
    const { container } = render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[]}
        revealedCells={[
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ]}
      />,
    );

    expect(screen.getByLabelText('А, строка 1, столбец 1').className).toContain(
      'hintPrevious',
    );
    expect(screen.getByLabelText('Б, строка 1, столбец 2').className).toContain(
      'hintCurrent',
    );
    expect(container.querySelectorAll('[data-hint-connector]')).toHaveLength(1);
    expect(container.querySelector('[data-hint-fill]')).not.toBeInTheDocument();
  });

  it('opens definitions from server found targets and blocks found cells from selection', async () => {
    const user = userEvent.setup();
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[target]}
      />,
    );

    const found = screen.getByRole('button', {
      name: 'Б, строка 1, столбец 2. Найденное слово АБ. Открыть информацию',
    });
    await user.click(found);

    expect(callbacks.onOpenTarget).toHaveBeenCalledWith(target);
    expect(callbacks.onSelectionChange).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' '])('собирает и отправляет тот же ортогональный путь с клавиши %s, что и pointer', (activationKey) => {
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[]}
      />,
    );

    const first = screen.getByLabelText('А, строка 1, столбец 1');
    const second = screen.getByLabelText('Б, строка 1, столбец 2');
    first.focus();

    fireEvent.keyDown(first, { key: activationKey });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: activationKey });

    expect(callbacks.onSelectionChange).toHaveBeenLastCalledWith('АБ', ['1:1', '1:2']);
    expect(callbacks.onSelectionEnd).toHaveBeenCalledWith(['1:1', '1:2']);
  });

  it('не добавляет диагональную или повторную клетку и отменяет активный путь по Escape', () => {
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[]}
      />,
    );

    const first = screen.getByLabelText('А, строка 1, столбец 1');
    const diagonal = screen.getByLabelText('Д, строка 2, столбец 2');

    first.focus();
    fireEvent.keyDown(first, { key: 'Enter' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(callbacks.onSelectionChange).toHaveBeenLastCalledWith('АБ', ['1:1', '1:2']);

    diagonal.focus();
    fireEvent.keyDown(diagonal, { key: 'Enter' });
    expect(callbacks.onSelectionChange).toHaveBeenCalledTimes(2);
    expect(callbacks.onSelectionChange).toHaveBeenLastCalledWith('АБ', ['1:1', '1:2']);
    expect(callbacks.onSelectionEnd).toHaveBeenCalledWith(['1:1', '1:2']);

    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(callbacks.onSelectionChange).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(first, { key: 'Escape' });
    expect(callbacks.onSelectionChange).toHaveBeenLastCalledWith('', []);
    expect(callbacks.onSelectionEnd).toHaveBeenCalledTimes(1);
  });

  it('активация найденной клавиатурой открывает definition и не добавляет locked-клетку в путь', async () => {
    const user = userEvent.setup();
    const lockedTarget: FoundTarget = {
      ...target,
      targetId: '8f8fad5b-d9cb-469f-a165-808677289529',
      word: 'ЕЖ',
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
    };
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[lockedTarget]}
      />,
    );

    const first = screen.getByLabelText('А, строка 1, столбец 1');
    const locked = screen.getByRole('button', {
      name: 'Д, строка 2, столбец 2. Найденное слово ЕЖ. Открыть информацию',
    });

    first.focus();
    fireEvent.keyDown(first, { key: 'Enter' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    locked.focus();
    await user.keyboard('{Enter}');

    expect(callbacks.onSelectionChange).toHaveBeenLastCalledWith('АБ', ['1:1', '1:2']);
    expect(callbacks.onOpenTarget).toHaveBeenCalledWith(lockedTarget);
    expect(callbacks.onSelectionEnd).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(locked);
  });

  it('opens the target with the greatest foundSequence on an overlapping cell regardless of array order', async () => {
    const user = userEvent.setup();
    const olderTarget: FoundTarget = {
      ...target,
      targetId: '8f8fad5b-d9cb-469f-a165-808677289524',
      word: 'СТАРОЕ',
      foundSequence: 1,
    };
    const newerTarget: FoundTarget = {
      ...target,
      targetId: '8f8fad5b-d9cb-469f-a165-808677289525',
      word: 'НОВОЕ',
      foundSequence: 2,
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    };
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[newerTarget, olderTarget]}
      />,
    );

    const overlappingCell = screen.getByRole('button', {
      name: 'А, строка 1, столбец 1. Найденное слово НОВОЕ. Открыть информацию',
    });
    await user.click(overlappingCell);

    expect(callbacks.onOpenTarget).toHaveBeenCalledWith(newerTarget);
  });

  it('disables every cell while a mutation or interim completion is active', () => {
    render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[]}
        inputDisabled
      />,
    );

    expect(screen.getByLabelText('Игровое поле')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByRole('button')).toEqual(
      expect.arrayContaining([expect.objectContaining({ disabled: true })]),
    );
    screen.getAllByRole('button').forEach((cell) => expect(cell).toBeDisabled());
  });
});

function withinBoardButtons(board: HTMLElement): HTMLButtonElement[] {
  return Array.from(board.querySelectorAll('button'));
}

describe('found-target presentation', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  const threeCellTarget: FoundTarget = {
    targetId: '8f8fad5b-d9cb-469f-a165-808677289526',
    word: 'АБВ',
    definition: 'Трёхбуквенное целевое слово.',
    foundAt: '2026-08-21T12:00:00.000Z',
    foundSequence: 1,
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ],
  };

  it('does not render folded-corner/bookmark markers inside found cells', () => {
    const { container } = render(
      <BoardViewGameBoard
        {...callbacks}
        board={makeBoard(3)}
        foundTargets={[threeCellTarget]}
      />,
    );

    expect(container.querySelector('[data-found-marker]')).not.toBeInTheDocument();
  });
});

describe('course-linked КУРС pulse lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const linkedTarget: FoundTarget = {
    targetId: '8f8fad5b-d9cb-469f-a165-808677289527',
    word: 'КУРС',
    definition: 'Ценная бумага, которая подтверждает долю владения компанией.',
    foundAt: '2026-08-21T12:00:00.000Z',
    foundSequence: 1,
    cells: [
      { row: 2, col: 4 },
      { row: 2, col: 3 },
      { row: 1, col: 3 },
      { row: 0, col: 3 },
      { row: 0, col: 2 },
    ],
  };

  const ordinaryTarget: FoundTarget = {
    targetId: '8f8fad5b-d9cb-469f-a165-808677289528',
    word: 'ФОНД',
    definition: 'Способ объединить деньги многих инвесторов.',
    foundAt: '2026-08-21T12:01:00.000Z',
    foundSequence: 2,
    cells: [
      { row: 1, col: 4 },
      { row: 0, col: 4 },
      { row: 0, col: 5 },
      { row: 1, col: 5 },
    ],
  };

  it('does not pulse when КУРС is already found on initial mount/resume', () => {
    const { container } = render(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[linkedTarget]}
      />,
    );

    const group = container.querySelector('[data-found-group]');
    expect(group).not.toBeNull();
    expect(group).not.toHaveAttribute('data-pulse-iterations');
    expect(group).not.toHaveAttribute('data-pulse-duration-ms');
  });

  it('adds the 4-iteration / 3.2s pulse to the whole found SVG group on rerender from none', () => {
    const { container, rerender } = render(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[]}
      />,
    );

    rerender(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[linkedTarget]}
      />,
    );

    const group = container.querySelector('[data-found-group]');
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute('data-pulse-iterations', '4');
    expect(group).toHaveAttribute('data-pulse-duration-ms', '3200');

  });

  it('pulses only the newly added КУРС target group when an ordinary target already exists', () => {
    const { container, rerender } = render(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[ordinaryTarget]}
      />,
    );

    rerender(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[ordinaryTarget, linkedTarget]}
      />,
    );

    const groups = container.querySelectorAll('[data-found-group]');
    expect(groups).toHaveLength(2);
    expect(groups[0]).not.toHaveAttribute('data-pulse-iterations');
    expect(groups[0]).not.toHaveAttribute('data-pulse-duration-ms');
    expect(groups[1]).toHaveAttribute('data-pulse-iterations', '4');
    expect(groups[1]).toHaveAttribute('data-pulse-duration-ms', '3200');
  });

  it('clears the pulse after the animation completes', () => {
    const { container, rerender } = render(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[]}
      />,
    );

    rerender(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[linkedTarget]}
      />,
    );
    expect(
      container.querySelector('[data-found-group]'),
    ).toHaveAttribute('data-pulse-iterations', '4');

    rerender(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[linkedTarget, ordinaryTarget]}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(3_200);
    });

    expect(container.querySelectorAll('[data-pulse-iterations]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-pulse-duration-ms]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-pulse="active"]')).toHaveLength(0);
  });

  it('does not add a linked pulse to an ordinary target', () => {
    const { container } = render(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[ordinaryTarget]}
      />,
    );

    const group = container.querySelector('[data-found-group]');
    expect(group).not.toBeNull();
    expect(group).not.toHaveAttribute('data-pulse-iterations');
    expect(group).not.toHaveAttribute('data-pulse-duration-ms');
  });

  it('renders a static group without animation attributes under reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container, rerender } = render(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[]}
      />,
    );

    rerender(
      <BoardViewGameBoard
        {...callbacks}
        levelId={6}
        board={makeBoard(6)}
        foundTargets={[linkedTarget]}
      />,
    );

    const group = container.querySelector('[data-found-group]');
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute('data-pulse', 'none');
    expect(group).not.toHaveAttribute('data-pulse-iterations');
    expect(group).not.toHaveAttribute('data-pulse-duration-ms');
  });
});

it.each(['pointer', 'keyboard'] as const)('does not clear a new %s gesture when the previous route hold expires', (input) => {
  const props = { ...callbacks, board: makeBoard(3), foundTargets: [], revealedCells: [] };
  const view = render(<BoardViewGameBoard {...props} retainSelection={false} />);
  const cells = () => [document.querySelector('[data-cell-id="1:1"]')!, document.querySelector('[data-cell-id="1:2"]')!];
  fireEvent.keyDown(cells()[0], { key: ' ' });
  fireEvent.keyDown(cells()[0], { key: 'ArrowRight' });
  fireEvent.keyDown(cells()[1], { key: 'Enter' });
  view.rerender(<BoardViewGameBoard {...props} retainSelection />);
  if (input === 'pointer') fireEvent.pointerDown(cells()[0], { pointerId: 17 });
  else fireEvent.keyDown(cells()[0], { key: ' ' });
  view.rerender(<BoardViewGameBoard {...props} retainSelection={false} />);
  expect(cells()[0]).toHaveAttribute('aria-pressed', 'true');
  expect(cells()[1]).toHaveAttribute('aria-pressed', 'false');
});
