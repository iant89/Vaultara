import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonText } from './Skeleton';

describe('skeletons', () => {
  it('hides individual placeholder shapes from assistive technology', () => {
    const { container } = render(
      <div>
        <Skeleton />
        <SkeletonText />
        <SkeletonCard />
      </div>,
    );

    for (const element of container.querySelectorAll(
      'span[aria-hidden="true"], div[aria-hidden="true"]',
    )) {
      expect(element).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('announces loading once per region, not once per shape', () => {
    render(
      <SkeletonGroup label="Loading films…">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </SkeletonGroup>,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Loading films…');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('defaults the announcement text', () => {
    render(
      <SkeletonGroup>
        <SkeletonCard />
      </SkeletonGroup>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading content…');
  });
});
