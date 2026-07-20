import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './icons';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: 'surface' | 'ghost';
  depth?: 'flat' | 'raised';
}

export function IconButton({
  icon,
  label,
  variant = 'surface',
  depth = variant === 'surface' ? 'raised' : 'flat',
  className = '',
  ...props
}: IconButtonProps) {
  const classes = [
    styles.button,
    variant === 'ghost' ? styles.ghost : styles.surface,
    depth === 'raised' ? styles.raised : styles.flat,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
