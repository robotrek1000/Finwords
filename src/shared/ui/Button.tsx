import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'medium' | 'large';
  compactText?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary',
  size = 'large',
  compactText = false,
  className = '',
  children,
  ...props
}, ref) {
  const classes = [
    styles.button,
    styles[variant],
    size === 'large' ? styles.large : '',
    compactText ? styles.compactText : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});
