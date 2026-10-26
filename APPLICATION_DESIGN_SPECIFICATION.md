# VAULTARA
# APPLICATION DESIGN SPECIFICATION

Version: 1.0
Status: Initial Design
Application Type: Universal Digital Archive and Media Discovery Platform
Frontend: React + TypeScript
Architecture: Modular, Provider-Based Application
Primary Provider: Internet Archive (Archive.org)
Additional Providers: Wikipedia, Adult
Primary Design Inspiration: Netflix
Target Platforms: Desktop, Tablet, Mobile

---

# 1. APPLICATION OVERVIEW

## 1.1 Purpose

Vaultara is a unified digital discovery platform for exploring,
collecting, downloading, and interacting with digital content
from multiple providers through one consistent interface.

The application combines the visual discovery experience of
Netflix with the extensive collections of Archive.org, the
knowledge resources of Wikipedia, and additional content
provided through an optional Adult provider plugin.

Vaultara is not limited to traditional media.

Supported content includes:

- Movies and video recordings.
- Music and audio recordings.
- Books, ebooks, and scanned publications.
- PDFs and historical documents.
- Photographs, artwork, and illustrations.
- Software and operating system images.
- Retro games and compatible game ROMs.
- Educational resources.
- Historical websites and web archives.
- Wikipedia articles and associated media.
- Additional content supplied by future providers.

The application must provide a unified experience regardless
of which provider supplies an item.

## 1.2 Core Objectives

1. Provide Netflix-style visual content discovery.
2. Support multiple independent content providers.
3. Organize content into categories and collections.
4. Provide universal search across enabled providers.
5. Maintain a global favorites list.
6. Personalize discovery using user preferences.
7. Track explored content and viewing progress.
8. Hide previously explored content from ordinary discovery
   unless the user has liked or favorited it.
9. Provide downloads for resources that permit downloading.
10. Select specialized viewers based on content type.
11. Support persistent accounts and cross-device synchronization.
12. Make adding providers and viewers straightforward.
13. Provide a responsive, accessible interface.
14. Respect provider policies, licensing, and access restrictions.

---

# 2. TECHNOLOGY STACK

## 2.1 Frontend

- React.
- TypeScript with strict type checking.
- React Router or equivalent routing solution.
- TanStack Query or equivalent data-fetching library.
- Lightweight global state management.
- CSS Modules, standard CSS, or a consistent component system.
- IndexedDB for appropriate client-side persistence.
- Lazy-loaded modules for specialized viewers.

Avoid unnecessary dependencies and overly complicated
frontend architecture.

The application should remain modular and maintainable.

## 2.2 Backend

A backend service is required for production account functionality.

Responsibilities include:

- Authentication and account management.
- User preferences.
- Favorites and likes.
- Exploration history.
- Viewer progress.
- Provider configuration.
- Synchronization between devices.
- Optional managed download tasks.
- Request validation and rate limiting.
- Secure management of provider credentials.

The backend should use a documented API contract.

Provider requests should be made through official APIs or
supported access mechanisms.

A backend proxy may be used when required for authentication,
CORS compatibility, caching, or request coordination.

## 2.3 Architecture Style

Use a modular architecture with clearly separated concerns.

Avoid tightly coupling the interface to Archive.org or any
other individual provider.

Provider adapters must implement shared interfaces.

Viewers must be independently registered modules.

---

# 3. APPLICATION ARCHITECTURE

The application consists of the following subsystems.

## 3.1 Application Shell

- Global navigation.
- Provider tabs.
- Search interface.
- Global favorites.
- Account menu.
- Notifications.
- Responsive layout.

## 3.2 Discovery System

- Personalized home page.
- Category rows.
- Collection browsing.
- Full category pages.
- Item discovery.
- Recommendations.
- Related content.

## 3.3 Provider Integration

- Provider registry.
- Provider lifecycle management.
- Provider adapters.
- Capability detection.
- Search orchestration.
- Error isolation.
- Provider configuration.

## 3.4 Content Management

- Favorites.
- Likes.
- Exploration history.
- Category preferences.
- Viewing progress.
- Download history.
- User-defined collections.

## 3.5 Content Presentation

- Universal item details page.
- Viewer registry.
- Viewer selection service.
- Shared viewer toolbar.
- Specialized content viewers.
- Generic file viewer.

## 3.6 Data Services

- API clients.
- Backend API.
- Client-side cache.
- Persistent user data.
- Pagination.
- Request cancellation.
- Error handling.
- Synchronization.

---

# 4. GLOBAL NAVIGATION

## 4.1 Navigation Layout

The application must have a persistent top navigation bar.

Desktop layout:

