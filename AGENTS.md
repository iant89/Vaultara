# AGENTS.md — Vaultara Engineering Instructions

## 1. Project Overview

Vaultara is a unified digital discovery and content-viewing platform built with React and TypeScript. It provides a Netflix-inspired interface for discovering, organizing, and viewing digital content from multiple independent providers.

Supported and planned content types include:

- Books, EPUBs, PDFs, and other documents
- Movies, videos, and audio
- Images, artwork, and photography
- Software, operating system images, and utilities
- Retro games and compatible ROM files
- Historical documents and web archives
- Wikipedia articles and reference material
- Additional content sources through a plugin-based provider architecture

The application emphasizes a consistent discovery experience, cross-provider search, personalized recommendations, global favorites, content history, downloads where permitted, and specialized in-browser viewers.

All development agents must follow this document when working on the repository.

---

## 2. Mandatory Engineering Rules

1. Read `AGENTS.md`, `APPLICATION_DESIGN_SPECIFICATION.md`, `DEVELOPMENT_ROADMAP.md`, `TESTING_AND_REGRESSION_GUIDELINES.md`, and `mnemosync.md` before beginning meaningful development work.
2. Inspect the existing repository before proposing or implementing architectural changes.
3. Treat the existing implementation, configuration, tests, and package scripts as authoritative regarding what currently exists and works.
4. Treat `APPLICATION_DESIGN_SPECIFICATION.md` as the authoritative reference for intended application behavior and requirements.
5. Treat `TESTING_AND_REGRESSION_GUIDELINES.md` as the authoritative reference for testing strategy, regression prevention, verification procedures, and release quality gates.
6. Preserve established architecture and coding conventions unless there is a documented reason to change them.
7. Use React and TypeScript for application development.
8. Use strict TypeScript and avoid `any`. Prefer explicit types, discriminated unions, and safe runtime validation.
9. Build reusable, maintainable components rather than duplicating functionality.
10. Keep provider-specific logic isolated from shared application functionality.
11. Do not introduce unnecessary dependencies, frameworks, build tools, or architectural complexity.
12. Do not claim that code works unless the relevant implementation has been inspected and verification has been performed.
13. Do not silently remove existing functionality to make a change easier.
14. Clearly distinguish implemented functionality from planned, partially implemented, mocked, or unverified functionality.
15. Update documentation and `mnemosync.md` when significant implementation details, architectural decisions, test results, or development state change.
16. Never overwrite useful notebook information with a short, vague status update. Preserve important historical context.
17. Protect existing user changes and avoid destructive Git operations without explicit authorization.
18. Add or update regression tests for bug fixes whenever practical.
19. Select tests according to the change's impact and risk. Do not limit testing to the modified file when shared functionality may be affected.
20. Report failed, blocked, and unexecuted checks accurately.

When requirements conflict, prioritize security, correctness, data integrity, explicit user instructions, and established project conventions. Resolve conflicts with the design specification explicitly rather than silently ignoring requirements.

---

## 3. Authoritative Application Design Specification

The root-level file `APPLICATION_DESIGN_SPECIFICATION.md` is the authoritative application design specification for Vaultara.

It defines the intended product, required features, user workflows, application architecture, user interface, data models, technical constraints, and acceptance criteria.

### 3.1 Mandatory Reading

Before implementing features, making architectural changes, or modifying significant application behavior:

1. Read `APPLICATION_DESIGN_SPECIFICATION.md`.
2. Identify the relevant requirements and acceptance criteria.
3. Inspect the existing implementation to understand what is already supported.
4. Identify gaps between the intended design and the current implementation.
5. Plan changes that satisfy the specification while preserving existing functionality.

Do not begin substantial implementation work based solely on a task description when the specification contains relevant requirements.

For small, isolated tasks, consult the relevant sections rather than rereading the entire document unnecessarily.

### 3.2 Implementation Requirements

- Use the specification as the primary reference for intended application functionality.
- Follow the documented requirements unless the user explicitly authorizes a change or a necessary technical adjustment is justified.
- Do not silently omit, simplify, or replace specified functionality.
- Do not invent requirements and attribute them to the specification.
- Check related requirements before modifying shared interfaces or application-wide behavior.
- Consider the effects of changes on other features, providers, viewers, and user workflows.
- If a requirement is ambiguous, inspect the surrounding specification and existing implementation before deciding how to proceed.
- If a requirement is technically infeasible, unsafe, outdated, or incompatible with an established constraint, document the issue and propose an appropriate alternative.
- Do not treat a planned feature as implemented simply because it appears in the specification.

### 3.3 Handling Conflicts

If the design specification, user instructions, existing implementation, and technical constraints disagree:

1. Identify the conflicting requirements.
2. Determine whether the conflict concerns intended behavior or existing implementation.
3. Follow explicit user instructions for authorized design changes.
4. Preserve security, correctness, and data integrity.
5. Explain material trade-offs and proposed changes.
6. Update the specification when the user approves a change to the intended product design.

Do not silently rewrite the product requirements to match an incomplete implementation.

### 3.4 Updating the Specification

Update `APPLICATION_DESIGN_SPECIFICATION.md` when the user approves changes to the intended product design or requirements.

Examples include:

- Adding or removing application features
- Changing core user workflows
- Introducing or removing providers
- Changing application architecture
- Revising data models or integration contracts
- Changing viewer behavior
- Modifying security requirements
- Changing acceptance criteria

Keep the specification focused on the intended application, not a chronological record of coding activity.

Do not update the specification merely to rationalize an implementation that deviates from the approved design.

### 3.5 Missing Specification

If `APPLICATION_DESIGN_SPECIFICATION.md` is missing:

1. Check the repository and available project files before assuming it does not exist.
2. Search the repository for a renamed or relocated specification if appropriate.
3. Do not fabricate an authoritative specification from incomplete context.
4. Record the missing document in `mnemosync.md`.
5. If the task depends on requirements that cannot be recovered, explain the limitation and request clarification when necessary.

### 3.6 Document Responsibilities

Keep the responsibilities of the root-level documentation files distinct:

