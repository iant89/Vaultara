import { ONBOARDING_CATEGORIES, type OnboardingCategory } from '../../config/onboarding';
import { cx } from '../../utils/cx';
import styles from './CategoryPicker.module.css';

interface CategoryPickerProps {
  readonly selectedIds: readonly string[];
  readonly onChange: (selectedIds: readonly string[]) => void;
  readonly disabled?: boolean;
}

export function CategoryPicker({ selectedIds, onChange, disabled = false }: CategoryPickerProps) {
  const selected = new Set(selectedIds);

  function toggle(id: string) {
    if (disabled) {
      return;
    }

    if (selected.has(id)) {
      onChange(selectedIds.filter((entry) => entry !== id));
      return;
    }

    onChange([...selectedIds, id]);
  }

  return (
    <ul className={styles.grid} aria-label="Categories">
      {ONBOARDING_CATEGORIES.map((category) => (
        <li key={category.id}>
          <CategoryOption
            category={category}
            selected={selected.has(category.id)}
            disabled={disabled}
            onToggle={() => {
              toggle(category.id);
            }}
          />
        </li>
      ))}
    </ul>
  );
}

function CategoryOption({
  category,
  selected,
  disabled,
  onToggle,
}: {
  readonly category: OnboardingCategory;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(styles.card, selected && styles.selected)}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className={styles.art} data-category={category.id} aria-hidden>
        {category.name.slice(0, 1)}
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{category.name}</span>
        <span className={styles.description}>{category.description}</span>
      </span>
    </button>
  );
}