+--------------------------------------------------------------+
| VAULTARA | Archive | Wikipedia | Adult | Search | Favorites  |
|                                                   | Account  |
+--------------------------------------------------------------+

Required elements:

- Vaultara logo.
- Archive tab.
- Wikipedia tab.
- Adult tab.
- Global search.
- Global favorites.
- Account menu.

The selected provider tab must have a visible active state.

Switching providers must not reset global favorites, user
preferences, or the application's core navigation.

## 4.2 Account Menu

Include:

- Account settings.
- Content preferences.
- Viewing history.
- Downloads.
- Provider settings.
- Privacy settings.
- Content visibility settings.
- Sign out.

## 4.3 Responsive Navigation

Desktop:
- Horizontal navigation.
- Expanded search field.
- Visible favorites control.

Tablet:
- Compact spacing.
- Search field allowed to contract.

Mobile:
- Compact navigation.
- Search can expand into a dedicated interface.
- Favorites remain directly accessible.
- Secondary actions may move into an overflow menu.
- All primary controls must be touch-friendly.

Target minimum touch area: 44 x 44 CSS pixels.

Support mobile Safari without requiring hover interactions.

---

# 5. DISCOVERY HOME PAGE

## 5.1 Overview

The home page must resemble a modern streaming service.

Content is organized into vertically stacked categories.
Each category contains a horizontally scrolling row of cards.

Example:

+--------------------------------------------------------------+
| NAVIGATION                                                   |
+--------------------------------------------------------------+
| FEATURED COLLECTION                                          |
| Artwork, title, description, Explore button                  |
+--------------------------------------------------------------+
| CONTINUE EXPLORING                                           |
| [Card][Card][Card][Card][Card][Card] ... [View All]          |
+--------------------------------------------------------------+
| RECOMMENDED FOR YOU                                          |
| [Card][Card][Card][Card][Card][Card] ... [View All]          |
+--------------------------------------------------------------+
| BOOKS AND PUBLICATIONS                                       |
| [Card][Card][Card][Card][Card][Card] ... [View All]          |
+--------------------------------------------------------------+
| FILMS AND VIDEO                                              |
| [Card][Card][Card][Card][Card][Card] ... [View All]          |
+--------------------------------------------------------------+
| RETRO GAMES                                                  |
| [Card][Card][Card][Card][Card][Card] ... [View All]          |
+--------------------------------------------------------------+

The featured banner is optional.

Only display it when appropriate content exists.

## 5.2 Category Rows

Each row contains:

- Category title.
- Optional description.
- Horizontally scrollable card track.
- Left and right scroll controls where appropriate.
- Touch scrolling.
- Approximately 20-30 cards when sufficient results exist.
- A View All entry at the end.
- Loading placeholders.
- Empty and error states.

Twenty to thirty cards is a target, not a strict requirement.

Do not fabricate entries to fill a row.

Load content progressively rather than requesting every item
from every category during application startup.

## 5.3 Collection Cards

Each card may display:

- Artwork or thumbnail.
- Collection title.
- Provider name.
- Item count.
- Short description.
- Content-type indicator.
- Favorite or save action when supported.

Artwork should dominate the card.

Use consistent aspect ratios within each card family.

Provide a polished fallback when artwork is unavailable.

## 5.4 Interaction

Desktop:
- Hover reveals secondary information.
- Clicking the card opens the collection.
- Keyboard focus exposes equivalent controls.

Mobile:
- Tapping opens the collection.
- Favorite controls must not trigger card navigation.
- No essential functionality may depend on hover.

## 5.5 View All

The View All entry opens a complete category page.

Support:

- Responsive grid layout.
- Sorting.
- Filtering.
- Search within the category.
- Provider-specific filters.
- Content-type filters.
- Pagination or infinite scrolling.
- Optional list view.

---

# 6. ACCOUNT CREATION AND ONBOARDING

## 6.1 Onboarding Flow

After account creation, present a category-selection interface.

Users may skip onboarding and receive a useful default
discovery page.

## 6.2 Category Selection

Example categories:

- Books and ebooks.
- Comics.
- Films.
- Television.
- Music.
- Audiobooks.
- Podcasts.
- Historical photographs.
- Art and illustrations.
- Retro games.
- Computer software.
- Operating systems.
- Educational material.
- Science and technology.
- Historical documents.
- Web archives.
- Wikipedia knowledge.
- Additional provider categories.

Each category should include a name, representative artwork,
description, and selectable state.

Allow multiple selections.

Provide Select All, Clear All, and Continue controls.

## 6.3 Personalized Discovery

Build the home page around the user's selected categories.

Prioritize:

