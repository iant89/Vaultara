import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { SoftwareViewer } from './SoftwareViewer';

const iso = makeFile({
  id: 'dos.iso',
  providerId: 'archive',
  itemId: 'dos_stub',
  name: 'dos.iso',
  mimeType: 'application/x-iso9660-image',
  sizeBytes: 4096,
  downloadUrl: 'https://archive.org/download/dos_stub/dos.iso',
});

const rom = makeFile({
  id: 'homebrew.gb',
  providerId: 'archive',
  itemId: 'dos_stub',
  name: 'homebrew.gb',
  mimeType: 'application/x-gameboy-rom',
  extension: 'gb',
  downloadUrl: 'https://archive.org/download/dos_stub/homebrew.gb',
});

const item = makeItem({
  id: 'dos_stub',
  providerId: 'archive',
  title: 'MS-DOS stub',
  type: 'software',
  sourceUrl: 'https://archive.org/details/dos_stub',
  metadata: { os: 'MS-DOS', processor: 'x86', emulator: 'DOSBox' },
});

describe('SoftwareViewer', () => {
  it('lists metadata and download without claiming execution', () => {
    render(
      <MemoryRouter>
        <SoftwareViewer item={item} files={[iso]} activeFileId="dos.iso" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/does not run downloaded programs/i)).toBeInTheDocument();
    expect(screen.getByText('MS-DOS')).toBeInTheDocument();
    expect(screen.getByText('x86')).toBeInTheDocument();
    expect(screen.getByText('DOSBox')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download dos.iso' })).toHaveAttribute(
      'href',
      'https://archive.org/download/dos_stub/dos.iso',
    );
    expect(screen.queryByTitle(/Archived capture/)).not.toBeInTheDocument();
  });

  it('offers Play when a Game Boy ROM on the item can use the emulator sandbox', () => {
    render(
      <MemoryRouter>
        <SoftwareViewer item={item} files={[iso, rom]} activeFileId="dos.iso" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Play homebrew.gb' })).toHaveAttribute(
      'href',
      '/viewer/archive/dos_stub?file=homebrew.gb',
    );
  });
});
