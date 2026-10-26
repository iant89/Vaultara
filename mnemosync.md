# mnemosync.md — Vaultara Engineering Notebook

Persistent engineering notebook for Vaultara. Preserves technical context between
development sessions, including sessions performed by different AI agents.

**Maintenance rules:** see `AGENTS.md` §4. Distinguish verified facts from assumptions.
Record verification results honestly using `PASS` / `FAIL` / `BLOCKED` / `NOT RUN` / `PARTIAL`.
Never record secrets, credentials, or private user information.

Last updated: 2026-10-25 (Phase 2 implemented and validated; GitHub Pages deployment configured; see Session Handoff Log)

---

## Project Summary

Vaultara is a unified digital discovery and content-viewing platform: a Netflix-style
browsing experience over multiple independent content providers (books, film, audio,
images, software, retro games, web archives, Wikipedia articles).

Fixed product decisions already established by
`APPLICATION_DESIGN_SPECIFICATION.md` (do not re-litigate without approval):

- **Frontend:** React + TypeScript, strict type checking.
- **Primary provider:** Internet Archive (Archive.org). Additional: Wikipedia, Adult (opt-in).
- **Canonical content identity:** `providerId:itemId` — item IDs are **not** globally unique.
- **Likes and favorites are separate concepts.** Likes feed personalization; favorites
  populate one global cross-provider favorites list.
- **Explored-content filtering** hides explored items from _discovery only_. It must never
  suppress explicit search results or deliberately opened collections.
- **Opening a collection must not mark its items explored.** Exploration is item-level only.
- All provider-supplied content is untrusted: sandboxed rendering, sanitized HTML, no
  script execution, no arbitrary binary execution.

---

## Current Development Status

**Phase: 5 (discovery experience) implemented. Deployment to GitHub Pages configured.**

The Internet Archive adapter is now driven by the interface. Home shows a featured item, one row
per content family (24 cards each) and the provider's category grid; provider and category pages list
collections; collection pages show a paginated item grid with sorting, a content-type filter and
in-collection search; item pages show artwork, description, files with per-file download links,
metadata, licence, source link and related items. Every list is a URL-reachable state, and breadcrumbs
connect the hierarchy.

Reads go through `src/data/`: a TTL cache with in-flight de-duplication, a concurrency limiter, a
`useAsyncValue` hook that binds one key to one component, and a `ProviderServices` context. Pages
never import an adapter; `getProviderRuntime()` is reached only through that context.

**Still no favourites, likes, history, search results, download manager, or viewer.** Cards render no
favourite control because no favourite state exists; the item page says so in words. Personalisation
is a stated placeholder on the home page.

The application is published as a static site to GitHub Pages by
`.github/workflows/deploy-pages.yml`. Discovery requires a network route to `archive.org`; without
one, each surface reports the failure and offers a retry.

Verified 2026-10-26 after Phase 5:

| Fact                                                       | Evidence                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Every quality gate passes                                  | `npm run check` (typecheck, lint, format, 598 tests in 37 files): PASS                    |
| Production build succeeds                                  | `npm run build`: main 408.78 kB (127.38 kB gzip); design-system chunk 12.39 kB, split out |
| Provider data layer                                        | 26 tests in `src/data/`: cache TTL, de-duplication, limiter, keys, async state: PASS      |
| Archive adapter behaviour                                  | 135 tests in `src/providers/archive/`: search, collections, items, files, failures: PASS  |
| Discovery pages against provider data                      | 14 tests in `src/pages/discovery.test.tsx` with a stubbed gateway: PASS                   |
| Discovery workflow in a real browser                       | `e2e/discovery.spec.ts`: 4 tests with stubbed Archive JSON, 360-1440 px: PASS             |
| No horizontal overflow with real content                   | `e2e/`: eight routes at four viewports plus data-driven pages: PASS                       |
| End-to-end suite                                           | `npm run test:e2e`: 33 tests, Chromium, 25.1 s: PASS                                      |
| Contrast of every used pairing                             | `src/styles/contrast.test.ts` computes ratios from `tokens.css`: PASS                     |
| Touch target floor                                         | `--touch-target: 2.75rem` (44px) asserted; `Button` enforces it: PASS                     |
| Dev-only page is code-split and unregistered in production | no sample-content strings in the main chunk; route absent from `createRoutes()`: PASS     |
| Keyboard traversal, focus ring, skip link, Escape          | `e2e/responsive.spec.ts`: PASS                                                            |
| Build output is deployable as a Pages site                 | `npm run verify:pages`: base path, assets, `404.html`, deep links: PASS                   |
| Deployed-style bundle boots and routes in a real browser   | Chromium against `dist/` served with Pages semantics: PASS                                |
| Native `<dialog>` modal behaviour                          | PARTIAL: jsdom lacks `showModal`; browser suite renders it, but no test asserts it yet    |
| Behaviour against the live service                         | NOT VERIFIED: the sandbox has no route to archive.org; browser tests stub the JSON        |
| Real provider artwork, Safari/Firefox/iOS, screen readers  | NOT VERIFIED: no such environment is available here                                       |

Do not describe favourites, likes, history, search results, downloads, personalisation, or viewing as
working. They do not exist.

---

## Technology Stack

### Toolchain in use (established in Phase 1)

| Concern                  | Choice                              | Version         | Rationale                                                                                                                                      |
| ------------------------ | ----------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Build and dev server     | Vite                                | 8.3.5           | Fast, minimal config, shares a plugin pipeline with Vitest                                                                                     |
| UI runtime               | React                               | 19.3.1          | Required by the specification                                                                                                                  |
| Routing                  | react-router-dom                    | 7.18.4          | Specification allows React Router; the data router supplies nested routes, `errorElement`, and deep-link support                               |
| Language                 | TypeScript                          | 5.9.3 (pinned)  | `7.0.2` is the current release, but typescript-eslint 8.72 declares `typescript <6.1.0`; upgrade when the lint toolchain supports TypeScript 7 |
| Unit and component tests | Vitest                              | 5.0.5           | Reuses the Vite pipeline; no second bundler                                                                                                    |
| DOM environment          | jsdom                               | 30.1.3          | Sufficient for the shell; real browsers are required for media and layout work later                                                           |
| Component testing        | @testing-library/react              | 16.3.3          | Behaviour-oriented queries; discourages implementation-coupled tests                                                                           |
| Linting                  | ESLint                              | 9.39.5 (pinned) | eslint-plugin-jsx-a11y 6.10.2 peers `^9` at most; note that ESLint 9 is upstream-EOL, so revisit when jsx-a11y supports ESLint 10              |
| Type-aware lint rules    | typescript-eslint                   | 8.72.0          | Recommended set plus explicit bans on `any` and `eval`                                                                                         |
| Accessibility lint       | eslint-plugin-jsx-a11y              | 6.10.2          | Catches missing labels, bad roles, and non-interactive handlers                                                                                |
| Formatting               | Prettier                            | 3.9.10          | Application code only; governing prose documents are excluded                                                                                  |
| End-to-end tests         | @playwright/test                    | 1.64.1          | 33 tests in a real Chromium; browsers provisioned by `scripts/setup-deps.sh`, not by `npm install`                                             |
| Styling                  | CSS Modules + CSS custom properties | none            | The specification permits CSS Modules and no styling dependency is warranted                                                                   |

### Design system (Phase 2)

Styling is CSS Modules plus CSS custom properties in `src/styles/tokens.css`. No styling
framework, icon package, or animation library was added; icons are hand-written SVG in
`src/components/ui/icons.tsx` and motion is CSS transitions driven by tokens.

| Token group            | Notes                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces               | `--color-bg` .. `--color-surface-active`, plus `--color-border` (decorative only) and `--color-border-strong` (control boundaries, must clear 3:1) |
| Text                   | `--color-text`, `--color-text-muted`, `--color-text-subtle`, all asserted >= 4.5:1 on every surface                                                |
| Accents/status         | accent, danger, success, warning, and a focus ring that stays >= 3:1                                                                               |
| Typography             | `--text-2xs` .. `--text-4xl` with fluid `clamp()` display sizes, line-height and tracking scales                                                   |
| Space                  | `--space-1` .. `--space-8`, 4px based                                                                                                              |
| Radii/elevation/motion | radii `xs`..`xl`, three shadow levels, three durations and one standard easing                                                                     |
| Layout                 | `--content-max-width`, `--nav-height`, `--touch-target`, `--card-min-width`, aspect ratios, and a `--z-*` stacking scale                           |

Responsive technique: media queries for navigation and page padding; container queries for
card sizing inside a content row (with a `grid-auto-columns` fallback via `@supports`);
`auto-fill`/`minmax` for grids so they need no breakpoints at all.

### Deliberately not installed

- **TanStack Query** (or a data-fetching library): nothing fetches data yet. Introduce it with
  the first real provider work (Phase 3/4), not before.
- **A global state library**: no shared mutable state exists. The specification asks for
  "lightweight" state management; decide when favorites, likes, and history land.
- **A CSS framework, icon set, or component library**: the design system is Phase 2.
- **A date library, schema validator, or form library**: no current use.

Record the reason here before adding any of these, per `AGENTS.md` section 11.

### Still undecided (blocks specific later phases)

- Backend language, framework, database, and API contract -> Phase 6.
- PDF rendering, EPUB parsing, and emulator libraries -> Phases 12 and 14.
- Global state and data-fetching approach -> when persistence and providers arrive.

### Sandbox environment (observed, not a project decision)

Node `v22.22.3`, npm `10.9.8`. `cdn.playwright.dev` is unreachable from this sandbox, so
Playwright cannot download a browser here. `scripts/setup-deps.sh` therefore falls back to a
standalone Chromium build (153.0.8010.0) extracted into `node_modules/.vaultara/chromium`, with the
NSS/NSPR libraries it needs under `lib/`. That fallback is sandbox scaffolding, not part of the
project's dependency graph, and `playwright.config.ts` discovers it automatically. See Testing and
Verification.

---

## Repository Structure

Current layout:

