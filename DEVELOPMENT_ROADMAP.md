# VAULTARA
# DEVELOPMENT ROADMAP

Version: 1.0
Status: Approved
Frontend: React + TypeScript
Architecture: Modular Provider-Based Application

---

# ROADMAP OBJECTIVES

Build Vaultara incrementally, establishing a reliable
foundation before introducing additional providers and
complex content viewers.

Development priorities:

1. Establish the application architecture.
2. Build a polished discovery interface.
3. Integrate Archive.org.
4. Implement persistent user accounts and preferences.
5. Implement global favorites, likes, and exploration history.
6. Implement universal search.
7. Build the viewer registry and download system.
8. Integrate specialized content viewers.
9. Add Wikipedia and Adult providers.
10. Harden, test, optimize, and prepare for deployment.

Every phase must leave the application in a working state.

Do not implement placeholder functionality that is presented
as fully operational.

---

# PHASE 1: PROJECT FOUNDATION

## Objectives

Establish the project, development environment, architecture,
and initial application shell.

## Tasks

### 1.1 Project Setup

- [x] Create the React + TypeScript project.
- [x] Enable TypeScript strict mode.
- [x] Configure the development server.
- [x] Configure production builds.
- [x] Configure linting and formatting.
- [x] Configure unit testing.
- [x] Configure end-to-end testing.
- [x] Establish environment configuration.
- [x] Document development commands.

### 1.2 Application Structure

- [x] Create the application entry point.
- [x] Implement application routing.
- [x] Create the global layout.
- [x] Create the navigation component.
- [x] Create reusable loading states.
- [x] Create reusable empty states.
- [x] Create reusable error states.
- [x] Establish shared component conventions.

### 1.3 Shared Data Models

- [x] Define ContentItem.
- [x] Define ContentCollection.
- [x] Define ContentFile.
- [x] Define ContentCategory.
- [x] Define ContentProvider.
- [x] Define ProviderCapabilities.
- [x] Define user content state.
- [x] Define viewer progress.
- [x] Define pagination types.
- [x] Define standardized errors.

### 1.4 Quality Gates

- [x] Application builds successfully.
- [x] TypeScript checks pass.
- [x] Linter passes.
- [x] Initial unit tests pass.
- [x] Routes render correctly.
- [x] No placeholder links masquerade as working features.

## Status

**Complete (2026-10-25).**

Verified with `npm run check` (type check, lint, format check, and 117 passing unit and
component tests) and `npm run build`. See `mnemosync.md` for the full verification record.

Known limitation: end-to-end testing is configured and the specs are written, but the
Playwright browser download is blocked in the current development sandbox, so the E2E suite
has never executed. Treat it as unverified. Real-browser visual, responsive, and iOS Safari
checks are likewise not yet performed; Phase 2 should include them.

## Deliverable

A working React + TypeScript application shell with shared
models, routing, tooling, and initial tests.

Delivered as: Vite + React + TypeScript scaffold, the route table from design spec
section 22, shared layout and navigation, reusable loading/empty/error states, shared models
in `src/models/`, validated environment configuration, and the full quality-gate toolchain.

---

# PHASE 2: VISUAL DESIGN SYSTEM

## Objectives

Establish Vaultara's visual identity and reusable interface
components before implementing extensive provider logic.

## Tasks

### 2.1 Global Styling

- [x] Implement the dark visual theme.
- [x] Define colors and typography.
- [x] Define spacing and sizing conventions.
- [x] Define card and panel styling.
- [x] Define focus and hover states.
- [x] Implement reduced-motion support.

### 2.2 Navigation

- [x] Implement the Vaultara logo area.
- [x] Add Archive navigation.
- [x] Add Wikipedia navigation.
- [x] Add Adult navigation. (Registered as a provider tab, rendered only when
      `VITE_ENABLE_ADULT_PROVIDER` is enabled, per design spec 13.3. Covered by
      `src/config/providers.test.ts`.)
- [x] Add global search control.
- [x] Add favorites control.
- [x] Add account menu.
- [x] Implement responsive navigation.

### 2.3 Shared Components

- [x] Create collection cards.
- [x] Create item cards.
- [x] Create provider badges.
- [x] Create favorite buttons.
- [x] Create like buttons.
- [x] Create metadata displays.
- [x] Create responsive grids.
- [x] Create horizontal content rows.
- [x] Create dialogs and menus.
- [x] Create skeleton loading placeholders.

### 2.4 Responsive Behavior

- [x] Validate desktop layout.
- [x] Validate tablet layout.
- [x] Validate mobile layout.
- [x] Validate touch targets.
- [x] Validate keyboard navigation.
- [x] Prevent horizontal page overflow.

## Status

**Implemented and validated (2026-10-25).**

Sections 2.1 through 2.4 are implemented. Validation runs in two layers: jsdom component tests for
semantics and behaviour, and a Playwright suite driving a real Chromium build for anything that
depends on layout, media queries, or an actual keyboard.

Automated coverage:

- **Colour contrast** for every text/background and control-boundary pairing used in the system,
  computed from the real token file (`src/styles/contrast.test.ts`).
- **Touch targets**: the 44x44 CSS pixel minimum, both as a token value and as enforced by the
  shared `Button` primitive, plus a runtime measurement of the primary controls at each viewport.
- **Component semantics**: accessible names, `aria-pressed` toggles, focus return, Escape
  dismissal, live-region announcements, and the rule that a card toggle never navigates.
- **Responsive layout** at 360, 414, 768, and 1440 CSS pixels: navigation and favourites remain
  reachable, the header never clips a provider tab, and no route overflows horizontally
  (`document.scrollWidth` equals the viewport width).
- **Keyboard navigation**: the skip link moves focus to the main landmark, focus rings are
  visibly rendered, focus follows navigation without being stolen on first render, and the
  account menu closes on Escape and restores focus to its trigger.
- **Mobile search**: the collapsed control expands, accepts input, and submits.

