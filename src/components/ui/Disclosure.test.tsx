import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Disclosure, DisclosureAction, DisclosureGroup, DisclosureItem } from './Disclosure';

function renderDisclosure() {
  return render(
    <MemoryRouter>
      <Disclosure triggerLabel="Account menu" triggerContent={<span>icon</span>}>
        <DisclosureGroup title="Your library">
          <DisclosureItem to="/favorites">Favorites</DisclosureItem>
          <DisclosureItem to="/history">History</DisclosureItem>
        </DisclosureGroup>
      </Disclosure>
    </MemoryRouter>,
  );
}

describe('Disclosure', () => {
  it('starts closed and reports its state', () => {
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: 'Account menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Favorites' })).toBeNull();
  });

  it('opens on activation and exposes the grouped links', async () => {
    renderDisclosure();

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('group', { name: 'Your library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('href', '/favorites');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    renderDisclosure();
    const trigger = screen.getByRole('button', { name: 'Account menu' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes when a pointer goes down outside', async () => {
    renderDisclosure();
    const trigger = screen.getByRole('button', { name: 'Account menu' });

    await userEvent.click(trigger);
    await userEvent.click(document.body);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes after following a link', async () => {
    renderDisclosure();
    const trigger = screen.getByRole('button', { name: 'Account menu' });

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('link', { name: 'History' }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes after a command action', async () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <Disclosure triggerLabel="Account menu" triggerContent={<span>icon</span>}>
          <DisclosureGroup title="Account">
            <DisclosureAction onClick={onClick}>Sign out</DisclosureAction>
          </DisclosureGroup>
        </Disclosure>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: 'Account menu' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles closed when the trigger is activated twice', async () => {
    renderDisclosure();
    const trigger = screen.getByRole('button', { name: 'Account menu' });

    await userEvent.click(trigger);
    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