```
AGENTS.md                            Engineering rules, standards, agent workflow
APPLICATION_DESIGN_SPECIFICATION.md  Authoritative product requirements (v1.0)
DEVELOPMENT_ROADMAP.md               Authoritative 20-phase delivery plan (v1.0); Phases 0-4 complete
TESTING_AND_REGRESSION_GUIDELINES.md Authoritative testing and regression process
README.md                            Onboarding: setup, scripts, configuration, structure
mnemosync.md                         This notebook

package.json                         Scripts and dependency manifest
package-lock.json                    Locked dependency tree (commit it)
vite.config.ts                       Build, dev server, and Vitest configuration
tsconfig.json                        Application type checking (strict, noUncheckedIndexedAccess)
tsconfig.node.json                   Tooling type checking (build and Playwright configs)
tsconfig.e2e.json                    E2E type checking (adds DOM types for page.evaluate)
eslint.config.js                     Flat config: TS, React hooks, jsx-a11y, security bans
playwright.config.ts                 End-to-end configuration (starts its own dev server)
.prettierrc.json / .prettierignore   Formatting rules; governing docs excluded
.env.example                         Documented environment variables (no secrets)
index.html                           Vite entry document

.github/workflows/deploy-pages.yml   Build, verify, and publish to GitHub Pages on push to main
scripts/setup-deps.sh                Provision or verify the toolchain, including the E2E browser
scripts/build-pages-404.mjs          postbuild: publishes the shell as the 404.html routing fallback
scripts/verify-pages-build.mjs       npm run verify:pages: checks dist/ is deployable to Pages

e2e/appBase.ts                       Base-path-aware URL helpers; keeps the suite on the deployed path
e2e/smoke.spec.ts                    Shell-only end-to-end coverage
e2e/responsive.spec.ts               Viewports, overflow, touch targets, keyboard, mobile search

src/
  main.tsx                           Browser entry point
  vite-env.d.ts                      Vite client types and VITE_ variables
  app/App.tsx                        Browser router instance, with the base path applied
  app/basePath.ts                    Converts Vite BASE_URL into a router basename
  app/routes.tsx                     Route table (design spec section 22)
  app/routes.test.tsx                Route rendering regression tests
  components/feedback/               LoadingState, EmptyState, ErrorState, NotYetImplemented
  components/layout/                 AppLayout, Navigation, Page (+ CSS Modules)
  config/env.ts                      Validated environment configuration (pure parser + loader)
  config/providers.ts                Provider catalogue: availability and phase per provider
  models/content.ts                  ContentItem, ContentCollection, ContentFile, ContentCategory
  models/provider.ts                 ContentProvider, ProviderCapabilities, SearchOptions
  models/viewer.ts                   ContentViewerProps, ViewerDescriptor, ViewerError
  models/userState.ts                UserContentState and the ViewerProgress union
  models/identity.ts                 Canonical `providerId:itemId` identity helpers
  models/pagination.ts               Pagination options/results and helpers
  models/errors.ts                   AppError, kinds, normalization
  pages/                             One module per route; `pages/settings/` for subsections
  providers/registry.ts              Registration, state, health, enable/disable, capabilities
  providers/gateway.ts               The only caller of an adapter; applies one call policy
  providers/reliability.ts           Timeouts, cancellation, retries, backoff, rate limits
  providers/normalize.ts             Untrusted payload -> shared model
  providers/validate.ts              Response shape checks before the core uses a result
  providers/composition.ts           Composition root: builds the registry and the gateway
  providers/archive/api.ts           Archive HTTP: URLs, status translation, JSON parsing
  providers/archive/types.ts         Raw Archive response shapes (all fields `unknown`)
  providers/archive/taxonomy.ts      Mediatype, format and MIME-type vocabulary
  providers/archive/query.ts         Lucene escaping, filters, sort mapping
  providers/archive/map.ts           Archive payload -> shared models (pure, no I/O)
  providers/archive/catalog.ts       Curated categories and collections
  providers/archive/adapter.ts       ContentProvider implementation
  providers/archive/fixtures.ts      Hand-written payloads and fetch stubs for tests
  styles/tokens.css                  Design tokens (Phase 2 builds on these)
  styles/global.css                  Minimal global baseline
  test/setup.ts                      Testing Library and jest-dom setup
  utils/cx.ts                        Conditional className join
```

Directory layout mirrors the subsystem boundaries in the specification: components never
import provider adapters, and provider configuration lives in `src/config/`.

---

## Architecture and Module Boundaries

The specification's separation of ownership (Spec §31) is a hard constraint:

- **Core owns:** navigation, discovery presentation, canonical identity, preferences,
  favorites/likes, exploration history, search _orchestration_, download _workflows_,
  viewer _selection_.
- **Providers own:** external data retrieval, provider metadata, capability declarations,
  resource resolution.
- **Viewers own:** rendering, format-specific interaction, playback/reading state.

Practical implications for implementers:

1. No Archive.org-specific fetching inside components, discovery, routing, or viewers.
   Provider fetch logic lives in adapters only.
2. Adding a provider must not require editing discovery, favorites, search, details, or
   viewer selection code (Spec §10.1).
3. One provider failing must not break others — registration, initialization, search, and
   error handling are all per-provider (Spec §10.4; testing matrix in
   `TESTING_AND_REGRESSION_GUIDELINES.md` §8.3).
4. Viewer selection is a registry lookup driven by content metadata + file format, not
   hardcoded `if (type === …)` chains in the details page.

### Contracts referenced from the spec (not yet in code)

- `ContentProvider` interface — Spec §10.2. Explicitly a "starting point"; final contract
  must match real provider capability, and optional methods must reflect genuinely optional
  capabilities.
- `ProviderCapabilities` — Spec §10.3. Advertise only what is truly supported.
- `ContentViewerProps` — Spec §17.3. Each viewer declares MIME types, extensions, content
  types, required resources, fullscreen, progress, offline, extra permissions.
- Data models `ContentItem`, `ContentCollection`, `ContentFile`, `UserContentState`,
  `ContentType` — Spec §20. `metadata: Record<string, unknown>` preserves provider-specific
  data; it must be validated at the boundary, not trusted.
- Routes — Spec §22 (`/`, `/provider/:providerId`, `/category/:categoryId`,
  `/collection/:providerId/:collectionId`, `/item/:providerId/:itemId`, `/search`,
  `/favorites`, `/history`, `/downloads`, `/viewer/:providerId/:itemId`, `/settings/*`).

Do not duplicate the full type definitions here; the specification is authoritative.

---

## Development Commands

All commands are defined in `package.json` (Phase 1). Nothing here is guessed.

| Command                | Purpose                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server on port 5173, bound to all interfaces                 |
| `npm run build`        | `typecheck` then `vite build` into `dist/`                            |
| `npm run preview`      | Serve the production build on port 4173                               |
| `npm run typecheck`    | `tsc --noEmit` for app and tooling configs                            |
| `npm run lint`         | ESLint over the repository                                            |
| `npm run lint:fix`     | ESLint with safe fixes                                                |
| `npm run format`       | Prettier write (application code; docs excluded)                      |
| `npm run format:check` | Prettier check without writing                                        |
| `npm test`             | Vitest run once (598 tests in 37 files)                               |
| `npm run test:watch`   | Vitest watch mode                                                     |
| `npm run test:e2e`     | Playwright (33 tests); browser provisioned by `scripts/setup-deps.sh` |
| `npm run check`        | The full gate: typecheck, lint, format check, unit tests              |

`npm install` is required once. There is no CI workflow yet (see Known Issues).

Test files live beside their source as `*.test.ts` / `*.test.tsx`. `src/test/setup.ts` runs
before each test file and performs explicit RTL cleanup because Vitest runs without globals.

---

## Data Models and Contracts

Authoritative definition: `APPLICATION_DESIGN_SPECIFICATION.md` section 20. Do not fork
definitions.

Implemented in `src/models/` during Phase 1 (types plus the helpers below):

| Module          | Contents                                                                                                                               | Notes                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `content.ts`    | `ContentType`, `ContentItem`, `ContentCollection`, `ContentFile`, `ContentCategory`, `ContentRights`, `CONTENT_TYPES`, `isContentType` | `ContentRights` is _provisional_: the spec names the type but does not define its fields                        |
| `provider.ts`   | `ContentProvider`, `ProviderCapabilities`, `SearchOptions`, `SearchSort`                                                               | Optional methods stay optional, matching genuinely optional provider capability                                 |
| `viewer.ts`     | `ContentViewerProps`, `ViewerDescriptor`, `ViewerError`                                                                                | Contract only; the registry is Phase 11                                                                         |
| `userState.ts`  | `UserContentState` and a discriminated `ViewerProgress` union                                                                          | One variant per progress kind, per `AGENTS.md` 5.1                                                              |
| `identity.ts`   | `createContentIdentity`, `formatCanonicalId`, `parseCanonicalId`, `canonicalIdsEqual`, `isValidProviderId`                             | Throws on invalid construction; `parseCanonicalId` returns `null` because it runs on untrusted route parameters |
| `pagination.ts` | `PaginationOptions`, `PaginatedResult`, `resolvePaginationOptions`, `calculateOffset`, `calculatePageCount`, `createPaginatedResult`   | `DEFAULT_PAGE_SIZE = 24`, `MAX_PAGE_SIZE = 100`; out-of-range input is clamped, not rejected                    |
| `errors.ts`     | `AppError`, `AppErrorKind`, `createAppError`, `isAppError`, `toAppError`, `getDefaultErrorMessage`                                     | Abort errors normalize to `cancelled` so callers can distinguish cancellation from failure                      |

Deliberate deviations from the spec's illustrative snippets, each recorded rather than
silently applied:

- Collections are typed as `readonly` arrays (`readonly ContentItem[]`) instead of mutable
  arrays. This is an immutability constraint, not a reduction in functionality; adapters
  returning plain arrays still satisfy the contract.
- `getRelatedItems` keeps the specification's `Promise<ContentItem[]>` shape but returns
  `Promise<readonly ContentItem[]>` for the same reason. It is **not** paginated, because the
  specification does not paginate it.
- `ProviderCapabilities.contentTypes` represents the spec's separate "documents, images,
  audio, video" capability flags as a declared content-type list.

Points that are easy to get wrong:

- `ContentFile.downloadAvailable` and `.viewable` are **independent** flags. A file may be
  viewable but not downloadable. Never infer one from the other.
- An item existing does not imply any file is accessible or playable (design spec 11.3).
- `UserContentState` keys on `(providerId, itemId)`, not `itemId` alone.
- `ViewerProgress` must not implicitly toggle `liked` or `favorited` (design spec 19.3).
- Favorite records store title and thumbnail snapshots so they render when a provider is
  temporarily unreachable (design spec 14.1).

---

## Provider Integrations

One adapter implemented; the rest are planned. None is wired to the interface.

| Provider         | Status              | Notes / constraints                                                                                                                                                                                      |
| ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internet Archive | Adapter implemented | Phase 4. Official APIs only. Metadata + thumbnails may be cached per provider policy. Never download full media just to show metadata; prefer streaming/range requests (Spec §11.4). No browsing UI yet. |
| Wikipedia        | Not started         | Phase 13. Respect attribution/licensing and API requirements. Document-oriented reader, not a poster grid (Spec §12.2).                                                                                  |
| Adult            | Not started         | Phase 16, opt-in, independently configurable. Must not surface in ordinary Archive/Wikipedia recommendations. Favorites may contain Adult items but visibility settings must be honored (Spec §13).      |

Cross-cutting provider requirements: timeouts, cancellation, rate limiting, retries/backoff,
malformed-response handling, capability honesty, and failure isolation (Spec §25; `AGENTS.md` §7).

---

## Viewer Integrations

All planned. None implemented. Registry + shared container come first (Phase 11), then
individual viewers.

| Viewer                 | Phase | Key constraints                                                                                                                            |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Image                  | 12    | Zoom/pan/fit; don't load full resolution unnecessarily                                                                                     |
| PDF                    | 12    | PDF.js or equivalent; resume from page; progressive loading                                                                                |
| Book / EPUB            | 12    | Typography + themes; scanned books fall back to PDF/image                                                                                  |
| Audio                  | 12    | Resume position; release media on unmount                                                                                                  |
| Video                  | 12    | Prefer native playback; subtitles when available                                                                                           |
| Wikipedia reader       | 13    | Document layout, TOC, references                                                                                                           |
| Game Boy emulator      | 14    | Maintained emulator behind an adapter; **never** execute ROMs as JS; no bundled commercial ROMs; design adapter to allow GBC/NES/SMS later |
| Web archive            | 15    | Sandboxed iframe, restrictive policy, no access to app credentials/storage/privileged APIs                                                 |
| Software / disk images | 15    | Inspect + download only; never execute downloaded binaries in the app origin                                                               |
| Generic fallback       | 11    | Must never leave the user on a blank page (Spec §18.10)                                                                                    |

Treat file extensions and provider metadata as untrusted when choosing a viewer (Spec §17.4).

---

## Implemented Features

