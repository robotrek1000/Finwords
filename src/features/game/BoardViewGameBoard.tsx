import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type { CellId, LevelId } from '../../app/types';
import type {
  BoardView,
  CellRef,
  FoundTarget,
} from '../../shared/demoTypes';
import { cellToCoordinates, extendSelection } from './gameEngine';
import {
  boardCellMap,
  cellRefToCellId,
  foundCellMap,
  wordFromBoardPath,
} from './boardViewMapper';
import {
  resolveTargetPresentation,
} from './targetPresentation';
import styles from './BoardViewGameBoard.module.css';

export type RouteAccentState = 'pending' | 'bonus' | 'repeated' | 'invalid';

interface BoardViewGameBoardProps {
  board: BoardView;
  foundTargets: FoundTarget[];
  levelId?: LevelId;
  revealedCells?: CellRef[];
  inputDisabled?: boolean;
  retainSelection?: boolean;
  routeState?: RouteAccentState;
  onOpenTarget: (target: FoundTarget) => void;
  onSelectionChange: (word: string, path: CellId[]) => void;
  onSelectionEnd: (path: CellId[]) => void;
}

const TARGET_PALETTE = [
  '#52C7B8',
  '#F6C945',
  '#8B7CF6',
  '#FF8A72',
  '#55A6F7',
  '#EF83BA',
  '#75C96B',
];

const cellUnits = 100;

function gapUnits(size: number): number {
  return size <= 4 ? 10 : 12;
}

function cellOrigin(index: number, size: number): number {
  return index * (cellUnits + gapUnits(size));
}

function boardUnits(size: number): number {
  return size * cellUnits + (size - 1) * gapUnits(size);
}

function connectorGeometry(from: CellId, to: CellId, size: number) {
  const [fromRow, fromCol] = cellToCoordinates(from).map((value) => value - 1);
  const [toRow, toCol] = cellToCoordinates(to).map((value) => value - 1);
  const connectorThickness = 72;
  const overlap = 4;

  if (fromRow === toRow) {
    const left = Math.min(fromCol, toCol);
    return {
      x: cellOrigin(left, size) + cellUnits - overlap,
      y: cellOrigin(fromRow, size) + (cellUnits - connectorThickness) / 2,
      width: gapUnits(size) + overlap * 2,
      height: connectorThickness,
      horizontal: true,
      origin:
        toCol > fromCol
          ? '0% 50%'
          : '100% 50%',
    };
  }

  const top = Math.min(fromRow, toRow);
  return {
    x: cellOrigin(fromCol, size) + (cellUnits - connectorThickness) / 2,
    y: cellOrigin(top, size) + cellUnits - overlap,
    width: connectorThickness,
    height: gapUnits(size) + overlap * 2,
    horizontal: false,
    origin:
      toRow > fromRow
        ? '50% 0%'
        : '50% 100%',
  };
}

function hintLineGeometry(from: CellRef, to: CellRef, size: number) {
  return {
    x1: cellOrigin(from.col, size) + cellUnits / 2,
    y1: cellOrigin(from.row, size) + cellUnits / 2,
    x2: cellOrigin(to.col, size) + cellUnits / 2,
    y2: cellOrigin(to.row, size) + cellUnits / 2,
  };
}

function targetKey(target: FoundTarget): string {
  return `${target.word}\u0000${target.foundAt}`;
}

