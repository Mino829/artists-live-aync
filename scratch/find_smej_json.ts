const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

async function run() {
  const url = 'https://www.sonymusic.co.jp/common/assets/javascripts/application.js';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, { headers });
    const js = await res.text();
    console.log(`JS Length: ${js.length}`);

    // Let's search for keywords case-insensitively
    const keywords = ['jsonp', 'json', 'ajax', 'information', 'api/'];
    for (const kw of keywords) {
      console.log(`\n=== Searching for "${kw}" ===`);
      let pos = 0;
      let count = 0;
      while (true) {
        const idx = js.toLowerCase().indexOf(kw.toLowerCase(), pos);
        if (idx === -1) break;
        count++;
        console.log(`Match ${count} at index ${idx}:`);
        const start = Math.max(0, idx - 150);
        const end = Math.min(js.length, idx + kw.length + 150);
        console.log(`[... ${js.slice(start, end).replace(/\s+/g, ' ')} ...]`);
        pos = idx + 1;
        if (count >= 10) {
          console.log(`Too many matches, truncating...`);
          break;
        }
      }
    }

  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

run();