| Area                                                                                 | State                                                | Evidence                                                   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------- |
| Provider contract (`ContentProvider`, capabilities, request options)                 | Implemented                                          | `src/models/provider.ts`                                   |
| Provider registry (registration, duplicates, lookup, enable/disable, capabilities)   | Implemented                                          | `src/providers/registry.ts`                                |
| Provider lifecycle, health and availability circuit                                  | Implemented                                          | `registry.ts`, `recordSuccess`/`recordFailure`             |
| Gateway enforcing one call policy for every operation                                | Implemented                                          | `src/providers/gateway.ts`                                 |
| Timeouts, cancellation, retries, jittered backoff, rate-limit hints                  | Implemented                                          | `src/providers/reliability.ts`                             |
| Payload normalization (types, URLs, text, dates, metadata, entities)                 | Implemented                                          | `src/providers/normalize.ts`                               |
| Response validation and malformed-payload rejection                                  | Implemented                                          | `src/providers/validate.ts`                                |
| Archive adapter: search, categories, collections, collection items, item metadata    | Implemented; drives the discovery pages              | `src/providers/archive/adapter.ts`                         |
| Archive normalization: mediatype/format taxonomy, dates, rights, artwork, access     | Implemented                                          | `src/providers/archive/{taxonomy,map}.ts`                  |
| Archive available files, access restrictions, download URLs                          | Implemented                                          | `mapFiles`, `getDownloadUrl`                               |
| Provider composition root (single registration point)                                | Implemented; reached through `ProviderServices`      | `src/providers/composition.ts`                             |
| Wikipedia and Adult adapters                                                         | **Not implemented** — Phases 13, 16                  | catalogue entries remain `planned`                         |
| Discovery query layer: TTL cache, in-flight de-duplication, concurrency limiter      | Implemented                                          | `src/data/{contentQueries,requestCache,requestLimiter}.ts` |
| `useAsyncValue`: one request key to one component, abort on change, fresh reload     | Implemented                                          | `src/data/useAsyncValue.ts`                                |
| Provider context (`ProviderServices`, shared lazy runtime)                           | Implemented                                          | `src/data/ProviderServices.tsx`                            |
| Home page: featured item, six category rows, category grid, personalisation notice   | Implemented                                          | `src/pages/HomePage.tsx`                                   |
| Provider page: categories for an available provider, honest status otherwise         | Implemented                                          | `src/pages/ProviderPage.tsx`                               |
| Category page: collections, paginated, breadcrumbs                                   | Implemented                                          | `src/pages/CategoryPage.tsx`                               |
| Collection page: item grid, sorting, type filter, in-collection search, paging       | Implemented                                          | `src/pages/CollectionPage.tsx`                             |
| Item page: hero, description, files with download links, metadata, rights, related   | Implemented                                          | `src/pages/ItemPage.tsx`                                   |
| Discovery components: rows, breadcrumbs, pagination, files, toolbar, category card   | Implemented                                          | `src/components/content/`                                  |
| Design tokens: colour, type, space, radii, elevation, motion, layout, z-index        | Implemented                                          | `src/styles/tokens.css`                                    |
| Reduced-motion support (CSS + JS smooth-scroll guard)                                | Implemented                                          | `tokens.css`, `src/utils/motion.ts`                        |
| Global baseline: focus rings, selection, scrollbars, `.sr-only`, typography defaults | Implemented                                          | `src/styles/global.css`                                    |
| Brand lockup with decorative vault mark                                              | Implemented                                          | `src/components/layout/Logo.tsx`                           |
| Provider tabs (Adult hidden unless enabled)                                          | Implemented                                          | `Navigation.tsx`, `src/config/providers.test.ts`           |
| Global search control (navigates to `/search?q=`)                                    | Implemented                                          | `SearchControl.tsx`; results are Phase 9                   |
| Favourites control, directly reachable at all widths                                 | Implemented                                          | `Navigation.tsx`                                           |
| Account menu (library + settings groups, honest "not signed in" status)              | Implemented                                          | `AccountMenu.tsx`, `Disclosure.tsx`                        |
| Responsive navigation (collapsible search, wrapping provider strip)                  | Implemented; verified at 4 viewports in Chromium     | `Navigation.module.css`, `e2e/responsive.spec.ts`          |
| Item cards, collection cards, provider badges                                        | Implemented                                          | `src/components/ui/`                                       |
| Favourite and like toggle primitives                                                 | Implemented as controlled components; no persistence | `ToggleButton.tsx`                                         |
| Metadata list, responsive grid, horizontal content row                               | Implemented                                          | `src/components/ui/`                                       |
| Dialog, disclosure menu, button primitive, skeletons                                 | Implemented                                          | `src/components/ui/`                                       |
| Development-only design system reference                                             | Implemented, dev-only, code-split                    | `/design-system`, `src/pages/DesignSystemPage.tsx`         |
| SPA focus management on navigation + skip link + footer attribution                  | Implemented                                          | `AppLayout.tsx`, `src/hooks/useFocusMainOnNavigate.ts`     |
| Route table for every documented route, error boundary, not-found                    | Implemented                                          | `src/app/routes.tsx`                                       |
| Shared models and provider/viewer contracts                                          | Provider contract implemented against; viewers not   | `src/models/`                                              |

Not implemented anywhere: search results, accounts, favourites and likes persistence, history,
downloads, personalisation, the viewer registry, and every viewer. The Wikipedia and Adult adapters
do not exist.

---

## Features in Progress

**None.** Phase 5 is complete; Phase 6 has not been authorised.

---

## Known Issues and Technical Debt

### Documentation gaps

1. **RESOLVED 2026-10-25: `README.md` did not fulfill its assigned role.** It was a heading
   plus one paragraph. It now documents status, requirements, quick start, every script,
   environment variables, project structure, testing, and the documentation map.
2. **RESOLVED 2026-10-25: the roadmap is now an authoritative document.** With explicit user
   authorization it was added to the document set in `AGENTS.md` section 3.6 (with a
   responsibility row and a precedence note), to the mandatory reading in sections 2.1, 4.2,
   and 15 Step 1, to the documentation list in section 14, and to the final directive in
   section 18. `TESTING_AND_REGRESSION_GUIDELINES.md` sections 2 and 2.2 and `README.md` were
   updated to match. The roadmap's own status line changed from `Proposed` to `Approved`, and
   Phase 1 is checked off with its verification and limitations recorded.
   Precedence is now explicit: the roadmap governs _delivery order and phase status_, the
   specification governs _intended behavior_. On conflict the specification wins.
3. **RESOLVED 2026-10-25: filenames are now underscore-separated.** With explicit user
   authorization the two documents were renamed with `git mv` to
   `APPLICATION_DESIGN_SPECIFICATION.md` and `DEVELOPMENT_ROADMAP.md`, matching the paths
   already used throughout `AGENTS.md` and `TESTING_AND_REGRESSION_GUIDELINES.md`, so no path
   reference inside those documents needed to change. All references in `README.md`,
   `mnemosync.md`, and `.prettierignore` were updated. No source file ever cited either
   document as a path, so no code changed. Only the documents' own `# TITLE` headings retain
   spaces, which are display titles rather than paths.
4. **RESOLVED 2026-10-25: `mnemosync.md` was mandated but absent.** It exists and is current.

### Phase 2 gaps (open)

- **RESOLVED 2026-10-25: visual verification now runs in a real browser.** The earlier
  conclusion that no browser could be obtained was wrong. `@sparticuz/chromium`'s
  `bin/al2023.tar.br` does ship `libnspr4.so`; it must be untarred separately because the
  package's own helper only does so on Amazon Linux. With `LD_LIBRARY_PATH` pointing at the
  extracted libraries and `--no-sandbox`, Chromium 153.0.8010.0 renders and Playwright drives
  it. `scripts/setup-deps.sh` provisions it and `playwright.config.ts` finds it. Two real
  layout defects surfaced this way and were fixed.
- **Only Chromium is exercised.** Safari, Firefox, and mobile Safari are unverified. Nothing in
  the suite would catch a WebKit-only layout difference.
- **jsdom still only renders the desktop layout.** It does not evaluate media queries, so
  mobile-specific state cannot be asserted there. Mobile behaviour is now covered in the
  browser suite instead, which is where it belongs.
- **`<dialog>` modal semantics are untested.** jsdom has no `showModal`/`close`; the
  component falls back to an `open` attribute with its own Escape handling. Focus trapping and
  background inertness come from the native implementation and are unverified here.
- **The design-system chunk still exists in `dist/`.** The page and fixtures are split into
  their own 20.71 kB chunk and the route is never registered in production, so it is never
  requested, but the file is emitted. Removing it entirely would need build-level
  conditional entry handling; not worth the complexity now.
- **`--color-border-strong` was lightened to `#6b7686`** to satisfy the 3:1 non-text contrast
  requirement on control boundaries. This is a visible aesthetic change and may look heavier
  than intended; review it when a browser is available.
- **Backdrop click-to-dismiss was dropped** from `Dialog`: a click handler on a non-interactive
  element fails `jsx-a11y` and is an accessibility smell. Escape and the close button remain.
- **Deferred, deliberately:** no data-fetching library, no global state, no form library, no
  date library. See Architecture Decisions 13.

### Toolchain debt (unchanged from Phase 1)

- **End-to-end browsers need provisioning.** Playwright does not download browsers during
  `npm install`, and `cdn.playwright.dev` is unreachable in this sandbox.
  `scripts/setup-deps.sh` handles both cases, falling back to a standalone Chromium build. A
  fresh clone must run the script (or `npx playwright install chromium` where the CDN is
  reachable) before `npm run test:e2e`.
- **The E2E TypeScript lives in its own config.** `tsconfig.e2e.json` adds the DOM library that
  `page.evaluate` callbacks need; `tsconfig.node.json` deliberately excludes `e2e/` so
  Node-side tooling never sees DOM globals. `npm run typecheck` runs all three.
- **Two deliberately held-back versions.** TypeScript is pinned to `~5.9.3` because
  typescript-eslint requires `<6.1.0`, and ESLint is pinned to `^9` because
  eslint-plugin-jsx-a11y peers at most `^9`. ESLint 9 is already upstream-EOL, so this needs
  revisiting; when both upstream projects support the newer majors, upgrade together and
  re-run `npm run check`.
- **No type-aware lint rules yet.** The config uses typescript-eslint's recommended set
  without `parserOptions.projectService`, so rules such as `no-floating-promises` are not
  active. Type-aware linting is worth enabling once code volume grows; it costs lint time.
- **`exactOptionalPropertyTypes` is off.** It interacts poorly with React optional props.
  Consider enabling per-directory later rather than globally.
- **No CI configuration.** No `.github/workflows`; `npm run check` is the gate and must be
  run manually. Adding CI is not in the roadmap but would protect the gates.
- **No coverage reporting.** Deliberate: the guidelines treat coverage as a diagnostic, not
  proof of correctness (section 21).
- **No visual or responsive verification in a real browser.** The shell was verified for
  HTTP correctness and DOM structure, not for visual layout. Phase 2 owns visual work and
  should include a real-browser pass.

### Architectural risks to watch (anticipatory, not defects)

- Exposing `metadata: Readonly<Record<string, unknown>>` to UI components invites `any`-like
  access and contract drift. Validate and narrow at the provider boundary.
- Exploration filtering is the most regression-prone rule in the product: it spans discovery,
  search, collections, and history. It needs a single shared predicate plus table-driven
  tests, not duplicated conditionals per surface.
- Optimistic favorite and like updates require rollback on persistence failure (design spec
  14.2); "fire and forget" updates will violate the specification.
- Download UX must distinguish _link resolved_ from _download completed_. Browsers often give
  no completion signal (design spec 16.4).
- Viewer cleanup (listeners, timers, animation loops, object URLs, workers) is in the
  regression matrix; leaked emulator loops are a likely defect class.
- Security-sensitive areas are the least automatically testable: iframe sandbox boundaries,
  archived-content isolation, download URL validation, and SSRF. Plan manual review, and
  remember a present `sandbox` attribute is not proof of isolation (testing guidelines 12.2).

---

## Architecture Decisions

