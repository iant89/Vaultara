# TESTING_AND_REGRESSION_GUIDELINES.md — Vaultara

## 1. Purpose

This document defines the testing strategy, regression prevention rules, verification procedures, and quality standards for Vaultara.

Vaultara is a React and TypeScript application that integrates multiple digital content providers, supports cross-provider discovery, manages user preferences, and renders content through specialized viewers.

Because features share application state, provider interfaces, content models, routing, persistence, and viewer infrastructure, a seemingly small change can cause regressions across unrelated parts of the application.

These guidelines establish a consistent process for detecting defects before they reach users and ensuring that future development does not break previously working functionality.

All developers and AI coding agents MUST follow these guidelines when implementing features, fixing bugs, refactoring code, modifying integrations, or changing application architecture.

---

## 2. Relationship to Other Project Documents

The following files define complementary responsibilities.

| File | Responsibility |
|---|---|
| `AGENTS.md` | Mandatory engineering rules, coding standards, and development workflow |
| `APPLICATION_DESIGN_SPECIFICATION.md` | Authoritative product requirements, architecture, features, workflows, and acceptance criteria |
| `DEVELOPMENT_ROADMAP.md` | Authoritative delivery sequence, phase task checklists, implementation priorities, and phase-level completion criteria |
| `TESTING_AND_REGRESSION_GUIDELINES.md` | Testing strategy, regression prevention, verification procedures, and release quality gates |
| `mnemosync.md` | Persistent engineering notebook containing current implementation status, discoveries, test results, known issues, and session handoffs |
| `README.md` | Project overview, installation, configuration, and developer onboarding |

### 2.1 Requirement Precedence

Testing must verify the intended behavior defined in `APPLICATION_DESIGN_SPECIFICATION.md`.

If a test contradicts the approved design specification:

1. Determine whether the test or implementation is incorrect.
2. Verify the intended behavior against the specification.
3. Correct the test or implementation as appropriate.
4. Update the specification only when an approved product requirement changes.

Do not modify a correct test simply to make an incorrect implementation pass.

### 2.2 Mandatory Reading

Before performing meaningful testing or regression-sensitive changes, review:

- `AGENTS.md`
- `APPLICATION_DESIGN_SPECIFICATION.md`
- `DEVELOPMENT_ROADMAP.md`
- `TESTING_AND_REGRESSION_GUIDELINES.md`
- `mnemosync.md`

Inspect the existing repository, test framework, package scripts, and current Git status before deciding which commands to execute.

---

## 3. Core Testing Principles

### 3.1 Test Observable Behavior

Tests should verify externally observable behavior rather than relying unnecessarily on internal implementation details.

Prefer assertions such as:

- Search results contain the expected items.
- A favorite remains favorited after navigation or reload.
- An unavailable provider does not prevent other providers from returning results.
- A viewer displays an appropriate error for unsupported content.
- A collection page does not mark every item as explored.

Avoid tests that pass only because a specific private function, internal variable, or component hierarchy happens to exist.

Implementation details may be tested when they represent important architectural contracts or security boundaries.

### 3.2 Prevent Regressions by Default

Every bug fix should include a regression test when practical.

The test must reproduce the original failure and demonstrate that the corrected implementation behaves as expected.

For example, if opening a collection incorrectly marks every item as explored:

1. Create a collection containing multiple unexplored items.
2. Open the collection.
3. Verify that none of the items becomes explored merely because the collection was opened.
4. Open an individual item using the intended exploration action.
5. Verify that only the appropriate item becomes explored.

Do not consider a bug permanently fixed merely because it no longer appears during manual testing.

### 3.3 Isolate Failures

A test failure must be investigated rather than automatically attributed to the most recent change.

Determine whether the cause is:

- A regression introduced by the current change
- A pre-existing defect
- An incorrect test expectation
- A test environment problem
- A dependency or browser compatibility issue
- An external provider failure
- A flaky or nondeterministic test

Record unresolved failures and their likely causes in `mnemosync.md`.

### 3.4 Test Failure Paths

Happy-path tests are insufficient for an application that depends on external providers and untrusted content.

Test network errors, invalid responses, unavailable resources, missing metadata, unsupported file formats, expired access, and interrupted operations.

### 3.5 Make Tests Deterministic

