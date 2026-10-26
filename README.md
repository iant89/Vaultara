# Vaultara

A unified digital discovery platform for exploring books, movies, music, games, historical archives, and more: Netflix-style browsing, cross-provider search, personalized recommendations, global favorites, downloads, and in-browser content viewers.

Built with React and TypeScript, designed around a provider plugin system so that each content source stays independent of the application core.

---

## Project status

**Phases 1-4 are implemented and roadmap Phase 5 (the discovery experience) is implemented against the Internet Archive provider.**

What works today: the application shell and its visual language (route table, design tokens, responsive navigation, shared components, loading/empty/error states); shared data models and provider/viewer contracts; the Internet Archive adapter behind the registry, gateway, and reliability layer; and the discovery surfaces that read from it — a home page with a featured item, one row per category and a category grid, category pages that show each collection as a row of its items, collection pages with nested-collection shelves plus an item shelf (sorting, filtering, in-collection search, "View more"), breadcrumbs and related collections, and item pages with artwork, metadata, available files, related content, and source attribution.

Discovery needs a network route to `archive.org`. Where the provider cannot be reached, each surface says so and offers a retry rather than showing an empty page.

Personalisation and recommendations, favourites and likes, exploration history, search results, the download manager, and every content viewer are still unimplemented, and the interface says so. See `mnemosync.md` for exactly what is and is not verified.

Every route renders a real page. Pages whose feature is not implemented say so explicitly instead of showing inactive controls that look functional. This is a deliberate project rule: no placeholder may masquerade as a working feature.

| Area                                                                | State                                         |
| ------------------------------------------------------------------- | --------------------------------------------- |
| Build, type check, lint, format, unit tests                         | Implemented and passing                       |
| Routing, layout, navigation, shell                                  | Implemented                                   |
| Shared models and provider/viewer contracts                         | Defined and implemented against               |
| Provider registry and adapters (Internet Archive, Wikipedia, Adult) | Archive adapter wired to the UI; rest planned |
| Discovery: home, category, collection, item details                 | Implemented against the Archive provider      |
| Favourites, likes, history, search results, downloads               | Not started                                   |
| Content viewers (PDF, EPUB, image, audio, video, emulator, …)       | Not started                                   |

See `DEVELOPMENT_ROADMAP.md` for the full phase plan.

---

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Quick start

```bash
./scripts/setup-deps.sh
npm run dev
```

