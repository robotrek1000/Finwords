import { motion } from 'motion/react';
import styles from './Progress.module.css';

interface ProgressProps {
  current: number;
  max: number;
  color?: string;
  className?: string;
}

function ratio(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, current / max));
}

export function LinearProgress({
  current,
  max,
  color = '#38BDF8',
  className = '',
}: ProgressProps) {
  const progress = ratio(current, max);
  return (
    <div
      className={`${styles.linear} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={current}
      style={{ '--progress-color': color } as React.CSSProperties}
    >
      <motion.div
        className={styles.linearFill}
        initial={false}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
    </div>
  );
}

interface CircularProgressProps extends ProgressProps {
  size?: number | string;
  strokeWidth?: number;
  showValue?: boolean;
}

export function CircularProgress({
  current,
  max,
  color = '#38BDF8',
  size = 112,
  strokeWidth = 12,
  showValue = true,
  className = '',
}: CircularProgressProps) {
  const radius = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ratio(current, max);
  const ringSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`${styles.ring} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={current}
      style={
        {
          '--progress-color': color,
          '--ring-size': ringSize,
          '--ring-width': strokeWidth,
        } as React.CSSProperties
      }
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.ringTrack} cx="50" cy="50" r={radius} />
        <motion.circle
          className={styles.ringFill}
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </svg>
      {showValue ? (
        <span className={styles.ringValue}>
          {current}/{max}
        </span>
      ) : null}
    </div>
  );
}
