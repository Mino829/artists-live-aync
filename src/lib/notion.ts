import { Client } from '@notionhq/client';

export interface NotionSyncItem {
  title: string;
  artistName: string;
  date: string;
  venue: string;
  link: string;
}

/**
 * Validates Notion credentials by attempting to retrieve the database.
 */
export async function validateNotionConnection(apiKey: string, databaseId: string): Promise<boolean> {
  try {
    const notion = new Client({ auth: apiKey, notionVersion: '2022-06-28' });
    await notion.databases.retrieve({ database_id: databaseId });
    return true;
  } catch (error) {
    console.error('Notion validation failed:', error);
    return false;
  }
}

/**
 * Ensures the Notion database has the required properties, creating them if missing.
 * Returns the name of the Title property.
 */
async function ensureDatabaseProperties(notion: Client, apiKey: string, databaseId: string): Promise<string> {
  const dbResponse = await notion.databases.retrieve({ database_id: databaseId });
  if (!('properties' in dbResponse)) {
    console.error('Notion API returned a partial database object:', dbResponse);
    throw new Error(`Could not retrieve full database properties (Response object type: ${dbResponse.object}). Please check if your database exists, the integration is shared with editing permissions, and that you have passed a Database ID rather than a Page ID.`);
  }
  const properties = (dbResponse as any).properties;

  // Find the Title property dynamically (e.g. 'Name', 'Title', 'タイトル')
  const titlePropName = Object.keys(properties).find(
    (key) => properties[key].type === 'title'
  ) || 'Name';

  // Check which required helper properties are missing
  const missingProps: Record<string, any> = {};

  if (!properties['Artist']) {
    missingProps['Artist'] = { select: {} };
  }
  if (!properties['Date']) {
    missingProps['Date'] = { rich_text: {} };
  }
  if (!properties['Venue']) {
    missingProps['Venue'] = { rich_text: {} };
  }
  if (!properties['Link']) {
    missingProps['Link'] = { url: {} };
  }

  // If any are missing, update the database schema
  if (Object.keys(missingProps).length > 0) {
    try {
      const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: missingProps,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to update Notion database properties directly:', errorData);
      } else {
        console.log('Successfully updated Notion database schema directly with missing properties:', Object.keys(missingProps));
      }
    } catch (error) {
      console.error('Failed to update database schema (ensure you gave full editing permissions to the Integration):', error);
      // We still try to proceed, as the user might have custom columns set up manually
    }
  }

  return titlePropName;
}

/**
 * Syncs a single live event to the Notion database.
 * Returns the newly created page ID.
 */
export async function syncEventToNotion(
  apiKey: string,
  databaseId: string,
  item: NotionSyncItem
): Promise<string> {
  const notion = new Client({ auth: apiKey, notionVersion: '2022-06-28' });

  // 1. Ensure columns exist and get the Title column name
  const titleColumnName = await ensureDatabaseProperties(notion, apiKey, databaseId);

  // 2. Prepare page properties
  const properties: Record<string, any> = {
    [titleColumnName]: {
      title: [
        {
          text: {
            content: item.title,
          },
        },
      ],
    },
    'Artist': {
      select: {
        name: item.artistName,
      },
    },
    'Date': {
      rich_text: [
        {
          text: {
            content: item.date || 'TBA',
          },
        },
      ],
    },
    'Venue': {
      rich_text: [
        {
          text: {
            content: item.venue || 'TBA',
          },
        },
      ],
    },
  };

  // Only add link if it is valid URL
  if (item.link) {
    try {
      new URL(item.link);
      properties['Link'] = {
        url: item.link,
      };
    } catch (e) {
      // Ignore invalid URL, save it as a note in description or skip link
    }
  }

  // 3. Create the page in the database
  const pageResponse = await notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties,
  });

  return pageResponse.id;
}