| #   | Decision                                                                                  | Rationale                                                                                                                                           | Status                          |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Provider-based architecture with a shared adapter contract                                | Product must add providers without rewriting discovery, search, favorites, or viewers (design spec 10.1, 31)                                        | Decided by spec                 |
| 2   | Canonical identity `providerId:itemId`                                                    | Provider item IDs collide across sources (design spec 9.5)                                                                                          | Decided by spec                 |
| 3   | Likes and favorites are separate concepts                                                 | Personalization signal vs. explicit bookmark (design spec 8.3, 14.4)                                                                                | Decided by spec                 |
| 4   | Explored filtering is scoped to discovery only                                            | Explicit user intent (search, opened collection) must never be silently filtered (design spec 7.2)                                                  | Decided by spec                 |
| 5   | Viewer registry with lazy-loaded modules                                                  | Isolates format-specific code and keeps bundles small (design spec 17, 25)                                                                          | Decided by spec                 |
| 6   | IndexedDB for client data; localStorage only for small non-sensitive preferences          | Design spec 21.2; no auth secrets in browser storage                                                                                                | Decided by spec                 |
| 7   | Deterministic, transparent recommendation rules before any ML                             | Roadmap Phase 17 explicitly forbids starting with ML                                                                                                | Decided by roadmap              |
| 8   | Documentation-only repository until Phase 1                                               | Reflects actual state; avoids implying unimplemented behavior exists                                                                                | Superseded in Phase 1           |
| 9   | Create `mnemosync.md` before code scaffolding                                             | `AGENTS.md` 4 makes the notebook mandatory pre-work                                                                                                 | Done 2026-10-25                 |
| 10  | Vite + React Router data router (`createBrowserRouter`)                                   | Minimal config, native `errorElement` and nested routes, one pipeline shared with Vitest                                                            | Phase 1                         |
| 11  | Vitest + React Testing Library, no Jest                                                   | Avoids a second bundler and transform stack; tests reuse `vite.config.ts`                                                                           | Phase 1                         |
| 12  | CSS Modules plus CSS custom-property tokens, no styling dependency                        | Spec permits CSS Modules; a framework would add weight before the design system exists                                                              | Phase 1                         |
| 13  | No data-fetching or global-state library yet                                              | Nothing fetches or shares state; adding them now would be an unused dependency (`AGENTS.md` 11)                                                     | Phase 1, revisit Phase 3        |
| 14  | Provider catalogue marks every provider `planned`; unimplemented pages state their status | Quality gate forbids placeholders that masquerade as working features                                                                               | Phase 1                         |
| 15  | Invalid configuration fails loudly at startup                                             | Silent fallback could mask a misconfigured backend URL or a disabled safety control                                                                 | Phase 1                         |
| 16  | Prettier excludes the governing Markdown documents                                        | Prettier reflows hand-wrapped prose and tables, producing large diffs in authoritative documents                                                    | Phase 1                         |
| 17  | Pin TypeScript 5.9.3 and ESLint 9                                                         | Upstream lint tooling does not yet support TypeScript 7 or ESLint 10; gates must run                                                                | Phase 1, revisit                |
| 18  | Rename documents to underscore-separated filenames                                        | `AGENTS.md` and the testing guidelines already cited underscore paths; renaming the files removes the mismatch without editing dozens of references | Done 2026-10-25 (user approved) |
| 19  | `DEVELOPMENT_ROADMAP.md` is authoritative for delivery order, not for intended behavior   | Phase sequence and completion status need a single owner; product behavior stays with the specification                                             | Done 2026-10-25 (user approved) |

| 20 | Design tokens in CSS custom properties; CSS Modules per component | One source of truth for the visual system; no runtime CSS-in-JS or styling dependency | Phase 2 |
| 21 | Control boundaries use `--color-border-strong` (`#6b7686`); `--color-border` is decorative only | 3:1 non-text contrast applies to essential UI boundaries, not to separators | Phase 2 |
| 22 | Hand-written inline SVG icons instead of an icon package | Small, dependency-free, `aria-hidden` by construction (`AGENTS.md` 11) | Phase 2 |
| 23 | Shared `Button` primitive rather than per-component button styling | Guarantees the 44px target, focus ring, and disabled treatment everywhere | Phase 2 |
| 24 | Content row is _not_ a tab stop; keyboard access comes from focusable cards and real scroll buttons | A focusable non-interactive list is misleading and fails `jsx-a11y`; focusing a card scrolls it into view | Phase 2 |
| 25 | Disclosure pattern (not ARIA `menu`) for the account menu | The panel holds links, not commands; `menu` would promise arrow-key navigation | Phase 2 |
| 26 | Native `<dialog>` for modals, with a documented fallback for environments without `showModal` | Free focus trap and inert background, with testability preserved | Phase 2 |
| 27 | Design system reference is a dev-only route, lazily imported | Reviewable in a browser without shipping to production; keeps the main bundle clean | Phase 2 |
| 28 | Media queries for nav/page chrome, container queries for row cards | Container queries size cards to the row, but media queries are the broader fallback | Phase 2 |
| 29 | Hosting is GitHub Pages, built by an Actions workflow; no `gh-pages` branch, no committed build output | Pages is free for a public repository and the workflow keeps the source of truth in `main`; a committed `dist/` would rot and bloat history | Deployment |
| 30 | One base path for development, build, and preview, defaulting to `/Vaultara/` | Developing at the root hides base-path bugs until after deployment. The dev server redirects `/` to the base, so the local URL still works | Deployment |
| 31 | Router `basename` derived from `import.meta.env.BASE_URL`, never hardcoded | A single `VITE_BASE_PATH` must be able to move the whole app, including routing | Deployment |
| 32 | Deep links are served through a generated `404.html` rather than hash routing | Pages has no rewrites. The 404 status is honest, links stay clean and shareable, and the router resolves the route on boot | Deployment |
| 33 | The registry performs no fetching; the gateway imports no adapter | Adding a provider touches neither. Both files stay provider-agnostic, which is the whole point of spec 10.1 | Phase 3 |
| 34 | Timeouts enforced by racing the call, not by trusting the adapter signal | An adapter that ignores cancellation still cannot hang the caller; the abandoned promise is drained to avoid unhandled rejections | Phase 3 |
| 35 | Cancellation is never recorded as a provider failure | Otherwise a user who changes their mind three times trips the availability circuit and hides a healthy provider | Phase 3 |
| 36 | Availability is a consecutive-failure circuit, and a probe answering "unhealthy" is decisive | Transient failures should not take a provider offline, but a provider that says it cannot serve should not be asked again | Phase 3 |
| 37 | Retries limited to transient kinds; malformed payloads never retried | Retrying an invalid response just fetches the same invalid response | Phase 3 |
| 38 | Unsafe URL schemes are dropped during normalization rather than sanitized | A provider has no legitimate reason to return `javascript:` or `data:`; dropping is auditable, rewriting is not | Phase 3 |
| 39 | Archive adapter split into transport, taxonomy, query, mapping, and contract modules | Mapping is pure, so it is tested without a network or a clock; the adapter only sequences calls | Phase 4 |
| 40 | Content type comes from `mediatype` alone (`texts` -> `document`, `etree` -> `music`) | Inferring "book" from a collection label would make an item's type depend on which request produced it | Phase 4 |
| 41 | The Archive's 10,000-result ceiling is reported as the total | Otherwise `hasMore` keeps offering pages the provider will refuse, and the UI promises results that cannot exist | Phase 4 |
| 42 | An unknown identifier (`200` + `{}`) and `is_dark` both become `not-found`; `getDownloadUrl` returns `null` instead | The provider has no 404 for missing items, and `null` is the contract's channel for "nothing to offer" | Phase 4 |
| 43 | Administrative files are dropped, originals listed first, restrictions expressed per file | `_meta.xml` and CDX indexes are not content; a lending scan's files exist but must not look downloadable (spec 11.3) | Phase 4 |
| 44 | `viewable` means "the browser can render it unaided" — no PDF, EPUB, or DjVu yet | Claiming otherwise would advertise a viewer that arrives in Phase 8 | Phase 4 |
| 45 | Categories are curated configuration, and collection titles are merged from one identifier lookup | The Archive exposes no category endpoint; a failed lookup falls back to catalogue names instead of an empty screen | Phase 4 |
| 46 | Related content means sibling collections, and a missing item reports `not-found` rather than an empty list | Personalization does not exist yet; "no related content" is a statement about an item that exists | Phase 4 |
| 47 | Discovery rows are defined by shared content type in `src/config/discovery.ts` | A row is a product decision, not provider knowledge; a second provider fills the same row instead of needing new UI | Phase 5 |
| 48 | Reads go through a cache/limiter/async-state layer (`src/data/`), never the adapter | Caching, de-duplication and cancellation belong above the gateway so every surface gets them (roadmap 5.5, `AGENTS.md` 5.8) | Phase 5 |
| 49 | The featured slot reuses its row's cache entry | Same key, same query: promoting an item costs no extra request, and the two cannot disagree | Phase 5 |
| 50 | Paging, sorting, filtering and in-collection search live in the URL | Every view is linkable, bookmarkable and back-button friendly; parsers fall back instead of throwing | Phase 5 |
| 51 | "View all" renders only for categories the provider reports | A dead link is worse than no link; provider swaps must not break navigation | Phase 5 |
| 52 | Item counts appear only where the provider reports one | A count per collection card would cost one request per card; inventing one would be a lie (design spec 9.3) | Phase 5 |
| 53 | Favourite controls stay absent until favourite state exists | Quality gate: never render a control that cannot work | Phase 5, revisit Phase 8 |

Resolved by user decision on 2026-10-25: file naming (issue 3, decision 18) and the
roadmap's authoritative status (issue 2, decision 19).

Open decisions awaiting input: concrete Phase 2 visual direction (palette accents, typography
scale, card families); whether to add CI; when to enable type-aware lint rules.

---

## Deployment

**Target: GitHub Pages.** `https://iant89.github.io/Vaultara/`, published by
`.github/workflows/deploy-pages.yml` on every push to `main` (and on demand). The workflow runs
the quality gates, builds, verifies the artefact, and uploads `dist/` through the official Pages
actions. There is no `gh-pages` branch and no build output in Git.

Requirements on the repository: **Settings -> Pages -> Source** must be set to
**GitHub Actions**. No other setting is needed.

### The base path

A Pages project site is served from `/<repository>/`, so the app is not at the domain root. One
variable controls this end to end:

| Concern        | Mechanism                                                  |
| -------------- | ---------------------------------------------------------- |
| Asset URLs     | Vite `base`, from `VITE_BASE_PATH` (default `/Vaultara/`)  |
| Client routing | Router `basename`, derived from `import.meta.env.BASE_URL` |
| Local dev      | Same base; the dev server redirects `/` to `/Vaultara/`    |
| CI detection   | `/ <repository> /`, or `/` for a `<owner>.github.io` repo  |
| Override       | Repository variable `PAGES_BASE_PATH`, or `VITE_BASE_PATH` |

Development runs under the same prefix as production deliberately. The alternative - root in
development, sub-path in production - means the router `basename` is only ever exercised on the
deployed site, which is exactly where no test runs.

### Deep links

Pages serves static files only and has no rewrites. `postbuild` copies the shell to `404.html`,
which Pages serves for unmatched paths, so the app boots and the router resolves the route. Those
requests return HTTP 404 rather than 200: honest, since the server has no such resource, and it
keeps URLs clean. Hash routing would return 200 but produce uglier URLs and diverge from the
documented route paths.

### Verification