1. New content in selected categories.
2. Relevant collections.
3. Content from enabled providers.
4. Recommendations informed by likes and favorites.
5. Additional discoveries from subscribed categories.

Allow users to change preferences at any time.

Preference changes must not delete favorites or history.

---

# 7. EXPLORATION HISTORY AND PERSONALIZATION

## 7.1 Exploration Tracking

Record exploration when a user opens an item's details page
or begins interacting with its viewer.

Do not mark every item in a collection as explored merely
because the collection was opened.

Track:

- Provider ID.
- Item ID.
- First exploration timestamp.
- Last exploration timestamp.
- Exploration count.
- Optional viewing progress.
- Optional completion state.

## 7.2 Discovery Filtering

By default:

- Explored, not liked, not favorited:
  Hide from ordinary discovery.
- Explored and liked:
  Eligible for rediscovery.
- Explored and favorited:
  Eligible for rediscovery.
- Never explored:
  Eligible for discovery.

Explicit search results must not be hidden because an item
was previously explored.

Items explicitly requested through a collection page must
remain visible.

This filtering applies to discovery recommendations, not
to the provider's underlying data.

## 7.3 History Controls

Provide settings to:

- Enable or disable explored-content filtering.
- Reset exploration history.
- Clear history for a specific provider.
- Exclude items from recommendations.
- Change recommendation preferences.

Resetting history must not remove favorites, likes, or
category preferences.

---

# 8. COLLECTION PAGES

## 8.1 Collection Header

Display:

- Artwork.
- Title.
- Provider.
- Description.
- Item count when available.
- Collection metadata.
- Breadcrumbs.
- Favorite or save action when supported.
- Share action where appropriate.

## 8.2 Collection Items

Display entries in a responsive grid.

Cards may include:

- Thumbnail.
- Title.
- Content type.
- Creator or author.
- Publication date.
- Duration or page count.
- Favorite action.

Support:

- Sorting.
- Filtering.
- Search within collection.
- Pagination.
- Infinite scrolling.
- Related collections.

Do not fetch every entry at once.

## 8.3 Navigation

Support:

- Return to discovery.
- Return to parent category.
- Breadcrumb navigation.
- Related collections.
- Next and previous items where appropriate.

---

# 9. UNIVERSAL ITEM DETAILS PAGE

## 9.1 Overview

Every provider item must use a common details-page structure.

The layout adapts to content type while retaining consistent
navigation and actions.

## 9.2 Hero Section

Display:

- Background artwork.
- Title.
- Creator or author.
- Publication date or release year.
- Provider badge.
- Content type.
- Description.
- Relevant metadata.
- Primary action.
- Download button when available.
- Favorite button.
- Like button.

Primary actions depend on content type:

- Play.
- Read.
- Open.
- Launch Game.
- Explore Website.
- View Article.
- Listen.

## 9.3 Details Sections

Optional sections include:

- Overview.
- Description.
- Technical metadata.
- Available files.
- Formats.
- Creator information.
- Publication information.
- Subjects and tags.
- Related items.
- Related collections.
- Source attribution.
- Licensing and rights.

Only show sections when relevant data exists.

## 9.4 Additional Actions

Support:

- Favorite or unfavorite.
- Like or unlike.
- Download.
- Share.
- Open in viewer.
- Resume from saved progress.
- Open original provider page.
- Report broken content.

Do not show unsupported actions as functional.

## 9.5 Canonical Identity

Use a composite identity:

    providerId + ":" + providerItemId

Provider IDs must be included because item identifiers may
not be globally unique.

Cross-provider deduplication may be added later, but must
not merge unrelated records based solely on matching titles.

---

# 10. PROVIDER PLUGIN SYSTEM

## 10.1 Design

Archive, Wikipedia, and Adult must be independent providers.

The core interface must not contain provider-specific
fetching logic.

Adding a provider must not require rewriting discovery,
favorites, search, details pages, or viewer selection.

## 10.2 Provider Contract

Define a shared TypeScript interface.

    interface ContentProvider {
      id: string;
      name: string;
      version: string;

      getCapabilities(): ProviderCapabilities;

      search(
        query: string,
        options?: SearchOptions
      ): Promise<PaginatedResult<ContentItem>>;

      getCategories(): Promise<ContentCategory[]>;

      getCollections(
        categoryId: string,
        options?: PaginationOptions
      ): Promise<PaginatedResult<ContentCollection>>;

      getCollection(
        collectionId: string
      ): Promise<ContentCollection>;

      getCollectionItems(
        collectionId: string,
        options?: PaginationOptions
      ): Promise<PaginatedResult<ContentItem>>;

      getItem(
        itemId: string
      ): Promise<ContentItem>;

      getRelatedItems(
        itemId: string
      ): Promise<ContentItem[]>;

      getAvailableFiles?(
        itemId: string
      ): Promise<ContentFile[]>;

      getDownloadUrl?(
        itemId: string,
        fileId: string
      ): Promise<string | null>;
    }

