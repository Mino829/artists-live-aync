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
  parserType?: 'html' | 'jsonld-event' | 'legacy-json';
}

/**
 * Clean up text content by removing double spaces, newlines, and tabs
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenJsonLd(value: unknown): Record<string, any>[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, any>;
  const nested = [
    ...flattenJsonLd(record['@graph']),
    ...flattenJsonLd(record.itemListElement),
    ...flattenJsonLd(record.item),
    ...flattenJsonLd(record.mainEntity),
  ];
  return [record, ...nested];
}

/** Parse only explicit Schema.org Event records; article publish dates are not event dates. */
export function extractJsonLdEvents(content: string, liveUrl: string): ScrapedEvent[] {
  const $ = cheerio.load(content);
  const records: Record<string, any>[] = [];

  $('script[type="application/ld+json"]').each((_, script) => {
    const raw = $(script).contents().text().trim();
    if (!raw) return;
    try {
      records.push(...flattenJsonLd(JSON.parse(raw)));
    } catch {
      // Ignore malformed JSON-LD blocks and keep looking for usable records.
    }
  });

  return records.flatMap((record) => {
    const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
    const isEvent = types.some((type) =>
      typeof type === 'string' && /(?:^|[/#])(?:Event|MusicEvent|Concert)$/i.test(type)
    );
    if (!isEvent || typeof record.name !== 'string' || !record.name.trim()) return [];

    const location = record.location;
    const venue = typeof location === 'string'
      ? location
      : typeof location?.name === 'string'
        ? location.name
        : '';
    let link = liveUrl;
    const rawLink = record.url || record['@id'];
    if (typeof rawLink === 'string') {
      try {
        link = new URL(rawLink, liveUrl).href;
      } catch {
        // Keep the source page URL if the event URL is malformed.
      }
    }

    return [{
      title: cleanText(record.name),
      date: typeof record.startDate === 'string' ? cleanText(record.startDate) : '',
      venue: cleanText(venue),
      link,
    }];
  });
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
  if (!selectorItem && options.parserType !== 'jsonld-event') {
    throw new Error('Item selector is required');
  }

  // Fetch HTML with User-Agent to avoid simple bot blocks
  const response = await fetch(liveUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page. HTTP Status: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();

  if (options.parserType === 'jsonld-event') {
    return extractJsonLdEvents(content, liveUrl);
  }

  // Try to parse as JSON / JSONP first (to support dynamic APIs like Sony Music / King Gnu)
  if (options.parserType !== 'html') try {
    let jsonString = content.trim();
    
    // Check if the content is HTML and contains __NEXT_DATA__
    if (content.includes('__NEXT_DATA__')) {
      const regex = new RegExp('<script\\s+id="__NEXT_DATA__"\\s+type="application/json">([\\s\\S]*?)</script>');
      const match = content.match(regex);
      if (match) {
        jsonString = match[1].trim();
      }
    } else {
      // Clean up JSONP callback wrapper if present (e.g. callback({...}); or callback({...}))
      const jsonpMatch = jsonString.match(/^[a-zA-Z0-9_\$]+\(([\s\S]+)\);?$/);
      if (jsonpMatch) {
        jsonString = jsonpMatch[1].trim();
      }
    }
    
    const jsonData = JSON.parse(jsonString);
    
    // Find the array of items inside the JSON response
    let list: any[] | null = null;
    if (Array.isArray(jsonData)) {
      list = jsonData;
    } else if (jsonData.items && Array.isArray(jsonData.items.articles)) {
      list = jsonData.items.articles;
    } else if (jsonData.list && Array.isArray(jsonData.list)) {
      list = jsonData.list;
    } else if (jsonData.articles && Array.isArray(jsonData.articles)) {
      list = jsonData.articles;
    } else if (jsonData.items && Array.isArray(jsonData.items)) {
      list = jsonData.items;
    } else if (jsonData.props?.pageProps && typeof jsonData.props.pageProps === 'object') {
      // Support for Next.js pageProps data structure (e.g., Pasocom Music Club)
      const pageProps = jsonData.props.pageProps;
      if (Array.isArray(pageProps.posts)) {
        list = pageProps.posts;
      } else if (Array.isArray(pageProps.articles)) {
        list = pageProps.articles;
      } else if (Array.isArray(pageProps.news)) {
        list = pageProps.news;
      } else {
        // Find the largest array in pageProps as a fallback
        let largestArray: any[] | null = null;
        for (const val of Object.values(pageProps)) {
          if (Array.isArray(val)) {
            if (!largestArray || val.length > largestArray.length) {
              largestArray = val;
            }
          }
        }
        list = largestArray;
      }
    } else {
      // Fallback: search for any array property in the root of the JSON object
      for (const val of Object.values(jsonData)) {
        if (Array.isArray(val)) {
          list = val;
          break;
        }
      }
    }

    if (list && Array.isArray(list)) {
      const results: ScrapedEvent[] = [];
      for (const item of list) {
        const title = cleanText(item.title || item.name || item.subject || '');
        // Publication timestamps are not event dates. Only trust an explicit event date field.
        const date = cleanText(item.date || '');
        
        const venue = cleanText(item.venue || '');
        
        let link = liveUrl;
        if (item.slug) {
          // If the item has a slug, generate a slug URL
          link = `${liveUrl.replace(/\/$/, '')}?post=${item.slug}`;
        } else if (item.id) {
          if (liveUrl.includes('kinggnu')) {
            link = `https://kinggnu.jp/news/in.html?id=${item.id}`;
          } else {
            link = `${liveUrl}?id=${item.id}`;
          }
        } else if (item.link) {
          try {
            link = new URL(item.link, liveUrl).href;
          } catch (e) {
            link = item.link;
          }
        }
        
        if (title) {
          results.push({
            title,
            date,
            venue,
            link,
          });
        }
      }
      return results;
    }
  } catch (jsonError) {
    // Fail silently and fallback to HTML parsing
  }

  // Auto-detect XML content to enable xmlMode for proper CDATA and tag parsing
  const isXml = content.trim().startsWith('<?xml') || liveUrl.toLowerCase().endsWith('.xml');
  const $ = cheerio.load(content, isXml ? { xmlMode: true } : undefined);
  const items = $(selectorItem);

  if (items.length === 0) {
    throw new Error(
      `No items found matching the selector "${selectorItem}". Please verify the selector or check if the content is dynamically loaded.`
    );
  }

  const results: ScrapedEvent[] = [];

  items.each((_, element) => {
    const el = $(element);

    // Helper to get text or attribute
    const getValue = (selector: string): string => {
      if (!selector) return '';
      let val = '';
      if (selector.startsWith('@')) {
        const attrName = selector.slice(1);
        val = el.attr(attrName) || '';
      } else if (selector.includes('@')) {
        const [subSelector, attrName] = selector.split('@');
        const subEl = subSelector ? el.find(subSelector) : el;
        val = subEl.attr(attrName) || '';
      } else {
        val = el.find(selector).text();
      }

      // If text contains HTML tags (e.g. CDATA containing tags), strip tags for clean text
      if (val && /<[a-z/][^>]*>/i.test(val)) {
        try {
          val = cheerio.load(val).text();
        } catch (e) {
          // Fallback to original
        }
      }

      return cleanText(val);
    };

    // Extract Date
    let date = getValue(selectorDate);

    // Extract Title (excluding nested Date element)
    let title = '';
    if (selectorTitle) {
      if (selectorTitle.startsWith('@') || selectorTitle.includes('@')) {
        title = getValue(selectorTitle);
      } else {
        const titleEl = el.find(selectorTitle).clone();
        if (selectorDate && !selectorDate.startsWith('@') && !selectorDate.includes('@')) {
          titleEl.find(selectorDate).remove();
        }
        title = cleanText(titleEl.text());
      }
    } else {
      const cloneEl = el.clone();
      if (selectorDate && !selectorDate.startsWith('@') && !selectorDate.includes('@')) {
        cloneEl.find(selectorDate).remove();
      }
      title = cleanText(cloneEl.text());
    }

    // If title is empty, skip or use a placeholder
    if (!title) {
      return;
    }

    // Extract Venue / description
    let venue = getValue(selectorVenue);

    // Extract Link
    let link = liveUrl;
    let foundHref: string | undefined = undefined;

    if (selectorLink) {
      if (selectorLink.startsWith('@')) {
        const attrName = selectorLink.slice(1);
        foundHref = el.attr(attrName);
      } else if (selectorLink.includes('@')) {
        const [subSelector, attrName] = selectorLink.split('@');
        const subEl = subSelector ? el.find(subSelector) : el;
        foundHref = subEl.attr(attrName);
      } else {
        let linkElement: any = el.find(selectorLink);
        if (linkElement.length === 0 && el.is(selectorLink)) {
          linkElement = el; // Selected item itself is the link
        }
        foundHref = linkElement.attr('href');
      }
    }

    // Fallback: Check if the raw HTML contains a link (helpful for CDATA with HTML tags)
    if (!foundHref) {
      const elementHtml = el.html() || '';
      const hrefMatch = elementHtml.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        foundHref = hrefMatch[1];
      }
    }

    if (foundHref) {
      try {
        link = new URL(foundHref, liveUrl).href;
      } catch (e) {
        link = foundHref;
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
