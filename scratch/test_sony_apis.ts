const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

async function testUrl(url: string) {
  try {
    const res = await fetch(url, { headers });
    console.log(`URL: ${url} -> Status: ${res.status}`);
    if (res.ok) {
      const text = await res.text();
      console.log(`  Length: ${text.length}`);
      console.log(`  Sample (first 200 chars):`, text.slice(0, 200));
      return true;
    }
  } catch (e: any) {
    console.log(`URL: ${url} -> Error: ${e.message}`);
  }
  return false;
}

async function run() {
  console.log(`=== Testing YOASOBI API candidates ===`);
  const yoasobiCandidates = [
    'https://www.sonymusic.co.jp/json/v2/artist/yoasobi/information/list/start/0/count/10',
    'https://www.sonymusic.co.jp/json/v2/artist/YOASOBI/information/list/start/0/count/10',
    'https://www.yoasobi-music.jp/json/v2/artist/yoasobi/information/list/start/0/count/10',
    'https://www.yoasobi-music.jp/json/v2/artist/YOASOBI/information/list/start/0/count/10',
  ];
  for (const c of yoasobiCandidates) {
    await testUrl(c);
  }

  console.log(`\n=== Testing BREIMEN API candidates ===`);
  const breimenCandidates = [
    'https://www.sonymusic.co.jp/json/v2/artist/breimen/information/list/start/0/count/10',
    'https://www.sonymusic.co.jp/json/v2/artist/BREIMEN/information/list/start/0/count/10',
    'https://www.brei.men/json/v2/artist/breimen/information/list/start/0/count/10',
    'https://www.brei.men/json/v2/artist/BREIMEN/information/list/start/0/count/10',
  ];
  for (const c of breimenCandidates) {
    await testUrl(c);
  }

  console.log(`\n=== Testing MILLENNIUM PARADE API candidates ===`);
  const mpCandidates = [
    'https://www.sonymusic.co.jp/json/v2/artist/millenniumparade/information/list/start/0/count/10',
    'https://www.sonymusic.co.jp/json/v2/artist/MILLENNIUMPARADE/information/list/start/0/count/10',
    'https://www.sonymusic.co.jp/json/v2/artist/millennium-parade/information/list/start/0/count/10',
    'https://www.sonymusic.co.jp/json/v2/artist/millennium_parade/information/list/start/0/count/10',
    'https://millenniumparade.com/json/v2/artist/millenniumparade/information/list/start/0/count/10',
    'https://millenniumparade.com/json/v2/artist/MILLENNIUMPARADE/information/list/start/0/count/10',
    'https://millenniumparade.com/json/v2/artist/millennium-parade/information/list/start/0/count/10',
  ];
  for (const c of mpCandidates) {
    await testUrl(c);
  }

  console.log(`\n=== Reading BREIMEN api.js ===`);
  try {
    const jsRes = await fetch('https://www.brei.men/assets/js/api.js', { headers });
    if (jsRes.ok) {
      const jsText = await jsRes.text();
      console.log(jsText.slice(0, 1500)); // Print first 1500 chars of api.js
    } else {
      console.log(`Failed to fetch BREIMEN api.js`);
    }
  } catch (e: any) {
    console.log(`Error fetching BREIMEN api.js: ${e.message}`);
  }
}

run();
