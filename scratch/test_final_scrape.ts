import { scrapeLiveInfo } from '../src/lib/scraper';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const dbPath = path.join(__dirname, '../data/db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const artists = db.artists;

  console.log(`Loaded ${artists.length} artists from database.`);

  for (const artist of artists) {
    // Only test fujii-kaze, yoasobi, zutomayo, breimen, millennium-parade
    const targetIds = ['fujii-kaze', 'yoasobi', 'zutomayo', 'breimen', 'millennium-parade'];
    if (!targetIds.includes(artist.id)) continue;

    console.log(`\n--------------------------------------------------`);
    console.log(`Scraping artist: ${artist.name}`);
    console.log(`URL: ${artist.liveUrl}`);
    console.log(`--------------------------------------------------`);

    try {
      const items = await scrapeLiveInfo({
        liveUrl: artist.liveUrl,
        selectorItem: artist.selectorItem,
        selectorTitle: artist.selectorTitle,
        selectorDate: artist.selectorDate,
        selectorVenue: artist.selectorVenue,
        selectorLink: artist.selectorLink,
      });

      console.log(`Success! Found ${items.length} items.`);
      if (items.length > 0) {
        console.log(`First 3 items:`);
        items.slice(0, 3).forEach((item, idx) => {
          console.log(`  [${idx + 1}] Date:  ${item.date}`);
          console.log(`      Title: ${item.title}`);
          console.log(`      Link:  ${item.link}`);
        });
      }
    } catch (e: any) {
      console.error(`Error scraping ${artist.name}:`, e.message);
    }
  }
}

run();