- Avoid arbitrary timeouts when explicit synchronization is available.
- Avoid depending on uncontrolled external services in ordinary unit tests.
- Use controlled clocks for time-dependent behavior.
- Use deterministic fixtures for provider responses.
- Reset persistent state between tests where appropriate.
- Avoid relying on test execution order.
- Do not use production user data as test fixtures.
- Avoid flaky tests that depend on network timing or third-party service availability.

---

## 4. Testing Layers

Use multiple layers of testing. Each layer catches different categories of defects.

### 4.1 Static Analysis

Static analysis should detect issues before application execution.

Applicable checks include:

- TypeScript type checking
- ESLint or the project's configured linter
- Formatting checks, if configured
- Dependency and security checks, where available

Verify the actual commands in `package.json`. Do not assume that a particular script or tool is installed.

Static analysis does not replace runtime testing.

### 4.2 Unit Tests

Unit tests verify isolated functions, hooks, utilities, state transitions, and services.

Examples:

- Canonical content identity generation
- Content type normalization
- Search result filtering
- Exploration-state transitions
- Favorite and like state handling
- Provider capability detection
- Viewer selection
- Download eligibility decisions
- URL validation
- Pagination calculations
- Error normalization

Unit tests should generally be fast and deterministic.

### 4.3 Component Tests

Component tests verify that UI components render and respond correctly.

Examples:

- Search input behavior
- Content card navigation
- Favorite buttons
- Category rows
- Collection item lists
- Viewer controls
- Dialogs and menus
- Loading indicators
- Error and empty states
- Keyboard interaction
- Accessible names and labels

Test important interactions rather than merely checking that a component renders without throwing an exception.

### 4.4 Integration Tests

Integration tests verify interactions between application subsystems.

Examples:

- Provider adapter to content normalization
- Search coordinator to multiple provider adapters
- Favorites to persistence
- Exploration history to discovery filtering
- Content metadata to viewer selection
- Download eligibility to download handling
- Routing to content loading
- Local state restoration after application initialization

These tests are particularly important when a change modifies shared interfaces.

### 4.5 End-to-End Tests

End-to-end tests verify complete user workflows in a real browser.

Examples:

1. Open Vaultara.
2. Search for content.
3. Open a result.
4. View its details.
5. Add it to favorites.
6. Navigate to the favorites page.
7. Confirm the item appears.
8. Reload the application.
9. Confirm the favorite remains present when persistence is expected.

Additional workflows should cover onboarding, provider browsing, downloads, supported viewers, settings, and history according to the implemented product scope.

Use the project's existing end-to-end framework if one is configured. Do not add a new framework without a clear justification.

### 4.6 Manual Testing

Manual testing is required when automated tests cannot adequately validate a behavior.

Examples include:

- iOS Safari compatibility
- Touch gestures
- Full-screen and browser integration behavior
- Video or audio playback under realistic conditions
- Complex responsive layouts
- Emulator input behavior
- Browser-specific file access limitations
- Visual presentation and accessibility with assistive technology

Document the environment and the specific behavior tested.

---

## 5. Repository and Environment Preparation

Before testing a change:

1. Inspect the current Git status.
2. Preserve unrelated user changes.
3. Identify the affected source files and dependencies.
4. Inspect `package.json` for available scripts.
5. Inspect relevant test configuration and fixtures.
6. Determine whether environment variables or external services are required.
7. Review existing failures when baseline information is available.
8. Identify the expected behavior from the design specification.

### 5.1 Establishing a Baseline

For significant changes, run relevant existing checks before implementation when practical.

Record pre-existing failures so they are not mistakenly attributed to the new change.

If a baseline cannot be established, state that limitation.

### 5.2 Test Environment Isolation

- Keep test data separate from production data.
- Do not use real user credentials in automated tests.
- Do not run destructive tests against production services.
- Use mocks, fixtures, or dedicated test accounts where appropriate.
- Prevent tests from accidentally deleting user files or persistent application data.
- Use isolated browser contexts for end-to-end tests when practical.

---

## 6. Test Selection and Impact Analysis

Do not run only the tests closest to the modified file when the change can affect shared behavior.

Determine the likely impact of a change by examining:

- Direct imports and dependencies
- Reverse dependencies and consumers
- Shared interfaces and data models
- Routing and navigation
- Persistent state
- Provider and viewer contracts
- Browser APIs
- Build and runtime configuration
- Security boundaries

