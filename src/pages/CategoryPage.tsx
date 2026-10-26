import { useParams } from 'react-router-dom';
import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function CategoryPage() {
  const { categoryId = '' } = useParams<{ categoryId: string }>();

  return (
    <Page title="Category" intro={`Category route parameter: "${categoryId}".`}>
      <NotYetImplemented
        feature="Category browsing"
        summary="The View All page for a category: a responsive grid with sorting, filtering, in-category search, and incremental loading."
        plannedPhase="Phase 5"
      />
    </Page>
  );
}
