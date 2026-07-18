import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './icons';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: 'surface' | 'ghost';
}

export function IconButton({
  icon,
  label,
  variant = 'surface',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${variant === 'ghost' ? styles.ghost : ''} ${className}`}
      aria-label={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