| File | Responsibility |
|---|---|
| `AGENTS.md` | Engineering rules, coding standards, architectural constraints, and agent workflow |
| `APPLICATION_DESIGN_SPECIFICATION.md` | Authoritative product requirements, intended functionality, architecture, workflows, and acceptance criteria |
| `DEVELOPMENT_ROADMAP.md` | Authoritative delivery plan: phase sequence, task checklists, implementation priorities, and phase-level definition of done |
| `TESTING_AND_REGRESSION_GUIDELINES.md` | Testing strategy, regression prevention, verification procedures, and release quality gates |
| `mnemosync.md` | Persistent engineering notebook containing implementation status, discoveries, decisions, known issues, test results, and session handoffs |
| `README.md` | Project introduction, installation, configuration, usage, and developer onboarding |

Do not duplicate large amounts of changing implementation detail across these documents.

`DEVELOPMENT_ROADMAP.md` defines **what order** approved requirements are delivered in and
which work is complete; it does not define **what** the product must do. When the roadmap and
the specification appear to disagree about intended behavior, the specification wins and the
roadmap is corrected. Marking a roadmap task complete is a claim about implementation status,
so update the roadmap when work is actually finished rather than in anticipation of it.

---

## 4. Persistent Engineering Notebook: `mnemosync.md`

### 4.1 Purpose

The root-level file `mnemosync.md` is the project's persistent engineering notebook.

It exists to preserve useful technical context between development sessions, including sessions performed by different AI agents.

Use it as both:

- A session-to-session memory system for preserving project context.
- An engineering notepad for recording discoveries, design decisions, implementation details, problems, experiments, and next steps.

The notebook must make it possible for a future session to continue development without unnecessarily repeating repository exploration or rediscovering previously established facts.

### 4.2 Mandatory Reading

Before beginning meaningful development work:

1. Read `AGENTS.md`.
2. Read `APPLICATION_DESIGN_SPECIFICATION.md`.
3. Read `DEVELOPMENT_ROADMAP.md`.
4. Read `TESTING_AND_REGRESSION_GUIDELINES.md`.
5. Read `mnemosync.md`, if it exists.
6. Inspect the relevant source files, configuration, and tests.
7. Compare the notebook's descriptions with the current repository state.
8. Identify outstanding tasks, known issues, architectural constraints, and recent decisions.

If `mnemosync.md` does not exist, create it using the structure described below.

Do not assume notebook entries are still accurate simply because they were recorded previously. Verify important claims against the current implementation.

### 4.3 What to Record

Update `mnemosync.md` whenever meaningful engineering information is discovered or changed.

Record information such as:

- Current project status and development phase
- Application architecture and important module boundaries
- Technology stack and significant dependencies
- Repository structure and important file locations
- Development, build, test, lint, and type-check commands
- Architectural decisions and their rationale
- Features completed, in progress, planned, or blocked
- Important data models and API contracts
- Provider integrations and their limitations
- Viewer implementations and supported file formats
- Known bugs, regressions, and technical debt
- Security concerns and mitigations
- Test results and verification performed
- Failed approaches and why they failed
- Performance issues and relevant measurements
- Environment-specific problems and workarounds
- Changes made during the current session
- Remaining work and recommended next steps
- Important assumptions requiring future verification

Prefer concrete details over vague summaries.

**Weak entry:**

> Improved the viewer and fixed some bugs.

**Good entry:**

> Updated the PDF viewer to preserve the current page when the toolbar changes. Verified with the existing viewer tests. Mobile Safari behavior still requires manual testing. The viewer currently relies on the shared content-loading service; do not introduce a separate provider fetch path.

### 4.4 Notebook Maintenance Rules

- Keep information organized under meaningful headings.
- Include file paths, component names, function names, and commands when useful.
- Record why significant decisions were made, not just what was changed.
- Distinguish verified facts from assumptions and hypotheses.
- Record failed experiments when repeating them could waste future effort.
- Update outdated entries rather than allowing contradictory instructions to accumulate.
- Preserve important historical decisions when they explain current architecture.
- Avoid recording secrets, access tokens, credentials, or private user information.
- Never use the notebook as a substitute for source code, automated tests, or formal project documentation.
- Keep entries concise enough to scan while retaining the context needed to continue work.
- Do not record routine, insignificant edits unless they affect future engineering decisions.
- Keep current implementation status separate from intended requirements in `APPLICATION_DESIGN_SPECIFICATION.md`.
- Record significant testing outcomes and regression risks, including any required checks that could not be performed.

### 4.5 Session Handoff Protocol

Before finishing a meaningful development session, update `mnemosync.md` with a handoff entry.

Include the following when applicable:

1. **Objective:** What the session was intended to accomplish.
2. **Specification references:** Relevant sections of `APPLICATION_DESIGN_SPECIFICATION.md`.
3. **Changes made:** Important files, components, APIs, and behavior changed.
4. **Implementation status:** Completed, partial, blocked, or unverified.
5. **Verification:** Commands executed and whether they passed.
6. **Failures:** Tests, builds, or checks that failed, including relevant error details.
7. **Outstanding work:** Tasks that remain incomplete.
8. **Known risks:** Regressions, assumptions, limitations, or areas requiring review.
9. **Next steps:** The most useful actions for the next session.
10. **Relevant files:** Paths that the next session should inspect first.

Never report a test as passing if it was not run. If verification could not be performed, explicitly state that limitation.

### 4.6 Recommended Notebook Structure

Create and maintain the following structure in `mnemosync.md` as appropriate:

- Project Summary
- Current Development Status
- Technology Stack
- Repository Structure
- Architecture and Module Boundaries
- Development Commands
- Data Models and Contracts
- Provider Integrations
- Viewer Integrations
- Implemented Features
- Features in Progress
- Known Issues and Technical Debt
- Architecture Decisions
- Security Considerations
- Testing and Verification
- Failed Approaches and Lessons Learned
- Recent Changes
- Next Steps
- Session Handoff Log

Sections may be added, reorganized, or removed when appropriate. Preserve important information during restructuring.

---

## 5. Technology and Code Standards

### 5.1 React and TypeScript

