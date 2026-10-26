import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { CloseIcon, SearchIcon } from '../ui/icons';
import { buildSearchPath } from '../../utils/links';
import styles from './Navigation.module.css';

/**
 * Global search entry point (design spec 4.1, 15.2).
 *
 * The control is real: submitting navigates to `/search?q=…`, which is the documented route
 * and the contract the search implementation will read. Search *results* are not implemented
 * until Phase 9, and that page says so. A single DOM serves both layouts — the toggle only
 * exists below the desktop breakpoint.
 */
export function SearchControl() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const navigate = useNavigate();

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  return (
    <form
      role="search"
      className={styles.search}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(buildSearchPath(query));
        setExpanded(false);
      }}
    >
      <Button
        ref={toggleRef}
        variant="icon"
        className={styles.searchToggle}
        aria-expanded={expanded}
        aria-controls={inputId}
        aria-label={expanded ? 'Close search' : 'Open search'}
        onClick={() => {
          setExpanded((current) => !current);
        }}
      >
        {expanded ? <CloseIcon /> : <SearchIcon />}
      </Button>

      <div className={styles.searchField} data-expanded={expanded}>
        <SearchIcon className={styles.searchIcon} width={18} height={18} />
        <input
          ref={inputRef}
          id={inputId}
          className={styles.searchInput}
          type="search"
          name="q"
          value={query}
          /* The placeholder is not a label; this name is what assistive tech announces. */
          aria-label="Search all providers"
          placeholder="Search Vaultara"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && expanded) {
              setExpanded(false);
              toggleRef.current?.focus();
            }
          }}
        />
      </div>
    </form>
  );
}
