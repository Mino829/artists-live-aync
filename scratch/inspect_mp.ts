import * as cheerio from 'cheerio';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

async function run() {
  try {
    const res = await fetch('https://millenniumparade.com/', { headers });
    const html = await res.text();
    const $ = cheerio.load(html);

    console.log("=== MILLENNIUM PARADE Script Tags ===");
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      const type = $(el).attr('type');
      const text = $(el).text();
      console.log(`Script ${i}: src="${src || ''}" type="${type || ''}"`);
      if (text.trim()) {
        console.log(`  Content preview:`, text.trim().slice(0, 500));
      }
    });

    console.log("\n=== Checking links or imports ===");
    $('link').each((i, el) => {
      const href = $(el).attr('href');
      const rel = $(el).attr('rel');
      console.log(`Link ${i}: rel="${rel || ''}" href="${href || ''}"`);
    });

  } catch (e: any) {
    console.error(e.message);
  }
}

run();
