import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentRow } from './ContentRow';

function renderRow(props: Partial<Parameters<typeof ContentRow>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ContentRow title="Continue exploring" itemCount={3} {...props}>
        <li>one</li>
        <li>two</li>
        <li>three</li>
      </ContentRow>
    </MemoryRouter>,
  );
}

/**
 * jsdom lays nothing out, so scroll metrics are defined explicitly to exercise the control
 * availability logic. This is the only way to test overflow-dependent behaviour without a
 * real engine.
 */
function simulateScrollMetrics(
  element: HTMLElement,
  { scrollWidth, clientWidth, scrollLeft }: Record<string, number>,
) {
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(element, 'scrollLeft', {
    value: scrollLeft,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  vi.stubGlobal('scrollBy', undefined);
  HTMLElement.prototype.scrollBy = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error - removing the jsdom stub
  delete HTMLElement.prototype.scrollBy;
});

describe('ContentRow', () => {
  it('labels the section with its title', () => {
    renderRow();

    expect(screen.getByRole('region', { name: 'Continue exploring' })).toBeInTheDocument();
  });

  it('renders its children as list items', () => {
    renderRow();

    const list = screen.getByRole('list', { name: 'Continue exploring' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  // Keyboard access is provided by focusable cards (focusing an off-screen card scrolls it
  // into view) and by the scroll buttons, not by making the list itself a tab stop.
  it('does not turn the scroll container into a misleading tab stop', () => {
    renderRow();

    expect(screen.getByRole('list', { name: 'Continue exploring' })).not.toHaveAttribute(
      'tabindex',
    );
  });

  it('keeps the scroll controls reachable as buttons', () => {
    renderRow();
    const track = screen.getByRole('list', { name: 'Continue exploring' });
    simulateScrollMetrics(track, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 300 });

    act(() => {
      track.dispatchEvent(new Event('scroll'));
    });

    for (const button of screen.getAllByRole('button', { name: /^Scroll/ })) {
      expect(button.tagName).toBe('BUTTON');
      expect(button).toBeEnabled();
    }
  });

  // Regression guard: a row that cannot scroll must not offer scroll controls.
  it('omits scroll controls when there is nothing to scroll', () => {
    renderRow();

    expect(screen.queryByRole('button', { name: /scroll/i })).toBeNull();
  });

  it('offers a forward control when content overflows, and no backward one at the start', () => {
    renderRow();
    const track = screen.getByRole('list', { name: 'Continue exploring' });
    simulateScrollMetrics(track, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 0 });

    act(() => {
      track.dispatchEvent(new Event('scroll'));
    });

    expect(
      screen.getByRole('button', { name: 'Scroll Continue exploring forward' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scroll Continue exploring backward' })).toBeNull();
  });

  it('offers both controls when scrolled to the middle', () => {
    renderRow();
    const track = screen.getByRole('list', { name: 'Continue exploring' });
    simulateScrollMetrics(track, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 300 });

    act(() => {
      track.dispatchEvent(new Event('scroll'));
    });

    expect(
      screen.getByRole('button', { name: 'Scroll Continue exploring backward' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Scroll Continue exploring forward' }),
    ).toBeInTheDocument();
  });

  it('scrolls by roughly one page of cards', async () => {
    renderRow();
    const track = screen.getByRole('list', { name: 'Continue exploring' });
    simulateScrollMetrics(track, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 0 });

    act(() => {
      track.dispatchEvent(new Event('scroll'));
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Scroll Continue exploring forward' }),
    );

    expect(track.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number) as number }),
    );
    const calls = vi.mocked(track.scrollBy).mock.calls;
    const firstCall = calls[0]?.[0] as ScrollToOptions | undefined;
    expect(firstCall?.left).toBe(320);
  });

  it('shows a view-all link when a destination is given', () => {
    renderRow({ viewAllHref: '/category/books' });

    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute(
      'href',
      '/category/books',
    );
  });

  it('makes the row title a link to the same destination', () => {
    renderRow({ viewAllHref: '/category/books' });

    expect(screen.getByRole('link', { name: 'Continue exploring' })).toHaveAttribute(
      'href',
      '/category/books',
    );
  });

  it('reports an empty row honestly instead of rendering an empty track', () => {
    render(
      <MemoryRouter>
        <ContentRow title="Films" itemCount={0}>
          {null}
        </ContentRow>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('Nothing to show here yet.')).toBeInTheDocument();
  });

  it('supports a custom empty message', () => {
    render(
      <MemoryRouter>
        <ContentRow title="Films" itemCount={0} emptyMessage="No films matched this filter.">
          {null}
        </ContentRow>
      </MemoryRouter>,
    );

    expect(screen.getByText('No films matched this filter.')).toBeInTheDocument();
  });
});
