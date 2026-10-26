import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import styles from './Disclosure.module.css';

interface DisclosureContextValue {
  readonly close: () => void;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

interface DisclosureProps {
  /** Accessible name of the trigger; the visible glyph is supplied as `triggerContent`. */
  readonly triggerLabel: string;
  readonly triggerContent: ReactNode;
  readonly children: ReactNode;
  readonly triggerClassName?: string;
}

/**
 * Disclosure button plus a popover panel.
 *
 * Deliberately not an ARIA `menu`: the panel holds ordinary links, and the menu role would
 * promise arrow-key navigation this component does not implement. A disclosure with
 * `aria-expanded`/`aria-controls` is the honest pattern.
 *
 * Closes on Escape (returning focus to the trigger), on outside pointer-down, and after
 * following a link.
 */
export function Disclosure({
  triggerLabel,
  triggerContent,
  children,
  triggerClassName,
}: DisclosureProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event: PointerEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper !== null && event.target instanceof Node && !wrapper.contains(event.target)) {
        close();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeAndReturnFocus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close, closeAndReturnFocus]);

  return (
    <DisclosureContext.Provider value={{ close }}>
      <div className={styles.wrapper} ref={wrapperRef}>
        <Button
          ref={triggerRef}
          variant="icon"
          className={triggerClassName}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={triggerLabel}
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          {triggerContent}
        </Button>

        {open ? (
          <div id={panelId} className={styles.panel}>
            {children}
          </div>
        ) : null}
      </div>
    </DisclosureContext.Provider>
  );
}

interface DisclosureGroupProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function DisclosureGroup({ title, children }: DisclosureGroupProps) {
  const titleId = useId();

  return (
    <div role="group" aria-labelledby={titleId}>
      <p id={titleId} className={styles.groupTitle}>
        {title}
      </p>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}

interface DisclosureItemProps {
  readonly to: string;
  readonly children: ReactNode;
}

/** A link rendered as a menu row. Closes the panel after navigation. */
export function DisclosureItem({ to, children }: DisclosureItemProps) {
  const context = useContext(DisclosureContext);

  return (
    <li>
      <Link
        to={to}
        className={styles.item}
        onClick={() => {
          context?.close();
        }}
      >
        {children}
      </Link>
    </li>
  );
}