Section 2.4 was checked off only after the rendered interface was inspected. Two defects were found
and fixed this way, neither of which any jsdom test could have caught: the provider strip clipped
its last tab behind hidden overflow at narrow widths, and the header pushed the brand mark onto an
unexpected line when the controls wrapped. The header now uses an explicit two-row grid below
48rem and the tab strip wraps instead of scrolling. Both are covered by regression tests.

Remaining limitations, stated rather than implied:

- Only Chromium is exercised. Safari, Firefox, and mobile Safari rendering are unverified.
- jsdom does not evaluate media queries (it effectively renders the desktop layout only) and has
  no `showModal`, so the native `<dialog>` path is exercised only in the browser suite.
- "Desktop, tablet, and mobile" mean the four tested widths. Intermediate widths are checked by a
  layout probe run during development, not by a committed test.

The development-only reference page at `/design-system` (registered only when
`import.meta.env.DEV`) renders every token and component for review in a real browser.

## Deliverable

A consistent, responsive visual system ready for real content.

Delivered as: an expanded token layer (colour, typography, spacing, radii, elevation, motion,
layout); a rebuilt responsive navigation with logo, provider tabs, global search, favourites, and
an account menu; shared components for item cards, collection cards, provider badges,
favourite/like toggles, metadata lists, responsive grids, horizontal content rows, dialogs,
disclosure menus, buttons, and skeleton placeholders; and a Playwright end-to-end suite that
verifies the responsive and keyboard behaviour described above.

---

# PHASE 3: PROVIDER ARCHITECTURE

## Objectives

Build the provider system before adding provider-specific
business logic throughout the application.

## Tasks

### 3.1 Provider Registry

- [x] Implement provider registration.
- [x] Prevent duplicate provider IDs.
- [x] Implement provider lookup.
- [x] Track provider initialization.
- [x] Track provider health and availability.
- [x] Implement enable and disable operations.
- [x] Expose provider capabilities.

### 3.2 Provider Contract

- [x] Define search operations.
- [x] Define category operations.
- [x] Define collection operations.
- [x] Define item-detail operations.
- [x] Define related-content operations.
- [x] Define available-file operations.
- [x] Define download URL resolution.
- [x] Define provider error handling.

### 3.3 Data Normalization

- [x] Normalize provider identifiers.
- [x] Normalize item types.
- [x] Normalize titles and descriptions.
- [x] Normalize thumbnails.
- [x] Normalize categories and tags.
- [x] Normalize publication metadata.
- [x] Preserve provider-specific metadata.
- [x] Preserve original source URLs.

### 3.4 Reliability

- [x] Implement request timeouts.
- [x] Implement cancellation.
- [x] Implement retry policies.
- [x] Implement rate-limit handling.
- [x] Isolate provider failures.
- [x] Test malformed provider responses.

## Status

**Implemented and tested (2026-10-25).**

The architecture exists and is exercised by 174 tests. **No provider adapter is implemented
yet**, so the application still fetches nothing: every content surface continues to state that
it is unimplemented. Phase 4 supplies the first adapter.

Where each responsibility lives:

| Concern                | Module                           |
| ---------------------- | -------------------------------- |
| Contract types         | `src/models/provider.ts`         |
| Registration and state | `src/providers/registry.ts`      |
| Call policy            | `src/providers/gateway.ts`       |
| Timeouts/retries       | `src/providers/reliability.ts`   |
| Payload normalization  | `src/providers/normalize.ts`     |
| Response validation    | `src/providers/validate.ts`      |

Design decisions worth knowing:

- **The registry performs no fetching, and the gateway imports no adapter.** Adding a provider
  touches neither file; it registers an object that satisfies the contract.
- **Timeouts are enforced by racing the call**, not by trusting the adapter to honour its
  `AbortSignal`. An adapter that ignores cancellation still cannot hang a caller.
- **Cancellation is never recorded as a failure.** Otherwise an impatient user could trip a
  provider's availability threshold and hide a healthy provider.
- **A failed initialization isolates only that provider.** Others initialize and serve normally.
- **Availability is a circuit, not a status.** Three consecutive failed requests (configurable)
  stop new requests until a success clears the streak; a provider's own health probe returning
  "unhealthy" is decisive rather than counted.
- **Retries are limited to transient kinds** (timeout, network, rate limit, unavailability).
  Malformed payloads are not retried, because the same bad payload would come back.
- **Only `http`/`https` URLs survive normalization.** `javascript:`, `data:`, and `file:` are
  dropped rather than sanitized.

## Deliverable

A working provider registry and shared adapter contract
with tests and documented integration requirements.

Delivered as: `ProviderRegistry` (registration, duplicate rejection, lookup, independent
initialization, health, enable/disable, capability exposure, change subscription);
`ProviderGateway` (one call policy for every operation, capability enforcement, response
validation, health recording); a reliability layer (timeouts, cancellation, jittered exponential
backoff, rate-limit hints); normalization and validation layers for untrusted provider payloads;
and integration requirements documented in `README.md` and `AGENTS.md` section 5.7.

---

# PHASE 4: ARCHIVE.ORG INTEGRATION

## Objectives

Implement the primary content provider and establish the
first complete end-to-end discovery experience.

## Tasks

### 4.1 API Integration

- [x] Research supported Archive.org APIs.
- [x] Implement the Archive provider adapter.
- [x] Implement search.
- [x] Implement category discovery.
- [x] Implement collection retrieval.
- [x] Implement collection-item retrieval.
- [x] Implement item metadata retrieval.
- [x] Implement thumbnail resolution.
- [x] Implement available-file retrieval.
- [x] Implement source-page links.

### 4.2 Content Normalization

- [x] Map Archive.org metadata to shared models.
- [x] Normalize available content types.
- [x] Normalize file formats.
- [x] Normalize publication metadata.
- [x] Normalize collection information.
- [x] Handle missing artwork.
- [x] Handle incomplete metadata.
- [x] Handle inaccessible resources.

