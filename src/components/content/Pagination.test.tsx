import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { buildPageWindow, Pagination } from './Pagination';

function renderPagination(props: Parameters<typeof Pagination>[0]) {
  return render(
    <MemoryRouter>
      <Pagination {...props} />
    </MemoryRouter>,
  );
}

describe('buildPageWindow', () => {
  it('lists every page when the list is short', () => {
    expect(buildPageWindow(1, 1)).toEqual([1]);
    expect(buildPageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('anchors the first and last page and abbreviates the middle', () => {
    expect(buildPageWindow(1, 20)).toEqual([1, 2, null, 20]);
    expect(buildPageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(buildPageWindow(20, 20)).toEqual([1, null, 19, 20]);
  });
});

describe('Pagination', () => {
  it('renders nothing when there is nowhere to go', () => {
    const { container } = renderPagination({
      page: 1,
      hasMore: false,
      total: 10,
      pageSize: 24,
      buildHref: (page) => `/page/${String(page)}`,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('numbers the pages when the provider reported a total', () => {
    renderPagination({
      page: 2,
      hasMore: true,
      total: 100,
      pageSize: 24,
      buildHref: (page) => `/collection/archive/feature_films?page=${String(page)}`,
    });

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    const pages = within(nav).getByRole('list', { name: 'Pages' });

    expect(within(nav).getByText('Page 2 of 5')).toBeInTheDocument();
    expect(within(pages).getByText('2')).toHaveAttribute('aria-current', 'page');
    expect(within(pages).getByRole('link', { name: '1' })).toHaveAttribute(
      'href',
      '/collection/archive/feature_films?page=1',
    );
    expect(within(pages).getByRole('link', { name: '5' })).toBeInTheDocument();
  });

  it('offers previous and next as real links', () => {
    renderPagination({
      page: 2,
      hasMore: true,
      buildHref: (page) => `/category/movies?page=${String(page)}`,
    });

    const nav = screen.getByRole('navigation', { name: 'Pagination' });

    // Without a total there is no page count to invent, so only the neighbours are offered.
    expect(within(nav).getByText('Page 2')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Previous/ })).toHaveAttribute(
      'href',
      '/category/movies?page=1',
    );
    expect(within(nav).getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      '/category/movies?page=3',
    );
  });

  it('marks the current page as a span rather than a link to itself', () => {
    renderPagination({
      page: 1,
      hasMore: true,
      total: 48,
      pageSize: 24,
      buildHref: (page) => `/page/${String(page)}`,
    });

    const current = screen.getByText('1');

    expect(current.tagName).toBe('SPAN');
    expect(current).toHaveAttribute('aria-current', 'page');
  });
});