This is an architectural starting point.

Optional methods must reflect genuinely optional capabilities.
The final contract should match real provider functionality.

## 10.3 Provider Capabilities

Providers may declare support for:

- Search.
- Categories.
- Collections.
- Item details.
- Downloadable files.
- Streaming.
- Documents.
- Images.
- Audio.
- Video.
- Related content.
- Pagination.
- Adult-content classification.

Unsupported capabilities must not prevent provider registration.

## 10.4 Provider Registry

The registry must:

- Register providers.
- Prevent duplicate registrations.
- Track provider status.
- Resolve providers by ID.
- Expose capabilities.
- Initialize providers independently.
- Enable and disable providers.
- Handle failures independently.

A provider failure must not break other providers.

## 10.5 Provider Isolation

Validate provider results before using them.

Do not execute arbitrary JavaScript returned by providers.

External content and third-party viewers must be isolated
and explicitly permissioned.

---

# 11. ARCHIVE.ORG PROVIDER

## 11.1 Supported Operations

Implement integration with official Internet Archive access
mechanisms where available.

Support:

- Search.
- Collection browsing.
- Item metadata.
- Thumbnail retrieval.
- File listing.
- Format detection.
- Download URL resolution.
- Related content where available.
- Original source links.

## 11.2 Content Types

Support:

- Books and documents.
- PDFs.
- Audio recordings.
- Video recordings.
- Images.
- Software.
- Web archives.
- Historical documents.
- Games and other digital artifacts.

## 11.3 File Metadata

Represent available files using:

- File ID or path.
- Filename.
- Format.
- MIME type.
- Size.
- Availability.
- Access restrictions.
- Download URL.
- Checksum when available.
- Viewer compatibility.

An item existing does not guarantee that every format
is accessible or downloadable.

## 11.4 Large Resources

Use streaming or range requests where supported.

Do not download full media merely to display metadata.

Cache metadata and thumbnails according to applicable
provider policies.

---

# 12. WIKIPEDIA PROVIDER

## 12.1 Features

Support:

- Article search.
- Article summaries.
- Full article reading.
- Thumbnails.
- Article categories.
- Related articles.
- References.
- Language selection where supported.
- Associated media.
- Original article links.
- Favorites and exploration history.

## 12.2 Article Reader

Provide:

- Title.
- Summary.
- Table of contents.
- Readable article body.
- Images.
- Footnotes.
- References.
- Internal article navigation.
- External source links.
- Favorite action.
- Related articles.

Use a document-oriented layout rather than a poster-grid
layout for full article reading.

Respect attribution, licensing, and API requirements.

---

# 13. ADULT PROVIDER

## 13.1 Overview

The Adult provider is optional and independently configurable.

It must use the same provider contract as other sources.

## 13.2 Requirements

Implement:

- Explicit provider opt-in.
- Appropriate age assurance.
- Configurable visibility.
- Adult-content exclusion from ordinary discovery.
- Separate provider preferences.
- Privacy controls.
- Provider identification.
- Safe external-media handling.

Apply legal age requirements and relevant content restrictions.

## 13.3 Isolation

Adult content must not unexpectedly appear in ordinary
Archive or Wikipedia recommendations.

The provider should be hidden or disabled when unavailable
or when the user does not meet applicable access requirements.

Global favorites may contain Adult items, but visibility
settings must be respected.

---

# 14. GLOBAL FAVORITES AND LIKES

## 14.1 Global Favorites

All providers share one global favorites list.

Store:

- User ID.
- Provider ID.
- Provider item ID.
- Item type.
- Title snapshot.
- Thumbnail snapshot when appropriate.
- Date favorited.
- Optional user-defined grouping.

Snapshots allow graceful display when a provider is
temporarily unavailable.

## 14.2 Favorite Locations

Favorite actions must be available from:

- Discovery cards.
- Collection cards.
- Item details.
- Search results.
- Related content.
- Viewers where appropriate.

Favorite state must remain consistent throughout the app.

Use optimistic updates with rollback on failure.

## 14.3 Favorites Page

Support:

- Unified item grid.
- Provider filtering.
- Content-type filtering.
- Sorting.
- Search within favorites.
- Removing favorites.
- Opening details.
- Downloading available resources.
- Resuming supported viewers.

## 14.4 Likes

Likes and favorites are separate.

Likes influence personalization.

Favorites explicitly save items for later access.