### 4.3 Provider Testing

- [x] Test search responses.
- [x] Test collection responses.
- [x] Test item details.
- [x] Test pagination.
- [x] Test missing items.
- [x] Test rate limits.
- [x] Test temporary provider failures.
- [x] Verify attribution and source links.

## Status

**Implemented and tested (2026-10-25).** 135 tests cover the adapter and its integration with the
registry and gateway.

Roadmap Phase 5 wired the adapter to the interface: the discovery pages read through the gateway,
so the provider's data path is exercised in a browser as well as in unit tests. See Phase 5's
status for what the surfaces do with the data.

Where each responsibility lives:

| Concern                        | Module                                  |
| ------------------------------ | --------------------------------------- |
| HTTP, status translation       | `src/providers/archive/api.ts`          |
| Raw response shapes            | `src/providers/archive/types.ts`        |
| Mediatype and format taxonomy  | `src/providers/archive/taxonomy.ts`     |
| Query construction             | `src/providers/archive/query.ts`        |
| Payload → shared models        | `src/providers/archive/map.ts`          |
| Browsable categories           | `src/providers/archive/catalog.ts`      |
| The `ContentProvider` contract | `src/providers/archive/adapter.ts`      |
| Test payloads and stubs        | `src/providers/archive/fixtures.ts`     |
| Registration                   | `src/providers/composition.ts`          |

Endpoints used, all read-only:

| Operation          | Endpoint                                     |
| ------------------ | -------------------------------------------- |
| Search, counts     | `/advancedsearch.php` (`output=json`)        |
| Item metadata      | `/metadata/<identifier>`                     |
| Thumbnails         | `/services/img/<identifier>`                 |
| Downloads          | `/download/<identifier>/<file>`              |
| Source attribution | `/details/<identifier>`                      |

Design decisions worth knowing:

- **No media is ever downloaded.** Metadata and search responses only; artwork and files are URLs
  the browser resolves (design spec 11.4).
- **The 10,000-result ceiling is reported as the total.** The Archive refuses searches beyond it,
  so `total` is clamped and `hasMore` stops offering pages that cannot exist.
- **User text is escaped, and parenthesized when a filter is present.** Escaping stops a search
  term becoming a field query; the parentheses stop a typed `OR` from binding looser than the
  `AND` and slipping past a content-type filter.
- **`texts` maps to `document`, not `book`.** The Archive does not distinguish a scanned book from
  a scanned report; inferring one would make an item's type depend on which request produced it.
- **An unknown identifier is `not-found`, not an empty item.** The metadata endpoint answers `200`
  with `{}`, so absence has to be recognized rather than wait for a 404. `is_dark` items are
  treated the same way.
- **`getDownloadUrl` returns `null` instead of throwing.** That is the contract's channel for
  "nothing to offer"; restricted, private, and missing files all use it.
- **Restriction travels with each file.** `downloadAvailable`, `viewable`, and `accessStatus`
  separate a lending-library scan (metadata public, files not) from a `nodownload` item and from a
  private file, so the interface can explain rather than fail (design spec 11.3).
- **`viewable` means "the browser can present this unaided".** PDF, EPUB, and DjVu are excluded
  until a viewer exists (Phase 8), because marking them viewable would advertise functionality
  that is not there.
- **Artwork is always a URL, never a probe.** The thumbnail service answers a placeholder for
  items without a cover, so resolving missing artwork costs no request.
- **Categories are configuration.** The Archive has no category endpoint, so `catalog.ts` holds
  curated mediatype/collection lists; one identifier lookup fills in real titles and a failure
  falls back to the catalogue names rather than an empty screen.
- **Related content means sibling collections.** Personalization does not exist yet, and an item
  that is missing or withdrawn is reported as `not-found` rather than as "no related content".

**Not verified:** live archive.org behaviour — the development sandbox has no route to it, so the
fixtures are hand-written to the documented response shapes. The curated collection identifiers in
`catalog.ts` and the CORS behaviour of `advancedsearch.php` should be confirmed against the live
service when a network is available. Response caching is deliberately not the adapter's job: it
lives above the gateway in `src/data/requestCache.ts` (roadmap 5.5).

## Deliverable

A functional Archive.org provider returning normalized,
validated data through the shared provider contract.

Delivered as: an adapter implementing every contract operation the provider can support (search,
categories, collections, collection metadata, collection items, item metadata, related items,
available files, download URLs, health probe); a mapping layer covering content types, file
formats and MIME types, publication dates, collections, rights, artwork, incomplete metadata, and
inaccessible resources; a composition root that registers it with the registry behind the gateway;
and failure handling that reaches the caller as `AppError` values the reliability layer already
understands.

---

# PHASE 5: DISCOVERY EXPERIENCE

## Objectives

Build the complete Netflix-inspired discovery experience
using real Archive.org data.

## Tasks

### 5.1 Home Page

- [x] Implement the discovery page.
- [x] Implement category rows.
- [x] Display 20-30 entries where available.
- [x] Add View All entries.
- [x] Implement featured content when available.
- [x] Add recently added content where supported.
- [x] Add category-based discovery.
- [x] Add recommendation placeholders until personalization
      becomes available.

### 5.2 Collection Cards

- [x] Display artwork.
- [x] Display titles.
- [x] Display provider badges.
- [x] Display item counts where available.
- [x] Display descriptions where appropriate.
- [x] Implement card navigation.
- [x] Implement favorite actions. Signed-in visitors save from collection cards; unsigned visitors
      still see no dead control.
- [x] Implement missing-image fallbacks.

### 5.3 Collection Pages

- [x] Implement collection headers.
- [x] Implement item shelves (horizontal poster tracks with "View more").
- [x] Implement pagination.
- [x] Implement sorting.
- [x] Implement filtering.
- [x] Implement search within collections.
- [x] Implement breadcrumbs.
- [x] Implement related collections.