- Use React function components and hooks.
- Use TypeScript for application logic, components, data models, and service interfaces.
- Enable and respect strict TypeScript checks.
- Avoid `any`, unsafe type assertions, and unnecessary non-null assertions.
- Use explicit types for public interfaces and shared contracts.
- Use discriminated unions for state that has distinct variants.
- Keep components focused on a clear responsibility.
- Extract reusable logic into hooks, services, utilities, or shared components when appropriate.
- Avoid unnecessary global state.
- Handle asynchronous operations, loading states, errors, and cancellation where appropriate.
- Clean up event listeners, timers, subscriptions, and other external resources.

Follow the dependency choices and architectural constraints established by the design specification and existing project configuration.

### 5.2 Component Design

Components should have clear boundaries.

Examples include:

- Application shell and navigation
- Search and filtering controls
- Content cards and collections
- Category and provider pages
- Content detail pages
- Favorites and history interfaces
- Viewer containers and viewer-specific controls
- Settings and onboarding flows

Do not place provider-specific API requests, large amounts of business logic, and presentation code into a single component.

Prefer composition over large components with many unrelated conditional branches.

### 5.3 Responsive Design

The application must work across desktop, tablet, and mobile devices.

- Design mobile layouts intentionally rather than shrinking desktop layouts.
- Support touch interaction with practical touch targets, generally around 44 × 44 CSS pixels.
- Avoid horizontal overflow.
- Ensure dialogs, menus, viewers, and navigation work on narrow screens.
- Test relevant interactions on iOS Safari.
- Respect reduced-motion preferences.
- Preserve keyboard accessibility and visible focus indicators.

### 5.4 Accessibility

Target WCAG 2.2 AA where applicable.

- Use semantic HTML.
- Provide accessible names for controls.
- Support keyboard navigation.
- Maintain sufficient color contrast.
- Associate form controls with labels.
- Provide meaningful alternative text for informative images.
- Communicate loading, success, and error states to assistive technology.
- Do not rely on color alone to communicate important information.

### 5.5 Environment Setup: `scripts/setup-deps.sh`

`scripts/setup-deps.sh` is the supported way to prepare a checkout. Run it before the first build and whenever the toolchain is in doubt:

```bash
./scripts/setup-deps.sh            # install what is missing, verify the rest
./scripts/setup-deps.sh --check    # verify only; exits non-zero if anything is missing
./scripts/setup-deps.sh --no-browser
./scripts/setup-deps.sh --browser  # fail, rather than warn, when Chromium is unavailable
```

It is idempotent and verifies rather than assumes. In order it checks:

1. **Node.js** against `engines.node` in `package.json` (the single source of truth for the required version).
2. **npm**, new enough to read the committed lockfile.
3. **npm packages**, comparing every manifest dependency against the version resolved in `package-lock.json`; drift is corrected with `npm ci`, never `npm install`, so the lockfile stays authoritative.
4. **A headless Chromium** for `npm run test:e2e`, resolved in this order: `PLAYWRIGHT_CHROMIUM`, an existing Playwright-managed browser, `npx playwright install chromium`, then a sandbox fallback extracted into `node_modules/.vaultara/chromium`.

Rules that follow from this:

- Do not document or script ad-hoc install commands instead of this script; extend the script so the check stays in one place.
- Only step 4 is needed for the end-to-end suite, so a missing browser is a warning, not a failure, unless `--browser` is passed. Type checking, linting, and unit tests must never depend on a browser being present.
- The fallback in step 4 is **not** a project dependency: it is fetched with `--no-save` because it exists only to work around environments where the Playwright CDN is unreachable. Do not add it to `package.json` or import it from application or test code. `playwright.config.ts` discovers the extracted binary; nothing else should know about it.
- Extracted binaries and their shared libraries live under `node_modules/`, so they are git-ignored. Never commit a browser binary.
- `--check` is safe to run in CI and in read-only environments: it installs nothing and exits non-zero when the environment is incomplete. An agent that finds it failing should report the environment as `BLOCKED` rather than claiming the checks passed.

### 5.6 Deployment: GitHub Pages

The application is published to GitHub Pages by `.github/workflows/deploy-pages.yml`. Pages is
served from a sub-path (`/<repository>/`), which makes the base path a correctness concern in
ordinary application code, not a deployment detail.

- Never hardcode a root-absolute URL such as `href="/favorites"` or `src="/logo.svg"`. A path
  that starts at `/` resolves to the wrong place once the app is served from a sub-path, and the
  failure appears only on the deployed site.
- Build in-app links with the path builders in `src/utils/links.ts` and render them through React
  Router's `Link`/`NavLink`, which apply the router `basename` automatically.
- Reference build-time assets through `import.meta.env.BASE_URL`, or import them so the bundler
  rewrites the URL.
- The router `basename` is derived from `import.meta.env.BASE_URL` in `src/app/App.tsx`, via
  `src/app/basePath.ts`. Do not hardcode a basename; changing `VITE_BASE_PATH` must be enough.
- Keep development on the same base as production. The dev server is intentionally served from
  `/Vaultara/` so base-path mistakes surface locally. Do not "simplify" this by developing at the
  root.
- Do not commit build output and do not create a `gh-pages` branch. The workflow uploads `dist/`
  as an artefact.
- `404.html` is generated by `postbuild` (`scripts/build-pages-404.mjs`); it is the client-side
  routing fallback. Never edit files under `dist/` by hand.
- Run `npm run build && npm run verify:pages` after any change that could affect asset URLs,
  routing, or the build output. The workflow runs the same check before publishing, so a broken
  base path fails the deployment rather than shipping.

### 5.7 Provider Integration

The provider layer is split so that adding a provider touches one file, not the application:

| Concern                | Module                         | Who changes it      |
| ---------------------- | ------------------------------ | ------------------- |
| Contract types         | `src/models/provider.ts`       | Rarely, by design   |
| Registration and state | `src/providers/registry.ts`    | Never per provider  |
| Call policy            | `src/providers/gateway.ts`     | Never per provider  |
| Reliability            | `src/providers/reliability.ts` | Never per provider  |
| Normalization          | `src/providers/normalize.ts`   | When a shape is new |
| Response validation    | `src/providers/validate.ts`    | Never per provider  |
| Composition root       | `src/providers/composition.ts` | Per provider        |
| Archive adapter        | `src/providers/archive/`       | Archive only        |