### 6.1 Change Impact Categories

Classify changes by risk.

| Risk | Examples | Expected Verification |
|---|---|---|
| LOW | Isolated copy change, nonfunctional styling adjustment | Relevant component checks and applicable static analysis |
| MEDIUM | Component behavior, local state, isolated utility, individual viewer | Unit and component tests, plus affected integration tests |
| HIGH | Shared state, routing, provider interfaces, persistence, viewer registry | Relevant unit, component, integration, and regression suites |
| CRITICAL | Authentication, untrusted-content execution, download security, major data migration, application-wide architecture | Broad regression coverage, security-focused tests, integration and end-to-end verification, explicit release review |

These classifications are guidance, not substitutes for engineering judgment.

A visually small change can be HIGH or CRITICAL if it modifies a shared contract or security boundary.

### 6.2 Dependency-Aware Testing

For each change:

1. Identify modified files.
2. Identify the direct dependencies affected.
3. Identify important consumers of the modified interfaces.
4. Identify user workflows that rely on those consumers.
5. Select tests covering those workflows.
6. Run broader tests when impact cannot be bounded confidently.

If the repository has a dependency-aware test selection system, use it according to its documented rules.

Do not claim complete regression coverage when only a narrow test subset was executed.

---

## 7. Core Regression Test Matrix

The following matrix defines important application behaviors that must remain correct as Vaultara evolves.

Only mark a test as implemented after confirming that the corresponding automated or documented manual test actually exists.

| Area | Required Regression Behavior |
|---|---|
| Application startup | Application initializes without an unrecoverable error when optional providers are unavailable |
| Routing | Supported routes render the correct page or a useful not-found state |
| Search | Results from one provider remain available when another provider fails |
| Search | A stale response does not overwrite results for a newer query |
| Content identity | Identical provider item IDs from different providers remain distinct |
| Content normalization | Missing optional metadata does not crash shared UI components |
| Collections | Opening a collection does not mark all contained items as explored |
| Exploration history | Only the intended item-level action updates exploration state |
| Discovery | Ordinary feed filtering does not unintentionally suppress explicit search results |
| Favorites | Favorites remain consistent across providers and application pages |
| Likes | Likes remain separate from favorites |
| Persistence | Persisted state restores correctly when the application reloads |
| Onboarding | Selected categories and preferences are applied according to the specification |
| Provider adapters | Malformed or unavailable provider responses produce controlled failures |
| Pagination | Loading subsequent pages does not duplicate or silently omit results |
| Viewer selection | Supported content types select an appropriate viewer |
| Viewer fallback | Unsupported formats produce a useful fallback instead of a blank or crashed page |
| Viewer lifecycle | Unmounting a viewer cleans up listeners, playback resources, and subscriptions |
| PDF viewer | Supported documents load and relevant navigation controls work |
| Book reader | Supported books open and preserve required reading state |
| Audio/video | Playback controls reflect actual media state and errors are handled |
| Game Boy emulator | Invalid or unsupported ROMs fail safely without crashing the application |
| Web archives | Untrusted archived content cannot access privileged application functionality |
| Downloads | Unavailable or disallowed downloads are not presented as successful |
| Downloads | Browser security restrictions are handled without bypass attempts |
| Accessibility | Important controls remain keyboard accessible |
| Responsive UI | Essential workflows remain usable on mobile and desktop |
| Error handling | Recoverable failures expose a useful recovery path |
| Security | External content cannot execute arbitrary code with application privileges |

The exact test inventory must evolve with the approved design and implemented features.

---

## 8. Provider Integration Testing

Each provider must be tested independently and as part of the shared application.

### 8.1 Adapter Contract Tests

Every provider adapter should be tested against the common provider contract.

Where applicable, verify:

- Provider identification
- Supported capabilities
- Search behavior
- Browse behavior
- Item retrieval
- Collection retrieval
- Pagination
- Metadata normalization
- File listing
- Download eligibility
- Error normalization
- Cancellation and timeout behavior

Provider-specific tests may be required for functionality that cannot be represented by the shared contract.

### 8.2 Fixture-Based Testing

Use representative provider-response fixtures for:

- Typical results
- Empty results
- Missing fields
- Unexpected data types
- Malformed responses
- Large result sets
- Duplicate items
- Invalid file metadata
- Authentication or access failures
- Rate limiting
- Server errors

