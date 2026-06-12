# System Features & Implementation

This document describes the key features of the **Artist Live Info Scraper & Notion Sync App** and how they are implemented.

---

## 1. Scraper Engine (`src/lib/scraper.ts`)

The scraper uses **Cheerio** to parse static HTML fetched from the artist's official website.

### Key Logic
* **User-Agent spoofing:** Sends standard browser headers to prevent basic bot protection blocks.
* **Relative Link Resolution:** Automatically resolves relative links (e.g. `/news/123`) to absolute URLs using the base `liveUrl`.
* **Deterministic ID Generation (`generateEventId`):**
  Generates an MD5 hash of `${artistId}-${normalizedTitle}-${normalizedDate}` to uniquely identify an event. If the event is scraped again, it matches the existing ID, preventing duplicate insertions.

---

## 2. Notion Syncer (`src/lib/notion.ts`)

Integrates with the official `@notionhq/client` SDK.

### Database Validation & Schema Safety
1. **Schema Check (`ensureDatabaseProperties`):**
   Prior to creating a page, the app retrieves the database.
   * If the Notion API returns a **Partial Database Object** (lacking a `properties` field), the app throws a descriptive error explaining that the database may be a "Synced Database" (read-only) or lacks permissions.
   * Dynamically checks if the required properties (`Artist`, `Date`, `Venue`, `Link`) exist. If any are missing, it performs a database update to create them.
2. **Page Insertion (`syncEventToNotion`):**
   Creates a new page inside the database parent. Populates the fields with proper select, rich text, and URL formatting.

---

## 3. Backend API Routes (`src/app/api/`)

The application exposes Next.js Route Handlers to perform operations:

* **`GET /api/config` / `POST /api/config`**:
  * Loads or updates the Notion API token and Database ID.
  * Validates the connection on save by making a test retrieve call to Notion.
* **`GET /api/artists` / `POST /api/artists` / `DELETE /api/artists`**:
  * Manages the list of registered artists. Normalizes artist names into slug IDs.
* **`GET /api/events`**:
  * Retrieves all scraped event logs sorted by newest scraped first.
* **`POST /api/scrape`**:
  * Triggers the scraper for one or all artists.
  * Writes new events to `data/db.json`.
  * Syncs unsynced events to Notion and saves the resulting `notionPageId` locally.
* **`POST /api/scrape/test`**:
  * Simulates a scrape without saving any data or touching Notion. Used to test CSS selector configurations.

---

## 4. Frontend Dashboard (`src/app/page.tsx`)

A single-page dashboard designed with a sleek dark theme and layout:

### Main Sections
1. **Notion Integration Settings:**
   * Enter API credentials.
   * Supports **Notion Database URL Auto-Extraction**: Automatically extracts the 32-character database ID even if a user pastes a full `notion.com` or `notion.so` URL with query parameters and hyphens.
2. **Scraper Dashboard (Tabs):**
   * **Feed Tab**: Shows the timeline of scraped events, their scraping details, and sync status.
   * **Artists Config Tab**: 
     * Register presets (米津玄師, Official髭男dism) or configure custom selectors.
     * **Test Scraper Live**: Runs a sandbox test and renders the scraped JSON preview on-screen before registering.
     * **Console Output**: A real-time terminal emulator showing system operations, successes, and warning logs.
