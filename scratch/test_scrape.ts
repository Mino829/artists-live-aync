import * as cheerio from 'cheerio';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

async function testFetch(name: string, url: string) {
  console.log(`\n==================================================`);
  console.log(`Testing: ${name} (${url})`);
  console.log(`==================================================`);
  try {
    const res = await fetch(url, { headers });
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.log(`Failed to fetch`);
      return;
    }
    const html = await res.text();
    console.log(`HTML Length: ${html.length}`);

    // Check if __NEXT_DATA__ exists
    if (html.includes('__NEXT_DATA__')) {
      console.log(`Found __NEXT_DATA__!`);
      const regex = new RegExp('<script\\s+id="__NEXT_DATA__"\\s+type="application/json">([\\s\\S]*?)</script>');
      const match = html.match(regex);
      if (match) {
        try {
          const json = JSON.parse(match[1]);
          console.log(`__NEXT_DATA__ Keys:`, Object.keys(json));
          console.log(`__NEXT_DATA__ sample structure (props):`, JSON.stringify(json.props).slice(0, 500));
        } catch (e) {
          console.log(`Error parsing __NEXT_DATA__ JSON`);
        }
      }
    }

    // Check if it is a Nuxt or other framework site (like YOASOBI)
    if (html.includes('__NUXT__')) {
      console.log(`Found __NUXT__!`);
    }

    const $ = cheerio.load(html);
    
    // Dump some tags
    console.log(`Title tag:`, $('title').text());
    
    // Let's print some structural snippets
    if (name === 'Fujii Kaze') {
      // Let's find news elements based on previous context: fujiikaze.com uses specific structure
      // e.g. .fk-news-archive__item or similar
      const items = $('.fk-news-archive__item, li.fk-news-archive__item, .fk-news-item, li');
      console.log(`Fujii Kaze: found ${$('li.fk-news-archive__item').length} items with selector "li.fk-news-archive__item"`);
      console.log(`Sample HTML of first item:`, $('li.fk-news-archive__item').first().html() || 'Not found');
    }
    else if (name === 'ZUTOMAYO') {
      // previous context mentions: <section class="ztmy-topics" id="newsid_xxx">
      console.log(`ZUTOMAYO: found ${$('.ztmy-topics').length} items with selector ".ztmy-topics"`);
      console.log(`Sample HTML of first item:`, $('.ztmy-topics').first().html() || 'Not found');
    }
    else if (name === 'BREIMEN') {
      // Let's print some generic list/item elements to see where news or lives are
      console.log(`BREIMEN: listing some potential wrapper elements:`);
      console.log(`Found article elements:`, $('article').length);
      console.log(`Found .live or .news classes:`, $('.live, .news, .item, li').length);
      // Let's dump the outer HTML of the main/body area to understand structure
      console.log(`Body outline:`, $('body').html()?.slice(0, 1000));
    }
    else if (name === 'MILLENNIUM PARADE') {
      console.log(`MILLENNIUM PARADE: body outline:`);
      console.log(`Body outline:`, $('body').html()?.slice(0, 1000));
    }
    else if (name === 'YOASOBI') {
      console.log(`YOASOBI: body outline or script tags:`);
      console.log(`Body outline:`, $('body').html()?.slice(0, 1000));
      // Yoasobi might be Nuxt SPA, let's list script tags
      $('script').each((i, el) => {
        const src = $(el).attr('src');
        if (src) console.log(`Script src:`, src);
        else console.log(`Inline script length:`, $(el).html()?.length);
      });
    }

  } catch (err: any) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  await testFetch('Fujii Kaze', 'https://fujiikaze.com/news/');
  await testFetch('ZUTOMAYO', 'https://zutomayo.net/news/');
  await testFetch('BREIMEN', 'https://www.brei.men/live/');
  await testFetch('MILLENNIUM PARADE', 'https://millenniumparade.com/');
  await testFetch('YOASOBI', 'https://www.yoasobi-music.jp/news');
}

run();
