import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import type { EmulatorEngine } from './adapter';
import { GameBoyViewer } from './GameBoyViewer';
import { buildMinimalGbRom } from './minimalRom';

const romFile = makeFile({
  id: 'homebrew.gb',
  providerId: 'archive',
  itemId: 'gb',
  name: 'homebrew.gb',
  mimeType: 'application/x-gameboy-rom',
  extension: 'gb',
  downloadUrl: 'https://archive.org/download/gb/homebrew.gb',
});

const item = makeItem({
  id: 'gb',
  providerId: 'archive',
  title: 'Vaultara GB stub',
  type: 'game',
});

function fakeEngine(): EmulatorEngine {
  const buttons = new Map<string, boolean>();
  let running = false;
  let disposed = false;

  return {
    system: 'gb',
    displayWidth: 160,
    displayHeight: 144,
    attach() {
      return undefined;
    },
    load() {
      return undefined;
    },
    start() {
      running = true;
    },
    pause() {
      running = false;
    },
    resume() {
      running = true;
    },
    setButton(button, pressed) {
      buttons.set(button, pressed);
    },
    setPalette() {
      return undefined;
    },
    setKeyBinding() {
      return undefined;
    },
    setFrameRate() {
      return undefined;
    },
    getSaveRam() {
      return running || disposed ? undefined : undefined;
    },
    setSaveRam() {
      return false;
    },
    dispose() {
      disposed = true;
      running = false;
    },
  };
}

describe('GameBoyViewer', () => {
  it('shows the display, pause control, and touch buttons after the ROM loads', async () => {
    const engine = fakeEngine();
    render(
      <GameBoyViewer
        item={item}
        files={[romFile]}
        activeFileId="homebrew.gb"
        load={async () => buildMinimalGbRom()}
        createEngine={async () => engine}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Game Boy emulator' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Game Boy display/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download homebrew.gb' })).toHaveAttribute(
      'href',
      'https://archive.org/download/gb/homebrew.gb',
    );
    expect(screen.getByText(/never run as JavaScript/i)).toBeInTheDocument();
  });

  it('pauses and resumes through the adapter', async () => {
    const user = userEvent.setup();
    const pause = vi.fn();
    const resume = vi.fn();
    const engine = { ...fakeEngine(), pause, resume };
    render(
      <GameBoyViewer
        item={item}
        files={[romFile]}
        activeFileId="homebrew.gb"
        load={async () => buildMinimalGbRom()}
        createEngine={async () => engine}
      />,
    );

    await screen.findByRole('button', { name: 'Pause' });
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(pause).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(resume).toHaveBeenCalled();
  });

  it('presses a touch button on the adapter', async () => {
    const setButton = vi.fn();
    const engine = { ...fakeEngine(), setButton };
    render(
      <GameBoyViewer
        item={item}
        files={[romFile]}
        activeFileId="homebrew.gb"
        load={async () => buildMinimalGbRom()}
        createEngine={async () => engine}
      />,
    );

    const a = await screen.findByRole('button', { name: 'A' });
    fireEvent.pointerDown(a);
    expect(setButton).toHaveBeenCalledWith('a', true);
  });

  it('explains a rejected ROM and still offers the original download', async () => {
    render(
      <GameBoyViewer
        item={item}
        files={[romFile]}
        activeFileId="homebrew.gb"
        load={async () => {
          throw new Error('This file is not a Game Boy ROM. The emulator was not started.');
        }}
        createEngine={async () => fakeEngine()}
      />,
    );

    expect(await screen.findByText(/could not be opened/i)).toBeInTheDocument();
    expect(screen.getByText(/not a Game Boy ROM/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download homebrew.gb' })).toBeInTheDocument();
  });

  it('disposes the engine on unmount', async () => {
    const dispose = vi.fn();
    const engine = { ...fakeEngine(), dispose };
    const { unmount } = render(
      <GameBoyViewer
        item={item}
        files={[romFile]}
        activeFileId="homebrew.gb"
        load={async () => buildMinimalGbRom()}
        createEngine={async () => engine}
      />,
    );

    await screen.findByRole('toolbar', { name: 'Game Boy emulator' });
    unmount();
    expect(dispose).toHaveBeenCalled();
  });
});
