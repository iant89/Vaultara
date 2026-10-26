import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  /** Renders the pressed styling for toggle buttons. Pair with `aria-pressed`. */
  readonly pressed?: boolean;
}

/**
 * Shared button primitive.
 *
 * Exists so that every interactive control inherits the same touch target, focus ring, and
 * disabled treatment instead of each component re-deriving them (AGENTS.md section 5.2).
 * Icon-only usage must pass an `aria-label` or `aria-labelledby`.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', pressed = false, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.button, styles[variant], pressed && styles.pressed, className)}
      {...props}
    />
  );
});
