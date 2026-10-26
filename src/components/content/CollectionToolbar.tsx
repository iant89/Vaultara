import { useId, useState } from 'react';
import { Button } from '../ui/Button';
import styles from './CollectionToolbar.module.css';

export interface ToolbarOption {
  readonly value: string;
  readonly label: string;
}

interface CollectionToolbarProps {
  readonly query: string;
  readonly sort: string;
  readonly contentType: string;
  readonly sortOptions: readonly ToolbarOption[];
  readonly contentTypeOptions: readonly ToolbarOption[];
  readonly onSearch: (query: string) => void;
  readonly onSortChange: (sort: string) => void;
  readonly onContentTypeChange: (contentType: string) => void;
  readonly searchLabel?: string;
  readonly provider?: string;
  readonly providerOptions?: readonly ToolbarOption[];
  readonly onProviderChange?: (providerId: string) => void;
}

/**
 * Search, sort, and filter controls for a collection's items (design spec 5.3).
 *
 * The selects apply immediately and the text field applies on submit: a query that fires on every
 * keystroke would send a request per character, which a rate-limited provider will not tolerate.
 * The field's value follows the URL so a shared link and the control always agree.
 */
export function CollectionToolbar({
  query,
  sort,
  contentType,
  sortOptions,
  contentTypeOptions,
  onSearch,
  onSortChange,
  onContentTypeChange,
  searchLabel = 'Search this collection',
  provider = '',
  providerOptions,
  onProviderChange,
}: CollectionToolbarProps) {
  // The field holds an unsubmitted draft. It is derived from the URL parameter that produced it,
  // so a new link, the back button, or the browser's own reset replace the draft instead of the
  // two disagreeing — without an effect that writes state on every navigation.
  const [draft, setDraft] = useState<{ readonly base: string; readonly value: string } | null>(
    null,
  );
  const text = draft !== null && draft.base === query ? draft.value : query;
  const searchId = useId();
  const sortId = useId();
  const typeId = useId();
  const providerId = useId();

  return (
    <div className={styles.toolbar}>
      <form
        role="search"
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(text.trim());
        }}
      >
        <label className={styles.label} htmlFor={searchId}>
          {searchLabel}
        </label>
        <div className={styles.searchRow}>
          <input
            id={searchId}
            className={styles.input}
            type="search"
            value={text}
            placeholder="Title, creator, or subject"
            onChange={(event) => {
              setDraft({ base: query, value: event.target.value });
            }}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
      </form>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={sortId}>
          Sort by
        </label>
        <select
          id={sortId}
          className={styles.select}
          value={sort}
          onChange={(event) => {
            onSortChange(event.target.value);
          }}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {providerOptions !== undefined && providerOptions.length > 1 && onProviderChange ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={providerId}>
            Provider
          </label>
          <select
            id={providerId}
            className={styles.select}
            value={provider}
            onChange={(event) => {
              onProviderChange(event.target.value);
            }}
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {contentTypeOptions.length > 1 ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={typeId}>
            Content type
          </label>
          <select
            id={typeId}
            className={styles.select}
            value={contentType}
            onChange={(event) => {
              onContentTypeChange(event.target.value);
            }}
          >
            {contentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
