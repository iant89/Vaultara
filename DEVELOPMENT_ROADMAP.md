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

- [ ] Implement provider registration.
- [ ] Prevent duplicate provider IDs.
- [ ] Implement provider lookup.
- [ ] Track provider initialization.
- [ ] Track provider health and availability.
- [ ] Implement enable and disable operations.
- [ ] Expose provider capabilities.

### 3.2 Provider Contract

- [ ] Define search operations.
- [ ] Define category operations.
- [ ] Define collection operations.
- [ ] Define item-detail operations.
- [ ] Define related-content operations.
- [ ] Define available-file operations.
- [ ] Define download URL resolution.
- [ ] Define provider error handling.

### 3.3 Data Normalization

- [ ] Normalize provider identifiers.
- [ ] Normalize item types.
- [ ] Normalize titles and descriptions.
- [ ] Normalize thumbnails.
- [ ] Normalize categories and tags.
- [ ] Normalize publication metadata.
- [ ] Preserve provider-specific metadata.
- [ ] Preserve original source URLs.

### 3.4 Reliability

- [ ] Implement request timeouts.
- [ ] Implement cancellation.
- [ ] Implement retry policies.
- [ ] Implement rate-limit handling.
- [ ] Isolate provider failures.
- [ ] Test malformed provider responses.

## Deliverable

A working provider registry and shared adapter contract
with tests and documented integration requirements.

---

# PHASE 4: ARCHIVE.ORG INTEGRATION

## Objectives

Implement the primary content provider and establish the
first complete end-to-end discovery experience.

## Tasks

### 4.1 API Integration

- [ ] Research supported Archive.org APIs.
- [ ] Implement the Archive provider adapter.
- [ ] Implement search.
- [ ] Implement category discovery.
- [ ] Implement collection retrieval.
- [ ] Implement collection-item retrieval.
- [ ] Implement item metadata retrieval.
- [ ] Implement thumbnail resolution.
- [ ] Implement available-file retrieval.
- [ ] Implement source-page links.

### 4.2 Content Normalization

- [ ] Map Archive.org metadata to shared models.
- [ ] Normalize available content types.
- [ ] Normalize file formats.
- [ ] Normalize publication metadata.
- [ ] Normalize collection information.
- [ ] Handle missing artwork.
- [ ] Handle incomplete metadata.
- [ ] Handle inaccessible resources.

### 4.3 Provider Testing

- [ ] Test search responses.
- [ ] Test collection responses.
- [ ] Test item details.
- [ ] Test pagination.
- [ ] Test missing items.
- [ ] Test rate limits.
- [ ] Test temporary provider failures.
- [ ] Verify attribution and source links.

## Deliverable

A functional Archive.org provider returning normalized,
validated data through the shared provider contract.

---

# PHASE 5: DISCOVERY EXPERIENCE

## Objectives

Build the complete Netflix-inspired discovery experience
using real Archive.org data.

## Tasks

### 5.1 Home Page

- [ ] Implement the discovery page.
- [ ] Implement category rows.
- [ ] Display 20-30 entries where available.
- [ ] Add View All entries.
- [ ] Implement featured content when available.
- [ ] Add recently added content where supported.
- [ ] Add category-based discovery.
- [ ] Add recommendation placeholders until personalization
      becomes available.

### 5.2 Collection Cards

- [ ] Display artwork.
- [ ] Display titles.
- [ ] Display provider badges.
- [ ] Display item counts where available.
- [ ] Display descriptions where appropriate.
- [ ] Implement card navigation.
- [ ] Implement favorite actions.
- [ ] Implement missing-image fallbacks.

### 5.3 Collection Pages

- [ ] Implement collection headers.
- [ ] Implement item grids.
- [ ] Implement pagination.
- [ ] Implement sorting.
- [ ] Implement filtering.
- [ ] Implement search within collections.
- [ ] Implement breadcrumbs.
- [ ] Implement related collections.

### 5.4 Item Details

- [ ] Implement item hero sections.
- [ ] Display metadata.
- [ ] Display descriptions.
- [ ] Display provider information.
- [ ] Display source attribution.
- [ ] Add available actions.
- [ ] Add available-file listings.
- [ ] Add related content.

### 5.5 Performance

- [ ] Lazy-load artwork.
- [ ] Implement request caching.
- [ ] Avoid duplicate requests.
- [ ] Prevent layout shifts.
- [ ] Test large collections.
- [ ] Verify responsive scrolling.

## Deliverable

A complete Archive.org discovery workflow:

Home -> Category -> Collection -> Item Details.

---

