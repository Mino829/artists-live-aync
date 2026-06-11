import * as cheerio from 'cheerio';
import crypto from 'crypto';

export interface ScrapedEvent {
  title: string;
  date: string;
  venue: string;
  link: string;
}

export interface ScraperOptions {
  liveUrl: string;
  selectorItem: string;
  selectorTitle: string;
  selectorDate: string;
  selectorVenue: string;
  selectorLink: string;
}

/**
 * Clean up text content by removing double spaces, newlines, and tabs
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrapes live event details from a given artist's official live page.
 */
export async function scrapeLiveInfo(options: ScraperOptions): Promise<ScrapedEvent[]> {
  const {
    liveUrl,
    selectorItem,
    selectorTitle,
    selectorDate,
    selectorVenue,
    selectorLink,
  } = options;

  if (!liveUrl) {
    throw new Error('Live URL is required');
  }
  if (!selectorItem) {
    throw new Error('Item selector is required');
  }

  // Fetch HTML with User-Agent to avoid simple bot blocks
  const response = await fetch(liveUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page. HTTP Status: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const items = $(selectorItem);

  if (items.length === 0) {
    throw new Error(
      `No items found matching the selector "${selectorItem}". Please verify the selector or check if the content is dynamically loaded.`
    );
  }

  const results: ScrapedEvent[] = [];

  items.each((_, element) => {
    const el = $(element);

    // Extract Title
    let title = '';
    if (selectorTitle) {
      title = cleanText(el.find(selectorTitle).text());
    } else {
      // Fallback: Use direct text of the item
      title = cleanText(el.text());
    }

    // If title is empty, skip or use a placeholder
    if (!title) {
      return;
    }

    // Extract Date
    let date = '';
    if (selectorDate) {
      date = cleanText(el.find(selectorDate).text());
    }

    // Extract Venue / description
    let venue = '';
    if (selectorVenue) {
      venue = cleanText(el.find(selectorVenue).text());
    }

    // Extract Link
    let link = liveUrl;
    if (selectorLink) {
      let linkElement: any = el.find(selectorLink);
      if (linkElement.length === 0 && el.is(selectorLink)) {
        linkElement = el; // Selected item itself is the link (e.g. selectorLink is 'a')
      }
      const href = linkElement.attr('href');
      if (href) {
        try {
          // Resolve relative URL to absolute URL
          link = new URL(href, liveUrl).href;
        } catch (e) {
          link = href;
        }
      }
    } else if (el.is('a')) {
      const href = el.attr('href');
      if (href) {
        try {
          link = new URL(href, liveUrl).href;
        } catch (e) {
          link = href;
        }
      }
    }

    results.push({
      title,
      date,
      venue,
      link,
    });
  });

  return results;
}

/**
 * Generates a unique, deterministic hash for an event.
 */
export function generateEventId(artistId: string, title: string, date: string): string {
  const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
  const normalizedDate = date.toLowerCase().replace(/\s+/g, '');
  const key = `${artistId}-${normalizedTitle}-${normalizedDate}`;
  return crypto.createHash('md5').update(key).digest('hex');
}
