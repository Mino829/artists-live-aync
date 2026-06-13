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

    // Let's search for Vue components or AJAX calls related to "news-content"
    const lines = js.split('\n');
    console.log(`Total lines: ${lines.length}`);

    const keywords = ['news-content', 'information/list', 'information', '/json/v2/'];
    lines.forEach((line, idx) => {
      if (keywords.some(kw => line.includes(kw))) {
        console.log(`Line ${idx + 1}: ${line.trim().slice(0, 300)}`);
      }
    });

  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

run();
