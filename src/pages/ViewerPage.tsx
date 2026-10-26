import { lazy, Suspense } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { Breadcrumbs } from '../components/content/Breadcrumbs';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Page } from '../components/layout/Page';
import { getProviderName } from '../config/providers';
import { providerSupports } from '../data/providerCapabilities';
import { useProviderServices } from '../data/ProviderServices';
import { useAsyncValue } from '../data/useAsyncValue';
import type { ContentFile } from '../models/content';
import { formatCanonicalId } from '../models/identity';
import { canReadPdf, selectPdfFile } from '../viewers/pdf/isPdfFile';
import { buildHomePath, buildItemPath, buildProviderPath, buildViewerPath } from '../utils/links';

const PdfViewer = lazy(async () => {
  const module = await import('../viewers/pdf/PdfViewer');
  return { default: module.PdfViewer };
});

export function ViewerPage() {
  const { providerId = '', itemId = '' } = useParams<{ providerId: string; itemId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { queries, runtime } = useProviderServices();
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

  const title = item.state.status === 'ready' ? item.state.value.title : 'Viewer';

  return (
    <Page
      title={title}
      intro={`Viewer route identity: "${providerId}:${itemId}".`}
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', to: buildHomePath() },
            { label: providerName, to: buildProviderPath(providerId) },
            {
              label: title,
              to: buildItemPath(identity),
            },
            { label: 'Reader' },
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
        {(loaded) => (
          <AsyncContent
            state={files.state}
            reload={files.reload}
            errorTitle="Files could not be loaded"
            loading={<LoadingState label="Loading files…" />}
          >
            {(entries) => {
              const pdfFiles = entries.filter(canReadPdf);
              const selected = selectPdfFile(entries, requestedFile);

              if (selected === undefined) {
                return (
                  <EmptyState
                    title="No PDF this app can read"
                    description="The PDF reader opens a downloadable PDF from this item. Audio, video, and other formats do not have a viewer yet."
                    action={<Link to={buildItemPath(identity)}>Back to item details</Link>}
                  />
                );
              }

              return (
                <Suspense fallback={<LoadingState label="Loading reader…" />}>
                  <PdfViewer
                    item={loaded}
                    file={selected}
                    pdfFiles={pdfFiles}
                    onSelectFile={(fileId) => navigate(buildViewerPath(identity, fileId))}
                  />
                </Suspense>
              );
            }}
          </AsyncContent>
        )}
      </AsyncContent>
    </Page>
  );
}