`npm run verify:pages` reads the base path out of the built `dist/index.html` instead of trusting
the configuration, then fails if a referenced asset would 404, if `404.html` is missing or stale,
or if a deep link does not return the shell. The deploy workflow runs it before uploading, so a
wrong base path fails the build instead of publishing a broken site. The end-to-end suite runs
against the same sub-path locally, so routing is covered by tests as well.

**Not verified:** that the workflow itself succeeds on GitHub's runners. It has never executed;
the first push to `main` will be its first run. Its steps mirror commands run locally (`npm ci`,
`npm run check`, the build, `verify:pages`), but `actions/configure-pages` and the deploy job are
untested here.

---

## Security Considerations

Non-negotiable boundaries, restated here because they are easy to erode during implementation.

- **Untrusted content:** all provider data is untrusted. Sanitize HTML before rendering as
  HTML; prefer text rendering. No `eval`, no `new Function`, no executing provider-supplied
  JavaScript (Spec §26; `AGENTS.md` §10.2).
- **Iframes:** restrictive `sandbox`, minimum necessary permissions, no unrestricted parent
  access, no application credentials or localStorage exposure to archived content.
- **URLs:** validate and restrict dangerous schemes (`javascript:`, `data:` where
  inappropriate); validate resolved download URLs; protect any backend proxy from SSRF.
- **Downloads:** respect provider permissions, licensing, DRM, borrowing, paywalls, and CORS
  reality. Never attempt to bypass access controls. A backend proxy is optional and must be
  justified (Spec §16.3, §26).
- **No binary execution:** downloaded software, OS images, and ROMs are never executed in the
  application origin. Game Boy emulation runs behind an adapter in an isolated context and
  treats ROMs/save states as untrusted data (Spec §18.6, §18.7).
- **Credentials:** never in frontend bundles; never in the browser's ordinary storage; never
  in the repository or this notebook.
- **Adult provider:** opt-in, age assurance where applicable, isolated from ordinary
  discovery, and privacy-aware in history and search (Spec §13, §26).

---

## Testing and Verification

### Executed checks (2026-10-26, latest gate)

| Check                                                       | Command                       | Status  | Detail                                                                                                                    |
| ----------------------------------------------------------- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Type check                                                  | `npm run typecheck`           | PASS    | Strict + `noUncheckedIndexedAccess`                                                                                       |
| Lint                                                        | `npm run lint`                | PASS    | Zero errors or warnings                                                                                                   |
| Format check                                                | `npm run format:check`        | PASS    | Application code only                                                                                                     |
| Unit and component tests                                    | `npm test`                    | PASS    | 37 files, 598 tests                                                                                                       |
| Production build                                            | `npm run build`               | PASS    | Main 408.78 kB (127.38 kB gzip); dev chunk split out                                                                      |
| Contrast audit                                              | `src/styles/contrast.test.ts` | PASS    | Body text >= 4.5:1 on 4 surfaces; subtle text >= 4.5:1; control boundaries >= 3:1 on 5 surfaces; focus ring >= 3:1        |
| Dev server HTTP smoke                                       | `curl`                        | PASS    | `/`, `/design-system`, `/favorites` all 200                                                                               |
| Production bundle hygiene                                   | `grep dist`                   | PASS    | Sample fixtures absent from the main chunk; dev route not registered                                                      |
| End-to-end suite                                            | `npm run test:e2e`            | PASS    | 33 tests, Chromium 153.0.8010.0, 25.1 s; 4 viewports, keyboard, mobile search, discovery workflow                         |
| Responsive layout / overflow / touch-target measurement     | `e2e/responsive.spec.ts`      | PASS    | 18 tests at 360/414/768/1440 px, plus discovery routes at 390/768/1440 px in `e2e/discovery.spec.ts`                      |
| Visual review of rendered UI                                | screenshots                   | PASS    | Shell, gallery, cards, and the four discovery pages at 390/1440 px; 2 layout defects found by the browser tests and fixed |
| Dependency provisioning                                     | `scripts/setup-deps.sh`       | PASS    | Clean run, idempotent re-run, and `--check` exit 0                                                                        |
| Native modal path                                           | manual                        | PARTIAL | Renders in Chromium, but no test asserts `showModal` behaviour yet                                                        |
| Provider architecture unit and integration tests            | `npm test`                    | PASS    | 174 new tests across registry, gateway, reliability, normalization, validation                                            |
| Archive adapter tests                                       | `npm test`                    | PASS    | 135 tests: API, mapping, adapter behaviour, and behaviour through registry + gateway                                      |
| Discovery page tests against stubbed provider data          | `npm test`                    | PASS    | 14 tests: home, provider, category, collection (sort/filter/search/page), item (files, rights, related)                   |
| Discovery workflow in a real browser                        | `e2e/discovery.spec.ts`       | PASS    | 4 tests at 390/768/1440 px with stubbed Archive JSON; no horizontal overflow on any route                                 |
| Adapter against the live archive.org service                | none                          | N/A     | No route from the sandbox. Fixtures follow documented shapes; not a substitute for a live run                             |
| Pages artefact: base path, assets, 404 fallback, deep links | `npm run verify:pages`        | PASS    | Verified for base `/Vaultara/` and `/`; emulates Pages serving without a browser                                          |
| Deployed build in a real browser                            | Chromium against `dist/`      | PASS    | `/Vaultara/favorites`, `/settings/privacy`, `/item/...` boot and route correctly; client navigation stays inside the base |

### Tests added in Phase 5

| File                              | Coverage                                                                                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/requestCache.test.ts`   | TTL expiry, 120-entry bound, in-flight de-duplication, `fresh` bypass, failures not cached                                                                                                    |
| `src/data/requestLimiter.test.ts` | Concurrency ceiling, queue order, rejection does not leak a slot                                                                                                                              |
| `src/data/contentQueries.test.ts` | Query keys include every argument; gateway calls; no adapter import                                                                                                                           |
| `src/data/useAsyncValue.test.tsx` | Loading/success/error, abort on key change and unmount, `reload()` bypassing the cache, no state update after unmount                                                                         |
| `src/utils/contentParams.test.ts` | Total parsers for page/sort/type/query; defaults for junk input; parameter serialisation clears `page`                                                                                        |
| `src/utils/format.test.ts`        | Item counts, durations, byte sizes, dates, and truncation of provider text                                                                                                                    |
| `src/pages/discovery.test.tsx`    | Home rows and featured item, provider status branches, category collections, collection sort/filter/search/pagination, item files, rights, missing item, related failure not failing the page |
| `e2e/discovery.spec.ts`           | Home, collection (sort/search/page), item, and category flows in Chromium with stubbed provider JSON; overflow at 390/768/1440 px                                                             |

### Tests added in Phase 2

| File                                           | Coverage                                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/contrast.test.ts`                  | Parses `tokens.css` and asserts WCAG 2.2 AA ratios; fails if a token is removed or a colour is darkened past the threshold                     |
| `src/utils/links.test.ts`                      | Canonical path construction, id escaping, provider disambiguation, search query encoding                                                       |
| `src/utils/motion.test.ts`                     | Reduced-motion detection and its effect on scroll behaviour, including missing `matchMedia`                                                    |
| `src/components/ui/Artwork.test.tsx`           | Lazy vs eager loading, labelled fallback, failure fallback, layout stability                                                                   |
| `src/components/ui/cards.test.tsx`             | Canonical hrefs, escaped ids, favourite identity, provider badge, item-count pluralisation, grid semantics                                     |
| `src/components/ui/toggles.test.tsx`           | `aria-pressed`, next-state requests, distinct favourite/like wording, disabled behaviour                                                       |
| `src/components/ui/ContentRow.test.tsx`        | Section labelling, list semantics, no tab stop on the track, controls only when overflowing, page-sized scrolling, empty state                 |
| `src/components/ui/MetadataList.test.tsx`      | `dl`/`dt`/`dd` structure, accessible name, omission of absent values                                                                           |
| `src/components/ui/Disclosure.test.tsx`        | `aria-expanded`, grouped links, Escape + focus return, outside click, close on navigation                                                      |
| `src/components/ui/Dialog.test.tsx`            | Accessible name, focus on open, Escape, focus restoration, hidden close button                                                                 |
| `src/components/ui/Skeleton.test.tsx`          | Placeholders hidden individually, one live announcement per region                                                                             |
| `src/components/layout/SearchControl.test.tsx` | Search landmark, labelled input, query encoding, expand/collapse state                                                                         |
| `src/components/layout/Navigation.test.tsx`    | Brand, provider tabs, planned labelling, Adult hidden, favourites reachable, account menu groups, honest account status                        |
| `src/config/providers.test.ts`                 | Catalogue honesty, lookup, Adult opt-in visibility (module re-import with stubbed env)                                                         |
| `src/app/routes.test.tsx`                      | All documented routes, settings sections, unknown provider, Adult disabled, dev-route gating, focus management, no focus theft on first render |

### Regression matrix coverage

Now additionally covered: "Accessibility - important controls remain keyboard accessible"
(semantics, focus behaviour, and real keyboard traversal including the skip link and Escape
dismissal), and the responsive/manual browser rows, which run in Chromium at four viewports in
`e2e/responsive.spec.ts`. "Viewer fallback" remains not applicable, and 'Application startup
without optional providers' remains covered.

Still not covered: non-Chromium engines, and the native `<dialog>` modal path in an automated
test (it is rendered during the browser run but nothing asserts its behaviour).

---

## Failed Approaches and Lessons Learned

**"No browser is obtainable here" was a wrong conclusion held for two phases.** Four avenues
were tried: (1) `npx playwright install chromium` - `cdn.playwright.dev` is outside the
allowlist; (2) `@sparticuz/chromium` - the binary unpacks but needs `libnspr4.so`;
(3) `chrome-aws-lambda`'s bundled `aws.tar.br` - ships `libnss3`/`libnssutil3` but not
`libnspr4`; (4) `apt`/`.deb` - Debian mirrors are unreachable. Each attempt ended at the same
missing library, so the library, not the browser, was treated as unobtainable.

The error was stopping at the first tarball. `@sparticuz/chromium` **does** ship `libnspr4.so` -
in `bin/al2023.tar.br`, a separate archive the package's own helper only unpacks on Amazon
Linux, which is why it looked absent. Extract it, point `LD_LIBRARY_PATH` at the result, add
`--no-sandbox`, and Chromium 153 runs and Playwright drives it.

Lessons: (a) a dependency failing for one reason is not evidence that the capability is
impossible - enumerate what the package actually ships before concluding; (b) a missing `.so` is
an inventory question, so search the archives for the file by name; (c) no RPATH exists in that
build, so co-locating the libraries with the binary does not work - `LD_LIBRARY_PATH` is
mandatory; (d) two phases of responsive work went unverified behind this, and two real layout
defects were found within minutes of the first successful run.

**jsdom's CSS handling misled the first test design.** It applies declarations inside
`@media` blocks without evaluating the conditions, so the mobile-only search toggle computed
as `display: none` and could not be found by role queries or focused. The lesson: treat jsdom
as rendering the desktop layout and assert _state_ through the DOM for anything that is
hidden by a media query; never assert visibility from jsdom.

**A production bundle contained a development page.** The design system page and its sample
fixtures were statically imported, so `grep` found them in `dist/assets/index-*.js`. Fixed by
lazily importing the page behind a dev-only route and verifying with `grep` that the fixtures
are gone from the main chunk.

**An over-strict self-written audit failed correctly.** A throwaway check rejected _any_
inline `style` for layout; it flagged only legitimate dynamic values (caller-supplied skeleton
sizes, a CSS custom property for the provider swatch, and demo sizing in the dev page). The
check was dropped rather than the code being contorted to satisfy it.

