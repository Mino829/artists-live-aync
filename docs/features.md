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
* **JSON/JSONP Auto-Detection:** Automatically detects if a URL returns JSON or JSONP (e.g., wrapped in `callback(...)`). It extracts the raw JSON, dynamically searches for arrays (like `items.articles` in Sony Music's API layout), and parses it directly, bypassing Cheerio.

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
  * **Smart Differential Sync:**
    * On the **first sync** for an artist, it slices the list to only save and sync the **latest 5 items**.
    * On **subsequent syncs**, it scans the list from newest to oldest and finds the first item that is already in our database. It discards everything below it (since they are older than what we have) and only syncs new articles published since the last sync.
  * Syncs unsynced events to Notion and saves the resulting `notionPageId` locally.
* **`POST /api/scrape/test`**:
  * Simulates a scrape without saving any data or touching Notion. Used to test CSS selector configurations.
* **`GET /api/logs`**:
  * Retrieves all past automated/manual sync logs.
* **`GET /api/health`**:
  * Public liveness endpoint for external uptime monitors; returns HTTP 200 without exposing app configuration.
* **`POST /api/auth/check` / `GET /api/auth/check`**:
  * Authenticates and verifies the access passcode saved in clients' browsers against the `ACCESS_PASSWORD` environmental variable.

---

## 4. Notifications Dispatcher (`src/lib/notification.ts`)

Parallel dispatch engine for live-event alerts:
* **Discord Webhooks**: Delivers customized rich embed blocks with artist info, show title, date, venue, and a quick-link button.
* **Slack Webhooks**: Uses the Slack Blocks kit to format a clean, readable layout.
* **LINE Messaging API**: Delivers push alerts directly to the configured user using `fetch` post-calls.
* Test sends check provider HTTP responses and report rejected webhooks as failures.

---

## 5. Uptime Monitor Health Endpoint (`src/app/api/health/route.ts`)

* `GET /api/health` returns HTTP 200 and a small `{ "status": "ok" }` response without authentication so an external monitor can check app availability.
* It is a liveness check only; it does not inspect database integrity or scraper success.
* Configure the monitor and its Discord notification in Uptime Kuma. Run Uptime Kuma on a separate reachable host if it must notify when the app server itself is down.

## 6. Security & Passcode Authorization (`src/lib/auth.ts`)

Protects the application from unauthorized access:
* **API Protection**: Checks incoming HTTP requests for `x-api-key` headers, `Authorization: Bearer` headers, or `?key=...` query parameters matching `ACCESS_PASSWORD`.
* **Client-side Gatekeeper**: Prompts users for a password on their first visit, saving it securely in `localStorage` and attaching it to every outbound request header.

---

## 7. Frontend Dashboard (`src/app/page.tsx`)

A single-page dashboard designed with a sleek dark theme and layout:

### Main Sections
1. **Integrations and Monitoring Settings:**
   * Configure optional Notion sync and new-event notifications separately from server uptime monitoring.
   * Copy the current app URL and assign a Discord notification target to an existing Uptime Kuma monitor.
   * An optional dedicated `/api/health` URL is available when creating or updating a monitor.
   * Notion config is optional (allowing notifications-only sync configurations).
   * Accordion guides explaining how to obtain Discord webhooks, Slack keys, and LINE tokens.
2. **Scraper Dashboard (Tabs):**
   * **Feed Tab**:
     * **Events Feed**: Shows the timeline of scraped events and sync status.
     * **Sync History**: Displays execution outcomes, timestamps, triggers (cron vs manual), scraped counts, new event counts, synced counts, and error highlights.
   * **Artists Config Tab**: 
     * Register presets (including XML Feed presets like Mr.Children) or configure custom selectors.
     * **Test Scraper Live**: Runs a sandbox test and renders the scraped JSON preview on-screen before registering.
     * **Console Output**: A real-time terminal emulator showing system operations, successes, and warning logs.
3. **Sync Controls:**
   * Trigger global sync sweeps or monitor metrics in a unified control interface.
