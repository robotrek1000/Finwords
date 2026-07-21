import { useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { CellId, LevelConfig, TargetWord } from '../../app/types';
import {
  cellToCoordinates,
  evaluateSelection,
  extendSelection,
  lockedCellMap,
  wordFromPath,
  type SelectionResult,
} from './gameEngine';
import styles from './GameBoard.module.css';

interface GameBoardProps {
  mode?: 'play' | 'review';
  inputDisabled?: boolean;
  level: LevelConfig;
  foundTargetIds: string[];
  hintTarget?: TargetWord;
  hintRevealedCount?: number;
  onSubmit: (result: SelectionResult, path: CellId[]) => void;
  onOpenTarget: (target: TargetWord) => void;
  onSelectionChange: (word: string, path: CellId[]) => void;
}

export function GameBoard({
  mode = 'play',
  inputDisabled = false,
  level,
  foundTargetIds,
  hintTarget,
  hintRevealedCount = 0,
  onSubmit,
  onOpenTarget,
  onSelectionChange,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | undefined>(undefined);
  const isSelectingRef = useRef(false);
  const selectionRef = useRef<CellId[]>([]);
  const tappedTargetRef = useRef<TargetWord | undefined>(undefined);
  const [selection, setSelection] = useState<CellId[]>([]);
  const [bonusFlash, setBonusFlash] = useState<CellId[]>([]);
  const lockedCells = useMemo(
    () => lockedCellMap(level, foundTargetIds),
    [foundTargetIds, level],
  );
  const lockedCellIds = useMemo(() => new Set(lockedCells.keys()), [lockedCells]);
  const selectedCells = useMemo(() => new Set(selection), [selection]);
  const bonusFlashCells = useMemo(() => new Set(bonusFlash), [bonusFlash]);
  const revealedHintPath = useMemo(
    () => hintTarget?.path.slice(0, hintRevealedCount) ?? [],
    [hintRevealedCount, hintTarget],
  );
  const previousHintCells = useMemo(
    () => new Set(revealedHintPath.slice(0, -1)),
    [revealedHintPath],
  );
  const currentHintCell = revealedHintPath.at(-1);

  function setActiveSelection(next: CellId[]) {
    selectionRef.current = next;
    setSelection(next);
    onSelectionChange(next.length ? wordFromPath(level, next) : '', next);
  }

  function finishSelection() {
    const targetTap = tappedTargetRef.current;
    tappedTargetRef.current = undefined;
    isSelectingRef.current = false;

    if (targetTap) {
      onOpenTarget(targetTap);
      return;
    }

    const path = selectionRef.current;
    const result = evaluateSelection(level, path);
    if (result.type === 'bonus') {
      setBonusFlash(path);
      window.setTimeout(() => setBonusFlash([]), 700);
    }
    onSubmit(result, path);
    setActiveSelection([]);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, cellId: CellId) {
    event.preventDefault();
    if (mode === 'review' || inputDisabled) {
      return;
    }
    const lockedTarget = lockedCells.get(cellId);
    if (lockedTarget) {
      tappedTargetRef.current = lockedTarget;
      return;
    }

    pointerIdRef.current = event.pointerId;
    isSelectingRef.current = true;
    setActiveSelection([cellId]);
    boardRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (mode === 'review' || inputDisabled || !isSelectingRef.current) {
      return;
    }
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cellElement = element?.closest<HTMLElement>('[data-cell-id]');
    const nextCell = cellElement?.dataset.cellId as CellId | undefined;
    if (!nextCell) {
      return;
    }
    const current = selectionRef.current;
    const next = extendSelection(current, nextCell, lockedCellIds);
    if (next !== current) {
      setActiveSelection(next);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (mode === 'review' || inputDisabled) {
      return;
    }
    if (
      pointerIdRef.current !== undefined &&
      boardRef.current?.hasPointerCapture(pointerIdRef.current)
    ) {
      boardRef.current.releasePointerCapture(pointerIdRef.current);
    }
    pointerIdRef.current = undefined;
    event.preventDefault();
    finishSelection();
  }

  function handlePointerCancel() {
    pointerIdRef.current = undefined;
    isSelectingRef.current = false;
    tappedTargetRef.current = undefined;
    setActiveSelection([]);
  }

  return (
    <div
      ref={boardRef}
      className={styles.board}
      data-mode={mode}
      aria-disabled={inputDisabled || undefined}
      onPointerMove={mode === 'play' && !inputDisabled ? handlePointerMove : undefined}
      onPointerUp={mode === 'play' && !inputDisabled ? handlePointerUp : undefined}
      onPointerCancel={mode === 'play' && !inputDisabled ? handlePointerCancel : undefined}
      aria-label={`Игровое поле уровня ${level.id}`}
    >
      {revealedHintPath.length > 1 ? (
        <svg
          className={styles.hintArrows}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="hint-arrowhead"
              markerWidth="5"
              markerHeight="5"
              refX="4"
              refY="2.5"
              orient="auto"
            >
              <path d="M0,0 L5,2.5 L0,5 Z" />
            </marker>
          </defs>
          {revealedHintPath.slice(1).map((cellId, index) => {
            const [fromRow, fromColumn] = cellToCoordinates(revealedHintPath[index]);
            const [toRow, toColumn] = cellToCoordinates(cellId);
            return (
              <line
                key={`${revealedHintPath[index]}-${cellId}`}
                x1={((fromColumn - 0.5) / 6) * 100}
                y1={((fromRow - 0.5) / 6) * 100}
                x2={((toColumn - 0.5) / 6) * 100}
                y2={((toRow - 0.5) / 6) * 100}
                markerEnd="url(#hint-arrowhead)"
              />
            );
          })}
        </svg>
      ) : null}
        {level.grid.flatMap((row, rowIndex) =>
          row.map((letter, columnIndex) => {
            const cellId = `${rowIndex + 1}:${columnIndex + 1}` as CellId;
            const foundTarget = lockedCells.get(cellId);
            const classes = [
              styles.cell,
              selectedCells.has(cellId) ? styles.selected : '',
              foundTarget ? styles.found : '',
              bonusFlashCells.has(cellId) ? styles.bonusFlash : '',
              previousHintCells.has(cellId) ? styles.hintPrevious : '',
              currentHintCell === cellId ? styles.hintCurrent : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={cellId}
                type="button"
                className={classes}
                data-cell-id={cellId}
                aria-label={
                  mode === 'review' && foundTarget
                    ? `${letter}, строка ${rowIndex + 1}, столбец ${columnIndex + 1}. Найденное слово ${foundTarget.word}. Открыть информацию`
                    : `${letter}, строка ${rowIndex + 1}, столбец ${columnIndex + 1}`
                }
                aria-pressed={selectedCells.has(cellId)}
                disabled={mode === 'play' && inputDisabled}
                style={
                  foundTarget
                    ? ({ '--word-color': foundTarget.color } as React.CSSProperties)
                    : undefined
                }
                onPointerDown={
                  mode === 'play' && !inputDisabled
                    ? (event) => handlePointerDown(event, cellId)
                    : undefined
                }
                onClick={
                  mode === 'review' && foundTarget
                    ? () => onOpenTarget(foundTarget)
                    : undefined
                }
              >
                {letter}
              </button>
            );
          }),
        )}
    </div>
  );
}