**A grid track sized `auto` floors at its content's min-content width.** Twice in Phase 5 a page
grew wider than the viewport for that reason: an item page widened to 456 px at 390 px because a
long licence URL could not break, and the home page overflowed by 3720 px at 1440 px because the
horizontal row's implicit `auto` column resolved to the full 24-card track (`scrollWidth` and
`clientWidth` both reported the inflated value, so the scroll container looked healthy).
`minmax(0, 1fr)` on the grid plus `min-width: 0` down to the scrolling child fixes both. Bisecting
with `display: none` does not narrow such a page — measure `scrollWidth`/`clientWidth` and each
child's `getBoundingClientRect().right` instead.

**Playwright's strict mode is strict about the app's own chrome.** `getByRole('button', { name:
'Search' })` also matches the header's "Open search" control, and `getByText('public domain')`
matched both a metadata value and the rights paragraph; the fixes were `exact: true` and asserting
the full sentence. A scratch probe script left in the repository root is linted as application
code, so it fails `npm run check` on `no-undef` — write probes outside the repository or delete
them in the same session.

**A hook cannot be called after a conditional return, and a route should not fetch for a provider
that has no adapter.** The first provider page issued its categories request before deciding
whether the provider existed, which would have recorded a health failure against a provider that
never had a chance to answer. The request moved into an extracted component that only mounts for
`availability === 'available'`.

---

## Recent Changes

### 2026-10-26 - Phase 5: discovery experience

- Added `src/data/`: a TTL cache with in-flight de-duplication, a concurrency limiter, a
  `useAsyncValue` hook (abort on key change, `fresh` reload that bypasses the cache), a
  capability lookup module, and a `ProviderServices` context that owns one lazily built runtime.
- Added `src/config/discovery.ts` (rows, page size, featured category, provider id) and
  `src/utils/{format,contentParams}.ts` (display formatting; total URL parsers for page, sort,
  type and query).
- Added `src/components/content/`: `ItemRow`, `CategoryCard`, `Section`, `FeaturedItem`,
  `Breadcrumbs`, `Pagination`, `CollectionToolbar`, `FileList`, `AsyncContent`.
- Added the five discovery pages: home (featured item, six rows, category grid, personalisation
  notice), provider (categories or an honest status), category (collections), collection (item grid
  with sorting, type filter, in-collection search, paging, related collections), and item (hero,
  description, files with download links, metadata, rights, source link, related items).
- Extended `src/components/layout/Page.tsx` with breadcrumbs, an optional media slot, and a meta
  slot; extended the provider contract's browse options with `sort`, `contentTypes` and `query`.
- Added `src/pages/discovery.test.tsx` (14 page tests) and `e2e/discovery.spec.ts` (4 browser
  tests with stubbed Archive JSON), and rewrote `src/app/routes.test.tsx` for the real pages.
- Fixed two layout defects found by the new browser tests: `ContentRow`/`ItemRow` grids narrowed to
  `minmax(0, 1fr)` with `min-width: 0` down to the scrolling track, and `Page` media capped at
  10rem on small screens.

### 2026-10-25 - Phase 4: Internet Archive adapter

- Added `src/providers/archive/`: an HTTP client that owns URLs and status translation, raw
  response types, a mediatype/format/MIME taxonomy, Lucene query construction, a pure mapping
  layer, a curated category catalogue, and the `ContentProvider` implementation.
- Implemented search (escaped text, content-type filters, shared sorts, page clamping), categories,
  collections (catalogue order merged with real titles), collection metadata with an item count
  from a `rows=0` request, collection items, item metadata, related items, available files, and
  download URLs.
- Normalized content types, file formats and MIME types, publication dates, collections, rights,
  artwork, and access state; administrative files are dropped and restrictions travel per file.
- Added `src/providers/composition.ts`: the single place adapters are registered and the gateway is
  constructed. Nothing else may build a registry.
- Flipped the catalogue entry for the Internet Archive to `available` and added `browsingPhase`, so
  the provider page and the navigation announce the adapter and the still-missing interface
  separately.
- Added 135 tests (search, collections, items, pagination, missing items, rate limits, provider
  failures, cancellation, attribution) plus hand-written fixtures — no test touches the network.
- Ticked roadmap 4.1-4.3 and documented the adapter in `AGENTS.md` section 5.7 and `README.md`.

### 2026-10-25 - Phase 3: provider architecture

- Added `ProviderRegistry`: registration with duplicate and malformed-id rejection, lookup,
  per-provider initialization with isolated failures, health and a consecutive-failure
  availability circuit, enable/disable, capability exposure, and change subscriptions.
- Added `ProviderGateway`: the only caller of an adapter. It enforces declared capabilities,
  applies one request policy, validates every response, and records outcomes as health.
- Added `src/providers/reliability.ts`: timeouts enforced by racing the call, cancellation that
  is never counted as a failure, jittered exponential backoff, and provider-supplied rate-limit
  hints.
- Added `src/providers/normalize.ts` and `validate.ts`: untrusted provider payloads become shared
  models, unsafe URL schemes are dropped, and malformed responses are rejected as
  `invalid-response`.
- Extended the contract with per-call request options, optional `initialize`/`checkHealth`, and a
  `createProviderCapabilities` helper; added the `unsupported-capability` error kind.
- Added 174 tests, including malformed responses, failure isolation, and cancellation.
- Documented integration rules in `AGENTS.md` section 5.7 and `README.md`.

### 2026-10-25 - GitHub Pages deployment

### 2026-10-25 - GitHub Pages deployment

- Added `.github/workflows/deploy-pages.yml`: quality gates, build, artefact verification, and
  deployment through the official Pages actions on every push to `main`.
- Moved the app to a single base path (`/Vaultara/` by default, `VITE_BASE_PATH` to override).
  Asset URLs, the router `basename`, the dev server, and the E2E suite all follow it, so a
  base-path mistake fails locally and in CI rather than only on the deployed site.
- Added `src/app/basePath.ts` (with tests) to convert Vite's `BASE_URL` into a router `basename`.
- Added `scripts/build-pages-404.mjs` as `postbuild`: publishes the shell as `404.html`, the only
  way a static host can support deep links.
- Added `scripts/verify-pages-build.mjs` (`npm run verify:pages`): checks the built artefact the
  way Pages serves it - asset resolution, fallback freshness, deep links - without a browser.
- Updated the E2E suite to navigate through `e2e/appBase.ts`, so it exercises the deployed
  sub-path instead of a root-mounted variant that only exists locally.
- Fixed a cold-start race exposed by the change: two keyboard tests pressed Tab before React had
  mounted, so they were asserting against an empty document.

### 2026-10-25 - Dependency script, and Phase 2 validated in a real browser

- Added `scripts/setup-deps.sh` and documented it in `AGENTS.md` section 5.5 and `README.md`:
  Node/npm gates, lockfile reconciliation via `npm ci`, and headless Chromium provisioning with
  `--check`, `--no-browser`, `--browser`, and `--verbose`.
- Solved the long-standing browser blocker with `@sparticuz/chromium`'s `al2023.tar.br`, which
  contains the `libnspr4.so` every earlier attempt was missing. Chromium 153.0.8010.0 now runs
  with `LD_LIBRARY_PATH` and `--no-sandbox`.
- Added `e2e/responsive.spec.ts` (18 tests) and widened `e2e/smoke.spec.ts` to 6; added
  `tsconfig.e2e.json`. The suite is 27 tests and takes about 14 seconds.
- Fixed two responsive defects that only a rendered browser could reveal: a clipped provider
  tab, and a header that wrapped the brand mark unexpectedly. The header is now an explicit
  two-row grid below 48rem and the tab strip wraps rather than scrolling.
- Ticked roadmap 2.4 and rewrote its status block to record what is verified, in what engine,
  and what remains unverified.
- Corrected this notebook: the "no browser is possible" conclusion was wrong and is now
  recorded as a lesson rather than a limitation.

### 2026-10-25 - Phase 2: visual design system

- Rebuilt the token layer (colour, typography, spacing, radii, elevation, motion, layout,
  z-index) and the global baseline (focus rings, selection, `.sr-only`, type defaults).
- Added shared components: `Button`, `Artwork`, `ProviderBadge`, `ItemCard`, `CollectionCard`,
  `FavoriteButton`/`LikeButton`, `MetadataList`, `ResponsiveGrid`, `ContentRow`, `Dialog`,
  `Disclosure`, and skeletons.
- Rebuilt navigation: logo, provider tabs, global search that routes to `/search?q=`,
  favourites, and an account menu; responsive collapse below 52rem with the provider strip on
  its own scrollable row.
- Added SPA focus management on navigation and a footer attribution line.
- Added a development-only, code-split design system reference at `/design-system`.
- Added 111 new tests (231 total) including a token-driven WCAG contrast suite.
- Recorded two deliberate accessibility changes: the content row is no longer a tab stop, and
  the dialog no longer dismisses on backdrop click.

Previous entries:

### 2026-10-25 - Renamed governing documents; roadmap made authoritative

User-approved documentation change, no application code touched.

- Renamed `APPLICATION DESIGN SPECIFICATION.md` -> `APPLICATION_DESIGN_SPECIFICATION.md` and
  `DEVELOPMENT ROADMAP.md` -> `DEVELOPMENT_ROADMAP.md` with `git mv`. The paths `AGENTS.md`
  and `TESTING_AND_REGRESSION_GUIDELINES.md` already cited now resolve.
- Added `DEVELOPMENT_ROADMAP.md` to the authoritative document set: `AGENTS.md` sections 2.1,
  3.6 (with a responsibility row and a precedence note), 4.2, 14, 15 Step 1, and 18; testing
  guidelines sections 2 and 2.2.
- Roadmap status `Proposed` -> `Approved`; Phase 1 checklist (33 tasks) checked off with its
  verification evidence and known limitations recorded inline.
- Updated references in `README.md`, `mnemosync.md`, and `.prettierignore`.
- Re-ran the full gate after the change: PASS.

Previous entries:

### 2026-10-25 - Phase 1: project foundation

- Scaffolded a Vite 8 + React 19 + TypeScript 5.9 application with strict type checking
  (`noUncheckedIndexedAccess`), ESLint 9 flat config (typescript-eslint, React hooks,
  jsx-a11y, `no-eval`/`no-new-func` bans), Prettier, Vitest 5 + Testing Library, and Playwright.
- Added the full route table from design spec section 22 plus a not-found route, a shared
  layout with skip link and landmarks, and 11 page modules.
- Added shared models and contracts: content, provider, viewer, user state, canonical
  identity, pagination, and standardized errors, with helpers and unit tests.
- Added feedback components: `LoadingState`, `EmptyState`, `ErrorState`, `NotYetImplemented`.
- Added validated environment configuration (`.env.example`, `src/config/env.ts`) and a
  provider catalogue in which every provider is honestly marked `planned`.
- Added 117 unit and component tests across 8 files; added a Playwright smoke suite that
  could not be executed here (browsers unavailable).
- Rewrote `README.md`, which previously did not fulfill its assigned role.
- Reverted an accidental repository-wide Prettier reformat of the four governing documents
  and added `.prettierignore` entries so it cannot recur.

Previous entry:

### 2026-10-25 — Documentation baseline + notebook creation

- Read `AGENTS.md`, `APPLICATION_DESIGN_SPECIFICATION.md`,
  `TESTING_AND_REGRESSION_GUIDELINES.md`, `DEVELOPMENT_ROADMAP.md`, `README.md` in full.
- Verified the repository contains no code, manifests, tooling, or CI (see baseline table).
- Created `mnemosync.md` with the recommended structure from `AGENTS.md` §4.6.
- Recorded four documentation gaps (README incomplete, roadmap orphaned from `AGENTS.md`,
  underscore-vs-space filenames, missing notebook) without changing any existing file.
- No application code, configuration, or dependency changes were made.

---

## Next Steps

