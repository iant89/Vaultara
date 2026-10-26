import { useCallback, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { CloseIcon } from './icons';
import styles from './Dialog.module.css';

interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Hide the standard close button when the footer supplies its own dismissal. */
  readonly hideCloseButton?: boolean;
}

/**
 * Modal dialog built on the native `<dialog>` element.
 *
 * Native modal semantics provide the focus trap, inert background, and Escape handling that
 * a hand-rolled overlay usually gets wrong. Where `showModal` is unavailable (some test
 * environments) it degrades to a rendered `open` attribute with its own Escape handling.
 * Focus always returns to the element that opened the dialog (design spec 27).
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  hideCloseButton = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    const supportsModal = typeof dialog.showModal === 'function';

    if (open) {
      openerRef.current = document.activeElement;
      if (!dialog.open) {
        if (supportsModal) {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
      closeButtonRef.current?.focus();
      return;
    }

    if (dialog.open) {
      if (supportsModal) {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }

    const opener = openerRef.current;
    if (opener instanceof HTMLElement) {
      opener.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Native Escape fires `cancel`; keep React state as the source of truth.
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        // Environments without showModal never fire `cancel`, so handle Escape directly
        // there. With native modal support the `cancel` handler above owns dismissal.
        if (event.key === 'Escape' && dialogRef.current?.hasAttribute('open') === true) {
          if (typeof dialogRef.current?.showModal !== 'function') {
            event.preventDefault();
            close();
          }
        }
      }}
      onClose={close}
      // Backdrop click-to-dismiss is intentionally not implemented: a mouse handler on a
      // non-interactive element is an accessibility smell, and Escape plus the visible
      // close button already provide complete keyboard dismissal.
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {hideCloseButton ? null : (
            <Button
              ref={closeButtonRef}
              variant="icon"
              className={styles.close}
              aria-label="Close dialog"
              onClick={close}
            >
              <CloseIcon />
            </Button>
          )}
        </div>

        <div className={styles.body}>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </dialog>
  );
}