### 5.6 Collection Hierarchy

The Archive is a tree: a media type holds collections, a collection may hold further collections,
and items sit at the leaves. Browsing has to follow that shape rather than flattening it.

- [x] List a media type's collections from the provider (not a curated list per media type).
- [x] Discover collections nested inside a collection and show each as a row of its items.
- [x] Keep subcollections out of the item grid, since a subcollection is an item too.
- [x] Place a nested collection under the media type it descends from, from its own ancestry data.
- [x] Paginate a media type's collection shelves with numbered pages and shareable URLs.

### 5.7 Incremental Lists

- [x] Load one batch of collection items instead of a whole page of a numbered series.
- [x] Offer "View more" where more entries exist, appending one batch per activation.
- [x] Do the same for nested collections and for an item's related content.
- [x] State how much is on screen and how much there is, when the provider reports a total.
- [x] Keep the entries already shown when appending fails, and report the failure beside the control.

### 5.8 Browsing shelves

The home page already used horizontal rows. Category and collection browse now match that
shape: a collection is a shelf of posters, not a folder card.

- [x] Show each collection on a category page as a row of its items, with View all.
- [x] Show nested collections the same way on a collection page.
- [x] Keep artwork dominant on collection cards (title and count; no description on the card).
- [x] Keep category paging in the URL; six shelves per page so each row stays its own request.

### 5.4 Item Details

- [x] Implement item hero sections.
- [x] Display metadata.
- [x] Display descriptions.
- [x] Display provider information.
- [x] Display source attribution.
- [x] Add available actions.
- [x] Add available-file listings.
- [x] Add related content.

### 5.5 Performance

- [x] Lazy-load artwork.
- [x] Implement request caching.
- [x] Avoid duplicate requests.
- [x] Prevent layout shifts.
- [x] Test large collections.
- [x] Verify responsive scrolling.

## Status

**Implemented and tested (2026-10-26).** The discovery workflow runs end to end against the Internet
Archive provider: home, category, collection, and item details, with breadcrumbs, related content,
and per-file download links.

| Surface                | Behaviour                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Home                   | Featured item, six category rows of 24 cards, category grid, personalisation placeholder            |
| Provider               | That provider's categories, or an honest status for providers without an adapter                    |
| Category               | Each collection as a row of its items, numbered pages of six shelves                                |
| Collection             | Nested collections as item shelves, then items: sort, filter, search, "View more"                   |
| Item                   | Hero, description, files with download links, metadata, rights, source link, related items + more   |

Where each piece lives:

| Concern                                  | Module                                                   |
| ---------------------------------------- | -------------------------------------------------------- |
| Cached reads, de-duplication, concurrency | `src/data/contentQueries.ts`, `requestCache.ts`, `requestLimiter.ts` |
| Request to component state               | `src/data/useAsyncValue.ts`                              |
| Provider context for the tree            | `src/data/ProviderServices.tsx`                          |
| Discovery rows, sort, page size          | `src/config/discovery.ts`                                |
| URL parsing for paging/sorting/filtering | `src/utils/contentParams.ts`                             |
| Discovery components                     | `src/components/content/`                                |
| Pages                                    | `src/pages/{Home,Provider,Category,Collection,Item}Page.tsx` |

Decisions worth knowing:

- **Rows are defined by shared content type, not by provider collection.** `src/config/discovery.ts`
  says which families appear and in what order, so a second provider serving films fills the same
  row. Each row is one search request; the featured slot reuses the films row's cache entry, so
  promoting an item costs no extra request.
- **"View all" is only rendered for a category the provider actually reports.** A dead link is
  worse than a missing one.
- **Paging, sorting, filtering, and in-collection search live in the URL.** Changing anything other
  than the page returns to page one, so a narrowed view is never requested from the middle of a
  result set.
- **Filter options come from declared capabilities.** A provider that never returns audio is not
  offered an audio filter.
- **Item counts appear only where the provider reports one.** Collections carry a real count; the
  category grid omits counts rather than inventing them, because a count per card would cost one
  request per card (design spec 9.3).
- **The hierarchy is read from the index, not curated.** A media type's collections are
  `mediatype:collection AND collection:<media type>`; a collection's nested collections are the same
  query one level down; a collection's items add `-mediatype:collection` so a subcollection is not
  rendered as content. Because the Archive writes every ancestor into an item's `collection` field,
  a collection nested three levels deep still resolves to the media type it belongs to. The previous
  curated list per media type is gone — it could only ever describe six collections per branch.
- **Collections are browsable to any depth without new configuration.** A new subcollection on the
  Archive appears on its parent's page on the next load; nothing here needs editing for it.
- **A collection on a browse surface is a shelf of its items.** Category pages and "Collections
  inside" render each collection as a horizontal row with View all, matching the home page rather
  than a grid of folder cards. The collection page is still where sorting, filtering, and "View
  more" happen. Six shelves per category page keeps each row as its own request.
- **Two kinds of paging, chosen per list.** A category's collection shelves are numbered pages in the
  URL, because a reader moves between them and expects to share the view. A collection's items, its
  nested collections, and an item's related content grow in place behind "View more", because a
  reader scans them and usually stops early — and because a `?page=7` of a collection is a bookmark
  nobody wants. Both state what is on screen and what exists.
- **An append failure never costs the reader the entries already on screen.** The batch failure is
  reported beside the control, with a retry that asks for the same page again.
- **Cards omit the provider badge on single-provider surfaces** (rows, collection grids) and the
  surface itself names the provider; every hero, badge row, and detail page identifies it.
- **No favourite controls exist yet.** Phase 8 brings favourite state; until then the item page says
  so rather than showing a control that cannot save anything.
- **Failures are contained per surface.** A row that fails reports it and offers a retry while the
  rest of the page keeps working; an unknown item says "not found" rather than blaming the network.