The development server prints its URL. Because the application is built for GitHub Pages, it is
served from a sub-path: `http://localhost:5173/Vaultara/`. Requests to the bare root redirect
there. The sub-path is deliberate rather than incidental — developing under the same prefix the
deployed site uses means a base-path bug shows up locally instead of only in production. See
[Deployment](#deployment-github-pages).

`scripts/setup-deps.sh` prepares a checkout: it verifies Node.js and npm against the versions this
project declares, reconciles installed packages with `package-lock.json`, and obtains a headless
Chromium for the end-to-end suite. It is idempotent and verifies rather than assumes.

```bash
./scripts/setup-deps.sh --check    # verify the environment only; installs nothing
```

If you prefer to manage dependencies yourself, `npm ci` followed by `npx playwright install
chromium` is equivalent for the non-browser steps.

## Scripts

| Command                 | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `npm run dev`           | Start the development server with hot reload                        |
| `npm run build`         | Type-check, then build the production bundle into `dist/`           |
| `npm run preview`       | Serve the production build locally                                  |
| `npm run typecheck`     | Type-check application and tooling configuration                    |
| `npm run lint`          | Run ESLint (TypeScript, React hooks, accessibility, security rules) |
| `npm run lint:fix`      | Lint and apply safe fixes                                           |
| `npm run format`        | Format with Prettier                                                |
| `npm run format:check`  | Verify formatting without writing                                   |
| `npm test`              | Run unit and component tests once                                   |
| `npm run test:watch`    | Run tests in watch mode                                             |
| `npm run test:e2e`      | Run the Playwright end-to-end suite                                 |
| `npm run check`         | Run type check, lint, format check, and tests in sequence           |
| `npm run verify:pages`  | Check that `dist/` is deployable to GitHub Pages                    |
| `scripts/setup-deps.sh` | Verify or install the toolchain, including the E2E browser          |

### End-to-end tests

Playwright does not download browsers during `npm install`, so one must be provisioned first.
`./scripts/setup-deps.sh` does this, and falls back to a standalone Chromium build in environments
where the Playwright CDN is unreachable:

```bash
./scripts/setup-deps.sh --browser   # provision, and fail loudly if no browser is obtained
npm run test:e2e
```

The suite starts its own dev server on port 4173. `playwright.config.ts` locates the browser
automatically; set `PLAYWRIGHT_CHROMIUM` to use a specific binary instead.

---

## Design system

Colour, typography, spacing, radii, elevation, motion, and layout values live in
`src/styles/tokens.css` and must be consumed through CSS custom properties rather than
hardcoded values. Every text and control-boundary colour pairing is asserted against WCAG 2.2
AA by `src/styles/contrast.test.ts`, so changing a colour without re-running `npm test` is not
safe.

Shared components live in `src/components/ui/` and use CSS Modules.

In development the shell also serves a reference page at **`/design-system`** showing every
token and component. It is registered only when `import.meta.env.DEV` is true and is
lazy-loaded, so it is never part of the initial production bundle.

## Configuration

Environment variables are read from `.env`, `.env.local`, or the shell. Copy `.env.example` to `.env.local` to begin.

| Variable                     | Default      | Purpose                                                             |
| ---------------------------- | ------------ | ------------------------------------------------------------------- |
| `VITE_API_BASE_URL`          | unset        | Absolute http(s) URL of the backend API. Unset means frontend-only. |
| `VITE_ENABLE_ADULT_PROVIDER` | `false`      | Opt-in switch for the Adult provider.                               |
| `VITE_BASE_PATH`             | `/Vaultara/` | Sub-path the app is served from. `/` for a custom domain.           |

Configuration is validated at startup by `src/config/env.ts`; an invalid value fails loudly rather than being silently ignored. Unknown boolean values are rejected so a typo cannot quietly disable a safety control.

**Never put credentials or secrets in a `VITE_` variable.** They are compiled into the browser bundle and are public.

---

## Deployment (GitHub Pages)

The site is published as a static bundle by `.github/workflows/deploy-pages.yml`, which runs on
every push to `main` and can also be started manually. Pages must be pointed at the workflow once,
in **Settings → Pages → Source → GitHub Actions**. Nothing is committed to a `gh-pages` branch.

The deployed URL is `https://iant89.github.io/Vaultara/`.

Because a Pages _project_ site is served from a sub-path, the bundle is built with
`VITE_BASE_PATH` (default `/Vaultara/`). This affects two things that must stay in step, and the
configuration handles both from the one variable:

- **Asset URLs.** Vite prefixes emitted `script`/`link` URLs with the base.
- **Client-side routing.** The router is created with a `basename` derived from
  `import.meta.env.BASE_URL` (`src/app/App.tsx`, `src/app/basePath.ts`). Without it, every route
  fails to match and direct links land on the not-found page.

The workflow detects the correct base automatically: `/<repository>/` for a project site, `/` for
a repository named `<owner>.github.io`. To override it — for instance when serving the site from a
custom domain, where the app lives at the domain root — set the repository variable
`PAGES_BASE_PATH` to `/`.

### Deep links

GitHub Pages serves static files only and has no rewrite rules, so `/Vaultara/favorites` has no
file behind it. `npm run build` therefore also writes the application shell to `404.html`; Pages
serves that file for any unmatched path, the application boots, and the router renders the
requested route. Those requests return HTTP 404 rather than 200, which is honest — the server
genuinely has no such resource — and it keeps URLs shareable and clean. Hash routing would avoid
the status code at the cost of uglier URLs.

### Verifying a build before it ships

```bash
npm run build && npm run verify:pages
```

`verify:pages` reads the base path out of the built `dist/index.html` rather than trusting the
configuration, then fails if any referenced asset would 404, if `404.html` is missing or stale, or
if a deep link does not return the shell. The workflow runs it before uploading, so a
misconfigured base fails the build instead of publishing a broken site.

The end-to-end suite also runs against the sub-path locally, so router and asset behaviour are
covered by tests rather than only by the deployment. The suite is not run in the deploy workflow;
`npm run test:e2e` needs a browser and is currently a manual gate.

---

## Project structure

```
├── .github/workflows/        GitHub Pages deployment workflow
├── e2e/                      Playwright end-to-end tests (base-path aware)
├── scripts/                  Dependency provisioning and Pages build verification
├── src/
│   ├── app/                  Router configuration and application root
│   ├── components/
│   │   ├── content/          Discovery pieces: rows, breadcrumbs, pagination, files, toolbar
│   │   ├── feedback/         Loading, empty, error, and status states
│   │   ├── layout/           App shell, navigation, search control, account menu, page frame
│   │   └── ui/               Cards, badges, toggles, rows, grids, dialog, skeletons, icons
│   ├── config/               Validated environment, provider catalog, discovery rows
│   ├── data/                 Cached query layer, request limiter, async state, provider context
│   ├── dev/                  Dev-only route registration and synthetic sample content
│   ├── hooks/                Shared React hooks (route focus management)
│   ├── models/               Shared content, provider, viewer, error, pagination types
│   ├── pages/                One module per route (settings sections nested)
│   ├── providers/            Registry, gateway, reliability, normalization, and the Archive adapter
│   ├── styles/               Design tokens, global baseline, and the contrast test
│   ├── test/                 Test setup (runs before every test file)
│   ├── utils/                Path builders, class naming, reduced-motion helpers
│   ├── main.tsx              Browser entry point
│   └── vite-env.d.ts         Vite client types and environment variables
├── index.html
├── eslint.config.js
├── playwright.config.ts
├── tsconfig.json             Application type checking (strict)
├── tsconfig.node.json        Tooling type checking
├── tsconfig.e2e.json         E2E type checking (DOM types for page.evaluate)
└── vite.config.ts            Build, base path, and test configuration
```

---

## Provider architecture

Content comes from providers: independent adapters behind one contract. The application core
never contains provider-specific fetching logic, so adding a provider does not touch discovery,
search, item pages, favourites, or viewers.

| Module                         | Responsibility                                                 |
| ------------------------------ | -------------------------------------------------------------- |
| `src/models/provider.ts`       | The `ContentProvider` contract and capability declarations     |
| `src/providers/registry.ts`    | Registration, duplicate rejection, state, health, enablement   |
| `src/providers/gateway.ts`     | The only caller of an adapter: capability check, then the call |
| `src/providers/reliability.ts` | Timeouts, cancellation, retries, rate-limit backoff            |
| `src/providers/normalize.ts`   | Untrusted payload → shared model                               |
| `src/providers/validate.ts`    | Response shape checks before the core uses a result            |
| `src/providers/composition.ts` | The composition root: builds the registry and gateway          |
| `src/providers/archive/`       | The Internet Archive adapter                                   |

**The Internet Archive adapter is implemented** (roadmap Phase 4) and is what the discovery pages
read from (roadmap Phase 5). Its data path is covered by 135 adapter tests — search, categories,
collections, collection items, item metadata, related items, thumbnail and source links, available
files, and download URLs — plus the page tests and browser tests that render its output. Wikipedia
and the Adult provider remain `planned`, and the catalogue in `src/config/providers.ts` says so.

Between the gateway and the pages sits the interface's data layer in `src/data/`: `contentQueries`
caches and de-duplicates reads, `requestLimiter` bounds concurrency, `useAsyncValue` binds one
request to one component, `providerCapabilities` reports what the UI may ask for, and
`ProviderServices` supplies all of it through React context. Pages use that layer and never import
an adapter; only `src/providers/composition.ts` constructs a registry.

The adapter is registered in exactly one place, `src/providers/composition.ts`; nothing else may
construct a registry or call an adapter. Request timeouts, retries, cancellation, and health
accounting are not the adapter's concern — the gateway applies them uniformly.

### Adding a provider

1. Implement `ContentProvider` in `src/providers/<name>/`. Fetch and normalize only — no React,
   no application state, no imports from other providers.
2. Normalize every payload field with the helpers in `src/providers/normalize.ts`. Only
   `http`/`https` URLs survive; control characters are stripped; provider-specific detail is kept
   in `metadata`.
3. Declare capabilities **honestly**. Advertising something unimplemented produces a control that
   breaks when used.
4. Forward the `AbortSignal` to your transport.
5. Add a factory to `defaultProviderFactories` in `src/providers/composition.ts`. That root builds
   the registry and gateway; call providers only through the gateway, which adds timeouts,
   retries, validation, and health tracking. Never call `fetch` from a component, and never create
   a second `ProviderRegistry`.
6. Add contract tests against recorded fixtures, plus malformed-response and failure-isolation
   cases. Tests must not touch the network.

Provider failures are isolated by construction: a provider that fails to initialize, or that
fails repeatedly, stops receiving requests while the others keep serving.

---

## Discovery experience

The discovery flow is `Home -> Category -> Collection -> Item details`, and every step is a real
route built from URL state so it can be linked, bookmarked, and reached with the back button.

| Route                         | What it shows                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                           | Featured item, one row per discovery row (24 cards), category grid                            |
| `/provider/:providerId`       | That provider's categories                                                                    |
| `/category/:categoryId`       | Each collection as a row of its items, with numbered pages of shelves                         |
| `/collection/:providerId/:id` | Nested collections as item shelves, then items: sort, filter, search, "View more"             |
| `/item/:providerId/:itemId`   | Item hero, description, files with download links, metadata, related content with "View more" |

### How the Archive's hierarchy is browsed

The Archive is a tree, not a flat list. A media type (Software, Moving Images, Texts, Audio, Images,
Data, Web Archive) contains collections; a collection can contain further collections; items sit at
the leaves. The Archive publishes no endpoint that returns that tree, so the application reads it
from the search index:

- A **media type's** collections are `mediatype:collection` restricted to that branch. The Archive
  adds every ancestor to an item's `collection` field, media type included, so a collection nested
  several levels down still resolves to the media type it belongs to.
- A **collection's** nested collections are the same query one level lower, each rendered as a
  horizontal shelf of its items (with View all) before this collection's own items.
- A **collection's** items exclude `mediatype:collection`, because a subcollection is an item too
  and would otherwise appear in the shelf as if it were content.

That is why the tree is browsable to any depth without a curated list per level.

### Adding more without leaving the page

Collection items, nested collections, and related content are batches, not pages of a numbered
series. Each shows "Showing 24 of 4,210 items" and a **View more** control that appends the next
batch. The first page is the only request a visit costs; every further batch is one request the
reader asked for. A failure while appending keeps what is already on screen and reports the
problem beside the button, so a readable list never turns into an error page.

Category pages are different: they are pageable in the URL, so `?page=2` is a link you can share,
and the pager shows numbered pages with first/last anchors once the provider reports a total.

Rules the pages follow:

- **One request per visible surface.** Rows are backed by `src/config/discovery.ts`; the featured
  slot and its row issue identical query arguments, so the cache serves both from one request.
  Lists that grow keep every extra batch behind a control the reader operates.
- **Every failure is local.** A row that cannot load reports it and offers a retry while the rest
  of the page keeps working; an item that does not exist says so instead of blaming the network.
- **Only render what exists.** Sections whose data is absent (no description, no files, no related
  content) are omitted rather than filled with placeholders.
- **Nothing is downloaded to show metadata.** Artwork is a provider URL with a fixed aspect ratio
  and a labelled fallback; layout is reserved before it loads.

---

## Testing

- **Unit and component tests:** Vitest with React Testing Library and `jsdom`. Tests live beside the code as `*.test.ts` / `*.test.tsx`.
- **End-to-end tests:** Playwright, in `e2e/`.
- **Static analysis:** TypeScript in strict mode (plus `noUncheckedIndexedAccess`), ESLint with `jsx-a11y` and React hooks rules, Prettier.

Test selection and reporting expectations are defined in `TESTING_AND_REGRESSION_GUIDELINES.md`. Report checks as PASS, FAIL, BLOCKED, NOT RUN, or PARTIAL; never as "probably fine".

---

## Project documentation

| File                                   | Responsibility                                                        |
| -------------------------------------- | --------------------------------------------------------------------- |
| `AGENTS.md`                            | Engineering rules, coding standards, agent workflow                   |
| `APPLICATION_DESIGN_SPECIFICATION.md`  | Authoritative product requirements and acceptance criteria            |
| `DEVELOPMENT_ROADMAP.md`               | Authoritative delivery order, phase checklists, and phase status      |
| `TESTING_AND_REGRESSION_GUIDELINES.md` | Testing strategy and regression prevention                            |
| `mnemosync.md`                         | Engineering notebook: current status, decisions, verification results |

`AGENTS.md`, `APPLICATION_DESIGN_SPECIFICATION.md`, `DEVELOPMENT_ROADMAP.md`, and `TESTING_AND_REGRESSION_GUIDELINES.md` are authoritative. Read `AGENTS.md` before making meaningful changes. Update `mnemosync.md` when you change implementation status, make an architectural decision, or run verification.

---

## Conventions

- React function components and hooks; TypeScript strict mode; no `any`.
- Provider-specific logic belongs in provider adapters, never in shared components.
- Content identity is `providerId:itemId`; item ids are not globally unique.
- Likes and favorites are separate concepts.
- Untrusted provider content is never executed, evaluated, or trusted by extension.
