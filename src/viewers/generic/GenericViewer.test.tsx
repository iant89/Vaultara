import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { GenericViewer } from './GenericViewer';

const item = makeItem({ title: 'Night of the Living Dead', type: 'movie' });
const video = makeFile({
  id: 'clip.mp4',
  name: 'clip.mp4',
  mimeType: 'video/mp4',
  sizeBytes: 1024,
  downloadUrl: 'https://archive.org/download/film/clip.mp4',
});

describe('GenericViewer', () => {
  it('explains the missing viewer and offers a provider download', () => {
    render(<GenericViewer item={item} files={[video]} activeFileId="clip.mp4" />);

    expect(screen.getByText(/no specialized viewer/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download clip.mp4' })).toHaveAttribute(
      'href',
      'https://archive.org/download/film/clip.mp4',
    );
  });
});
