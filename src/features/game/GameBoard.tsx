import { useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { CellId, LevelConfig, TargetWord } from '../../app/types';
import {
  evaluateSelection,
  extendSelection,
  lockedCellMap,
  wordFromPath,
  type SelectionResult,
} from './gameEngine';
import styles from './GameBoard.module.css';

interface GameBoardProps {
  level: LevelConfig;
  foundTargetIds: string[];
  hintTarget?: TargetWord;
  hintRevealedCount?: number;
  onSubmit: (result: SelectionResult, path: CellId[]) => void;
  onOpenTarget: (target: TargetWord) => void;
}

export function GameBoard({
  level,
  foundTargetIds,
  hintTarget,
  hintRevealedCount = 0,
  onSubmit,
  onOpenTarget,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | undefined>(undefined);
  const isSelectingRef = useRef(false);
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
  const hintedCells = useMemo(
    () => new Set(hintTarget?.path.slice(0, hintRevealedCount) ?? []),
    [hintRevealedCount, hintTarget],
  );
  const nextHintCell = hintTarget?.path[hintRevealedCount];

  function finishSelection() {
    const targetTap = tappedTargetRef.current;
    tappedTargetRef.current = undefined;
    isSelectingRef.current = false;

    if (targetTap) {
      onOpenTarget(targetTap);
      return;
    }

    const path = selection;
    const result = evaluateSelection(level, path);
    if (result.type === 'bonus') {
      setBonusFlash(path);
      window.setTimeout(() => setBonusFlash([]), 700);
    }
    onSubmit(result, path);
    setSelection([]);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, cellId: CellId) {
    event.preventDefault();
    const lockedTarget = lockedCells.get(cellId);
    if (lockedTarget) {
      tappedTargetRef.current = lockedTarget;
      return;
    }

    pointerIdRef.current = event.pointerId;
    isSelectingRef.current = true;
    setSelection([cellId]);
    boardRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isSelectingRef.current) {
      return;
    }
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cellElement = element?.closest<HTMLElement>('[data-cell-id]');
    const nextCell = cellElement?.dataset.cellId as CellId | undefined;
    if (!nextCell) {
      return;
    }
    setSelection((current) => extendSelection(current, nextCell, lockedCellIds));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
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
    setSelection([]);
  }

  return (
    <div className={styles.gameArea}>
      <div
        className={`${styles.selectionLabel} ${selection.length ? '' : styles.empty}`}
        aria-live="polite"
      >
        {selection.length ? wordFromPath(level, selection) : 'Выберите слово'}
      </div>
      <div
        ref={boardRef}
        className={styles.board}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={`Игровое поле уровня ${level.id}`}
      >
        {level.grid.flatMap((row, rowIndex) =>
          row.map((letter, columnIndex) => {
            const cellId = `${rowIndex + 1}:${columnIndex + 1}` as CellId;
            const foundTarget = lockedCells.get(cellId);
            const classes = [
              styles.cell,
              selectedCells.has(cellId) ? styles.selected : '',
              foundTarget ? styles.found : '',
              bonusFlashCells.has(cellId) ? styles.bonusFlash : '',
              hintedCells.has(cellId) ? styles.hinted : '',
              nextHintCell === cellId ? styles.hintNext : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={cellId}
                type="button"
                className={classes}
                data-cell-id={cellId}
                aria-label={`${letter}, строка ${rowIndex + 1}, столбец ${columnIndex + 1}`}
                aria-pressed={selectedCells.has(cellId)}
                style={
                  foundTarget
                    ? ({ '--word-color': foundTarget.color } as React.CSSProperties)
                    : undefined
                }
                onPointerDown={(event) => handlePointerDown(event, cellId)}
              >
                {letter}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
