import { Client } from '@notionhq/client';

async function main() {
  const apiKey = 'ntn_e20154201218yyoK48KDK97KAvo1WiAKaPBgfg4amr15TS';
  const databaseId = '37d07820ded98098836bd3a6f9a0b9c3';

  try {
    const notion = new Client({ auth: apiKey, notionVersion: '2022-06-28' });
    console.log('Retrieving database...');
    const dbResponse = await notion.databases.retrieve({ database_id: databaseId });
    console.log('Success! Properties keys:', Object.keys((dbResponse as any).properties || {}));
    console.log('Response properties existence:', 'properties' in dbResponse);
  } catch (error: any) {
    console.error('Notion test failed with error:', error);
  }
}

main();