Fixtures must reflect realistic provider responses.

Update fixtures when provider APIs change, but do not change fixtures merely to conceal a regression.

### 8.3 Partial Failure Isolation

Simulate a scenario in which one provider succeeds and another fails.

Verify that:

- Successful results are retained.
- The failed provider's error is isolated.
- Loading indicators eventually resolve.
- The interface accurately communicates partial failure where appropriate.
- Retrying the failed provider does not erase valid results from successful providers.

### 8.4 External API Testing

Ordinary automated tests should not depend on live external APIs unless the test is explicitly an integration or smoke test.

Live tests must:

- Be clearly identified.
- Handle rate limits.
- Avoid destructive operations.
- Avoid relying on unstable result ordering.
- Use only permitted endpoints and content.
- Record external service failures separately from application regressions.

---

## 9. State, Persistence, and Data Integrity

State-related regressions can affect multiple screens simultaneously.

### 9.1 Favorites and Likes

Verify that:

- Adding an item updates the relevant UI.
- Removing an item updates the relevant UI.
- The same canonical item is consistent across relevant pages.
- Different providers with colliding item IDs remain distinct.
- Favorites and likes do not overwrite one another.
- Persistence survives reloads when expected.
- Failed persistence operations do not falsely report success.

### 9.2 Exploration History

Verify that:

- The intended item-level action records exploration.
- Merely rendering a card does not accidentally record exploration.
- Opening a collection does not mark every item as explored.
- Explicit search and collection browsing remain usable even when ordinary discovery excludes explored items.
- History records use canonical content identity.
- Duplicate actions do not create inconsistent state.

### 9.3 Persistence Failures

Simulate failures such as:

- IndexedDB unavailable
- Storage quota exceeded
- Invalid or outdated stored data
- Interrupted initialization
- Failed backend synchronization
- Conflicting updates

Verify that the application fails gracefully and does not silently corrupt existing data.

If migrations are introduced, test both successful migrations and recovery from invalid or unsupported stored versions.

### 9.4 Cross-Tab and Cross-Device State

Where synchronization is implemented, test:

- Concurrent updates
- Stale data
- Conflict resolution
- Duplicate events
- Reconnection after network loss
- Cross-tab consistency
- Cross-device consistency

Do not test or claim synchronization behavior that the application does not implement.

---

## 10. Viewer Regression Testing

Each viewer must be tested independently and through the shared viewer selection and loading system.

### 10.1 Common Viewer Checks

Verify:

- Correct viewer selection
- Valid content loading
- Invalid content handling
- Loading and error states
- Missing metadata handling
- Navigation and back behavior
- Resource cleanup on unmount
- Responsive layout
- Keyboard interaction
- Appropriate fallback behavior

### 10.2 Media-Specific Checks

**PDF and book readers**

- Open valid documents.
- Handle malformed or inaccessible documents.
- Verify navigation and reading controls.
- Verify required reading-state persistence.

**Audio and video**

- Verify playback, pause, seeking, and volume controls as supported.
- Handle unsupported codecs and inaccessible media.
- Handle loading failures and playback errors.
- Verify that media resources are released when the viewer closes.

**Image viewer**

- Handle invalid image resources.
- Preserve aspect ratio when required.
- Verify zoom and navigation behavior where supported.
- Avoid uncontrolled layout overflow.

**Web archives**

- Verify that archived pages render through the intended isolation boundary.
- Confirm that archived scripts cannot access privileged application APIs.
- Test navigation restrictions and external-link handling.
- Verify that malicious or malformed content fails safely.

**Game Boy emulator**

- Load a permitted, known-good test ROM.
- Verify supported input controls.
- Verify reset and lifecycle behavior.
- Test invalid files and unsupported ROM formats.
- Confirm that ROM data is not evaluated as application JavaScript.
- Verify cleanup of animation loops, listeners, and emulator resources.

**Software and disk images**

- Verify file metadata and download eligibility.
- Confirm that unsupported formats produce useful information.
- Ensure downloaded binaries are not executed automatically.

Do not include unauthorized commercial content in the repository's test fixtures.

---

## 11. Search, Discovery, and Pagination Regression Testing

Search and discovery share content normalization and filtering logic, making them important regression targets.

### 11.1 Search

Test:

- Empty queries
- Whitespace-only queries
- Normal queries
- Rapidly changing queries
- No results
- Partial provider failures
- Total provider failure
- Duplicate results
- Missing metadata
- Provider-specific query restrictions
- Cancellation and stale-response handling

### 11.2 Discovery Filtering

Test that:

- Categories use the intended eligibility rules.
- Explored content is filtered only where specified.
- Liked or favorited content follows the documented discovery rules.
- Explicit search results remain visible when expected.
- Explicitly opened collections retain their intended contents.
- Provider-specific restrictions do not unintentionally affect other providers.

### 11.3 Pagination and Incremental Loading

Test:

- Initial page loading
- Subsequent page loading
- End-of-results behavior
- Empty pages
- Duplicate pages or items
- Failed page requests
- Retry behavior
- Concurrent requests
- Repeated scroll or load-more events

Verify that pagination does not create duplicate cards or permanently stop after a recoverable failure.

---

## 12. Download and Browser Security Testing

Downloads and external content access must be tested against realistic browser limitations.

### 12.1 Download Verification

Verify that:

- A download is offered only when supported and permitted.
- The target URL is validated.
- Access-denied responses are handled correctly.
- CORS restrictions are not bypassed.
- Failed downloads are not marked complete.
- Unsupported browser behavior is explained.
- External provider links remain available where appropriate.

### 12.2 Security Regression Tests

Test relevant defenses against:

- Cross-site scripting (XSS)
- Malicious HTML content
- Dangerous URL schemes
- Unsafe iframe permissions
- Unauthorized parent-window access
- Unexpected content types
- Malformed file metadata
- Untrusted scripts embedded in archived content
- Accidental execution of downloaded binaries

Security tests must verify actual isolation boundaries, not merely the presence of a `sandbox` attribute or a sanitization function.

Never use real secrets or production credentials in security fixtures.

Do not weaken security controls simply to make a test pass.

---

## 13. UI, Responsive, and Accessibility Regression Testing

### 13.1 Responsive Coverage

Test representative viewport sizes for:

- Small mobile screens
- Larger mobile screens
- Tablets
- Desktop layouts

Use viewport values appropriate to the supported device range rather than relying on one arbitrary resolution.

Verify:

- Navigation remains accessible.
- Content cards do not overflow.
- Search remains usable.
- Dialogs fit the viewport.
- Viewer controls remain reachable.
- Long titles and metadata wrap or truncate appropriately.
- Essential actions are not hidden behind hover-only interactions.

### 13.2 Accessibility Coverage

Verify:

- Keyboard navigation
- Focus visibility
- Focus management in dialogs
- Accessible control names
- Form labels and validation messages
- Appropriate heading hierarchy
- Meaningful status announcements
- Color contrast
- Reduced-motion behavior
- Appropriate image alternatives

Automated accessibility tools are useful but do not replace manual keyboard and assistive-technology checks.

### 13.3 Visual Regression

Use visual regression tests when they provide meaningful value for stable, important interfaces.

Visual snapshots should:

- Use deterministic test data.
- Use controlled viewport sizes.
- Avoid unnecessary dependence on live provider images.
- Account for known rendering differences.
- Be reviewed before accepting changed baselines.

Do not automatically approve a changed screenshot merely because the test framework generated it.

---

## 14. Performance Regression Testing

Performance matters for large collections, media viewers, search results, and content-heavy interfaces.

Monitor relevant metrics and behaviors, including:

- Initial application load
- Route transitions
- Search response rendering
- Large collection rendering
- Scroll performance
- Memory usage during viewer navigation
- Resource cleanup
- Bundle size
- Media loading behavior

### 14.1 Performance Tests

Where practical:

- Use representative content volumes.
- Compare results against a known baseline.
- Repeat measurements to reduce noise.
- Record the environment and test conditions.
- Test realistic device constraints.
- Investigate meaningful regressions before accepting them.

Avoid brittle performance assertions based on a single run or an uncontrolled machine.

### 14.2 Memory and Resource Leaks

Repeatedly open and close relevant viewers to detect:

- Accumulating event listeners
- Unreleased media resources
- Unstopped timers or animation loops
- Unreleased object URLs
- Unclosed workers
- Growing in-memory caches
- Retained component references

Clean up resources when a viewer, route, or component is no longer active.

---

## 15. Browser Compatibility

Vaultara must be tested against the browsers and environments required by the design specification.