Phases 0-5 are complete: the shell, the design system, static deployment, the provider
architecture, the Archive adapter, and the discovery workflow that consumes it.

1. **Phase 6: accounts and persistence** — only on the user's instruction. It brings IndexedDB,
   accounts, and the state that favourites currently lack.
2. **Wire the favourite controls when their state exists (Phase 8).** `ItemCard` already accepts
   `onFavoriteToggle`; discovery pages pass nothing, so no control renders. Do not add controls to
   the API contract before the store exists.
3. **Verify the discovery flow against the live service** when a network is available: the curated
   collection identifiers in `catalog.ts`, the CORS behaviour of `advancedsearch.php`, real
   artwork (the Archive serves a placeholder rather than a 404 for items without a thumbnail), and
   the item counts taken from `numFound`.
4. **Add a native-modal E2E test.** The `<dialog>` path renders in Chromium but nothing asserts
   `showModal` semantics, focus trapping, or background inertness.
5. **Extend CI** to run `npm run test:e2e`, not just `npm run check`.
6. **Review `--color-border-strong`** aesthetically; it was lightened to `#6b7686` to meet 3:1.

## Session Handoff Log

### Session 2026-10-26 (Phase 5 discovery experience)

1. **Objective:** execute roadmap Phase 5 — the discovery workflow `Home -> Category ->
Collection -> Item details` — on the user's instruction to continue with the next phase.
   Nothing was committed, by standing rule.
2. **Specification references:** design spec 7.1 (exploration is item-level), 9.1-9.5 (discovery,
   cards, collection and item pages), 11.4 (never download media to show metadata), 15.3 (every
   result identifies its provider), 9.3 (render a section only when data exists); roadmap 5.1-5.5,
   `AGENTS.md` 5.8.
3. **Changes made:**
   - `src/data/`: `requestCache` (5 min TTL, 120 entries, in-flight de-duplication, failures not
     cached), `requestLimiter` (4 concurrent), `contentQueries`, `useAsyncValue`,
     `providerCapabilities`, `ProviderServices`.
   - `src/config/discovery.ts`; `src/utils/{format,contentParams}.ts`; extended
     `src/components/layout/Page.tsx` with breadcrumbs, a media slot, and a meta slot.
   - `src/components/content/`: `ItemRow`, `CategoryCard`, `Section`, `FeaturedItem`,
     `Breadcrumbs`, `Pagination`, `CollectionToolbar`, `FileList`, `AsyncContent`.
   - Pages: `HomePage`, `ProviderPage`, `CategoryPage`, `CollectionPage`, `ItemPage` (plus one CSS
     module each).
   - Contract additions: `BrowseOptions` gained `sort`, `contentTypes` and `query`; `SearchSort`
     gained `added-desc` (Archive `publicdate desc`); the adapter's `getCollectionItems` now honours
     all three.
   - Tests: `src/data/*.test.ts`, `src/utils/{format,contentParams}.test.ts`,
     `src/pages/discovery.test.tsx`, `e2e/discovery.spec.ts`; `src/app/routes.test.tsx` rewritten
     for the real pages.
4. **Implementation status:** 5.1, 5.3, 5.4 and 5.5 complete. 5.2 is complete except favourite
   actions, which need favourite state (Phase 8) and are left unrendered rather than shown as dead
   controls. Search results, downloads, viewers, accounts and personalisation remain unimplemented
   and say so.
5. **Verification:** `npm run check` PASS (37 files, 598 tests); `npm run test:e2e` PASS (33 tests,
   25.1 s); `npm run build` PASS (main 408.78 kB, 127.38 kB gzip); `npm run verify:pages` PASS.
   Screenshots of the four discovery pages at 390 px and 1440 px were reviewed.
6. **Failures found by the tests:** the home page overflowed by 3720 px at 1440 px because the
   row's `auto` grid track resolved to the full 24-card width (fixed with `minmax(0, 1fr)` and
   `min-width: 0`); the item page reached 456 px at 390 px because a licence URL could not break
   (fixed the same way plus a shortened licence summary); Playwright strict-mode collisions on
   "Search" and "public domain" needed `exact` matching; a scratch probe script in the repository
   root failed `npm run check` on `no-undef` and was deleted.
7. **Outstanding work:** favourite controls (Phase 8), per-collection item counts in the category
   grid (one request per card, deliberately omitted), the search-results page (Phase 9), every
   viewer (Phase 8), and live verification against archive.org.
8. **Known risks:** the Archive's CORS behaviour for `advancedsearch.php` and `metadata` is
   unverified from this sandbox, so the browser path has only ever run against stubbed JSON; the
   curated collection identifiers in `catalog.ts` may name collections the Archive has renamed
   (the code falls back to catalogue names); item counts come from `numFound`, so they are as fresh
   as the request; and the discovery configuration assumes one provider id.
9. **Next steps:** Phase 6 (accounts and persistence) only on the user's instruction.
10. **Relevant files:** `src/data/`, `src/config/discovery.ts`, `src/components/content/`,
    `src/pages/{Home,Provider,Category,Collection,Item}Page.tsx`, `src/utils/contentParams.ts`,
    `e2e/discovery.spec.ts`, `DEVELOPMENT_ROADMAP.md` Phase 5, `AGENTS.md` 5.8, `README.md`.

### Session 2026-10-25 (Phase 4 Internet Archive adapter)

1. **Objective:** execute roadmap Phase 4 on the user's instruction to start the next phase — a
   functional Archive.org provider returning normalized, validated data through the shared
   contract. No UI work, and nothing committed.
2. **Specification references:** design spec 11.1-11.4 (supported operations, content types, file
   metadata, large resources), 10.2-10.5, 20, 28; roadmap Phase 4; `AGENTS.md` section 5.7.
3. **Changes made:** `src/providers/archive/{types,api,taxonomy,query,map,catalog,adapter,fixtures}.ts`
   and five test files; `src/providers/composition.ts`; `src/config/providers.ts` (Archive now
   `available`, new `browsingPhase`); `ProviderPage.tsx` copy; `Navigation.test.tsx` and
   `providers.test.ts` expectations; roadmap 4.1-4.3; `AGENTS.md` 5.7; `README.md`; this notebook.
4. **Implementation status:** Phase 4 sections 4.1-4.3 complete. The adapter is registered but no
   component calls it; browsing is Phase 5 and the UI says so.
5. **Verification:** `npm run check` PASS (32 files, 554 tests); `npm run test:e2e` PASS (27 tests,
   12.9 s); `npm run build` PASS; `npm run verify:pages` PASS; `grep dist` confirms no adapter code
   in any chunk.
6. **Environment limits:** archive.org is unreachable from the sandbox (`curl` returns `000`), so
   the payload fixtures are hand-written from documented response shapes. Live behaviour — CORS
   headers, real collection identifiers, actual pagination ceilings — is unverified.
7. **Decisions worth remembering:** escape and parenthesize user text so a typed `OR` cannot slip
   past a content-type filter; treat `200` + `{}` and `is_dark` as `not-found`; keep `viewable`
   to browser-native formats until a viewer exists.
8. **Known risks:** `catalog.ts` identifiers are curated guesses and may name collections the
   Archive no longer has (the code falls back to catalogue names, so navigation still works);
   nothing exercises the base-path/browser path until Phase 5 wires the UI.
9. **Next steps:** Phase 5 on the user's instruction. Do not start it unprompted.
10. **Relevant files:** `src/providers/archive/`, `src/providers/composition.ts`,
    `src/config/providers.ts`, `src/pages/ProviderPage.tsx`, `DEVELOPMENT_ROADMAP.md` Phase 4,
    `AGENTS.md` 5.7, `README.md`.

### Session 2026-10-25 (Phase 3 provider architecture)

1. **Objective:** execute roadmap Phase 3 — registry, contract, normalization, reliability — on
   the user's instruction to start the next phase. No provider adapter, so no fetching.
2. **Specification references:** design spec 10.1-10.5 (provider design, contract, capabilities,
   registry, isolation), 11.3 (file metadata), 25 (reliability), 28 (errors); roadmap Phase 3.
3. **Changes made:** `src/providers/{registry,gateway,reliability,normalize,validate}.ts`;
   contract extension in `src/models/provider.ts`; `unsupported-capability` kind and
   `retryAfterMs` in `src/models/errors.ts`; `src/test/fakeProvider.ts` fixtures; five test files.
4. **Implementation status:** Phase 3 sections 3.1-3.4 complete. No adapter exists, so discovery,
   search, item pages, favourites and downloads remain unimplemented and say so.
5. **Verification:** `npm run check` PASS (27 files, 412 tests); `npm run build` PASS;
   `npm run verify:pages` PASS; `npm run test:e2e` PASS (27 tests, 12.9 s) — unchanged, since no
   UI was touched, but run rather than assumed.
6. **Failures found by the tests:** an aborted request was still invoking the adapter on the next
   loop iteration, and that abandoned rejection surfaced as an unhandled rejection; both fixed by
   checking the signal before starting an attempt. A health probe answering "unhealthy" was
   counted like any other failure, needing three strikes; it is now decisive.
7. **Outstanding work:** Phase 4 (Archive.org adapter). Nothing in Phase 3 depends on it.
8. **Known risks:** the gateway imports no adapter and nothing constructs a registry yet, so the
   wiring is proven only by tests; Phase 4 must register through the gateway rather than calling
   an adapter directly.
9. **Next steps:** Phase 4 on the user's instruction.
10. **Relevant files:** `src/providers/`, `src/models/provider.ts`, `src/models/errors.ts`,
    `AGENTS.md` section 5.7, `README.md`.

### Session 2026-10-25 (GitHub Pages deployment)

1. **Objective:** make the repository deployable to GitHub Pages, at the user's request. The user
   changes the repository settings; this session changes the code and configuration.
2. **Specification references:** `AGENTS.md` section 5.6 (deployment, new); roadmap Phase 19
   mentions production configuration but is not started, so nothing there was ticked.
3. **Changes made:**
   - `.github/workflows/deploy-pages.yml`: `npm ci`, `setup-deps.sh --check --no-browser`,
     `npm run check`, base-path detection, build, `verify:pages`, then the official
     `configure-pages` / `upload-pages-artifact` / `deploy-pages` actions. Triggers on push to
     `main` and `workflow_dispatch`.
   - `vite.config.ts`: single `base` for dev, build, and preview, defaulting to `/Vaultara/` and
     overridable with `VITE_BASE_PATH`, normalised to leading and trailing slashes.
   - `src/app/basePath.ts` + `App.tsx`: router `basename` from `import.meta.env.BASE_URL`.
   - `e2e/appBase.ts` + all E2E navigation: the suite now drives the deployed sub-path.
   - `scripts/build-pages-404.mjs` (`postbuild`) and `scripts/verify-pages-build.mjs`
     (`npm run verify:pages`).
   - Documentation: `README.md` (new Deployment section, scripts table, config table, dev URL),
     `AGENTS.md` 5.6, this notebook.
4. **Implementation status:** deployment is configured; no product feature changed. Phase 2
   remains complete and validated.
5. **Verification:** `npm run check` PASS (22 files, 238 tests); `npm run test:e2e` PASS (27
   tests, twice) now running under `/Vaultara/`; `npm run build` PASS; `npm run verify:pages` PASS
   for base `/Vaultara/`, `/`, and a slash-less input. The built bundle was also served the way
   Pages serves it and driven with Chromium: root returned 200, deep links returned the shell and
   rendered the right page, client-side navigation stayed inside the base, and no request failed.
6. **Failures:** the change initially broke lint (the new Node scripts had no Node globals or
   `console` permission in `eslint.config.js`) and two keyboard E2E tests. The tests were a
   cold-start race - `page.goto` resolves on the load event, which can precede React's first
   render, so Tab hit an empty document. Fixed by waiting for the skip link to be visible.