export function BoardViewGameBoard({
  board,
  foundTargets,
  levelId,
  revealedCells = [],
  inputDisabled = false,
  retainSelection = false,
  routeState,
  onOpenTarget,
  onSelectionChange,
  onSelectionEnd,
}: BoardViewGameBoardProps) {
  const reduceMotion = useReducedMotion();
  const filterId = `selection-outline-${useId().replace(/:/g, '')}`;
  const boardRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | undefined>(undefined);
  const selectionRef = useRef<CellId[]>([]);
  const selectingRef = useRef(false);
  const clearFrameRef = useRef<number | undefined>(undefined);
  const [selection, setSelection] = useState<CellId[]>([]);
  const cells = useMemo(() => boardCellMap(board), [board]);
  const foundCells = useMemo(() => foundCellMap(foundTargets), [foundTargets]);
  const lockedCellIds = useMemo(() => new Set(foundCells.keys()), [foundCells]);
  const selectedCells = useMemo(() => new Set(selection), [selection]);
  const revealedIds = useMemo(
    () => revealedCells.map(cellRefToCellId),
    [revealedCells],
  );
  const previousHintIds = useMemo(
    () => new Set(revealedIds.slice(0, -1)),
    [revealedIds],
  );
  const currentHintId = revealedIds.at(-1);
  const foundColors = useMemo(
    () =>
      new Map(
        foundTargets.map((target, index) => [
          target,
          TARGET_PALETTE[index % TARGET_PALETTE.length],
        ]),
      ),
    [foundTargets],
  );
  const targetPresentations = useMemo(
    () =>
      new Map(
        foundTargets.map((target) => [
          target,
          resolveTargetPresentation(levelId, target.word),
        ]),
      ),
    [foundTargets, levelId],
  );
  const targetKeys = useMemo(() => foundTargets.map(targetKey), [foundTargets]);
  const linkedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const target of foundTargets) {
      if (targetPresentations.get(target)?.linked) {
        keys.add(targetKey(target));
      }
    }
    return keys;
  }, [foundTargets, targetPresentations]);
  const seenTargetKeysRef = useRef<ReadonlySet<string> | null>(null);
  const pulseTimersRef = useRef(new Map<string, number>());
  const [pulsingTargetKeys, setPulsingTargetKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useLayoutEffect(() => {
    const nextKeys = new Set(targetKeys);
    const seenKeys = seenTargetKeysRef.current;
    seenTargetKeysRef.current = nextKeys;
    if (seenKeys === null) return;
    const addedLinkedKeys = targetKeys.filter(
      (key) =>
        !seenKeys.has(key) &&
        linkedKeys.has(key) &&
        !pulseTimersRef.current.has(key),
    );
    if (addedLinkedKeys.length === 0) return;

    setPulsingTargetKeys((currentKeys) => {
      const nextPulsingKeys = new Set(currentKeys);
      for (const key of addedLinkedKeys) nextPulsingKeys.add(key);
      return nextPulsingKeys;
    });

    for (const key of addedLinkedKeys) {
      const timer = window.setTimeout(() => {
        pulseTimersRef.current.delete(key);
        setPulsingTargetKeys((currentKeys) => {
          if (!currentKeys.has(key)) return currentKeys;
          const nextPulsingKeys = new Set(currentKeys);
          nextPulsingKeys.delete(key);
          return nextPulsingKeys;
        });
      }, 3_200);
      pulseTimersRef.current.set(key, timer);
    }
  }, [targetKeys, linkedKeys]);
  const [routeColor, setRouteColor] = useState(TARGET_PALETTE[0]);
  const selectionColor =
    routeState === 'bonus' || routeState === 'repeated'
      ? '#96DBF6'
      : routeState === 'invalid'
        ? '#FEB6B4'
        : routeColor;
  const retainSelectionRef = useRef(retainSelection);
  const totalUnits = boardUnits(board.size);

  useEffect(
    () => () => window.cancelAnimationFrame(clearFrameRef.current ?? 0),
    [],
  );

  useEffect(
    () => () => {
      for (const timer of pulseTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      pulseTimersRef.current.clear();
    },
    [],
  );

  const clearActiveSelection = useEffectEvent(() => {
    setActiveSelection([]);
  });

  useEffect(() => {
    retainSelectionRef.current = retainSelection;
    if (!retainSelection && selectionRef.current.length > 0) {
      clearActiveSelection();
    }
  }, [retainSelection]);

  function setActiveSelection(next: CellId[]) {
    selectionRef.current = next;
    setSelection(next);
    onSelectionChange(wordFromBoardPath(board, next), next);
  }

  function clearSelectionSoon() {
    window.cancelAnimationFrame(clearFrameRef.current ?? 0);
    clearFrameRef.current = window.requestAnimationFrame(() => {
      if (retainSelectionRef.current) return;
      setActiveSelection([]);
    });
  }

  function startSelection(cellId: CellId) {
    window.cancelAnimationFrame(clearFrameRef.current ?? 0);
    clearFrameRef.current = undefined;
    if (selectionRef.current.length === 0) {
      setRouteColor(TARGET_PALETTE[foundTargets.length % TARGET_PALETTE.length]);
    }
    setActiveSelection([cellId]);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, cellId: CellId) {
    event.preventDefault();
    if (inputDisabled || lockedCellIds.has(cellId)) return;
    pointerIdRef.current = event.pointerId;
    selectingRef.current = true;
    startSelection(cellId);
    boardRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (inputDisabled || !selectingRef.current) return;
    const pointed = document.elementFromPoint(event.clientX, event.clientY);
    const cellElement = pointed?.closest<HTMLElement>('[data-cell-id]');
    const nextCell = cellElement?.dataset.cellId as CellId | undefined;
    if (!nextCell) return;
    const current = selectionRef.current;
    const next = extendSelection(current, nextCell, lockedCellIds);
    if (next !== current) setActiveSelection(next);
  }

  function releasePointer() {
    const pointerId = pointerIdRef.current;
    if (
      pointerId !== undefined &&
      boardRef.current?.hasPointerCapture?.(pointerId)
    ) {
      boardRef.current.releasePointerCapture(pointerId);
    }
    pointerIdRef.current = undefined;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (inputDisabled || !selectingRef.current) return;
    event.preventDefault();
    releasePointer();
    selectingRef.current = false;
    onSelectionEnd([...selectionRef.current]);
    clearSelectionSoon();
  }

  function handlePointerCancel() {
    releasePointer();
    selectingRef.current = false;
    setActiveSelection([]);
  }

  function moveFocus(cellId: CellId, key: string) {
    const [row, col] = cellToCoordinates(cellId);
    const offset =
      key === 'ArrowUp'
        ? [-1, 0]
        : key === 'ArrowDown'
          ? [1, 0]
          : key === 'ArrowLeft'
            ? [0, -1]
            : key === 'ArrowRight'
              ? [0, 1]
              : null;
    if (!offset) return;

    const [rowOffset, colOffset] = offset;
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;
    if (
      nextRow < 1 ||
      nextRow > board.size ||
      nextCol < 1 ||
      nextCol > board.size
    ) {
      return;
    }

    const nextCellId = `${nextRow}:${nextCol}` as CellId;
    const current = selectionRef.current;
    if (current.length > 0) {
      const next = extendSelection(current, nextCellId, lockedCellIds);
      if (next !== current) setActiveSelection(next);
    }
    boardRef.current
      ?.querySelector<HTMLButtonElement>(`[data-cell-id="${nextCellId}"]`)
      ?.focus();
  }

  function handleCellKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    cellId: CellId,
    foundTarget: FoundTarget | undefined,
  ) {
    if (inputDisabled) return;

    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      moveFocus(cellId, event.key);
      return;
    }

    if (event.key === 'Escape') {
      if (selectionRef.current.length > 0) {
        event.preventDefault();
        setActiveSelection([]);
      }
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (foundTarget) return;

    event.preventDefault();
    const current = selectionRef.current;
    if (current.length === 0) {
      startSelection(cellId);
      return;
    }
    if (current.length >= 2) {
      onSelectionEnd([...current]);
      clearSelectionSoon();
    }
  }

  const orderedCells = Array.from({ length: board.size * board.size }, (_, index) => {
    const row = Math.floor(index / board.size);
    const col = index % board.size;
    const cellId = `${row + 1}:${col + 1}` as CellId;
    const cell = cells.get(cellId);
    if (!cell) throw new Error(`MISSING_BOARD_CELL:${row}:${col}`);
    return { cellId, cell };
  });

  return (
    <div
      ref={boardRef}
      className={styles.board}
      data-size={board.size}
      data-route-state={routeState}
      aria-label="Игровое поле"
      aria-describedby={`${filterId}-instructions`}
      aria-disabled={inputDisabled || undefined}
      style={
        {
          '--board-size': board.size,
          '--selection-color': selectionColor,
        } as CSSProperties
      }
      onPointerMove={inputDisabled ? undefined : handlePointerMove}
      onPointerUp={inputDisabled ? undefined : handlePointerUp}
      onPointerCancel={inputDisabled ? undefined : handlePointerCancel}
    >
      <span id={`${filterId}-instructions`} className={styles.instructions}>
        Стрелки перемещают фокус. Enter или пробел начинают и отправляют маршрут; при активном маршруте стрелка добавляет соседнюю клетку. Escape отменяет маршрут.
      </span>
      <svg
        className={styles.routeLayer}
        viewBox={`0 0 ${totalUnits} ${totalUnits}`}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology
              in="SourceAlpha"
              operator="dilate"
              radius="2"
              result="expanded"
            />
            <feFlood floodColor="#18243c" result="outlineColor" />
            <feComposite
              in="outlineColor"
              in2="expanded"
              operator="in"
              result="outline"
            />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {revealedCells.slice(1).map((cell, index) => {
          const from = revealedCells[index];
          const line = hintLineGeometry(from, cell, board.size);
          return (
            <line
              key={`${from.row}:${from.col}-${cell.row}:${cell.col}`}
              {...line}
              className={styles.hintConnector}
              data-hint-connector
            />
          );
        })}

        {foundTargets.map((target) => {
          const color = foundColors.get(target);
          if (!color) return null;
          const key = targetKey(target);
          const isPulsing = pulsingTargetKeys.has(key);
          const cellIds = target.cells.map(cellRefToCellId);
          return (
            <g
              key={key}
              filter={`url(#${filterId})`}
              className={styles.foundGroup}
              data-found-group
              data-word={target.word}
              data-pulse={isPulsing && reduceMotion ? 'none' : undefined}
              data-pulse-iterations={isPulsing && !reduceMotion ? 4 : undefined}
              data-pulse-duration-ms={isPulsing && !reduceMotion ? 3200 : undefined}
            >
              {cellIds.slice(1).map((cellId, index) => {
                const from = cellIds[index];
                const geometry = connectorGeometry(from, cellId, board.size);
                return (
                  <rect
                    key={`found-connector-${from}-${cellId}`}
                    x={geometry.x}
                    y={geometry.y}
                    width={geometry.width}
                    height={geometry.height}
                    rx="5"
                    fill={color}
                  />
                );
              })}
              {cellIds.map((cellId) => {
                const [row, col] = cellToCoordinates(cellId).map(
                  (value) => value - 1,
                );
                return (
                  <rect
                    key={`found-cell-${cellId}`}
                    x={cellOrigin(col, board.size)}
                    y={cellOrigin(row, board.size)}
                    width={cellUnits}
                    height={cellUnits}
                    rx="22"
                    fill={color}
                  />
                );
              })}
            </g>
          );
        })}

        <g filter={`url(#${filterId})`}>
          <AnimatePresence initial={false}>
            {selection.slice(1).map((cellId, index) => {
              const from = selection[index];
              const geometry = connectorGeometry(from, cellId, board.size);
              return (
                <motion.rect
                  key={`connector-${from}-${cellId}`}
                  x={geometry.x}
                  y={geometry.y}
                  width={geometry.width}
                  height={geometry.height}
                  rx="5"
                  className={styles.selectionShape}
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: geometry.origin,
                  }}
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0.45,
                          scaleX: geometry.horizontal ? 0.05 : 1,
                          scaleY: geometry.horizontal ? 1 : 0.05,
                        }
                  }
                  animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scaleX: 0.05, scaleY: 0.05 }}
                  transition={{ duration: reduceMotion ? 0 : 0.14, ease: 'easeOut' }}
                />
              );
            })}
            {selection.map((cellId) => {
              const [row, col] = cellToCoordinates(cellId).map((value) => value - 1);
              return (
                <motion.rect
                  key={`cell-${cellId}`}
                  x={cellOrigin(col, board.size)}
                  y={cellOrigin(row, board.size)}
                  width={cellUnits}
                  height={cellUnits}
                  rx="22"
                  className={styles.selectionShape}
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
                  initial={reduceMotion ? false : { opacity: 0.45, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.92 }}
                  transition={{ duration: reduceMotion ? 0 : 0.14, ease: 'easeOut' }}
                />
              );
            })}
          </AnimatePresence>
        </g>
      </svg>

      {orderedCells.map(({ cellId, cell }) => {
        const foundTarget = foundCells.get(cellId);
        const isSelected = selectedCells.has(cellId);
        const classes = [
          styles.cell,
          isSelected ? styles.selected : '',
          foundTarget ? styles.found : '',
          previousHintIds.has(cellId) ? styles.hintPrevious : '',
          currentHintId === cellId ? styles.hintCurrent : '',
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
              foundTarget
                ? `${cell.letter}, строка ${cell.row + 1}, столбец ${cell.col + 1}. Найденное слово ${foundTarget.word}. Открыть информацию`
                : `${cell.letter}, строка ${cell.row + 1}, столбец ${cell.col + 1}${isSelected ? '. Выбрана' : ''}`
            }
            aria-pressed={isSelected}
            aria-disabled={inputDisabled || undefined}
            disabled={inputDisabled}
            onKeyDown={(event) => handleCellKeyDown(event, cellId, foundTarget)}
            onPointerDown={
              inputDisabled || foundTarget
                ? undefined
                : (event) => handlePointerDown(event, cellId)
            }
            onClick={
              foundTarget && !inputDisabled
                ? () => onOpenTarget(foundTarget)
                : undefined
            }
          >
            <span>{cell.letter}</span>
          </button>
        );
      })}
    </div>
  );
}
