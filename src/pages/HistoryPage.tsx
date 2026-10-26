import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Page } from '../components/layout/Page';
import { Button } from '../components/ui/Button';
import { getProviderName } from '../config/providers';
import { useProviderServices } from '../data/ProviderServices';
import { useSession } from '../data/SessionContext';
import { useAsyncValue } from '../data/useAsyncValue';
import { formatCanonicalId } from '../models/identity';
import type { StoredContentState } from '../persistence/contract';
import { isExploredRecord } from '../personalization/exploration';
import { buildItemPath, buildSettingsPath } from '../utils/links';
import styles from './HistoryPage.module.css';

export function HistoryPage() {
  const session = useSession();
  const explored = session.contentStates.filter(isExploredRecord).slice().sort(byLastExplored);

  if (session.status === 'loading') {
    return (
      <Page title="History">
        <LoadingState label="Loading history…" />
      </Page>
    );
  }

  if (session.status === 'signed-out') {
    return (
      <Page
        title="History"
        intro="Explored items, recorded only when an item's details page is opened or its viewer starts."
      >
        <EmptyState
          title="Sign in to keep history"
          description="Create an account to record the items you open. History stays in this browser."
          action={<Link to={buildSettingsPath()}>Go to Settings</Link>}
        />
      </Page>
    );
  }

  const providers = uniqueProviders(explored);

  return (
    <Page
      title="History"
      intro="Explored items, recorded only when an item's details page is opened or its viewer starts. Resetting history never removes favorites, likes, or category preferences."
    >
      {session.preferences.historyTrackingEnabled ? null : (
        <p className={styles.note}>
          History tracking is off. Existing records stay until you reset them; new visits are not
          recorded.
        </p>
      )}

      {explored.length === 0 ? (
        <EmptyState
          title="Nothing explored yet"
          description="Open an item's details or start its viewer to add it here. Opening a collection does not mark its items as explored."
        />
      ) : (
        <ol className={styles.list}>
          {explored.map((state) => (
            <HistoryRow key={formatCanonicalId(state)} state={state} />
          ))}
        </ol>
      )}

      <div className={styles.actions}>
        <Button
          disabled={explored.length === 0}
          onClick={() => {
            void session.resetExplorationHistory();
          }}
        >
          Reset exploration history
        </Button>
        {providers.map((providerId) => (
          <Button
            key={providerId}
            onClick={() => {
              void session.resetExplorationHistory({ providerId });
            }}
          >
            Clear {getProviderName(providerId)} history
          </Button>
        ))}
      </div>
    </Page>
  );
}

function HistoryRow({ state }: { readonly state: StoredContentState }) {
  const { queries } = useProviderServices();
  const item = useAsyncValue(`item:${state.providerId}:${state.itemId}`, ({ signal, fresh }) =>
    queries.item(state.providerId, state.itemId, { signal, fresh }),
  );
  const title = item.state.status === 'ready' ? item.state.value.title : state.itemId;
  const exploredAt = state.lastExploredAt ?? state.firstExploredAt;
  const count = state.explorationCount ?? (state.explored ? 1 : 0);

  return (
    <li className={styles.row}>
      <Link className={styles.link} to={buildItemPath(state)}>
        {title}
      </Link>
      <p className={styles.meta}>
        {getProviderName(state.providerId)}
        {exploredAt !== undefined ? (
          <>
            {' · '}
            <time dateTime={exploredAt}>{exploredAt.slice(0, 10)}</time>
          </>
        ) : null}
        {count > 0 ? ` · Visited ${count === 1 ? 'once' : `${count} times`}` : null}
      </p>
    </li>
  );
}

function byLastExplored(left: StoredContentState, right: StoredContentState): number {
  return Date.parse(right.lastExploredAt ?? '') - Date.parse(left.lastExploredAt ?? '');
}

function uniqueProviders(states: readonly StoredContentState[]): readonly string[] {
  return [...new Set(states.map((state) => state.providerId))];
}