Rules for an adapter:

- Implement `ContentProvider`. Fetch and normalize only; do not import React, application state,
  routes, or other providers.
- Declare capabilities honestly. A capability that is advertised but not implemented turns into a
  broken control, which is worse than an absent feature. Unsupported capabilities never block
  registration.
- Normalize every field with `src/providers/normalize.ts` before returning it. Never return a
  provider payload directly: untrusted `javascript:` URLs, control characters, and prototype
  keys must not reach the core.
- Forward the `AbortSignal` to the transport. The gateway still enforces the timeout, but a
  request that keeps running wastes the provider's quota and the user's bandwidth.
- Throw `AppError` (or let the gateway normalize what you throw). Do not invent error shapes:
  retry, cancellation, and user-facing messaging all key off `kind`.
- Preserve provider-specific detail in `metadata` rather than discarding it, and keep the
  original `sourceUrl` for attribution.
- Never evaluate provider content as code, and never inject provider HTML. Provider text is data.

Rules for everything else:

- Application code calls providers through the gateway, never `fetch`, never an adapter object.
  A direct call skips timeouts, retries, validation, and health tracking.
- Never treat an unavailable provider as a reason to fail the whole page. Providers fail
  independently by design; surface the failure for that provider and keep the rest working.
- A provider is not "available" until its adapter exists. Until then the catalogue entry stays
  `planned` and the UI says so. `availability` describes the adapter, not the screen:
  `browsingPhase` records which phase delivers in-app browsing, so an adapter that exists without a
  browsing interface is never reported as a working one.
- Every adapter needs contract tests against recorded fixtures plus malformed-response cases.
  Network access in tests is forbidden; fixtures are the provider.
- Register adapters only in `src/providers/composition.ts`. Do not construct a `ProviderRegistry`
  anywhere else, do not import an adapter from a component, and do not add a second gateway.

The Archive adapter (Phase 4) is the reference implementation:

| Concern                       | Module                                  |
| ----------------------------- | --------------------------------------- |
| HTTP and status translation   | `src/providers/archive/api.ts`          |
| Raw response shapes           | `src/providers/archive/types.ts`        |
| Mediatype and format taxonomy | `src/providers/archive/taxonomy.ts`     |
| Query construction            | `src/providers/archive/query.ts`        |
| Payload mapping               | `src/providers/archive/map.ts`          |
| Browsable categories          | `src/providers/archive/catalog.ts`      |
| Contract implementation       | `src/providers/archive/adapter.ts`      |
| Test payloads and stubs       | `src/providers/archive/fixtures.ts`     |

Two habits from that adapter are worth copying:

- Separate transport, mapping, and contract code. Mapping is pure, so it is tested without a
  network or a clock; the adapter then only sequences calls.
- Treat "absent" and "wrong type" as the same input. `unknown` in, model out, and an unusable
  optional field is dropped rather than defaulted to something plausible.

### 5.8 Discovery and Data Access

Pages read content through `src/data/`, never through an adapter and never through `fetch`:

| Concern                                | Module                              |
| -------------------------------------- | ----------------------------------- |
| Cached, de-duplicated reads            | `src/data/contentQueries.ts`        |
| Cache lifetime and in-flight sharing   | `src/data/requestCache.ts`          |
| Concurrency ceiling                    | `src/data/requestLimiter.ts`        |
| One request to one component           | `src/data/useAsyncValue.ts`         |
| Provider context for the tree          | `src/data/ProviderServices.tsx`     |
| Signed-in account and preferences      | `src/data/SessionContext.tsx`       |
| Local account backend (IndexedDB)      | `src/persistence/`                  |
| Onboarding category catalogue          | `src/config/onboarding.ts`          |
| Home-page row selection                | `src/personalization/discoveryRows.ts` |
| Explored-item discovery predicate      | `src/personalization/discoveryFilter.ts` |
| Favorite and like mutations            | `src/personalization/savedContent.ts`    |
| Favorites page listing                 | `src/personalization/favoriteList.ts`    |
| Searchable-provider set                | `src/personalization/searchProviders.ts` |
| Download URL safety and status copy    | `src/downloads/describe.ts`         |
| Download attempt records               | `src/downloads/record.ts`           |
| Viewer registry and selection          | `src/viewers/{registry,select,composition}.ts` |
| Shared viewer container                | `src/viewers/ViewerContainer.tsx`   |
| Recent search queries                  | `src/personalization/recentSearches.ts`  |
| Capability lookups used by the UI      | `src/data/providerCapabilities.ts`  |
| Rows, sorts, and page-size constants   | `src/config/discovery.ts`           |

Rules:

- A page never imports an adapter, constructs a registry, or calls `fetch`. `ProviderServices` wraps
  the composition root; a test wraps a subtree with its own services instead of mocking modules.
- **Cache keys include every argument that changes the result.** A key that omits one serves
  another page's data — a defect that only appears once someone paginates.
- **A key and its loader live together.** Never share a cache key through a module-level mutable
  singleton; express the shared loader as a hook that closes over `queries`. Identical arguments
  already de-duplicate, which is how the featured slot and its row share one request.
- **Every request is reachable from the URL.** Paging, sorting, filtering, in-collection search,
  and global search live in the query string; the parsers are total and fall back to defaults
  instead of throwing. Global search submits on enter, then the page reads `q`, `type`, `category`,
  `provider`, and `sort`. Requests are not fired per keystroke.
- **Failures are local; retries are real.** A row or section reports its own failure and offers a
  retry that passes `fresh: true` and bypasses the cache — re-reading a cached failure would look
  like a broken button.
- **Only render a section when its data exists** (design spec 9.3). No description, no files, or no
  related content means no section, not an empty one.
- **Never render a control that cannot work.** Favorite and like buttons appear only when the
  visitor is signed in. Unsigned surfaces omit them rather than showing a dead control. The
  favorites page asks unsigned visitors to sign in.
