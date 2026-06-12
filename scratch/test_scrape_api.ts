import { POST } from '../src/app/api/scrape/route';

async function main() {
  try {
    const request = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artistId: 'mr-children-news-xml',
      }),
    });

    console.log('Triggering scrape and sync for Mr.Children...');
    const response = await POST(request);
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('API call failed:', err);
  }
}

main();
