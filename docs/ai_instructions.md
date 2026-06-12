# AI Development Instructions

This file serves as a system prompt/instruction set for **future AI coding assistants** working on this codebase. It outlines the codebase layout, patterns, constraints, and standard procedures for modifying the application.

---

## 1. Technical Stack Constraints

* **Frontend:** Next.js 16+ (App Router, Client Components using `'use client'`).
* **Styling:** CSS variables defined in `src/app/globals.css`. Do not add Tailwind CSS unless explicitly requested. Maximize sleek, premium dark layouts.
* **Scraper:** Static scraping using `cheerio`. Dynamic JS-rendered pages are not supported. If a site is dynamically loaded, the selectors will fail.
* **Database:** Single file local JSON database (`data/db.json`) handled by `src/lib/db.ts`. File reading/writing is synchronous using Node's `fs`. Do not add heavy SQL databases unless requested.

---

## 2. Crucial Notion Integration Quirks

* **Synced Databases Limitation:**
  If a user connects a **Synced Database** (同期データベース, which Notion links to external tools like Jira or GitHub), the Notion API returns a database object **without** the `properties` schema. It instead includes a `data_sources` field.
  * **Rule:** Integrations *cannot* write to or modify the schema of Synced Databases. They are read-only.
  * **Handling:** If `properties` is missing from `dbResponse` when retrieving, throw a descriptive error telling the user they must use a **normal, blank Notion database** instead.
* **API Domain Changes:**
  Notion URLs can be either `notion.so` or `notion.com`, and may contain `/p/` in the path or hyphens in the database ID.
  * **Rule:** The URL extractor regex in `src/app/page.tsx` must support all of these forms and strip hyphens (`-`) from the final database ID before registering.
* **API Validation vs. Page Syncing:**
  `validateNotionConnection` checks connectivity by retrieving the database metadata. Even if the database is a "Synced Database" (read-only), the retrieve call succeeds. Thus, validation returns `true` but syncing will fail. The syncer must check for `properties` at the time of writing.

---

## 3. How to Extend the Application

### Adding New Artist Presets
To add a new artist preset template:
1. Open [page.tsx](file:///Users/souta/desktop/dev/src/app/page.tsx).
2. Locate the `PRESETS` array.
3. Add a new object following this schema:
   ```typescript
   {
     name: 'Artist Name',
     liveUrl: 'https://...',
     selectorItem: 'CSS selector for container',
     selectorTitle: 'CSS selector for title',
     selectorDate: 'CSS selector for date',
     selectorVenue: 'CSS selector for venue',
     selectorLink: 'CSS selector for link'
   }
   ```

### Running on Raspberry Pi (PM2 Deployment)
* The application runs on a remote server (e.g. Raspberry Pi) managed by PM2 under the process name `live-sync-app`.
* Remember that changing source files on the local development machine (Mac) will not update the Raspberry Pi until:
  1. Source changes are pushed/deployed to the Pi.
  2. The application is rebuilt on the Pi (`npm run build` or `bun run build`).
  3. The PM2 process is reloaded (`pm2 reload live-sync-app`).

---

## 4. Prompt Template for Future AI

When you are asked to make changes to this codebase, make sure to:
1. Parse the local configuration from `data/db.json` if you need to run sandbox connection checks.
2. Maintain type safety in `src/lib/db.ts` when adding fields.
3. Update the logs output cleanly using `addLog` in the frontend dashboard.
4. Keep the styling clean and dark, matching the design variables inside `globals.css`.