- **Accounts are local.** GitHub Pages cannot host a backend, so `src/persistence/` stores accounts
  in IndexedDB on this device. Passwords are PBKDF2 verifiers, never the password, and never in
  localStorage. Sign-in does not mean cross-device sync. Tests inject a memory store.
- **Downloads open the provider's URL.** `FileList` and the PDF reader use `target="_blank"` on an
  http(s) address the provider already exposed. This app does not fetch the file, does not proxy
  it, and does not record `completed`. A signed-in click writes an `opened` (or `unavailable`)
  row to IndexedDB; `/downloads` is that log. `javascript:` and other non-http(s) URLs are not
  offered. Lending/`nodownload` files stay listed with the restriction instead of a Download
  control. Pause and resume are not implemented: there is no transfer this client owns.
- **Viewers are registered, not hardcoded on the route.** `src/viewers/composition.ts` is the only
  place modules are registered. Selection scores (file, viewer) pairs; `?file=` is honoured;
  nothing specialized falls back to file details. Pages must not import an adapter or construct
  a registry except in tests.
- **Exploration filtering is one predicate.** `isHiddenFromDiscovery` hides explored-not-liked-not-
  favorited items from home-page rows only. Search results and collection pages must not call it.
  Opening a collection never marks its children explored; only an item details page or viewer start
  does.
- **Artwork is a URL with reserved space.** Fixed aspect ratios plus a labelled fallback keep the
  layout stable, and no media is fetched to render metadata (design spec 11.4).
- **Keep the layout from widening.** A grid track sized `auto` floors at its content's min-content
  width, so one long unbreakable string can push a page sideways; use `minmax(0, 1fr)` and let
  provider text wrap.
- **The PDF reader is a viewer, not a provider read.** Pages still go through `src/data/` for item
  and file metadata. Opening a PDF fetches the file's `downloadUrl` inside `src/viewers/pdf/engine.ts`
  (PDF.js). If the provider does not send CORS headers, the reader says so and leaves Download as
  the way through. Translation uses Chromium's on-device Translator API when the browser provides
  it. If that API is missing, page text is sent to MyMemory (Translated.net); there is no app
  backend or secret API key. Tests mock `fetch` and never call the live translation host.
- **Follow the provider's hierarchy instead of inventing one.** The Archive nests collections inside
  collections, and an item list must exclude `mediatype:collection` or subcollections appear as if
  they were content. Query for the containers one level down and render them as shelves of their
  items above this collection's own items. Drop any collection that still arrives in an item
  result, send collection-typed cards to the collection route, and redirect `/item/...` when the
  loaded record is a collection.
- **Detect containers from metadata, never a curated identifier list.** `is_collection` and
  `mediatype:collection` decide whether a record is a collection or an item, which is how nested
  collections are recognised without adding each identifier by hand. That classification is for
  routing (cards, `/item/...`, `/collection/...`), not for emptying a category list: extra values
  in the `collection` field are memberships, not a parent-child tree, and dropping them hid every
  live collection. The search `mediatype:collection AND collection:<id>` is the listing.
- **A collection on a browse surface is a row of its items, not a folder card.** Category pages and
  "Collections inside" show each collection as a horizontal shelf with a View all link to its page.
  The collection page remains the place to sort, filter, and ask for more. Neighbouring shelves
  fail independently.
- **Never assume a provider's tree is flat, and never assume it is deep.** Nesting is a declared
  capability (`subcollections`); a provider without it shows no "Collections inside" section and
  receives no request for one.