Users may like an item, favorite it, or do both.

---

# 15. GLOBAL SEARCH

## 15.1 Requirements

Search all enabled providers without requiring the user
to switch tabs.

Support:

- Global search.
- Current-provider search.
- Provider filters.
- Content-type filters.
- Category filters.
- Suggestions.
- Recent searches.
- Pagination.
- Relevance sorting.
- Date sorting when supported.

## 15.2 Search Interface

Provide an expandable search interface with:

- Search field.
- Recent searches.
- Suggested categories.
- Provider filters.
- Suggestions when available.

Debounce requests and cancel obsolete requests where possible.

## 15.3 Search Results

Use a shared result-card system.

Identify the source provider for every result.

Adapt metadata presentation to the content type.

Examples:

Books:
- Cover.
- Author.
- Publication date.

Videos:
- Thumbnail.
- Duration.
- Release date.

Games:
- Cover.
- Platform.
- Title.

Articles:
- Title.
- Summary.
- Thumbnail.

Images:
- Thumbnail.
- Creator.
- Dimensions where available.

## 15.4 Partial Failures

Search providers independently.

If one provider fails, display results from the others.

Report unavailable providers without discarding successful
results.

Explicit searches must include previously explored items
when returned by a provider.

---

# 16. DOWNLOAD MANAGER

## 16.1 Workflow

    User selects Download
            |
            v
    Resolve provider and item
            |
            v
    Retrieve available files
            |
            v
    Validate format and access
            |
            v
    Select file when necessary
            |
            v
    Resolve supported download URL
            |
            v
    Start download
            |
            v
    Report result

## 16.2 File Selection

When multiple files are available, display:

- Filename.
- Format.
- Size when known.
- Access status.
- Viewer compatibility.
- Download action.

Automatically select a file only when the choice is
unambiguous and appropriate.

## 16.3 Browser Downloads

Use normal browser download mechanisms where possible.

Account for:

- CORS.
- Cross-origin restrictions.
- File size.
- Mobile browser behavior.
- Authentication.
- Range requests.
- Download headers.

Do not assume arbitrary cross-origin URLs can be controlled
using the HTML download attribute.

Use backend-assisted downloads only where justified.

## 16.4 Download History

Record available information:

- Item title.
- Provider.
- Filename.
- Start time.
- Status when observable.
- File size when known.
- Retry action where appropriate.

Do not claim a download completed if the browser does not
provide evidence of completion.

## 16.5 Rights and Restrictions

Respect provider policies and access restrictions.

Do not bypass authentication, borrowing requirements, DRM,
or other access controls.

---

# 17. UNIVERSAL VIEWER SYSTEM

## 17.1 Overview

Vaultara must support independently registered viewers.

The viewer registry selects an appropriate viewer using
content metadata, file formats, and viewer capabilities.

## 17.2 Architecture

    Item Details Page
            |
            v
    Viewer Selection Service
            |
            +-- PDF / Document Viewer
            +-- Book Reader
            +-- Image Viewer
            +-- Audio Player
            +-- Video Player
            +-- Game Emulator
            +-- Software Viewer
            +-- Web Archive Viewer
            +-- Wikipedia Reader
            +-- Generic File Viewer
            |
            v
    Shared Viewer Container
            |
            +-- Toolbar
            +-- Favorite Action
            +-- Download Action
            +-- Fullscreen
            +-- Progress Tracking
            +-- Error Handling

## 17.3 Viewer Interface

Define a shared contract similar to:

    interface ContentViewerProps {
      item: ContentItem;
      files: ContentFile[];

      initialProgress?: ViewerProgress;

      onProgressChange?: (
        progress: ViewerProgress
      ) => void;

      onFavoriteToggle?: () => void;

      onDownload?: (
        file: ContentFile
      ) => void;

      onError?: (
        error: ViewerError
      ) => void;
    }

Each viewer must declare:

- Supported MIME types.
- Supported extensions.
- Supported content types.
- Required resources.
- Fullscreen support.
- Progress tracking support.
- Offline support.
- Additional permissions.

## 17.4 Selection Process

1. Resolve the selected item.
2. Retrieve available files.
3. Determine supported formats.
4. Match files against registered viewers.
5. Choose the best compatible viewer.
6. Allow format selection when appropriate.
7. Fall back to the generic viewer or original provider.

Treat file extensions and provider metadata as untrusted.

---

# 18. INITIAL VIEWERS

## 18.1 PDF Viewer

Use a maintained PDF rendering library such as PDF.js.

Features:

- Page navigation.
- Zoom.
- Fit to width.
- Fit to page.
- Search when supported.
- Page indicator.
- Download.
- Fullscreen.
- Keyboard navigation.
- Reading progress.
- Resume from previous page.

