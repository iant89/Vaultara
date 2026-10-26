import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import { CollectionCard } from '../components/ui/CollectionCard';
import { ContentRow } from '../components/ui/ContentRow';
import { Dialog } from '../components/ui/Dialog';
import { ItemCard, CONTENT_TYPE_LABELS } from '../components/ui/ItemCard';
import { MetadataList } from '../components/ui/MetadataList';
import { ProviderBadge } from '../components/ui/ProviderBadge';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonMedia } from '../components/ui/Skeleton';
import { FavoriteButton, LikeButton } from '../components/ui/ToggleButton';
import { SAMPLE_COLLECTIONS, SAMPLE_ITEMS } from '../dev/sampleContent';
import type { ContentIdentity } from '../models/identity';
import styles from './DesignSystemPage.module.css';

const COLOR_TOKENS = [
  { name: '--color-bg', label: 'Background' },
  { name: '--color-surface', label: 'Surface' },
  { name: '--color-surface-raised', label: 'Surface raised' },
  { name: '--color-border', label: 'Border' },
  { name: '--color-text', label: 'Text' },
  { name: '--color-text-muted', label: 'Text muted' },
  { name: '--color-text-subtle', label: 'Text subtle' },
  { name: '--color-accent', label: 'Accent' },
  { name: '--color-focus', label: 'Focus ring' },
  { name: '--color-danger', label: 'Danger' },
  { name: '--color-success', label: 'Success' },
  { name: '--color-warning', label: 'Warning' },
] as const;

const TYPE_SCALE = [
  { token: '--text-3xl', label: 'Page heading' },
  { token: '--text-2xl', label: 'Section heading' },
  { token: '--text-xl', label: 'Subsection' },
  { token: '--text-lg', label: 'Card row title' },
  { token: '--text-base', label: 'Body' },
  { token: '--text-sm', label: 'Card title' },
  { token: '--text-xs', label: 'Metadata' },
  { token: '--text-2xs', label: 'Caps label' },
] as const;

const SPACE_TOKENS = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-7',
  '--space-8',
] as const;

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionNote}>{note}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Development-only design system reference.
 *
 * Registered only when `includeDevRoutes` is set, so it is absent from production builds.
 * Every card here renders synthetic sample data from `src/dev/sampleContent.ts`; toggles
 * hold local state only, because favourites and likes are not implemented until Phase 8.
 */