At minimum, prioritize the supported desktop browsers and mobile Safari if they are part of the target environment.

Test browser-dependent functionality such as:

- IndexedDB
- File access and downloads
- Full-screen behavior
- Media playback
- Pointer and touch events
- Keyboard input
- iframe isolation
- URL handling
- Browser history and navigation

Do not assume that behavior observed in one browser guarantees behavior in another.

Document unsupported capabilities and provide fallbacks where practical.

---

## 16. Test Data and Fixtures

Test fixtures must be safe, deterministic, and representative.

### Requirements

- Use synthetic or legally usable sample content.
- Do not commit personal information or credentials.
- Do not bundle unauthorized copyrighted ROMs or media.
- Avoid depending on external files that may disappear.
- Include fixtures for missing and malformed metadata.
- Keep fixtures small unless large-file behavior is specifically under test.
- Document special fixtures that reproduce known defects.
- Use stable identifiers and deterministic timestamps where practical.

Where a provider's terms permit sample content but restrict redistribution, retrieve it through an approved test procedure rather than committing it.

---

## 17. Flaky Test Management

A flaky test produces inconsistent results under equivalent conditions.

When a test is flaky:

1. Identify the nondeterministic dependency.
2. Reproduce the issue.
3. Replace arbitrary delays with explicit state or event synchronization.
4. Control clocks, network responses, and external dependencies.
5. Verify that parallel execution does not cause shared-state conflicts.
6. Rerun the test repeatedly when useful.
7. Record unresolved flakiness in `mnemosync.md`.

Do not repeatedly rerun a failing test until it happens to pass and then report the feature as verified.

Do not permanently disable a test without documenting the reason, impact, and replacement plan.

Quarantining a flaky test may be appropriate temporarily, but the failure must remain visible.

---

## 18. Regression Workflow for Every Change

Follow this workflow for every meaningful bug fix, feature, refactor, or dependency change.

### Step 1: Identify Expected Behavior

- Read the relevant design specification.
- Identify the intended behavior.
- Review related acceptance criteria.
- Identify existing tests and known defects.

### Step 2: Assess Impact

- List modified files.
- Identify direct dependencies and consumers.
- Identify shared state, contracts, and affected workflows.
- Assign a risk level.

### Step 3: Establish a Baseline

- Inspect the Git status.
- Run relevant existing tests when practical.
- Record pre-existing failures.
- Preserve unrelated user modifications.

### Step 4: Write or Update Tests

For bug fixes, create a regression test that reproduces the defect when practical.

For new features, test expected behavior, invalid inputs, and relevant error states.

For refactors, verify that existing externally observable behavior remains intact.

### Step 5: Implement the Change

- Make focused changes.
- Avoid unrelated modifications.
- Preserve architectural boundaries.
- Update types and interfaces as needed.
- Maintain existing security guarantees.

### Step 6: Run Targeted Tests

Run the tests that directly cover the change and its immediate dependencies.

Fix failures before proceeding when they are caused by the implementation.

### Step 7: Run Broader Regression Checks

Expand the test scope according to risk and dependency impact.

For HIGH and CRITICAL changes, do not rely exclusively on unit tests for the modified function.

### Step 8: Review the Final Diff

Check for:

- Unintended file changes
- Removed functionality
- Unhandled errors
- Unsafe type assertions
- Debug code
- Accidental secrets
- Missing cleanup
- Changed interfaces without updated consumers
- Missing tests or documentation

### Step 9: Record Results

Update `mnemosync.md` with:

- The change and its affected areas
- Tests executed
- Actual verification results
- Failures and limitations
- Outstanding work
- Next steps

### Step 10: Report Accurately

Clearly state what was changed, what was tested, and what remains unverified.

---

## 19. Test Execution and Reporting Rules

### 19.1 Discover Commands Rather Than Guessing

Inspect the project's scripts before executing commands.

Common categories include:

- Type checking
- Linting
- Unit tests
- Integration tests
- End-to-end tests
- Production builds

The actual command names and tools must come from the repository configuration.

### 19.2 Verification Status

Use clear distinctions in reports.

- **PASS:** The check was executed and passed.
- **FAIL:** The check was executed and failed.
- **BLOCKED:** The check could not be executed because of an identified blocker.
- **NOT RUN:** The check was not executed.
- **PARTIAL:** Only part of the intended verification was completed.