- **Know which paging a list needs.** A list a reader compares across pages (a category's
  collections) belongs in the URL and gets a real pager. A list a reader scans and abandons
  (a collection's items, related content) grows in place: first batch on arrival, then a "View
  more" control that appends one page per activation. Never auto-load on scroll, never truncate
  silently, and never let an append failure replace the entries already on screen.
- **Say how much there is.** When the provider reports a total, show "Showing 24 of 4,210 items" so
  the reader knows what the control will reach; when it does not, say only what is known.

---

## 6. Architectural Boundaries

Vaultara must support multiple content providers without coupling the entire application to any single provider.

Maintain clear boundaries between the application core, provider integrations, viewer system, and persistence layer. Follow `APPLICATION_DESIGN_SPECIFICATION.md` for the intended architecture.

### 6.1 Application Core

Responsible for:

- Navigation and routing
- Shared application state
- Content discovery
- Search coordination
- Favorites, likes, and history
- User preferences
- Collection presentation
- Download coordination
- Viewer selection
- Shared error handling and loading states

### 6.2 Provider Integrations

Responsible for:

- Provider-specific API communication
- Provider-specific content discovery
- Translating provider data into common models
- Provider-specific metadata and capabilities
- Provider-specific collection and item retrieval
- Provider-permitted file access and downloads

### 6.3 Viewer System

Responsible for:

- Selecting an appropriate viewer
- Loading content through approved interfaces
- Rendering supported content types
- Exposing consistent viewer controls where practical
- Managing viewer lifecycle and cleanup
- Reporting loading and playback errors

### 6.4 Persistence Layer

Responsible for:

- User preferences
- Favorites and likes
- Exploration history
- Cached metadata
- Download metadata
- Account-backed synchronization when supported

Use IndexedDB or another suitable local persistence mechanism for substantial browser-side data. Use a backend when cross-device accounts, shared state, or server-side synchronization are required.

Do not imply that browser-local data automatically synchronizes across devices.

### 6.5 Canonical Content Identity

Use a stable composite identity for content across providers:

`providerId:itemId`

Do not assume item IDs are globally unique.

Use this identity consistently for favorites, likes, exploration history, caching, routing, and deduplication where appropriate.

When a provider exposes multiple representations of the same item, use explicit normalization or deduplication rules rather than silently merging potentially different content.

---

## 7. Provider Integration Rules

Providers must be independently maintainable and independently failure-tolerant.

Initial and planned providers include:

- Internet Archive
- Wikipedia
- Adult content providers
- Future providers implementing the shared provider contract

### 7.1 Requirements

- Define a common provider interface.
- Normalize provider results into shared content models.
- Preserve provider-specific metadata when needed.
- Expose supported capabilities explicitly.
- Handle pagination, rate limits, network failures, and malformed responses.
- Use request timeouts and cancellation where appropriate.
- Avoid hardcoding provider-specific behavior throughout the UI.
- Keep provider configuration separate from provider implementation.
- Do not allow one unavailable provider to break unrelated providers.
- Display useful error and empty states.
- Respect provider terms, licenses, permissions, and access restrictions.

A provider should advertise capabilities such as:

- Search
- Browse and discovery
- Collections
- Item details
- File listing
- Direct file access
- Downloads
- Streaming
- Metadata enrichment

Only advertise a capability when it is actually supported.

Never assume that a listed file can be downloaded or played directly.

---

## 8. Discovery and User-State Rules

Vaultara uses a media-discovery experience inspired by streaming platforms.

### 8.1 Discovery Interface

Support the discovery behaviors described in `APPLICATION_DESIGN_SPECIFICATION.md`, including applicable features such as:

- Personalized home-page sections
- Category-based browsing
- Horizontal content rows
- Collection cards
- Collection detail pages
- Universal content detail pages
- Provider-specific browsing
- Search results
- Favorites and history pages

Display approximately 20–30 cards per category row when enough content is available and doing so is practical. Use pagination or incremental loading for larger collections.

Do not substitute these general guidelines for more specific requirements in the application design specification.

### 8.2 Exploration History

Track when a user has explored an individual content item according to a clearly defined product rule.

In ordinary discovery feeds:

- Hide previously explored items by default where appropriate.
- Allow liked or favorited items to remain discoverable.
- Provide a way to revisit history.

Do not apply the ordinary discovery exclusion rule to explicit search results or collections that the user deliberately opens.

Opening a collection must not mark every item in that collection as explored. Only mark an item when the defined item-level exploration action occurs.

Avoid marking content as explored merely because its metadata appeared in a card, row, or search result.

### 8.3 Likes and Favorites

Likes and favorites are separate concepts.

- **Like:** A positive preference signal used for personalization.
- **Favorite:** An explicit bookmark that places an item in the user's global favorites collection.

Both must use canonical content identity and work across enabled providers.

---

## 9. Search and Download Rules

### 9.1 Search

- Search across all enabled providers when possible.
- Handle provider failures independently.
- Return available results even if one or more providers fail.
- Normalize results into a common representation.
- Support loading, partial-result, empty-result, and total-failure states.
- Prevent stale responses from overwriting newer search results.
- Debounce interactive search requests where appropriate.
- Preserve explicit user search intent even when ordinary discovery filters hide explored content.

### 9.2 Downloads

Downloads must respect provider permissions and browser security restrictions.

- Download only content the provider permits the application to retrieve.
- Check whether the provider exposes a usable file URL or download endpoint.
- Respect authentication, access restrictions, licensing, and applicable copyright requirements.
- Do not bypass DRM, borrowing restrictions, paywalls, or access controls.
- Do not assume CORS-restricted resources can be fetched by browser JavaScript.
- Explain when a download must be opened through the provider's own website.
- Handle interrupted, failed, unavailable, and unsupported downloads.
- Distinguish a download link from a file that has actually been downloaded.

This app has no download proxy (GitHub Pages cannot host one). The download action is a
browser navigation to the provider URL. History status is only `opened` or `unavailable`.
Never invent a `completed` state from `target="_blank"` or the HTML `download` attribute.

Where relevant, display source attribution, licensing information, and provider links.

---

## 10. Viewer and Execution Security

Vaultara must use a viewer registry that selects viewers based on content type, format, and provider capabilities.

Registered viewers:

- PDF viewer (book/page/grid layouts, auto scale, on-device then MyMemory translation)
- Photo gallery (JPEG, PNG, GIF, WebP: zoom, pan, fit, previous/next; current image only)
- Audio player (play/pause, seek, volume, speed, tracks, resume; waveform from decoded PCM when CORS and size allow)
- Video player (play/pause, seek, volume, speed, fullscreen, resume; WebVTT captions when present)
- Book reader (EPUB and book-like `.txt` as extracted text; typography, themes, TOC, search, focus, resume)
- Generic file details (no specialized preview; download if the provider permits)

Other viewer types remain planned:

- Wikipedia reader
- Web archive viewer
- Software information and file viewer
- Game Boy emulator for compatible ROMs

Use specialized libraries when they provide meaningful functionality, reliability, and acceptable maintenance costs.

### 10.1 Viewer Requirements

- Define a shared viewer interface.
- Keep format-specific parsing and rendering isolated.
- Handle unsupported formats gracefully.
- Validate content metadata before loading.
- Clean up resources when viewers unmount.
- Avoid downloading entire files when streaming or partial loading is available and supported.
- Provide clear error messages and fallback actions.
- Preserve navigation and relevant content state when practical.

### 10.2 Untrusted Content

Content obtained from external providers must be treated as untrusted.

- Never evaluate downloaded content as application JavaScript.
- Never execute arbitrary scripts supplied by content providers.
- Sanitize HTML before rendering it as HTML.
- Prefer text rendering over raw HTML where possible.
- Use sandboxed iframes for appropriate isolated content.
- Apply a restrictive iframe sandbox policy and grant only necessary permissions.
- Do not expose application credentials, privileged APIs, or unrestricted parent-window access to untrusted content.
- Validate external URLs and restrict dangerous URL schemes.
- Avoid unsafe DOM insertion and script injection.
- Do not trust file extensions alone to determine file types.

### 10.3 Game Boy Emulation

- Integrate a maintained emulator through an adapter.
- Keep emulator implementation details separate from shared application code.
- Do not execute ROM files as JavaScript.
- Validate supported file formats and handle invalid ROMs.
- Use an isolated execution context where appropriate and practical.
- Respect applicable copyright and licensing restrictions.
- Do not bundle unauthorized commercial ROMs.

### 10.4 Software and Operating System Images

- Treat software files, disk images, and operating system images as downloadable or inspectable content unless a specifically designed and securely isolated execution environment exists.
- Do not execute arbitrary downloaded binaries inside the application.
- Clearly distinguish file viewing, downloading, and execution capabilities.

---

## 11. Dependency Management

- Inspect existing dependencies before adding new packages.
- Prefer established, actively maintained libraries.
- Avoid adding dependencies for trivial functionality that can be implemented safely with existing tools.
- Explain the purpose of significant new dependencies.
- Check compatibility with the project's React and TypeScript versions.
- Avoid introducing multiple libraries that solve the same problem without a clear reason.
- Do not replace existing infrastructure merely because an alternative is fashionable.
- Keep dependencies and lockfiles consistent.
- Never commit secrets, credentials, or environment-specific private configuration.

When choosing a library, consider maintenance status, security, licensing, bundle size, accessibility, browser support, and integration complexity.

---

## 12. Testing and Regression Requirements

The root-level file `TESTING_AND_REGRESSION_GUIDELINES.md` defines the detailed testing and regression-prevention process.

All developers and AI coding agents must follow it when implementing features, fixing bugs, refactoring code, changing dependencies, or modifying shared interfaces.

### 12.1 Required Testing Behavior

- Determine the expected behavior from `APPLICATION_DESIGN_SPECIFICATION.md`.
- Assess the impact and risk of the proposed change.
- Inspect existing tests and available package scripts.
- Add or update tests for changed behavior where practical.
- Add regression tests for bug fixes whenever practical.
- Test relevant failure paths, not only successful operations.
- Select tests based on dependency impact rather than only the modified file.
- Run broader regression checks for changes to shared state, routing, provider contracts, persistence, viewers, or security boundaries.
- Preserve unrelated user modifications and existing test fixtures.
- Record significant verification results and unresolved failures in `mnemosync.md`.

### 12.2 Testing Layers

Use the testing layers appropriate to the change:

- Static analysis and TypeScript checks
- Unit tests
- Component tests
- Integration tests
- End-to-end tests
- Manual browser, responsive, accessibility, and security testing

Do not introduce a new testing framework without examining the existing setup and justifying the added complexity.

A browser engine for end-to-end runs is provisioned by `scripts/setup-deps.sh` (section 5.5), never by an ad-hoc install command. If no browser can be provisioned, report end-to-end checks as `BLOCKED` rather than omitting them silently, and state which behaviours therefore remain unverified.

### 12.3 Regression Prevention

- Reproduce a bug with a test before fixing it when practical.
- Verify that the test fails for the original defect and passes after the fix when the test environment permits.
- Test important consumers of modified shared interfaces.
- Verify that unrelated providers and features remain functional.
- Do not alter correct tests merely to accommodate incorrect behavior.
- Do not hide, delete, or permanently disable failing tests without documenting and justifying the change.
- Treat flaky tests as defects requiring investigation.

### 12.4 Verification Accuracy

Report test results truthfully.

Use these statuses when appropriate:

- **PASS:** The check was executed and passed.
- **FAIL:** The check was executed and failed.
- **BLOCKED:** The check could not run because of an identified blocker.
- **NOT RUN:** The check was not executed.
- **PARTIAL:** Only part of the intended verification was completed.

Never claim that a test, build, security check, or browser workflow passed unless it was actually verified.

### 12.5 Risk-Based Testing

Select verification based on the potential impact of the change.

- **LOW:** Isolated styling or copy changes with minimal behavioral impact.
- **MEDIUM:** Component behavior, local state, utilities, or an isolated viewer.
- **HIGH:** Shared state, routing, provider interfaces, persistence, or viewer registry changes.
- **CRITICAL:** Authentication, untrusted-content execution, download security, major data migrations, or application-wide architectural changes.

These classifications are guidance. Increase test coverage when dependencies, uncertainty, or potential consequences justify it.

### 12.6 Final Testing Report

For meaningful changes, report:

- What changed
- Risk level
- Tests and commands executed
- Actual results
- Regression coverage
- Known failures
- Unverified behavior
- Remaining risks

Update `mnemosync.md` with important test outcomes and actionable follow-up work.

For complete testing procedures, test matrices, provider contract tests, viewer regression checks, security tests, and release acceptance gates, follow `TESTING_AND_REGRESSION_GUIDELINES.md`.

---

## 13. Git and Change Management

- Inspect the current Git status before making changes.
- Preserve unrelated user modifications.
- Do not discard, reset, or overwrite existing work without explicit authorization.
- Keep changes focused on the requested objective.
- Avoid broad refactoring when a targeted change is sufficient.
- Do not silently modify generated files or dependency lockfiles without a reason.
- Review the final diff for unintended changes.
- Do not commit or push unless requested or explicitly authorized by the established workflow.
- Document meaningful architectural or behavioral changes.

When encountering uncommitted changes, assume they may belong to the user and protect them.

---

## 14. Documentation Requirements

Update documentation when implementation changes affect how the application is built, used, configured, tested, or extended.

Relevant documentation may include:

- `README.md`
- `AGENTS.md`
- `APPLICATION_DESIGN_SPECIFICATION.md`
- `DEVELOPMENT_ROADMAP.md`
- `TESTING_AND_REGRESSION_GUIDELINES.md`
- `mnemosync.md`
- Architecture documentation
- Provider integration guides
- Viewer integration guides
- API contracts
- Environment configuration instructions
- Testing instructions

Keep the responsibilities of these files distinct:

- **`AGENTS.md`:** Stable instructions, engineering standards, architectural constraints, and agent workflow requirements.
- **`APPLICATION_DESIGN_SPECIFICATION.md`:** Authoritative application requirements, intended functionality, architecture, and product design.
- **`DEVELOPMENT_ROADMAP.md`:** Authoritative delivery sequence, phase task checklists, implementation priorities, and phase-level completion criteria.
- **`TESTING_AND_REGRESSION_GUIDELINES.md`:** Testing procedures, regression prevention, verification standards, and release quality gates.
- **`mnemosync.md`:** Evolving engineering context, current implementation status, discoveries, decisions, issues, and session handoffs.
- **`README.md`:** Project overview, setup, usage, and general developer onboarding.

Do not duplicate large amounts of changing implementation detail across multiple documents when a single authoritative location is sufficient.

Update `DEVELOPMENT_ROADMAP.md` as phases progress: record completed work, outstanding issues, dependencies, and any approved change in scope. Do not mark a phase complete while required functionality remains unimplemented, and do not check off a task before the underlying work is done and verified.

Update `TESTING_AND_REGRESSION_GUIDELINES.md` when the approved testing strategy or regression requirements change. Record session-specific test results in `mnemosync.md` rather than continually adding execution logs to the testing guidelines.

---

## 15. Required Development Workflow

For every meaningful development task, follow this process.

### Step 1: Recover Context

- Read `AGENTS.md`.
- Read `APPLICATION_DESIGN_SPECIFICATION.md`.
- Read `DEVELOPMENT_ROADMAP.md`.
- Read `TESTING_AND_REGRESSION_GUIDELINES.md`.
- Read `mnemosync.md`.
- Inspect the current Git status.
- Identify the relevant source files, tests, and dependencies.
- Confirm the environment is prepared: `./scripts/setup-deps.sh --check` (section 5.5). If it reports a missing dependency you cannot install, record the affected checks as `BLOCKED`.

### Step 2: Understand the Requirement

- Determine the intended behavior.
- Identify the relevant design specification sections.
- Identify affected modules and interfaces.
- Review existing implementation patterns.
- Identify dependencies, risks, and edge cases.
- Determine whether the requested behavior is already implemented.
- Review related tests and known regressions.
- Clarify genuinely blocking ambiguities before making assumptions that could cause substantial rework.

### Step 3: Plan

- Choose the smallest maintainable implementation that satisfies the requirement.
- Identify required code, tests, and documentation changes.
- Preserve existing architecture unless a change is justified.
- Consider failure handling, accessibility, security, and responsive behavior.
- Assess the regression risk and identify dependent workflows.
- Identify any deviations from the design specification and resolve them explicitly.

### Step 4: Implement

- Make focused changes.
- Keep types and interfaces consistent.
- Handle errors explicitly.
- Avoid unrelated refactoring.
- Preserve existing user work.
- Follow the approved product requirements.
- Add or update regression tests where practical.

### Step 5: Verify

- Run targeted tests.
- Run broader regression tests according to risk and dependency impact.
- Run relevant type checks, linting, and build checks.
- Test failure paths and edge cases where appropriate.
- Inspect the final diff.
- Confirm that the implementation matches the requirement.
- Confirm that relevant acceptance criteria have been addressed.
- Identify anything that remains unverified.

Follow `TESTING_AND_REGRESSION_GUIDELINES.md` for detailed test selection, execution, and reporting requirements.

### Step 6: Update Documentation and Notebook

- Update `APPLICATION_DESIGN_SPECIFICATION.md` only when approved product requirements change.
- Update `TESTING_AND_REGRESSION_GUIDELINES.md` when approved testing procedures or standards change.
- Record significant implementation changes in `mnemosync.md`.
- Update current status and outstanding tasks.
- Capture important discoveries and decisions.
- Document failed checks and unresolved risks.
- Record the actual verification performed.
- Provide clear next steps for a future session.

### Step 7: Report

Provide a concise but useful summary that includes:

- What changed
- Relevant specification requirements addressed
- Important implementation decisions
- Files or modules affected
- Verification performed and its results
- Known limitations or outstanding issues
- Recommended next steps, if applicable

Be explicit about incomplete work. Never describe a proposed implementation as completed functionality or unexecuted tests as successful verification.

---

## 16. Prioritization

When choosing between competing implementation approaches, prioritize:

1. Correctness and data integrity
2. Security and privacy
3. Compliance with provider permissions and licensing
4. Conformance to approved product requirements
5. Maintainability and architectural consistency
6. Reliability and error recovery
7. Regression prevention and testability
8. Accessibility and responsive usability
9. Performance
10. Development simplicity
11. Visual polish
12. Optional enhancements

Do not sacrifice security or correctness for convenience or superficial UI improvements.

Avoid premature optimization, but do not ignore known performance bottlenecks in content-heavy interfaces.

---

## 17. Definition of Done

A task is complete only when the applicable requirements have been satisfied.

- [ ] The requested behavior has been implemented.
- [ ] Relevant requirements in `APPLICATION_DESIGN_SPECIFICATION.md` have been reviewed.
- [ ] The implementation follows existing architecture and coding standards.
- [ ] TypeScript types and interfaces are consistent.
- [ ] Relevant error and edge cases are handled.
- [ ] Security and provider restrictions have been considered.
- [ ] Regression risk and affected dependencies have been assessed.
- [ ] Relevant tests have been added or updated where practical.
- [ ] Targeted tests have been executed.
- [ ] Broader regression checks have been performed according to risk.
- [ ] Relevant static analysis and build checks have been executed.
- [ ] Verification results are accurately reported.
- [ ] No unrelated user changes have been overwritten.
- [ ] Relevant documentation has been updated.
- [ ] `mnemosync.md` has been updated with meaningful discoveries, status changes, verification results, and handoff information.
- [ ] Outstanding limitations and unverified behavior are documented.

Not every checkbox applies to every task. Any inapplicable item should be assessed according to the change's scope and risk rather than treated as a reason to skip relevant verification.

Follow `TESTING_AND_REGRESSION_GUIDELINES.md` for the detailed testing completion criteria and release gates.

---

## 18. Final Directive

Work as a careful, context-aware software engineer.

Understand the existing codebase before changing it. Read the authoritative application design specification before implementing meaningful features. Follow the testing and regression guidelines when modifying code. Make focused, type-safe, maintainable changes. Verify results rather than assuming success. Preserve user work and document important decisions.

**Always use `APPLICATION_DESIGN_SPECIFICATION.md` as the authoritative reference for intended application behavior, `DEVELOPMENT_ROADMAP.md` for the approved delivery order and phase status, `TESTING_AND_REGRESSION_GUIDELINES.md` as the authoritative reference for testing and regression prevention, and `mnemosync.md` as the persistent engineering notebook that carries technical knowledge, implementation status, discoveries, verification results, and actionable handoff notes into future development sessions.**

The objective is to ensure Vaultara remains aligned with its approved design, thoroughly tested, secure, understandable, extensible, and maintainable as development continues across multiple sessions and contributors.