import type { SVGProps } from 'react';

/**
 * Inline icon set.
 *
 * Icons are hand-written SVG rather than a dependency (AGENTS.md section 11: do not add a
 * package for functionality that is trivial to implement). Every icon is decorative and
 * marked `aria-hidden`; the accessible name always comes from surrounding text or an
 * explicit `aria-label` on the control.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.9z" />
    </Icon>
  );
}

export function ThumbUpIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
      <path d="M7 19.5h9.2a2 2 0 0 0 2-1.6l1.2-6a2 2 0 0 0-2-2.4h-3.7l.6-3.1a2 2 0 0 0-3.6-1.6L7 10.5z" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function AccountIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.4" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.8 21 19.5H3z" />
      <path d="M12 10v4M12 17v.4" />
    </Icon>
  );
}

/** The Vaultara mark: a stylised vault door. Purely decorative next to the wordmark. */
export function VaultaraMark(props: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="2.5" y="2.5" width="27" height="27" rx="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="7.5" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      <circle cx="16" cy="16" r="2.75" fill="currentColor" />
      <path d="M16 6.5v3M16 22.5v3M6.5 16h3M22.5 16h3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
