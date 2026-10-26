import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { WikipediaReader } from './WikipediaReader';
import type { LoadedArticle } from './loadArticle';

const file = makeFile({
  id: 'article',
  providerId: 'wikipedia',
  itemId: 'Ada_Lovelace',
  name: 'Ada Lovelace',
  mimeType: 'application/vnd.vaultara.wikipedia+html',
  downloadAvailable: true,
  downloadUrl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
});

const item = makeItem({
  id: 'Ada_Lovelace',
  providerId: 'wikipedia',
  title: 'Ada Lovelace',
  type: 'article',
  description: 'English mathematician',
  sourceUrl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
  metadata: {
    langlinks: [
      { lang: 'it', title: 'Ada Lovelace', url: 'https://it.wikipedia.org/wiki/Ada_Lovelace' },
    ],
  },
});

const article: LoadedArticle = {
  title: 'Ada Lovelace',
  displayTitle: 'Ada Lovelace',
  html: `<p>Ada Lovelace was a mathematician.</p><h2 id="Biography">Biography</h2><p>See <a href="/item/wikipedia/Charles_Babbage">Charles Babbage</a>.</p><p><img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Ada.jpg" alt="Ada"></p><h2 id="References">References</h2><ol><li id="cite_note-1">A book.</li></ol>`,
  sections: [
    { level: 1, line: 'Biography', anchor: 'Biography' },
    { level: 1, line: 'References', anchor: 'References' },
  ],
};

function renderReader(
  load: (itemId: string, signal: AbortSignal) => Promise<LoadedArticle> = async () => article,
) {
  return render(
    <MemoryRouter>
      <WikipediaReader item={item} files={[file]} activeFileId="article" load={load} />
    </MemoryRouter>,
  );
}

describe('WikipediaReader', () => {
  it('shows a document layout with contents, body, references, and the original link', async () => {
    renderReader();

    expect(await screen.findByRole('toolbar', { name: 'Wikipedia reader' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Table of contents' })).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace was a mathematician.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ada' })).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/a/a4/Ada.jpg',
    );
    expect(screen.getByText('A book.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Original article' })).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Ada_Lovelace',
    );
    expect(screen.getByRole('link', { name: 'it: Ada Lovelace' })).toHaveAttribute(
      'href',
      'https://it.wikipedia.org/wiki/Ada_Lovelace',
    );
  });

  it('navigates in-app wiki links', async () => {
    const user = userEvent.setup();
    renderReader();

    await screen.findByText('Ada Lovelace was a mathematician.');
    await user.click(screen.getByRole('link', { name: 'Charles Babbage' }));

    expect(screen.getByRole('link', { name: 'Charles Babbage' })).toHaveAttribute(
      'href',
      '/item/wikipedia/Charles_Babbage',
    );
  });

  it('aborts the parse fetch on unmount', async () => {
    const load = vi.fn(
      (_id: string, signal: AbortSignal) =>
        new Promise<LoadedArticle>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    const { unmount } = renderReader(load);

    expect(load).toHaveBeenCalled();
    unmount();
    expect(load.mock.calls[0]?.[1].aborted).toBe(true);
  });
});
