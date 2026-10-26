import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ContentCollection, ContentItem } from '../../models/content';
import { CollectionCard } from './CollectionCard';
import { ItemCard } from './ItemCard';
import { ProviderBadge } from './ProviderBadge';
import { ResponsiveGrid } from './ResponsiveGrid';

const ITEM: ContentItem = {
  id: 'item with space',
  providerId: 'archive',
  title: 'A Silent Film',
  type: 'movie',
  creator: 'F. W. Murnau',
  publicationDate: '1922',
  categories: ['films'],
  tags: [],
  metadata: {},
};

const COLLECTION: ContentCollection = {
  id: 'silent-cinema',
  providerId: 'archive',
  title: 'Early Silent Cinema',
  description: 'Public-domain films.',
  itemCount: 1240,
  categoryIds: ['films'],
  metadata: {},
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ItemCard', () => {
  it('links to the canonical item route, escaping the id', () => {
    renderWithRouter(<ItemCard item={ITEM} providerName="Internet Archive" />);

    expect(screen.getByRole('link', { name: 'A Silent Film' })).toHaveAttribute(
      'href',
      '/item/archive/item%20with%20space',
    );
  });

  it('shows the content type and creator', () => {
    renderWithRouter(<ItemCard item={ITEM} providerName="Internet Archive" />);

    // The type also appears in the artwork fallback label, so target the chip itself.
    expect(screen.getByTestId('content-type')).toHaveTextContent('Film');
    expect(screen.getByText('F. W. Murnau')).toBeInTheDocument();
    expect(screen.getByText('1922')).toBeInTheDocument();
  });

  it('renders a fallback instead of a broken image when artwork is missing', () => {
    renderWithRouter(<ItemCard item={ITEM} providerName="Internet Archive" />);

    expect(screen.getByTestId('artwork-fallback')).toBeInTheDocument();
  });

  it('hides the favourite control when toggling is not offered', () => {
    renderWithRouter(<ItemCard item={ITEM} providerName="Internet Archive" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('reports the canonical identity when the favourite toggle is used', async () => {
    const onFavoriteToggle = vi.fn();
    renderWithRouter(
      <ItemCard item={ITEM} providerName="Internet Archive" onFavoriteToggle={onFavoriteToggle} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add A Silent Film to favorites' }));

    expect(onFavoriteToggle).toHaveBeenCalledWith(
      { providerId: 'archive', itemId: 'item with space' },
      true,
    );
  });

  it('shows the provider badge only when asked', () => {
    const { rerender } = renderWithRouter(<ItemCard item={ITEM} providerName="Internet Archive" />);
    expect(screen.queryByText('Internet Archive')).toBeNull();

    rerender(
      <MemoryRouter>
        <ItemCard item={ITEM} providerName="Internet Archive" showProvider />
      </MemoryRouter>,
    );
    expect(screen.getByText('Internet Archive')).toBeInTheDocument();
  });
});

describe('CollectionCard', () => {
  it('links to the collection route for the right provider', () => {
    renderWithRouter(<CollectionCard collection={COLLECTION} providerName="Internet Archive" />);

    expect(screen.getByRole('link', { name: 'Early Silent Cinema' })).toHaveAttribute(
      'href',
      '/collection/archive/silent-cinema',
    );
  });

  it('formats the item count and singularises it', () => {
    renderWithRouter(<CollectionCard collection={COLLECTION} providerName="Internet Archive" />);
    expect(screen.getByText('1,240 items')).toBeInTheDocument();
  });

  it('omits the count when the provider did not report one', () => {
    const { itemCount: _itemCount, ...withoutCount } = COLLECTION;
    renderWithRouter(<CollectionCard collection={withoutCount} providerName="Internet Archive" />);

    expect(screen.queryByText(/items?$/)).toBeNull();
  });
});

describe('ProviderBadge', () => {
  it('always states the provider name as text', () => {
    renderWithRouter(<ProviderBadge providerId="wikipedia" providerName="Wikipedia" />);

    expect(screen.getByText('Wikipedia')).toBeInTheDocument();
  });

  it('marks the colour swatch as decorative', () => {
    renderWithRouter(<ProviderBadge providerId="wikipedia" providerName="Wikipedia" />);

    expect(screen.getByTestId('provider-swatch')).not.toHaveAttribute('role');
    expect(screen.getByTestId('provider-swatch').closest('[aria-hidden="true"]')).toBeNull();
    // The name is present, so colour is not the only signal.
    expect(screen.getByText('Wikipedia')).toBeVisible();
  });

  it('accepts providers without a defined swatch colour', () => {
    renderWithRouter(<ProviderBadge providerId="unknown" providerName="Unknown" />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('ResponsiveGrid', () => {
  it('renders a labelled list of cards', () => {
    renderWithRouter(
      <ResponsiveGrid label="Sample items">
        <li>one</li>
        <li>two</li>
      </ResponsiveGrid>,
    );

    const list = screen.getByRole('list', { name: 'Sample items' });
    expect(list.tagName).toBe('UL');
    expect(list.children).toHaveLength(2);
  });
});