Support progressive loading where possible.

## 18.2 Book Reader

Support appropriate text, EPUB, and PDF formats.

Features:

- Adjustable font size.
- Typography controls.
- Line spacing.
- Light, dark, and sepia themes.
- Chapter navigation.
- Table of contents.
- Reading progress.
- Resume reading.
- Search.
- Distraction-free mode.
- Download.

Scanned books should use a PDF or image-based reader.

## 18.3 Audio Player

Features:

- Play and pause.
- Seek.
- Duration.
- Volume.
- Playback speed where supported.
- Track selection.
- Playlist support where appropriate.
- Resume position.
- Download.

## 18.4 Video Player

Features:

- Playback controls.
- Seek.
- Fullscreen.
- Volume.
- Playback speed.
- Subtitles where available.
- Multiple-file selection.
- Resume position.
- Download.

Prefer native playback for compatible formats.

## 18.5 Image Viewer

Features:

- High-resolution display.
- Zoom.
- Pan.
- Fit to screen.
- Previous and next image.
- Metadata.
- Fullscreen.
- Download.

Avoid loading unnecessary full-resolution images.

## 18.6 Game Boy Emulator

Implement a dedicated browser-based emulator viewer for
compatible Game Boy ROMs.

Features:

- Emulator display canvas.
- Start, pause, and resume.
- Keyboard controls.
- Touch controls.
- Fullscreen gameplay.
- Emulator settings.
- Save states when supported.
- ROM selection.
- Download when permitted.
- Invalid ROM error handling.

Use a maintained emulator implementation behind an adapter.

Run emulation in an isolated execution context where supported.

Never execute ROM files as JavaScript.

Treat ROMs and save states as untrusted data.

Do not bundle copyrighted commercial ROMs without authorization.

Design the emulator interface to support future systems,
including Game Boy Color, NES, and Sega Master System.

## 18.7 Software Viewer

Support archived software and compatible disk images.

Features:

- File listing.
- Technical metadata.
- Platform information.
- Download.
- Source link.
- Launch action when an appropriate sandbox exists.

Never execute arbitrary downloaded programs directly
within the application origin.

## 18.8 Web Archive Viewer

Support archived website playback where available.

Features:

- Embedded viewing.
- Archived navigation.
- Capture date.
- Original URL.
- Source link.
- Supported export or download actions.

Use sandboxed frames and restrictive security policies.

Archived pages must not access application credentials,
local storage, or privileged application APIs.

## 18.9 Wikipedia Reader

Use a readable article layout with:

- Table of contents.
- Article navigation.
- References.
- Images.
- Related articles.
- Favorite action.
- Original article link.

## 18.10 Generic File Viewer

Display:

- Filename.
- File type.
- File size.
- Provider.
- Available formats.
- Download action.
- Original source link.
- Reason preview is unavailable.

Never leave the user on a blank page because a viewer
cannot handle an item.

---

# 19. SHARED VIEWER EXPERIENCE

## 19.1 Toolbar

Include supported actions:

- Back to details.
- Item title.
- Favorite.
- Download.
- Fullscreen.
- Viewer settings.
- Progress indicator.

## 19.2 Responsive Layout

Desktop:
- Maximize content viewing area.
- Keep essential controls accessible.

Mobile:
- Prioritize content.
- Use compact controls.
- Support landscape fullscreen where possible.
- Keep documents readable without horizontal scrolling.

## 19.3 Progress Tracking

Examples:

- PDF: page and optional scroll position.
- Book: chapter and reading position.
- Audio: timestamp.
- Video: timestamp.
- Emulator: supported save-state data.
- Web archive: last visited URL where appropriate.

Progress must not automatically change like or favorite state.

---

# 20. DATA MODELS

## 20.1 Content Item

    interface ContentItem {
      id: string;
      providerId: string;

      title: string;
      description?: string;

      type: ContentType;

      thumbnailUrl?: string;
      artworkUrl?: string;

      creator?: string;
      publicationDate?: string;

      categories: string[];
      tags: string[];

      sourceUrl?: string;
      rights?: ContentRights;

      metadata: Record<string, unknown>;
    }

## 20.2 Content Collection

    interface ContentCollection {
      id: string;
      providerId: string;

      title: string;
      description?: string;

      thumbnailUrl?: string;
      artworkUrl?: string;

      itemCount?: number;
      categoryIds: string[];

      sourceUrl?: string;
      metadata: Record<string, unknown>;
    }

