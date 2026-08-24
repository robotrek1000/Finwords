import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  );
}

type UseModalFocusBoundaryOptions = {
  active: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  focusKey?: string;
  onEscape?: () => void;
};

/** Keeps a foreground P1 modal keyboard-modal and returns focus to its opener. */
export function useModalFocusBoundary({
  active,
  dialogRef,
  focusKey,
  onEscape,
}: UseModalFocusBoundaryOptions) {
  const openerRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const hasFocusedRef = useRef(false);
  const focusKeyRef = useRef<string | undefined>(undefined);

  useLayoutEffect(
    () => () => {
      const opener = openerRef.current;
      if (opener?.isConnected) queueMicrotask(() => opener.focus());
    },
    [],
  );

  useLayoutEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusFirst = () => {
      (getFocusableElements(dialog)[0] ?? dialog).focus();
    };
    if (!hasFocusedRef.current || focusKeyRef.current !== focusKey) {
      focusFirst();
      hasFocusedRef.current = true;
      focusKeyRef.current = focusKey;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusFirst();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [active, dialogRef, focusKey, onEscape]);
}