# PHASE 6: ACCOUNTS AND PERSISTENCE

## Objectives

Implement user accounts and persistent user-specific state.

## Tasks

### 6.1 Backend Foundation

- [ ] Select the backend technology.
- [ ] Define the backend API.
- [ ] Implement authentication.
- [ ] Implement account creation.
- [ ] Implement sign-in and sign-out.
- [ ] Implement session management.
- [ ] Implement authorization.
- [ ] Validate all user-controlled input.

### 6.2 Persistence

- [ ] Persist category preferences.
- [ ] Persist enabled providers.
- [ ] Persist favorites.
- [ ] Persist likes.
- [ ] Persist exploration history.
- [ ] Persist viewer progress.
- [ ] Implement synchronization.
- [ ] Handle conflicts and duplicate operations.

### 6.3 Client Storage

- [ ] Implement IndexedDB caching where appropriate.
- [ ] Implement cache expiration.
- [ ] Implement pending synchronization operations.
- [ ] Handle offline changes where supported.
- [ ] Avoid storing authentication secrets in ordinary
      browser storage.

### 6.4 Testing

- [ ] Test account creation.
- [ ] Test authentication failures.
- [ ] Test persistence across refreshes.
- [ ] Test account isolation.
- [ ] Test synchronization conflicts.
- [ ] Test logout and session expiration.

## Deliverable

Persistent accounts with a reliable backend-backed user
state model.

---

# PHASE 7: ONBOARDING AND PERSONALIZATION

## Objectives

Customize discovery based on user interests and exploration.

## Tasks

### 7.1 Category Selection

- [ ] Implement category-selection onboarding.
- [ ] Add category artwork.
- [ ] Add selection states.
- [ ] Support multiple selections.
- [ ] Add Select All.
- [ ] Add Clear All.
- [ ] Add Continue.
- [ ] Allow onboarding to be skipped.

### 7.2 User Preferences

- [ ] Persist category selections.
- [ ] Implement preference editing.
- [ ] Implement provider preferences.
- [ ] Implement content visibility settings.
- [ ] Implement history controls.

### 7.3 Exploration Tracking

- [ ] Track item exploration.
- [ ] Track first and last exploration timestamps.
- [ ] Track exploration count.
- [ ] Avoid marking all collection entries as explored.
- [ ] Track viewer progress where supported.

### 7.4 Discovery Filtering

- [ ] Hide previously explored items by default.
- [ ] Keep liked items eligible for rediscovery.
- [ ] Keep favorited items eligible for rediscovery.
- [ ] Preserve explicitly requested search results.
- [ ] Preserve items in explicitly browsed collections.
- [ ] Implement reset-history functionality.
- [ ] Test all filtering combinations.

## Deliverable

Personalized discovery with persistent category preferences
and correct exploration-history behavior.

---

# PHASE 8: GLOBAL FAVORITES AND LIKES

## Objectives

Implement global saved content across all providers.

## Tasks

### 8.1 Favorite State

- [ ] Implement canonical item identities.
- [ ] Implement favorite persistence.
- [ ] Implement favorite toggling.
- [ ] Implement optimistic updates.
- [ ] Implement failure rollback.
- [ ] Synchronize favorite state across components.
- [ ] Preserve snapshots when providers are unavailable.

### 8.2 Global Favorites Page

- [ ] Implement the favorites route.
- [ ] Display a unified item grid.
- [ ] Filter by provider.
- [ ] Filter by content type.
- [ ] Sort favorites.
- [ ] Search within favorites.
- [ ] Remove favorites.
- [ ] Open item details.
- [ ] Resume supported viewers.

### 8.3 Likes

- [ ] Implement like state independently of favorites.
- [ ] Add like controls where appropriate.
- [ ] Persist likes.
- [ ] Integrate likes into recommendations.
- [ ] Verify likes do not automatically create favorites.

### 8.4 Testing

- [ ] Favorite items from discovery.
- [ ] Favorite items from collections.
- [ ] Favorite items from details pages.
- [ ] Verify global consistency.
- [ ] Test unavailable provider behavior.
- [ ] Test synchronization across devices.

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

- [ ] Integrate PDF.js or equivalent.
- [ ] Implement page navigation.
- [ ] Implement zoom.
- [ ] Implement fit-to-width.
- [ ] Implement search where supported.
- [ ] Implement download.
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
- [ ] Category onboarding works.
- [ ] User preferences persist.
- [ ] Favorites work across providers.
- [ ] Likes work independently.
- [ ] Exploration tracking works.
- [ ] Discovery filtering works.
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