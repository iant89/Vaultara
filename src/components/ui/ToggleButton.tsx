import { Button } from './Button';
import { StarIcon, ThumbUpIcon } from './icons';

interface ToggleActionProps {
  readonly active: boolean;
  readonly onToggle: (next: boolean) => void;
  readonly activeLabel: string;
  readonly inactiveLabel: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly icon: 'favorite' | 'like';
}

/**
 * Shared toggle behaviour for favourites and likes.
 *
 * Both controls are `aria-pressed` toggle buttons, so state is announced by assistive
 * technology and conveyed by a filled icon as well as colour (design spec 27). They remain
 * separate components below because a like is a personalization signal while a favourite is
 * a bookmark (design spec 8.3, 14.4); neither implies the other.
 */
function ToggleAction({
  active,
  onToggle,
  activeLabel,
  inactiveLabel,
  disabled = false,
  className,
  icon,
}: ToggleActionProps) {
  const Icon = icon === 'favorite' ? StarIcon : ThumbUpIcon;
  const label = active ? activeLabel : inactiveLabel;

  return (
    <Button
      variant="icon"
      pressed={active}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={className}
      onClick={(event) => {
        // Cards place a full-card link behind their content; a toggle must never navigate.
        event.preventDefault();
        event.stopPropagation();
        onToggle(!active);
      }}
    >
      <Icon filled={active} />
    </Button>
  );
}

interface CardToggleProps {
  readonly active: boolean;
  readonly onToggle: (next: boolean) => void;
  /** Item title, so each card's control has a distinct accessible name. */
  readonly itemTitle?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export type FavoriteButtonProps = CardToggleProps;

export function FavoriteButton({ itemTitle, ...props }: FavoriteButtonProps) {
  const subject = itemTitle ?? 'this item';

  return (
    <ToggleAction
      {...props}
      icon="favorite"
      inactiveLabel={`Add ${subject} to favorites`}
      activeLabel={`Remove ${subject} from favorites`}
    />
  );
}

export type LikeButtonProps = CardToggleProps;

export function LikeButton({ itemTitle, ...props }: LikeButtonProps) {
  const subject = itemTitle ?? 'this item';

  return (
    <ToggleAction
      {...props}
      icon="like"
      inactiveLabel={`Like ${subject}`}
      activeLabel={`Unlike ${subject}`}
    />
  );
}
