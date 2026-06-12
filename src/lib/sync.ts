import {
  readDb,
  getArtists,
  saveArtist,
  saveEvents,
  updateEventSyncStatus,
  addSyncLog,
  LiveEvent,
} from '@/lib/db';
import { scrapeLiveInfo, generateEventId } from '@/lib/scraper';
import { syncEventToNotion } from '@/lib/notion';
import { sendNotifications } from '@/lib/notification';

export async function runSync(artistId: string | undefined, trigger: 'manual' | 'cron') {
  const db = readDb();
  const config = db.config;
  const allArtists = getArtists();

  // Determine which artists to sync
  let targetArtists = allArtists;
  if (artistId) {
    const selected = allArtists.find((a) => a.id === artistId);
    if (!selected) {
      return { error: `Artist with ID "${artistId}" not found`, status: 404 };
    }
    targetArtists = [selected];
  }

  if (targetArtists.length === 0) {
    return { success: true, message: 'No artists configured to scrape.', results: [] };
  }

  const notionConfigured = !!(config.notionApiKey && config.notionDatabaseId);
  const syncResults = [];

  for (const artist of targetArtists) {
    // 1. Mark status as syncing
    artist.status = 'syncing';
    artist.errorMessage = null;
    saveArtist(artist);

    try {
      console.log(`Starting scrape for artist: ${artist.name}`);
      // 2. Perform scraping
      let scrapedItems = await scrapeLiveInfo({
        liveUrl: artist.liveUrl,
        selectorItem: artist.selectorItem,
        selectorTitle: artist.selectorTitle,
        selectorDate: artist.selectorDate,
        selectorVenue: artist.selectorVenue,
        selectorLink: artist.selectorLink,
      });

      // Check existing events for this artist in the database
      const currentDb = readDb();
      const existingEventIds = new Set(
        currentDb.events
          .filter((e) => e.artistId === artist.id)
          .map((e) => e.id)
      );

      if (existingEventIds.size === 0) {
        // First sync: Limit to the latest 5 items
        console.log(`First sync for artist ${artist.name}. Limiting to the latest 5 items.`);
        scrapedItems = scrapedItems.slice(0, 5);
      } else {
        // Subsequent syncs: Only keep items that are newer than what we have in the DB.
        let matchIndex = scrapedItems.findIndex((item) => {
          const eventId = generateEventId(artist.id, item.title, item.date);
          return existingEventIds.has(eventId);
        });

        if (matchIndex !== -1) {
          console.log(`Found existing event at index ${matchIndex} for ${artist.name}. Syncing ${matchIndex} new items.`);
          scrapedItems = scrapedItems.slice(0, matchIndex);
        } else {
          console.log(`No matching existing events found on the page for ${artist.name}. Treating all ${scrapedItems.length} as new.`);
        }
      }

      // 3. Map scraped items to database events
      const nowStr = new Date().toISOString();
      const artistEvents: LiveEvent[] = scrapedItems.map((item) => {
        const eventId = generateEventId(artist.id, item.title, item.date);
        return {
          id: eventId,
          artistId: artist.id,
          artistName: artist.name,
          title: item.title,
          date: item.date || 'TBA',
          venue: item.venue || 'TBA',
          link: item.link || artist.liveUrl,
          notionPageId: null,
          scrapedAt: nowStr,
          syncedAt: null,
        };
      });

      // 4. Save events locally
      saveEvents(artistEvents);

      // Send notifications for newly scraped events
      if (artistEvents.length > 0) {
        console.log(`Sending notifications for ${artistEvents.length} new events of ${artist.name}`);
        const currentConfig = readDb().config;
        await sendNotifications(currentConfig, artistEvents.map(e => ({
          artistName: e.artistName,
          title: e.title,
          date: e.date,
          venue: e.venue,
          link: e.link
        })));
      }

      // 5. Query updated database to check which events are still unsynced
      const updatedDb = readDb();
      const unsyncedEvents = updatedDb.events.filter(
        (e) => e.artistId === artist.id && e.notionPageId === null
      );

      let syncedCount = 0;
      let notionErrorMessage: string | null = null;

      // 6. Push unsynced events to Notion
      if (notionConfigured) {
        console.log(`Syncing ${unsyncedEvents.length} new events to Notion for ${artist.name}`);
        for (const event of unsyncedEvents) {
          try {
            const pageId = await syncEventToNotion(config.notionApiKey, config.notionDatabaseId, {
              title: event.title,
              artistName: event.artistName,
              date: event.date,
              venue: event.venue,
              link: event.link,
            });

            // Update sync state in local DB
            updateEventSyncStatus(event.id, pageId, new Date().toISOString());
            syncedCount++;
          } catch (notionError: any) {
            console.error(`Notion sync error for event "${event.title}":`, notionError);
            notionErrorMessage = `Notion API Error: ${notionError.message || notionError}`;
            break; // Halt syncing for this artist if Notion connection errors out
          }
        }
      }

      // 7. Update artist status
      const finalArtist = readDb().artists.find((a) => a.id === artist.id)!;
      if (notionConfigured && notionErrorMessage) {
        finalArtist.status = 'failed';
        finalArtist.errorMessage = `Scraped successfully, but Notion sync failed: ${notionErrorMessage}`;
      } else {
        finalArtist.status = 'success';
        finalArtist.lastSyncedAt = nowStr;
        finalArtist.errorMessage = null;
      }
      saveArtist(finalArtist);

      syncResults.push({
        artistId: artist.id,
        artistName: artist.name,
        status: finalArtist.status,
        scrapedCount: scrapedItems.length,
        newCount: unsyncedEvents.length,
        syncedCount,
        errorMessage: finalArtist.errorMessage,
      });
    } catch (scrapeError: any) {
      console.error(`Scrape failed for artist ${artist.name}:`, scrapeError);
      const finalArtist = readDb().artists.find((a) => a.id === artist.id)!;
      finalArtist.status = 'failed';
      finalArtist.errorMessage = scrapeError.message || 'Scrape failed due to unknown error';
      saveArtist(finalArtist);

      syncResults.push({
        artistId: artist.id,
        artistName: artist.name,
        status: 'failed',
        scrapedCount: 0,
        newCount: 0,
        syncedCount: 0,
        errorMessage: finalArtist.errorMessage,
      });
    }
  }

  // Save scrape log execution history
  addSyncLog({
    trigger,
    results: syncResults.map(r => ({
      artistName: r.artistName,
      status: r.status as 'success' | 'failed',
      scrapedCount: r.scrapedCount,
      newCount: r.newCount,
      syncedCount: r.syncedCount,
      errorMessage: r.errorMessage
    }))
  });

  return {
    success: !syncResults.some((r) => r.status === 'failed'),
    results: syncResults,
  };
}