**Verification (2026-10-26):** `npm run check` PASS (40 files, 625 tests); `npm run test:e2e` PASS
(34 tests, Chromium); `npm run build` PASS; `npm run verify:pages` PASS. Bundle: main 415.51 kB
(128.69 kB gzip), because the provider and data layer are part of the application.

**Not verified:** live archive.org behaviour (the sandbox has no route to it), real provider
artwork, Safari/Firefox/iOS, and screen-reader output. The browser tests stub the provider's JSON so
they do not depend on network access.

## Deliverable

A complete Archive.org discovery workflow:

Home -> Category -> Collection -> Item Details.

Delivered as: a cached, rate-limited query layer above the gateway; five discovery surfaces with real
navigation between them; paginated, sortable, searchable collection browsing; item pages with
available files, attribution, and related content; and per-surface failure handling that keeps the
rest of the page usable.

---

# PHASE 6: ACCOUNTS AND PERSISTENCE

## Objectives

Implement user accounts and persistent user-specific state.

## Tasks

### 6.1 Backend Foundation

- [x] Select the backend technology.
- [x] Define the backend API.
- [x] Implement authentication.
- [x] Implement account creation.
- [x] Implement sign-in and sign-out.
- [x] Implement session management.
- [x] Implement authorization.
- [x] Validate all user-controlled input.

### 6.2 Persistence

- [x] Persist category preferences.
- [x] Persist enabled providers.
- [x] Persist favorites.
- [x] Persist likes.
- [x] Persist exploration history.
- [x] Persist viewer progress.
- [x] Implement synchronization.
- [x] Handle conflicts and duplicate operations.

### 6.3 Client Storage

- [x] Implement IndexedDB caching where appropriate.
- [x] Implement cache expiration.
- [x] Implement pending synchronization operations.
- [x] Handle offline changes where supported.
- [x] Avoid storing authentication secrets in ordinary
      browser storage.

### 6.4 Testing

- [x] Test account creation.
- [x] Test authentication failures.
- [x] Test persistence across refreshes.
- [x] Test account isolation.
- [x] Test synchronization conflicts.
- [x] Test logout and session expiration.

## Status

**Implemented (2026-10-26).** GitHub Pages cannot host a server, so the account "backend" is a
documented TypeScript contract (`src/persistence/contract.ts`) implemented by a browser-local
service on IndexedDB. `VITE_API_BASE_URL` remains reserved; a remote HTTP adapter is not invented.

| Concern | Behaviour |
| --- | --- |
| Accounts | Create, sign in, sign out, session restore after refresh. Passwords stored as PBKDF2 verifiers only. |
| Isolation | Every record is keyed by `userId`. A second account cannot read the first. |
| Preferences | Category ids, disabled providers, history-tracking flag, hide-explored flag, onboarding-completed flag. Provider and category toggles in Settings are live. |
| Content state | Favorites, likes, exploration, viewer progress in one document per canonical identity. |
| Sync | Pending-operation queue, last-write-wins merge by identity/`updatedAt`, duplicate `opId` ignored. Local synchronize acknowledges the queue. |
| Cache | TTL helper over the same KV store. Expired entries are dropped. |

Honest copy: the account menu and Settings overview say the account stays on this device.

## Deliverable

Persistent accounts with a reliable backend-backed user
state model.

Delivered as: a local IndexedDB account service behind a documented API, session restore,
per-account preferences and content state, and tests for isolation, expiry, and conflicts.

---

# PHASE 7: ONBOARDING AND PERSONALIZATION

## Objectives

Customize discovery based on user interests and exploration.

## Tasks

### 7.1 Category Selection

- [x] Implement category-selection onboarding.
- [x] Add category artwork.
- [x] Add selection states.
- [x] Support multiple selections.
- [x] Add Select All.
- [x] Add Clear All.
- [x] Add Continue.
- [x] Allow onboarding to be skipped.

### 7.2 User Preferences

- [x] Persist category selections.
- [x] Implement preference editing.
- [x] Implement provider preferences.
- [ ] Implement content visibility settings. *(Adult visibility remains Phase 16.)*
- [x] Implement history controls.

### 7.3 Exploration Tracking

- [x] Track item exploration.
- [x] Track first and last exploration timestamps.
- [x] Track exploration count.
- [x] Avoid marking all collection entries as explored.
- [x] Track viewer progress where supported.

### 7.4 Discovery Filtering

- [x] Hide previously explored items by default.
- [x] Keep liked items eligible for rediscovery.
- [x] Keep favorited items eligible for rediscovery.
- [x] Preserve explicitly requested search results.
- [x] Preserve items in explicitly browsed collections.
- [x] Implement reset-history functionality.
- [x] Test all filtering combinations.

## Status

**Implemented (2026-10-26)** except Adult content-visibility settings, which stay Phase 16.

Onboarding is skippable and writes `selectedCategoryIds` plus `onboardingCompleted`. Home rows
follow that selection (empty means every family). Item details and the PDF viewer mark exploration;
opening a collection does not. Home rows hide explored-not-liked-not-favorited items when the
privacy toggle is on. Search is still Phase 9 and is not filtered. Resetting history keeps likes,
favorites, and category preferences.

Favourite **controls** shipped in Phase 8.

## Deliverable

Personalized discovery with persistent category preferences
and correct exploration-history behavior.

---

# PHASE 8: GLOBAL FAVORITES AND LIKES

## Objectives

Implement global saved content across all providers.

## Status

**Implemented (2026-10-26).** Favorites and likes persist in `UserContentState` under the
canonical identity. Toggles are optimistic inside the session write queue and roll back on
persistence failure. Unsigned visitors do not see dead controls. `/favorites` lists snapshot-first
so a downed provider still shows the saved title. Likes stay independent of favorites; they already
keep items on discovery (Phase 7) and do not create a recommendation engine here. Cross-device
sync is not offered — GitHub Pages has no backend. Adult visibility stays Phase 16. Search stays
Phase 9.

## Tasks

### 8.1 Favorite State