Do not label a blocked or unexecuted check as passed.

### 19.3 Reporting Template

Use the following template when reporting meaningful testing results:

    Testing Summary
    ---------------

    Change:
      <Short description>

    Risk:
      <LOW | MEDIUM | HIGH | CRITICAL>

    Checks Executed:
      - <Command or test suite>: PASS / FAIL / BLOCKED
      - <Command or test suite>: PASS / FAIL / BLOCKED

    Regression Coverage:
      - <Behavior verified>
      - <Behavior verified>

    Known Failures:
      - <Failure or None identified>

    Not Verified:
      - <Unverified behavior or None>

    Remaining Risks:
      - <Known risks or None identified>

    Notebook:
      - mnemosync.md updated: YES / NO

This template may be shortened for trivial changes, but meaningful limitations must remain explicit.

---

## 20. Release and Acceptance Gates

Before declaring a meaningful feature ready for release, verify the applicable gates.

### 20.1 Functional Gate

- Required behavior matches the approved design specification.
- Relevant acceptance criteria have been satisfied.
- Error and empty states behave appropriately.
- Related existing features still work.

### 20.2 Technical Gate

- Type checking passes.
- Relevant lint and test checks pass.
- The production build passes when required and available.
- No unexplained failures have been hidden or ignored.
- Dependencies and configuration remain consistent.

### 20.3 Regression Gate

- Tests cover the changed behavior.
- Important dependent workflows have been verified.
- Shared contracts and state transitions have been tested.
- Risk-appropriate regression testing has been completed.

### 20.4 Security Gate

- Relevant input validation and content isolation checks pass.
- No known critical security regression remains unresolved.
- Download and provider restrictions remain enforced.
- Untrusted content cannot obtain unauthorized application privileges.

### 20.5 Documentation Gate

- Relevant documentation is current.
- `mnemosync.md` contains the latest meaningful status and verification information.
- Known limitations and remaining tasks are documented.

### 20.6 Release Decision

A release must not be represented as fully verified when required checks have failed or have not been performed.

Any exception must be explicit, justified, and appropriately approved. Critical security defects and risks to data integrity require resolution before release.

---

## 21. Continuous Improvement

The testing strategy must evolve as Vaultara grows.

When recurring defects reveal gaps in test coverage:

1. Identify the missing protection.
2. Add or improve a regression test.
3. Update the relevant testing procedure.
4. Record the discovery in `mnemosync.md`.
5. Consider whether a shared utility, contract test, or architectural change could prevent similar defects.

Periodically review:

- Test coverage of critical workflows
- Flaky tests
- Slow test suites
- Untested provider contracts
- Viewer isolation and cleanup
- Persistence and migration reliability
- Browser compatibility
- Security-sensitive code paths
- Gaps between the design specification and actual implementation

Prioritize meaningful behavioral coverage over maximizing a numerical coverage percentage.

Code coverage is a diagnostic metric, not proof of correctness.

---

## 22. Definition of Testing Completion

Testing for a task is complete when the applicable requirements have been satisfied.

- [ ] Expected behavior was identified from the approved specification.
- [ ] The change's impact and risk were assessed.
- [ ] Relevant existing tests were reviewed.
- [ ] Regression tests were added or updated where practical.
- [ ] Targeted tests were executed.
- [ ] Broader tests were executed according to risk.
- [ ] Relevant static analysis and build checks were executed.
- [ ] Failures were investigated and accurately reported.
- [ ] No known regression was silently ignored.
- [ ] Unverified behavior and limitations were documented.
- [ ] `mnemosync.md` was updated for meaningful work.
- [ ] The final report accurately describes the verification performed.

Not every test category applies to every change. Select tests based on actual impact and risk, and clearly document any verification that could not be completed.

---

## 23. Final Directive

Testing is an essential part of implementation, not an optional step after coding.

Every meaningful change must be evaluated against the approved application design, existing behavior, affected dependencies, and relevant failure conditions.

Prevent regressions through deterministic tests, dependency-aware test selection, realistic fixtures, security-focused verification, and honest reporting.

**Never claim that a feature is correct merely because it compiles, that a bug is fixed without testing its original failure when practical, or that the application is fully verified when required checks remain unexecuted.**

The objective is to keep Vaultara reliable, secure, maintainable, and aligned with its approved design as features, providers, viewers, and development sessions accumulate.