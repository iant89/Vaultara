import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { Breadcrumbs } from '../components/content/Breadcrumbs';
import { SavedActions } from '../components/content/SavedActions';
import { LoadingState } from '../components/feedback/LoadingState';
import { Page } from '../components/layout/Page';
import { getProviderName } from '../config/providers';
import { providerSupports } from '../data/providerCapabilities';
import { useProviderServices } from '../data/ProviderServices';
import { useSession } from '../data/SessionContext';
import { useAsyncValue } from '../data/useAsyncValue';
import type { ContentFile } from '../models/content';
import { formatCanonicalId } from '../models/identity';
import type { ViewerProgress } from '../models/userState';
import { useMarkExplored } from '../personalization/useMarkExplored';
import { buildHomePath, buildItemPath, buildProviderPath, buildViewerPath } from '../utils/links';
import { ViewerContainer } from '../viewers/ViewerContainer';

export function ViewerPage() {
  const { providerId = '', itemId = '' } = useParams<{ providerId: string; itemId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { queries, runtime } = useProviderServices();
  const { recordProgress, contentStates } = useSession();
  const providerName = getProviderName(providerId);
  const requestedFile = params.get('file') ?? undefined;
  const identity = { providerId, itemId };

  const item = useAsyncValue(`item:${providerId}:${itemId}`, ({ signal, fresh }) =>
    queries.item(providerId, itemId, { signal, fresh }),
  );

  const files = useAsyncValue(`files:${providerId}:${itemId}`, ({ signal, fresh }) =>
    providerSupports(runtime, providerId, 'downloadableFiles')
      ? queries.files(providerId, itemId, { signal, fresh })
      : Promise.resolve<readonly ContentFile[]>([]),
  );

  const loaded = item.state.status === 'ready' ? item.state.value : undefined;
  const title = loaded?.title ?? 'Viewer';
  useMarkExplored(identity, loaded !== undefined, loaded?.type);

  const handleProgress = useCallback(
    (progress: ViewerProgress) => {
      void recordProgress({ providerId, itemId }, progress);
    },
    [itemId, providerId, recordProgress],
  );

  const handleSelectFile = useCallback(
    (fileId: string) => {
      void navigate(buildViewerPath({ providerId, itemId }, fileId));
    },
    [itemId, navigate, providerId],
  );

  const storedProgress = contentStates.find(
    (state) => state.providerId === providerId && state.itemId === itemId,
  )?.progress;

  return (
    <Page
      title={title}
      intro={`Viewer route identity: "${providerId}:${itemId}". Files stay on ${providerName}; this page only displays a copy a registered viewer can present.`}
      meta={loaded !== undefined ? <SavedActions item={loaded} /> : undefined}
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', to: buildHomePath() },
            { label: providerName, to: buildProviderPath(providerId) },
            {
              label: title,
              to: buildItemPath(identity),
            },
            { label: 'Viewer' },
          ]}
        />
      }
    >
      <AsyncContent
        state={item.state}
        reload={item.reload}
        errorTitle="This item could not be loaded"
        missing={{
          title: 'Item not found',
          description: `Nothing is listed as ${formatCanonicalId(identity)}.`,
        }}
      >
        {(loadedItem) => (
          <AsyncContent
            state={files.state}
            reload={files.reload}
            errorTitle="Files could not be loaded"
            loading={<LoadingState label="Loading files…" />}
          >
            {(entries) => (
              <ViewerContainer
                item={loadedItem}
                files={entries}
                {...(requestedFile !== undefined ? { requestedFileId: requestedFile } : {})}
                {...(storedProgress !== undefined ? { initialProgress: storedProgress } : {})}
                onSelectFile={handleSelectFile}
                onProgressChange={handleProgress}
              />
            )}
          </AsyncContent>
        )}
      </AsyncContent>
    </Page>
  );
}