- [x] Implement canonical item identities.
- [x] Implement favorite persistence.
- [x] Implement favorite toggling.
- [x] Implement optimistic updates.
- [x] Implement failure rollback.
- [x] Synchronize favorite state across components.
- [x] Preserve snapshots when providers are unavailable.

### 8.2 Global Favorites Page

- [x] Implement the favorites route.
- [x] Display a unified item grid.
- [x] Filter by provider.
- [x] Filter by content type.
- [x] Sort favorites.
- [x] Search within favorites.
- [x] Remove favorites.
- [x] Open item details.
- [x] Resume supported viewers.

### 8.3 Likes

- [x] Implement like state independently of favorites.
- [x] Add like controls where appropriate.
- [x] Persist likes.
- [x] Integrate likes into recommendations.
- [x] Verify likes do not automatically create favorites.

### 8.4 Testing

- [x] Favorite items from discovery.
- [x] Favorite items from collections.
- [x] Favorite items from details pages.
- [x] Verify global consistency.
- [x] Test unavailable provider behavior.
- [ ] Test synchronization across devices. Not applicable: no remote backend.

## Deliverable

A global favorites system and separate like functionality
that operate consistently across providers.

---

# PHASE 9: GLOBAL SEARCH

## Objectives

Implement search across every enabled provider.

## Tasks

### 9.1 Search Interface

- [ ] Implement the global search field.
- [ ] Implement the expanded search interface.
- [ ] Implement search suggestions where available.
- [ ] Implement recent searches.
- [ ] Implement provider filters.
- [ ] Implement content-type filters.
- [ ] Implement category filters.

### 9.2 Search Orchestration

- [ ] Query enabled providers independently.
- [ ] Normalize search results.
- [ ] Merge results.
- [ ] Preserve provider attribution.
- [ ] Implement pagination.
- [ ] Implement sorting.
- [ ] Cancel obsolete requests.
- [ ] Debounce input.
- [ ] Handle partial provider failures.

### 9.3 Search Correctness

- [ ] Ensure explored items remain searchable.
- [ ] Ensure favorite items remain searchable.
- [ ] Ensure disabled providers are excluded.
- [ ] Test empty results.
- [ ] Test rate limits.
- [ ] Test partial failures.
- [ ] Test large result sets.

## Deliverable

A unified search system that works across enabled providers.

---

# PHASE 10: DOWNLOAD MANAGER

## Objectives

Provide reliable downloads for content and files that
providers permit users to download.

## Tasks

### 10.1 File Discovery

- [ ] Retrieve available files.
- [ ] Display file names.
- [ ] Display formats.
- [ ] Display sizes where available.
- [ ] Display access restrictions.
- [ ] Identify compatible viewers.
- [ ] Resolve download URLs.

### 10.2 Download Workflow

- [ ] Implement the download action.
- [ ] Implement file selection.
- [ ] Implement browser download handling.
- [ ] Handle cross-origin restrictions.
- [ ] Handle inaccessible files.
- [ ] Handle unsupported formats.
- [ ] Respect provider access requirements.

### 10.3 Download History

- [ ] Implement download records.
- [ ] Display item and file information.
- [ ] Track observable statuses.
- [ ] Implement retry actions where appropriate.
- [ ] Avoid claiming completion without confirmation.

### 10.4 Security

- [ ] Validate download URLs.
- [ ] Protect backend proxy endpoints.
- [ ] Prevent SSRF.
- [ ] Avoid bypassing access restrictions.
- [ ] Verify provider policies.

## Deliverable

A working download workflow with honest status reporting,
appropriate access checks, and download history.

---

# PHASE 11: VIEWER FRAMEWORK

## Objectives

Establish the viewer registry and shared viewer container
before implementing individual viewers.

## Tasks

### 11.1 Viewer Registry

- [ ] Define the viewer interface.
- [ ] Register viewers.
- [ ] Prevent duplicate registrations.
- [ ] Declare supported content types.
- [ ] Declare supported MIME types.
- [ ] Declare supported extensions.
- [ ] Declare viewer capabilities.

### 11.2 Viewer Selection

- [ ] Match files to viewers.
- [ ] Prioritize suitable formats.
- [ ] Handle multiple compatible formats.
- [ ] Allow manual format selection.
- [ ] Implement generic fallback.
- [ ] Handle initialization failures.

### 11.3 Shared Viewer Container

- [ ] Implement the viewer route.
- [ ] Implement the shared toolbar.
- [ ] Implement back navigation.
- [ ] Implement favorite action.
- [ ] Implement download action.
- [ ] Implement fullscreen where supported.
- [ ] Implement progress tracking.
- [ ] Implement viewer error handling.
- [ ] Release resources when viewers close.

## Deliverable

A working framework that can host independently developed
viewers without modifying core routing or discovery logic.

---

# PHASE 12: CORE MEDIA VIEWERS

## Objectives

Implement the most broadly useful viewers.

## Tasks

### 12.1 Image Viewer

- [ ] Display images.
- [ ] Implement zoom.
- [ ] Implement pan.
- [ ] Implement fit-to-screen.
- [ ] Implement image navigation.
- [ ] Display available metadata.
- [ ] Add download action.

### 12.2 PDF Viewer

Brought forward ahead of Phase 11 at an explicit request. Files are matched as PDFs directly;
the shared viewer registry is still absent.

- [x] Integrate PDF.js or equivalent.
- [x] Implement page navigation.
- [ ] Implement zoom.
- [x] Implement fit-to-width.
- [ ] Implement search where supported.
- [x] Implement download.
- [ ] Implement reading progress.
- [ ] Implement resume functionality.

### 12.3 Book Reader

- [ ] Support appropriate text formats.
- [ ] Support EPUB where available.
- [ ] Support PDF fallback.
- [ ] Implement typography controls.
- [ ] Implement themes.
- [ ] Implement chapter navigation.
- [ ] Implement table of contents.
- [ ] Implement reading progress.
- [ ] Implement resume functionality.