7. **Outstanding work:** the workflow has never run on GitHub; the first push to `main` is its
   first execution. Pages must be enabled with source "GitHub Actions". E2E is still not in CI.
8. **Known risks:** deep links return HTTP 404 by design (Pages limitation; the shell still
   renders). If `VITE_BASE_PATH` and the deployed path ever disagree, assets 404 - which is why
   `verify:pages` reads the base out of the built HTML instead of trusting configuration.
9. **Next steps:** confirm the first deployment succeeds, then Phase 3 provider architecture on
   the user's instruction.
10. **Relevant files:** `.github/workflows/deploy-pages.yml`, `vite.config.ts`,
    `src/app/basePath.ts`, `e2e/appBase.ts`, `scripts/build-pages-404.mjs`,
    `scripts/verify-pages-build.mjs`, `AGENTS.md` section 5.6.

### Session 2026-10-25 (dependency script and real-browser validation)

1. **Objective:** install a working browser so Phase 2 validation could actually run, add a
   reusable dependency-provisioning script at the user's request, and correct the documentation
   that claimed a browser was impossible.
2. **Specification references:** roadmap 2.4 (Responsive Behavior); `AGENTS.md` sections 5
   (environment setup, new), 12.2 (testing layers), 13 (git safety).
3. **Changes made:**
   - Added `scripts/setup-deps.sh`, trimmed from a supplied generic script to only what this
     project needs: Node/npm version gates against `package.json`, package drift detection
     against `package-lock.json` corrected with `npm ci`, and headless Chromium resolution.
     Flags: `--check`, `--no-browser`, `--browser`, `--verbose`.
   - Rewrote `playwright.config.ts` with browser resolution: `PLAYWRIGHT_CHROMIUM`, then the
     extracted fallback (with `LD_LIBRARY_PATH` and `--no-sandbox`), then the
     Playwright-managed browser.
   - Rewrote `e2e/smoke.spec.ts` for the Phase 2 navigation and added `e2e/responsive.spec.ts`.
   - Added `tsconfig.e2e.json`; `e2e/` moved out of `tsconfig.node.json`.
   - Fixed two genuine responsive defects found by looking at the rendered output: the provider
     strip clipped its last tab (hidden `overflow-x` scroll strip), and the header pushed the
     brand mark to an unexpected line at narrow widths (flex wrap ordering). The header now uses
     an explicit two-row grid below 48rem, tabs wrap instead of scrolling, and the full search
     field waits until 56rem.
   - Documented all of this in `AGENTS.md` (new section 5.5), `README.md`, roadmap 2.4, and
     this notebook.
4. **Implementation status:** Phase 2 sections 2.1-2.4 complete and validated. No product
   feature beyond the shell exists.
5. **Verification:** `npm run typecheck` PASS (3 configs); `npm run lint` PASS; `npm test` PASS
   (21 files, 231 tests); `npm run test:e2e` PASS (27 tests, 14.1 s); `./scripts/setup-deps.sh`
   PASS on a clean run, an idempotent re-run, and `--check` (exit 0). Header geometry probed at
   20 widths from 320 to 1920 px: no clipping, no overflow, no unexpected wraps.
6. **Failures:** the supplied script's `@sparticuz/chromium` path was wrong at first (the
   extractor needs a directory, not a binary path, and must create it first); fixed and
   re-verified. Two own-bug E2E type errors (`page.evaluate` needed DOM types; `boundingBox()`
   has no `right`) were fixed by adding `tsconfig.e2e.json` rather than loosening types.
7. **Outstanding work:** none inside Phase 2. Phase 3 awaits instruction. Non-Chromium engines
   and an automated native-modal assertion remain uncovered.
8. **Known risks:** the fallback browser is sandbox scaffolding, not a project dependency; if
   `playwright.config.ts` ever loses the resolution logic, `test:e2e` fails confusingly rather
   than gracefully. Only Chromium is exercised.
9. **Next steps:** Phase 3 provider architecture, on the user's instruction.
10. **Relevant files:** `scripts/setup-deps.sh`, `playwright.config.ts`, `tsconfig.e2e.json`,
    `e2e/`, `src/components/layout/Navigation.module.css`, `AGENTS.md` section 5.5.

### Session 2026-10-25

1. **Objective:** Read the repository's governing documents and scaffold the persistent
   engineering notebook required by `AGENTS.md`.
2. **Specification references:** `AGENTS.md` §2.1, §3.6, §4 (notebook), §15 (workflow);
   testing guidelines §2.2, §19.1, §19.2.
3. **Changes made:** Created `mnemosync.md`. No other file was modified.
4. **Implementation status:** Notebook complete. Application implementation not started —
   there is no application code in the repository.
5. **Verification:** Repository inspection `PASS` (5 tracked docs, clean tree, HEAD
   `b0db56d`, branch `arena/3285ab2f-vaultara`). All mandatory documents read `PASS`.
   Type check, lint, tests, build, and manual browser review: `NOT RUN` — no toolchain exists.
6. **Failures:** None encountered. Nothing was blocked.
7. **Outstanding work:** The Phase 1 items in Next Steps, plus the three unresolved
   documentation decisions.
8. **Known risks:** Creating scaffolding without first choosing the toolchain could produce
   config that must be replaced; renaming the spec/roadmap files would touch every path
   reference. No functional risk, since no functionality exists.
9. **Next steps:** Resolve the documentation decisions, then scaffold the application and its
   quality gates together.
10. **Relevant files:** `mnemosync.md` (this file), `AGENTS.md` §4 and §15,
    `APPLICATION_DESIGN_SPECIFICATION.md` §10/§20/§22, `DEVELOPMENT_ROADMAP.md` Phase 1.

### Session 2026-10-25 (Phase 1 scaffolding)

1. **Objective:** Execute roadmap Phase 1 - project setup, application structure, shared data
   models, and quality gates - without implementing provider or viewer functionality.
2. **Specification references:** roadmap Phase 1 and 1.4 quality gates; design spec sections
   4 (navigation), 20 (data models), 22 (routing), 23-24 (visual foundation), 26 (security);
   testing guidelines sections 4, 6, 19; `AGENTS.md` sections 5, 11, 15, 17.
3. **Changes made:** created the entire application scaffold (see Repository Structure):
   configs, 11 page modules, layout and feedback components, 7 model modules, environment
   and provider configuration, 8 test files with 117 tests, a Playwright suite, and a
   rewritten `README.md`. Added `.gitignore`, `.env.example`, `.prettierrc.json`,
   `.prettierignore`.
4. **Implementation status:** Phase 1 complete. No provider, viewer, persistence, search,
   favorites, history, or download feature exists. Every unimplemented page states that
   plainly.
5. **Verification:** `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`
   (117 passed), `npm run build`, and `npm run check` all PASS. Dev server HTTP smoke via
   `curl` PASS. Playwright browser download BLOCKED by the network allowlist. Real-browser
   visual, responsive, and manual accessibility review NOT RUN.
6. **Failures:** one test failure during development (accessible-name concatenation); the
   component was corrected rather than the assertion. No unresolved test failures remain.
7. **Outstanding work:** the two documentation decisions (file naming, roadmap's place in the
   document set); a real-browser verification pass; Phase 2.
8. **Known risks:** E2E suite is unexecuted; TypeScript and ESLint are pinned below their
   latest majors for lint-tool compatibility and will need a coordinated upgrade; no CI
   enforces the gates; no coverage reporting.
9. **Next steps:** answer the documentation questions, run the shell in a real browser, then
   build the Phase 2 design system on the existing tokens.
10. **Relevant files:** `package.json`, `src/app/routes.tsx`, `src/app/routes.test.tsx`,
    `src/models/`, `src/config/`, `src/styles/tokens.css`, `README.md`, and this notebook.

### Session 2026-10-25 (documentation rename and roadmap authority)

1. **Objective:** Apply two user decisions carried over from the Phase 1 session - rename the
   spec and roadmap to underscore filenames, and add the roadmap to the authoritative
   document set.
2. **Specification references:** `AGENTS.md` sections 2.1, 3.6, 4.2, 13, 14, 15, 18; testing
   guidelines sections 2, 2.2.
3. **Changes made:** `git mv` for both documents; edits to `AGENTS.md` (six locations),
   `TESTING_AND_REGRESSION_GUIDELINES.md` (two), `DEVELOPMENT_ROADMAP.md` (status line plus the
   Phase 1 status and checklist), `README.md`, `.prettierignore`, and this notebook. No source
   file changed.
4. **Implementation status:** Documentation-only change; application still at end of Phase 1.
   Application behavior, dependencies, and tests are unaffected.
5. **Verification:** `npm run check` PASS (type check, lint, format check, 117 tests).
   `npx prettier --check .` PASS. Path-reference sweep with `grep` found no remaining
   space-form references outside the documents' own `# TITLE` headings. `git status` confirms
   the two files show as renames (`R`), not delete-plus-add.
6. **Failures:** None.
7. **Outstanding work:** Phase 2; a real-browser verification pass remains BLOCKED by the
   sandbox network.
8. **Known risks:** Any external bookmark, link, or tooling that referenced the old
   space-separated paths will break. In-repository references are all updated, but no remote
   or external consumers were checked. The roadmap is now authoritative, so its checklists
   must be maintained honestly as work completes.
9. **Next steps:** Run the shell in a real browser if possible, then begin Phase 2.
10. **Relevant files:** `AGENTS.md` sections 2.1/3.6/14/15/18, `DEVELOPMENT_ROADMAP.md`
    (Phase 1), `TESTING_AND_REGRESSION_GUIDELINES.md` section 2, `README.md`.

### Session 2026-10-25 (Phase 2 visual design system)

1. **Objective:** Execute roadmap Phase 2 - tokens, navigation, shared components, and
   responsive behaviour - without implementing provider or viewer functionality.
2. **Specification references:** design spec sections 4 (navigation), 5 (discovery surfaces),
   23 (visual design system), 24 (responsive), 27 (accessibility); roadmap Phase 2;
   `AGENTS.md` sections 5, 11, 17.
3. **Changes made:** rewrote `tokens.css` and `global.css`; added 13 shared UI components with
   CSS modules; rebuilt `Navigation` with `Logo`, `SearchControl`, `AccountMenu`, and
   `Disclosure`; added SPA focus management; added a dev-only design system page plus
   `src/dev/sampleContent.ts`; added `src/utils/links.ts` and `src/utils/motion.ts`; changed
   `createRoutes` to accept dev-route registration; added 111 tests.
4. **Implementation status:** Phase 2 sections 2.1-2.3 complete. Section 2.4 (responsive
   validation) untouched and unchecked. No product feature beyond the shell exists.
5. **Verification:** `npm run check` PASS (231 tests); `npm run build` PASS; contrast suite
   PASS; dev server 200 for `/`, `/design-system`, `/favorites`; `grep` confirms fixtures are
   not in the main bundle. E2E BLOCKED (no browser). Visual, responsive, touch-target
   measurement, and native modal checks NOT RUN.
6. **Failures:** no failing tests remain. Four failed attempts to obtain a browser are
   recorded above; do not repeat them.
7. **Outstanding work:** every item in roadmap 2.4; mobile-specific search behaviour and the
   native modal path lack automated coverage.
8. **Known risks:** the entire visual layer is unverified in a browser; media-query-dependent
   behaviour has no automated coverage; `--color-border-strong` may look heavier than intended.
9. **Next steps:** real-browser validation pass, then Phase 3 provider architecture.
10. **Relevant files:** `src/styles/tokens.css`, `src/components/ui/`, `Navigation.tsx`,
    `src/pages/DesignSystemPage.tsx`, `src/styles/contrast.test.ts`, this notebook.
