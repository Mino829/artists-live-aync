import * as cheerio from 'cheerio';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

async function run() {
  const url = 'https://www.sonymusic.co.jp/artist/MILLENNIUMPARADE/info/';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);

    const scriptUrls: string[] = [];
    $('script').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const fullUrl = new URL(src, url).href;
          scriptUrls.push(fullUrl);
        } catch (e) {}
      }
    });

    console.log(`Found ${scriptUrls.length} script tags.`);
    for (const src of scriptUrls) {
      console.log(`Scanning JS: ${src}`);
      try {
        const jsRes = await fetch(src, { headers });
        if (!jsRes.ok) continue;
        const code = await jsRes.text();

        // Search for JSON API paths
        const matches = code.match(/\/json\/v2\/[a-zA-Z0-9_/.-]+/g) || [];
        if (matches.length > 0) {
          console.log(`  Found json/v2 matches in ${src}:`, Array.from(new Set(matches)));
        }

        // Also search for window.smej or similar artist variables
        const sMatches = code.match(/artist(?:Id|Name|Url)?\s*:\s*['"][a-zA-Z0-9_-]+['"]/gi) || [];
        if (sMatches.length > 0) {
          console.log(`  Found artist variables:`, Array.from(new Set(sMatches)));
        }

        // Search for variables like "ARTIST_NAME" or similar
        const varMatches = code.match(/(?:const|var|let)\s+[a-zA-Z0-9_-]*artist[a-zA-Z0-9_-]*\s*=\s*['"][^'"]+['"]/gi) || [];
        if (varMatches.length > 0) {
          console.log(`  Found artist variable declarations:`, Array.from(new Set(varMatches)));
        }

      } catch (e: any) {
        console.log(`  Failed to fetch: ${e.message}`);
      }
    }

    // Check if there is some global config object in inline scripts
    $('script').each((i, el) => {
      const text = $(el).text();
      if (text.includes('smej') || text.includes('Artist') || text.includes('artist')) {
        console.log(`Inline script ${i} matches:`);
        const lines = text.split('\n');
        lines.forEach(line => {
          if (line.includes('artist') || line.includes('Artist') || line.includes('Id') || line.includes('id') || line.includes('json')) {
            console.log(`  Line: ${line.trim()}`);
          }
        });
      }
    });

  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

run();