### 12.4 Audio Player

- [ ] Implement playback controls.
- [ ] Implement seek.
- [ ] Implement volume.
- [ ] Implement duration.
- [ ] Implement playback speed where supported.
- [ ] Implement track selection.
- [ ] Implement resume position.
- [ ] Implement download.

### 12.5 Video Player

- [ ] Implement playback controls.
- [ ] Implement seek.
- [ ] Implement fullscreen.
- [ ] Implement volume.
- [ ] Implement playback speed.
- [ ] Implement subtitles where available.
- [ ] Implement resume position.
- [ ] Implement download.

### 12.6 Testing

- [ ] Test supported formats.
- [ ] Test unsupported formats.
- [ ] Test large resources.
- [ ] Test mobile playback.
- [ ] Test viewer cleanup.
- [ ] Test progress persistence.

## Deliverable

Functional image, PDF, book, audio, and video viewers.

---

# PHASE 13: WIKIPEDIA PROVIDER

## Objectives

Integrate Wikipedia into the provider system and global
discovery experience.

## Tasks

### 13.1 Provider Integration

- [ ] Select supported Wikipedia API mechanisms.
- [ ] Implement article search.
- [ ] Implement article retrieval.
- [ ] Implement summaries.
- [ ] Implement thumbnails.
- [ ] Implement category mapping.
- [ ] Implement related articles where supported.
- [ ] Implement source links.
- [ ] Preserve attribution and licensing metadata.

### 13.2 Article Reader

- [ ] Implement readable article layout.
- [ ] Implement table of contents.
- [ ] Render article content safely.
- [ ] Implement internal navigation.
- [ ] Display references.
- [ ] Display images.
- [ ] Implement related articles.
- [ ] Implement favorite action.

### 13.3 Integration

- [ ] Add Wikipedia discovery rows.
- [ ] Add Wikipedia search results.
- [ ] Add Wikipedia items to global favorites.
- [ ] Track exploration.
- [ ] Test provider failure isolation.

## Deliverable

A fully integrated Wikipedia provider and article reader.

---

# PHASE 14: GAME BOY EMULATOR

## Objectives

Implement browser-based Game Boy emulation for compatible
and legally accessible ROM files.

## Tasks

### 14.1 Emulator Integration

- [ ] Select a maintained emulator implementation.
- [ ] Define an emulator adapter.
- [ ] Integrate the emulator with the viewer registry.
- [ ] Load compatible ROM files.
- [ ] Validate file formats.
- [ ] Display initialization errors.

### 14.2 Controls

- [ ] Implement keyboard controls.
- [ ] Implement mobile touch controls.
- [ ] Implement pause and resume.
- [ ] Implement fullscreen.
- [ ] Implement emulator settings.
- [ ] Support orientation changes.

### 14.3 State Management

- [ ] Implement save states where supported.
- [ ] Persist compatible emulator settings.
- [ ] Validate imported save states.
- [ ] Release emulator resources on exit.

### 14.4 Security and Rights

- [ ] Isolate emulation where supported.
- [ ] Never execute ROMs as JavaScript.
- [ ] Do not bundle unauthorized commercial ROMs.
- [ ] Respect download restrictions.
- [ ] Test invalid and oversized files.

### 14.5 Future Extensions

Design the emulator adapter to allow additional systems,
including:

- Game Boy Color.
- NES.
- Sega Master System.

These systems are future extensions, not requirements
for the initial Game Boy implementation.

## Deliverable

A working Game Boy viewer integrated with the common
viewer framework.

---

# PHASE 15: WEB ARCHIVES AND SOFTWARE

## Objectives

Support archived websites and compatible software artifacts.

## Tasks

### 15.1 Web Archive Viewer

- [ ] Identify supported replay mechanisms.
- [ ] Display archived capture dates.
- [ ] Display original URLs.
- [ ] Implement sandboxed viewing.
- [ ] Restrict access to application data.
- [ ] Handle unsupported resources.
- [ ] Provide source links.

### 15.2 Software Viewer

- [ ] Display software metadata.
- [ ] Display platform information.
- [ ] Display available files.
- [ ] Support downloads.
- [ ] Add launch action when a compatible sandbox exists.
- [ ] Prevent direct execution of arbitrary programs.

### 15.3 Testing

- [ ] Test unavailable archived resources.
- [ ] Test malicious HTML scenarios.
- [ ] Test file validation.
- [ ] Test viewer isolation.
- [ ] Test browser compatibility.

## Deliverable

Safe web archive viewing and software artifact presentation.

---

# PHASE 16: ADULT PROVIDER

## Objectives

Implement the optional Adult provider with explicit
configuration and appropriate isolation.

## Tasks

### 16.1 Provider Configuration

- [ ] Define supported source integrations.
- [ ] Implement provider registration.
- [ ] Implement enable and disable controls.
- [ ] Implement provider-specific preferences.
- [ ] Implement independent error handling.

### 16.2 Access Controls

- [ ] Implement opt-in.
- [ ] Implement applicable age assurance.
- [ ] Enforce relevant access restrictions.
- [ ] Implement content visibility controls.
- [ ] Keep Adult content out of ordinary recommendations.
- [ ] Respect visibility settings in global favorites.

### 16.3 Privacy

- [ ] Review sensitive history handling.
- [ ] Prevent unexpected content previews.
- [ ] Review search-history behavior.
- [ ] Review shared-screen visibility.
- [ ] Test disabled-provider behavior.

## Deliverable

An independently configurable Adult provider that does not
compromise the other providers or core discovery experience.

---

# PHASE 17: ADVANCED DISCOVERY

## Objectives

Improve recommendations and content exploration after
the foundational features are reliable.

## Tasks

