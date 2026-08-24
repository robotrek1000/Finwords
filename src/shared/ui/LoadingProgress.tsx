import styles from './LoadingProgress.module.css';

export type LoadingProgressState =
  | 'Connecting'
  | 'LoadingData'
  | 'Restoring'
  | 'Preparing';

const CONTENT: Record<LoadingProgressState, { label: string; value: number }> = {
  Connecting: { label: 'Подключаемся…', value: 25 },
  LoadingData: { label: 'Загружаем данные…', value: 50 },
  Restoring: { label: 'Восстанавливаем прогресс…', value: 75 },
  Preparing: { label: 'Подготавливаем игру…', value: 100 },
};

interface LoadingProgressProps {
  state?: LoadingProgressState;
  className?: string;
}

export function LoadingProgress({
  state = 'Connecting',
  className = '',
}: LoadingProgressProps) {
  const content = CONTENT[state];
  return (
    <div className={`${styles.progress} ${className}`} role="status" aria-live="polite">
      <span>{content.label}</span>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Загрузка игры"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={content.value}
      >
        <span className={styles.fill} style={{ width: `${content.value}%` }} />
      </div>
    </div>
  );
}
