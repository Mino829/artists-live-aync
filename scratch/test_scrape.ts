import { scrapeLiveInfo } from '../src/lib/scraper';

async function main() {
  try {
    const results = await scrapeLiveInfo({
      liveUrl: 'https://www.mrchildren.jp/news/news.xml',
      selectorItem: 'news',
      selectorTitle: 'news_header',
      selectorDate: '@date',
      selectorVenue: 'news_content',
      selectorLink: 'news_content a@href',
    });
    console.log(`Successfully scraped ${results.length} items.`);
    console.log('Sample item:', JSON.stringify(results[0], null, 2));
  } catch (error) {
    console.error('Scrape failed:', error);
  }
}

main();