## 20.3 Content File

    interface ContentFile {
      id: string;
      providerId: string;
      itemId: string;

      name: string;
      extension?: string;
      mimeType?: string;
      sizeBytes?: number;

      downloadAvailable: boolean;
      viewable: boolean;

      checksum?: string;
      accessStatus?: string;

      metadata: Record<string, unknown>;
    }

## 20.4 User Content State

    interface UserContentState {
      providerId: string;
      itemId: string;

      liked: boolean;
      favorited: boolean;
      explored: boolean;

      firstExploredAt?: string;
      lastExploredAt?: string;

      progress?: ViewerProgress;
    }

## 20.5 Content Types

    type ContentType =
      | "book"
      | "document"
      | "article"
      | "movie"
      | "video"
      | "audio"
      | "music"
      | "image"
      | "game"
      | "software"
      | "website"
      | "collection"
      | "archive"
      | "unknown";

The model must remain extensible.

Provider-specific metadata must be preserved through a
validated metadata structure.

---

# 21. DATA PERSISTENCE

## 21.1 Backend Persistence

Persist:

- User preferences.
- Selected categories.
- Enabled providers.
- Favorites.
- Likes.
- Exploration history.
- Viewer progress.
- Search history when enabled.
- Download records where applicable.
- Content visibility settings.

## 21.2 Client Persistence

Use IndexedDB for appropriate:

- Cached metadata.
- Cached thumbnails where permitted.
- Recent item summaries.
- Offline reading data.
- Viewer settings.
- Pending synchronization operations.

Use local storage only for small, non-sensitive preferences.

Never store authentication secrets in ordinary browser storage.

## 21.3 Synchronization

Synchronize user state across devices.

Use canonical item identities and timestamps.

Support offline changes through a pending-operation queue
where appropriate.

Define conflict-resolution rules explicitly.

Favorites and likes should merge by canonical item identity.

---

# 22. APPLICATION ROUTING

Implement predictable routes.

    /
    /provider/archive
    /provider/wikipedia
    /provider/adult

    /category/:categoryId

    /collection/:providerId/:collectionId

    /item/:providerId/:itemId

    /search
    /search?q=:query

    /favorites
    /history
    /downloads

    /viewer/:providerId/:itemId

    /settings
    /settings/categories
    /settings/providers
    /settings/privacy
    /settings/content

Preserve search filters and sorting through URL parameters
where appropriate.

Direct navigation and browser refresh must work.

Handle missing items and unavailable providers gracefully.

---

# 23. VISUAL DESIGN SYSTEM

## 23.1 Overall Style

Use a premium, dark, media-focused interface.

Characteristics:

- Dark neutral background.
- High-contrast text.
- Large artwork.
- Subtle borders.
- Restrained accent colors.
- Rounded corners.
- Smooth transitions.
- Consistent spacing.
- Clear visual hierarchy.

The application should feel like one unified product.

## 23.2 Typography

Use readable sans-serif typography for navigation and metadata.

Use appropriate reading typography for books and articles.

Support text resizing and sufficient contrast.

## 23.3 Animation

Use restrained animation for:

- Card hover states.
- Navigation.
- Search expansion.
- Dialogs.
- Viewer transitions.
- Loading placeholders.

Respect reduced-motion preferences.

---

# 24. RESPONSIVE DESIGN

## Desktop

- Wide content area.
- Horizontal category rows.
- Hover interactions.
- Visible scrolling controls.

## Tablet

- Reduced card sizes.
- Touch scrolling.
- Adapted metadata.
- Responsive detail layouts.

## Mobile

- Compact navigation.
- Horizontal category rows.
- Touch-friendly controls.
- Expandable search.
- Accessible favorites.
- Responsive viewers.

Adapt to available viewport space and input capabilities
rather than relying exclusively on fixed device categories.

Use responsive CSS and container queries where appropriate.

Prevent horizontal page overflow.

Avoid mobile Safari input zoom caused by undersized text.

---

# 25. PERFORMANCE

## Discovery

- Load application shell independently.
- Fetch visible content progressively.
- Request only initial category pages.
- Lazy-load images.
- Prevent layout shifts.
- Virtualize large grids when appropriate.
- Cache metadata.
- Deduplicate requests.
- Cancel obsolete searches.

## Providers

- Independent timeouts.
- Independent retries.
- Rate limiting.
- Request cancellation.
- Backoff policies.
- Provider-specific caching.

A slow provider must not block the whole application.

## Viewers

- Lazy-load specialized viewers.
- Code-split large libraries.
- Release resources when viewers close.
- Stop playback and emulation loops when appropriate.
- Avoid unnecessary full-resolution images.

---

# 26. SECURITY AND PRIVACY

## External Data

Treat provider data as untrusted.

Sanitize HTML.

