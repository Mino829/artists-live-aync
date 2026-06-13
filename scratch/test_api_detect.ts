import * as cheerio from 'cheerio';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

async function findApiEndpoints(siteName: string, baseUrl: string, pageUrl: string) {
  console.log(`\n=== Finding API endpoints for ${siteName} (${pageUrl}) ===`);
  try {
    const res = await fetch(pageUrl, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);
    const scripts: string[] = [];

    $('script').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const fullUrl = new URL(src, baseUrl).href;
          scripts.push(fullUrl);
        } catch (e) {}
      }
    });

    console.log(`Found ${scripts.length} script tags.`);

    // Also test common Sony Music patterns under their own domain
    const candidateUrls = [
      `${baseUrl}/json/v2/artist/${siteName.toLowerCase()}/information/list/start/0/count/10`,
      `${baseUrl}/json/v2/artist/yoasobi/information/list/start/0/count/10`,
      `${baseUrl}/json/v2/artist/breimen/information/list/start/0/count/10`,
      `${baseUrl}/json/v2/artist/millenniumparade/information/list/start/0/count/10`,
      `${baseUrl}/api/news`,
      `${baseUrl}/api/information`,
    ];

    for (const cand of candidateUrls) {
      try {
        const testRes = await fetch(cand, { headers });
        if (testRes.ok) {
          const text = await testRes.text();
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            console.log(`  [MATCH] Found API directly at: ${cand} (Status: ${testRes.status})`);
            console.log(`  Data sample:`, text.slice(0, 200));
            return;
          }
        }
      } catch (e) {}
    }

    // Scan the JS bundles for URLs or keywords
    for (const scriptUrl of scripts) {
      console.log(`Scanning JS: ${scriptUrl}`);
      try {
        const jsRes = await fetch(scriptUrl, { headers });
        if (!jsRes.ok) continue;
        const jsText = await jsRes.text();

        // Search for api patterns
        const regexes = [
          /https?:\/\/[a-zA-Z0-9.-]+\/json\/v2\/artist\/[a-zA-Z0-9_-]+/g,
          /\/json\/v2\/artist\/[a-zA-Z0-9_-]+/g,
          /info(?:rmation)?\/list/g,
          /sonymusic\.co\.jp/g,
          /https?:\/\/[a-zA-Z0-9.-]+\/api\/[a-zA-Z0-9_-]+/g,
          /\/api\/[a-zA-Z0-9_-]+/g,
        ];

        for (const regex of regexes) {
          const matches = jsText.match(regex);
          if (matches) {
            console.log(`  Found matches for ${regex}:`, Array.from(new Set(matches)).slice(0, 5));
          }
        }
      } catch (e) {
        console.log(`  Failed to scan JS: ${scriptUrl}`);
      }
    }
  } catch (err: any) {
    console.error(`Error scanning ${siteName}:`, err.message);
  }
}

async function run() {
  await findApiEndpoints('yoasobi', 'https://www.yoasobi-music.jp', 'https://www.yoasobi-music.jp/news');
  await findApiEndpoints('breimen', 'https://www.brei.men', 'https://www.brei.men/live/');
  await findApiEndpoints('millenniumparade', 'https://millenniumparade.com', 'https://millenniumparade.com/');
}

run();
