/**
 * Shared button primitive — themed via CSS custom properties.
 *
 * Public interface: {@link Button} default export, {@link ButtonProps}.
 *
 * Bounded context: client UI (ADR-153 frontend). Three visual variants:
 *   - `primary`   — the default filled button (room creation, modal confirm)
 *   - `secondary` — outlined, for non-destructive secondary actions
 *   - `ghost`     — low-emphasis text-only button (roster rows, close icons)
 */

import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BASE_STYLE = {
  font: 'inherit',
  cursor: 'pointer',
  borderRadius: 'var(--sharpee-border-radius)',
  padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-md)',
  lineHeight: '1.5',
} as const;

function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--sharpee-accent)',
        color: 'var(--sharpee-bg)',
        border: '1px solid var(--sharpee-accent)',
      };
    case 'secondary':
      return {
        background: 'transparent',
        color: 'var(--sharpee-text)',
        border: '1px solid var(--sharpee-border)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--sharpee-text-muted)',
        border: '1px solid transparent',
      };
  }
}

export default function Button({
  variant = 'primary',
  style,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      style={{ ...BASE_STYLE, ...variantStyle(variant), ...style }}
      {...rest}
    />
  );
}
