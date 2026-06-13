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

    // Extract import map
    const importMapText = $('script[type="importmap"]').text();
    const importMap = JSON.parse(importMapText);
    console.log("=== Import Map ===");
    console.log(importMap);

    const baseUrl = 'https://millenniumparade.com/';

    // We can scan each local module in the import map
    for (const [key, relPath] of Object.entries(importMap.imports)) {
      if (typeof relPath === 'string' && relPath.startsWith('./')) {
        const fullUrl = new URL(relPath, baseUrl).href;
        console.log(`Scanning module: ${key} (${fullUrl})`);
        try {
          const modRes = await fetch(fullUrl, { headers });
          if (!modRes.ok) continue;
          const code = await modRes.text();

          // Check if code contains words like 'json', 'api', 'http', 'sonymusic'
          const keywords = ['json', 'sonymusic', 'api', 'fetch', 'ajax', 'information', 'live', 'news'];
          const foundKeywords = keywords.filter(kw => code.toLowerCase().includes(kw));
          if (foundKeywords.length > 0) {
            console.log(`  Keywords found:`, foundKeywords);
            // Print lines containing these keywords
            const lines = code.split('\n');
            lines.forEach((line, idx) => {
              if (keywords.some(kw => line.toLowerCase().includes(kw))) {
                if (line.length < 300) {
                  console.log(`    Line ${idx + 1}: ${line.trim()}`);
                } else {
                  console.log(`    Line ${idx + 1}: ${line.trim().slice(0, 300)}...`);
                }
              }
            });
          }
        } catch (e: any) {
          console.log(`  Failed: ${e.message}`);
        }
      }
    }

  } catch (e: any) {
    console.error(e.message);
  }
}

run();
