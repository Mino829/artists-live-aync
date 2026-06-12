# System Specification

This document details the core requirements, data models, database structures, and external integrations for the **Artist Live Info Scraper & Notion Sync App**.

---

## 1. Core Requirements

1. **Artist Scraper Configuration:**
   * Support dynamic scraper configuration (URL and CSS selectors) for any artist.
   * Provide pre-configured templates (Presets) for popular artists (e.g., Kenshi Yonezu, Official Hige Dandism).
2. **Deterministic Event De-duplication:**
   * Generate a unique, deterministic hash ID for each event based on its artist, title, and date.
   * Prevent duplicate entries when scraping the same page repeatedly.
3. **Local Event Feed & History:**
   * Store scraped events locally in a JSON database.
   * Provide a frontend feed displaying event history, scraper status, and sync logs.
4. **Automated Notion Synchronization:**
   * Connect to Notion via an Integration Token and Database ID.
   * Sync unsynced events (those with `notionPageId === null`).
   * Automatically detect and create required database columns (properties) in Notion if they do not exist.

---

## 2. Data Models (TypeScript)

### Artist
Represents a configured artist whose website will be scraped.
```typescript
interface Artist {
  id: string;             // URL-friendly slug (e.g., "kenshi-yonezu")
  name: string;           // Name of the artist
  liveUrl: string;        // URL of the live schedule page
  selectorItem: string;   // CSS selector for the event container list item
  selectorTitle: string;  // CSS selector for the title (relative to item)
  selectorDate: string;   // CSS selector for the date (relative to item)
  selectorVenue: string;  // CSS selector for the venue (relative to item)
  selectorLink: string;   // CSS selector for the event link (relative to item)
  lastSyncedAt: string | null; // ISO timestamp of the last successful sync
  status: 'idle' | 'syncing' | 'success' | 'failed'; // Scraper status
  errorMessage: string | null; // Detailed error message if status is failed
}
```

### LiveEvent
Represents a scraped live event.
```typescript
interface LiveEvent {
  id: string;             // Deterministic MD5 hash ID
  artistId: string;       // Foreign key pointing to Artist.id
  artistName: string;     // Cached artist name
  title: string;          // Event/Tour title
  date: string;           // Date string (e.g., "2025.08.8")
  venue: string;          // Venue name or description
  link: string;           // Absolute URL of the event detail page
  notionPageId: string | null; // Notion Page ID if synced, otherwise null
  scrapedAt: string;      // ISO timestamp when first scraped
  syncedAt: string | null; // ISO timestamp when successfully synced to Notion
}
```

---

## 3. Local JSON Database Schema (`data/db.json`)

Data is persisted locally in `data/db.json`. The file has the following schema:

```json
{
  "config": {
    "notionApiKey": "string (Notion Integration Token)",
    "notionDatabaseId": "string (32-character Database ID)"
  },
  "artists": [
    // Array of Artist objects
  ],
  "events": [
    // Array of LiveEvent objects
  ]
}
```

*Note: The `data/` directory is registered in `.gitignore` to prevent committing credentials and environment-specific database states.*

---

## 4. Notion Integration Schema

The application automatically verifies and configures the properties in the target Notion database. 

### Auto-Configured Columns
When syncing, if any of the following properties are missing from the Notion database, the app automatically updates the database schema using the Notion API:

| Column Name | Notion Type | Description |
| :--- | :--- | :--- |
| **Name** (or **Title**) | `title` | Title of the event (e.g., "米津玄師 2026 TOUR / GHOST"). Matches the default database Title property name dynamically. |
| **Artist** | `select` | The name of the artist. |
| **Date** | `rich_text` | The schedule date as text (retains the original parsed string format). |
| **Venue** | `rich_text` | The venue name or location text. |
| **Link** | `url` | URL pointing to the official event detail page. |