Validate URLs, identifiers, metadata, and file references.

Avoid unsafe raw HTML injection.

## Downloads

Validate resolved URLs.

Protect backend proxy endpoints against SSRF.

Never expose private provider credentials in frontend bundles.

Respect provider access restrictions.

## Viewers

Sandbox untrusted content.

Restrict third-party access to application data.

Use restrictive Content Security Policy directives.

Do not execute arbitrary downloaded programs or scripts
inside the application origin.

## Privacy

Allow users to manage exploration history.

Minimize collection of viewing data.

Keep Adult provider content isolated from ordinary discovery.

Provide appropriate controls for history tracking.

---

# 27. ACCESSIBILITY

Target WCAG 2.2 AA.

Support:

- Keyboard navigation.
- Visible focus indicators.
- Semantic headings.
- Screen-reader labels.
- Accessible dialogs.
- Sufficient contrast.
- Reduced motion.
- Text resizing.
- Captions where available.
- Keyboard viewer controls.

Horizontal scrolling rows must support keyboard interaction.

Never communicate favorite or selection state using color alone.

---

# 28. ERROR HANDLING

Handle:

- Provider unavailable.
- Empty search results.
- Collection not found.
- Item removed.
- File inaccessible.
- Download unavailable.
- Unsupported format.
- Viewer initialization failure.
- Authentication required.
- Rate limits.
- Network loss.

Each error must provide a useful explanation and recovery
action when possible.

Provider failures must not break unrelated providers.

Do not report successful operations before they succeed.

---

# 29. TESTING

## Unit Tests

Test:

- Provider registry.
- Provider adapters.
- Item identity.
- Discovery filtering.
- Favorites and likes.
- Exploration history.
- Viewer selection.
- Download resolution.
- Search merging.
- Pagination.
- Persistence.

## Integration Tests

Test:

- Provider initialization.
- Cross-provider search.
- Partial failures.
- Collection browsing.
- Item details.
- Global favorites.
- Explored-content filtering.
- Download selection.
- Viewer initialization.
- Progress synchronization.

## End-to-End Tests

1. Create an account.
2. Select categories.
3. Open personalized discovery.
4. Browse a collection.
5. Open an item.
6. Favorite the item.
7. Open global favorites.
8. Verify the item exists.
9. Open its viewer.
10. Return to discovery.
11. Verify explored-content filtering.
12. Verify favorited items remain eligible for rediscovery.
13. Search for the explored item.
14. Download an available file.
15. Switch providers and repeat relevant operations.

Test desktop, tablet, and mobile layouts.

Test touch and keyboard interactions.

---

# 30. ACCEPTANCE CRITERIA

The application must:

1. Display Netflix-style horizontal category rows.
2. Show approximately 20-30 cards when sufficient results exist.
3. Provide a working View All entry for each category.
4. Open collection pages.
5. Open item details pages.
6. Support Archive, Wikipedia, and optional Adult providers.
7. Use shared provider interfaces.
8. Allow additional providers without rewriting core components.
9. Support category-selection onboarding.
10. Personalize discovery.
11. Hide explored items from ordinary discovery by default.
12. Keep liked and favorited items eligible for rediscovery.
13. Preserve explicit search results regardless of exploration.
14. Search all enabled providers.
15. Maintain a global favorites list.
16. Synchronize favorite state across the application.
17. Provide valid download actions where permitted.
18. Handle inaccessible resources honestly.
19. Select appropriate viewers for supported formats.
20. Support PDF, book, image, audio, video, Wikipedia,
    web archive, and Game Boy viewer modules.
21. Provide a generic fallback viewer.
22. Isolate provider failures.
23. Persist user preferences and favorites.
24. Adapt to desktop, tablet, and mobile.
25. Meet security, accessibility, and performance targets.
26. Respect provider policies, attribution, and content rights.

---

# 31. FINAL ARCHITECTURAL DIRECTIVE

Vaultara must be implemented as a unified content-discovery
platform, not as a collection of separate provider websites.

The core application owns:

- Navigation.
- Discovery presentation.
- Canonical item identity.
- User preferences.
- Favorites and likes.
- Exploration history.
- Search orchestration.
- Download workflows.
- Viewer selection.

Providers own:

- External data retrieval.
- Provider-specific metadata.
- Provider capabilities.
- Content resource resolution.

Viewers own:

- Content rendering.
- Format-specific interaction.
- Playback or reading state.
- Viewer-specific controls.

These responsibilities must remain separate.

Prioritize a polished Archive.org experience, reliable global
search and favorites, persistent user state, and a small
set of fully functional viewers.

Additional providers and viewers must build on established
interfaces rather than introduce parallel architectures.