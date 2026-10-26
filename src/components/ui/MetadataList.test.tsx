import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetadataList } from './MetadataList';

describe('MetadataList', () => {
  it('renders term and definition pairs as dt/dd inside a dl', () => {
    const { container } = render(
      <MetadataList
        label="Item metadata"
        entries={[
          { label: 'Creator', value: 'Ada Lovelace' },
          { label: 'Year', value: 1843 },
        ]}
      />,
    );

    expect(container.querySelectorAll('dt')).toHaveLength(2);
    expect(container.querySelectorAll('dd')).toHaveLength(2);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('1843')).toBeInTheDocument();
  });

  it('names the description list for assistive technology', () => {
    const { container } = render(
      <MetadataList label="Item metadata" entries={[{ label: 'Year', value: 1843 }]} />,
    );

    expect(container.querySelector('dl')).toHaveAttribute('aria-label', 'Item metadata');
  });

  it('omits absent and blank values rather than rendering empty rows', () => {
    render(
      <MetadataList
        entries={[
          { label: 'Present', value: 'yes' },
          { label: 'Missing', value: undefined },
          { label: 'Null', value: null },
          { label: 'Blank', value: '   ' },
        ]}
      />,
    );

    expect(document.querySelectorAll('dt')).toHaveLength(1);
    expect(screen.queryByText('Missing')).toBeNull();
    expect(screen.queryByText('Blank')).toBeNull();
  });

  it('renders nothing at all when every value is absent', () => {
    const { container } = render(<MetadataList entries={[{ label: 'A', value: undefined }]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
