import { POST } from '../src/app/api/artists/route';

async function main() {
  try {
    const request = new Request('http://localhost:3000/api/artists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Mr.Children (News - XML)',
        liveUrl: 'https://www.mrchildren.jp/news/news.xml',
        selectorItem: 'news',
        selectorTitle: 'news_header',
        selectorDate: '@date',
        selectorVenue: 'news_content',
        selectorLink: 'news_content a@href',
      }),
    });

    const response = await POST(request);
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('API call failed:', err);
  }
}

main();
