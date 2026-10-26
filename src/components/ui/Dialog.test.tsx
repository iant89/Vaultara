import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

function Harness({ onClose }: { readonly onClose: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open details
      </button>
      <Dialog
        open={open}
        title="File details"
        onClose={() => {
          setOpen(false);
          onClose();
        }}
      >
        <p>Choose a file to download.</p>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('is closed until opened', () => {
    render(<Harness onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens with an accessible name from its title', async () => {
    render(<Harness onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open details' }));

    expect(screen.getByRole('dialog', { name: 'File details' })).toBeInTheDocument();
  });

  it('moves focus into the dialog when it opens', async () => {
    render(<Harness onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open details' }));

    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open details' }));
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to the control that opened it', async () => {
    render(<Harness onClose={vi.fn()} />);
    const opener = screen.getByRole('button', { name: 'Open details' });

    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(opener).toHaveFocus();
  });

  it('can hide the built-in close button when the footer provides dismissal', () => {
    render(
      <Dialog open title="Confirm" onClose={vi.fn()} hideCloseButton>
        <p>Body</p>
      </Dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close dialog' })).toBeNull();
  });
});