export function DesignSystemPage() {
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(new Set());
  const [likes, setLikes] = useState<ReadonlySet<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleIn = (
    setter: (updater: (current: ReadonlySet<string>) => ReadonlySet<string>) => void,
    identity: ContentIdentity,
    next: boolean,
  ) => {
    const key = `${identity.providerId}:${identity.itemId}`;
    setter((current) => {
      const updated = new Set(current);
      if (next) {
        updated.add(key);
      } else {
        updated.delete(key);
      }
      return updated;
    });
  };

  const isIn = (set: ReadonlySet<string>, identity: ContentIdentity) =>
    set.has(`${identity.providerId}:${identity.itemId}`);

  return (
    <div className={styles.page}>
      <header className={styles.sectionHeading}>
        <h1 className={styles.sectionTitle}>Design system</h1>
        <p className={styles.sectionNote}>
          Reference page for the shared visual language: tokens, typography, and every shared
          component in its default, pressed, disabled, and empty states.
        </p>
      </header>

      <div className={styles.notice}>
        <p>
          <strong>Development only.</strong> This route is not registered in production builds.
        </p>
        <p>
          All cards use synthetic sample content under a reserved <code>sample</code> provider id.
          Favourite and like toggles hold local state for demonstration; no user state is stored
          anywhere until Phase 8.
        </p>
      </div>

      <Section
        title="Colour"
        note="Every pairing used by components is asserted against WCAG 2.2 AA by src/styles/contrast.test.ts."
      >
        <ul className={styles.swatches}>
          {COLOR_TOKENS.map((token) => (
            <li key={token.name} className={styles.swatch}>
              <span
                className={styles.swatchChip}
                style={{ backgroundColor: `var(${token.name})` } as CSSProperties}
              />
              <span>{token.label}</span>
              <code className={styles.typeMeta}>{token.name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography" note="Fluid display sizes clamp between mobile and desktop.">
        <div className={styles.typeRow}>
          {TYPE_SCALE.map((entry) => (
            <div key={entry.token} className={styles.typeSample}>
              <span style={{ fontSize: `var(${entry.token})` }}>{entry.label}</span>
              <code className={styles.typeMeta}>{entry.token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing" note="A single 4px-based scale; no ad-hoc margins.">
        <div className={styles.spacingRow}>
          {SPACE_TOKENS.map((token) => (
            <div key={token} className={styles.swatch}>
              <div
                className={styles.spacingBar}
                style={{ width: '2.5rem', height: `var(${token})` }}
              />
              <code className={styles.typeMeta}>{token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons and toggles" note="Minimum 44px targets; visible focus rings.">
        <div className={styles.cluster}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <FavoriteButton active={false} itemTitle="Sample item" onToggle={() => undefined} />
          <FavoriteButton active itemTitle="Sample item" onToggle={() => undefined} />
          <LikeButton active={false} itemTitle="Sample item" onToggle={() => undefined} />
          <LikeButton active itemTitle="Sample item" onToggle={() => undefined} />
        </div>
      </Section>

      <Section
        title="Provider badges"
        note="The provider name is always text; the dot is decorative."
      >
        <div className={styles.cluster}>
          <ProviderBadge providerId="archive" providerName="Internet Archive" />
          <ProviderBadge providerId="wikipedia" providerName="Wikipedia" />
          <ProviderBadge providerId="adult" providerName="Adult" />
          <ProviderBadge providerId="sample" providerName="Sample" />
          <ProviderBadge providerId="unknown-provider" providerName="Unknown" />
          <ProviderBadge providerId="archive" providerName="Internet Archive" compact />
        </div>
      </Section>

      <Section
        title="Item cards"
        note="Artwork reserves its aspect ratio, the title link covers the card, and the favourite toggle sits above it without triggering navigation."
      >
        <ResponsiveGrid label="Sample items">
          {SAMPLE_ITEMS.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              providerName="Sample"
              showProvider
              isFavorite={isIn(favorites, { providerId: item.providerId, itemId: item.id })}
              onFavoriteToggle={(identity, next) => {
                toggleIn(setFavorites, identity, next);
              }}
            />
          ))}
        </ResponsiveGrid>
      </Section>

      <Section
        title="Collection cards"
        note="Open a collection never marks its items as explored; exploration is item-level only."
      >
        <ResponsiveGrid label="Sample collections" wide>
          {SAMPLE_COLLECTIONS.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} providerName="Sample" />
          ))}
        </ResponsiveGrid>
      </Section>

      <Section
        title="Content row"
        note="Horizontally scrollable, keyboard focusable, with prev/next controls rendered only when there is more to reach."
      >
        <ContentRow
          title="Continue exploring"
          description="A representative discovery row."
          viewAllHref="/category/books"
          itemCount={SAMPLE_ITEMS.length}
        >
          {SAMPLE_ITEMS.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              providerName="Sample"
              isFavorite={isIn(favorites, { providerId: item.providerId, itemId: item.id })}
              onFavoriteToggle={(identity, next) => {
                toggleIn(setFavorites, identity, next);
              }}
            />
          ))}
        </ContentRow>

        <ContentRow title="Empty row" itemCount={0}>
          {null}
        </ContentRow>
      </Section>

      <Section title="Likes" note="Separate from favourites; does not imply a favourite.">
        <div className={styles.cluster}>
          {SAMPLE_ITEMS.slice(0, 4).map((item) => {
            const identity = { providerId: item.providerId, itemId: item.id };
            return (
              <span key={item.id} className={styles.cluster}>
                <LikeButton
                  active={isIn(likes, identity)}
                  itemTitle={item.title}
                  onToggle={(next) => {
                    toggleIn(setLikes, identity, next);
                  }}
                />
                <span className={styles.sectionNote}>{CONTENT_TYPE_LABELS[item.type]}</span>
              </span>
            );
          })}
        </div>
      </Section>

      <Section title="Metadata" note="Terms and definitions; empty values are omitted entirely.">
        <div className={styles.panel}>
          <MetadataList
            label="Sample item metadata"
            entries={[
              { label: 'Creator', value: 'F. W. Murnau' },
              { label: 'Published', value: 1922 },
              { label: 'Provider', value: 'Sample' },
              { label: 'Missing', value: undefined },
              { label: 'Blank', value: '   ' },
            ]}
          />
        </div>
      </Section>

      <Section title="Loading placeholders" note="Announced once per region, never per shape.">
        <SkeletonGroup>
          <div className={styles.skeletonGrid}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </SkeletonGroup>

        <div className={styles.panel}>
          <p className={styles.panelTitle}>Inline placeholder</p>
          <SkeletonMedia />
          <Skeleton width="60%" />
        </div>
      </Section>

      <Section title="Dialog" note="Native modal semantics, Escape to dismiss, focus returned.">
        <div className={styles.cluster}>
          <Button
            variant="primary"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            Open dialog
          </Button>
        </div>

        <Dialog
          open={dialogOpen}
          title="File details"
          onClose={() => {
            setDialogOpen(false);
          }}
          footer={<Button variant="secondary">Close</Button>}
        >
          <p>
            Dialogs are used for file selection before a download and for confirmations. This
            example carries no provider content.
          </p>
        </Dialog>
      </Section>
    </div>
  );
}