- [ ] Implement related-item recommendations.
- [ ] Improve category relevance.
- [ ] Prioritize newly available content.
- [ ] Incorporate likes into recommendations.
- [ ] Incorporate favorites into recommendations.
- [ ] Respect exploration filters.
- [ ] Add user-defined collections.
- [ ] Add additional sorting options.
- [ ] Add optional recommendation explanations.
- [ ] Evaluate recommendation quality.

Do not require a complex machine-learning system initially.

Start with transparent, deterministic recommendation rules.

## Deliverable

An improved discovery system based on user preferences,
provider metadata, and user interaction history.

---

# PHASE 18: PERFORMANCE AND ACCESSIBILITY

## Objectives

Prepare the application for large collections and
real-world use across devices.

## Tasks

### Performance

- [ ] Profile initial loading.
- [ ] Optimize bundle sizes.
- [ ] Code-split viewers.
- [ ] Optimize thumbnail loading.
- [ ] Cache provider metadata.
- [ ] Avoid unnecessary rerenders.
- [ ] Virtualize large grids where beneficial.
- [ ] Review network request volume.
- [ ] Test low-powered devices.
- [ ] Test large collections.

### Accessibility

- [ ] Review keyboard navigation.
- [ ] Review screen-reader labels.
- [ ] Review focus management.
- [ ] Review color contrast.
- [ ] Review reduced-motion behavior.
- [ ] Review form accessibility.
- [ ] Review viewer controls.
- [ ] Test horizontal row navigation.

### Compatibility

- [ ] Test desktop browsers.
- [ ] Test mobile Safari.
- [ ] Test mobile Chrome.
- [ ] Test tablet layouts.
- [ ] Test portrait and landscape.
- [ ] Test touch interactions.

## Deliverable

A responsive, accessible, and performance-tested application.

---

# PHASE 19: SECURITY AND PRODUCTION HARDENING

## Objectives

Validate the application before production deployment.

## Tasks

### Security

- [ ] Review authentication.
- [ ] Review authorization.
- [ ] Validate provider data.
- [ ] Validate download URLs.
- [ ] Review SSRF protections.
- [ ] Review Content Security Policy.
- [ ] Review iframe sandboxing.
- [ ] Review HTML sanitization.
- [ ] Review third-party viewer isolation.
- [ ] Review credential handling.
- [ ] Review rate limiting.

### Reliability

- [ ] Test provider outages.
- [ ] Test backend outages.
- [ ] Test interrupted synchronization.
- [ ] Test stale cache behavior.
- [ ] Test malformed metadata.
- [ ] Test missing files.
- [ ] Test session expiration.
- [ ] Test recovery after network loss.

### Production Readiness

- [ ] Configure production builds.
- [ ] Configure environment variables.
- [ ] Configure error reporting.
- [ ] Configure monitoring.
- [ ] Document deployment.
- [ ] Document backups and recovery.
- [ ] Document provider integration.
- [ ] Document viewer integration.
- [ ] Verify licensing and attribution requirements.

## Deliverable

A production-ready release candidate with documented
security controls, deployment procedures, and known limitations.

---

# PHASE 20: FINAL ACCEPTANCE AND RELEASE

## Objectives

Verify that all core requirements are satisfied.

## Functional Checklist

- [ ] Netflix-style discovery works.
- [ ] Category rows display 20-30 items where available.
- [ ] View All navigation works.
- [ ] Collection browsing works.
- [ ] Item details work.
- [ ] Archive.org integration works.
- [ ] Wikipedia integration works.
- [ ] Adult provider controls work.
- [ ] Account creation works.
- [x] Category onboarding works.
- [x] User preferences persist.
- [ ] Favorites work across providers.
- [ ] Likes work independently.
- [x] Exploration tracking works.
- [x] Discovery filtering works.
- [ ] Global search works.
- [ ] Download workflows work where permitted.
- [ ] PDF viewer works.
- [ ] Book reader works.
- [ ] Image viewer works.
- [ ] Audio player works.
- [ ] Video player works.
- [ ] Game Boy emulator works with compatible ROMs.
- [ ] Web archive viewer works where supported.
- [ ] Generic fallback viewer works.
- [ ] Provider failures remain isolated.
- [ ] Mobile layouts work.
- [ ] Accessibility requirements are verified.
- [ ] Security review is complete.

## Release Criteria

The application must build successfully, pass its automated
tests, preserve user data correctly, handle provider failures,
and satisfy the documented acceptance criteria.

No feature may be marked complete solely because its UI
exists. The underlying operation must be implemented and
verified.

## Deliverable

Vaultara 1.0: a functional, responsive, multi-provider
digital archive and media discovery platform.

---

# IMPLEMENTATION PRIORITIES

Prioritize work in the following order:

1. Project foundation.
2. Visual design system.
3. Provider architecture.
4. Archive.org integration.
5. Discovery and collection browsing.
6. Accounts and persistence.
7. Personalization and exploration history.
8. Global favorites and likes.
9. Global search.
10. Download manager.
11. Viewer framework.
12. Core media viewers.
13. Wikipedia integration.
14. Game Boy emulator.
15. Web archives and software.
16. Adult provider.
17. Advanced discovery.
18. Performance and accessibility.
19. Security hardening.
20. Final acceptance and release.

The provider framework and viewer framework must be designed
for extensibility from the beginning.

Do not implement each provider or viewer as an independent
application.

All functionality must use the shared models, state
management, routing, and application services.

---

# DEFINITION OF DONE

A task is complete only when:

1. The implementation matches the requirement.
2. TypeScript checks pass.
3. Relevant automated tests pass.
4. Error and empty states are implemented.
5. Responsive behavior is verified where applicable.
6. Security and access restrictions are respected.
7. The feature integrates with existing shared interfaces.
8. Documentation is updated when necessary.
9. No unrelated functionality is broken.
10. The implementation has been tested using real data
    whenever the feature depends on a real provider.

The roadmap must be updated as implementation progresses.

Record completed work, outstanding issues, dependencies,
and changes to scope.

Do not mark an entire phase complete while required
functionality remains unimplemented.