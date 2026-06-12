import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export interface NotionConfig {
  notionApiKey: string;
  notionDatabaseId: string;
  discordWebhookUrl?: string;
  slackWebhookUrl?: string;
  lineChannelAccessToken?: string;
  lineUserId?: string;
  notificationEnabled?: boolean;
}

export interface Artist {
  id: string;
  name: string;
  liveUrl: string;
  selectorItem: string;
  selectorTitle: string;
  selectorDate: string;
  selectorVenue: string;
  selectorLink: string;
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'success' | 'failed';
  errorMessage: string | null;
}

export interface LiveEvent {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  date: string;
  venue: string;
  link: string;
  notionPageId: string | null;
  scrapedAt: string;
  syncedAt: string | null;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  trigger: 'manual' | 'cron';
  results: {
    artistName: string;
    status: 'success' | 'failed';
    scrapedCount: number;
    newCount: number;
    syncedCount: number;
    errorMessage: string | null;
  }[];
}

export interface DatabaseSchema {
  config: NotionConfig;
  artists: Artist[];
  events: LiveEvent[];
  syncLogs: SyncLog[];
}

const DEFAULT_DB: DatabaseSchema = {
  config: {
    notionApiKey: '',
    notionDatabaseId: '',
    discordWebhookUrl: '',
    slackWebhookUrl: '',
    lineChannelAccessToken: '',
    lineUserId: '',
    notificationEnabled: false,
  },
  artists: [
    {
      id: 'kenshi-yonezu',
      name: '米津玄師 (Kenshi Yonezu)',
      liveUrl: 'https://reissuerecords.net/live/',
      selectorItem: 'li.news_list_body',
      selectorTitle: 'h1',
      selectorDate: '.news_list_date',
      selectorVenue: 'p',
      selectorLink: 'a',
      lastSyncedAt: null,
      status: 'idle',
      errorMessage: null,
    }
  ],
  events: [],
};

// Ensure database file and directory exist
function ensureDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

export function readDb(): DatabaseSchema {
  ensureDb();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content) as DatabaseSchema;
  } catch (error) {
    console.error('Failed to read database file, reverting to default:', error);
    return DEFAULT_DB;
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write to database file:', error);
  }
}

// Config CRUD
export function getConfig(): NotionConfig {
  const db = readDb();
  return db.config;
}

export function saveConfig(config: NotionConfig): void {
  const db = readDb();
  db.config = config;
  writeDb(db);
}

// Artists CRUD
export function getArtists(): Artist[] {
  const db = readDb();
  return db.artists;
}

export function saveArtist(artist: Artist): void {
  const db = readDb();
  const index = db.artists.findIndex((a) => a.id === artist.id);
  if (index >= 0) {
    db.artists[index] = { ...db.artists[index], ...artist };
  } else {
    db.artists.push(artist);
  }
  writeDb(db);
}

export function deleteArtist(id: string): void {
  const db = readDb();
  db.artists = db.artists.filter((a) => a.id !== id);
  db.events = db.events.filter((e) => e.artistId !== id); // Cascade delete events
  writeDb(db);
}

// Events CRUD
export function getEvents(): LiveEvent[] {
  const db = readDb();
  return db.events;
}

export function saveEvents(newEvents: LiveEvent[]): void {
  const db = readDb();
  newEvents.forEach((newEvent) => {
    const index = db.events.findIndex((e) => e.id === newEvent.id);
    if (index >= 0) {
      // Keep existing notionPageId and syncedAt if already synced
      db.events[index] = {
        ...newEvent,
        notionPageId: db.events[index].notionPageId || newEvent.notionPageId,
        syncedAt: db.events[index].syncedAt || newEvent.syncedAt,
      };
    } else {
      db.events.push(newEvent);
    }
  });
  writeDb(db);
}

export function updateEventSyncStatus(
  eventId: string,
  notionPageId: string,
  syncedAt: string
): void {
  const db = readDb();
  const index = db.events.findIndex((e) => e.id === eventId);
  if (index >= 0) {
    db.events[index].notionPageId = notionPageId;
    db.events[index].syncedAt = syncedAt;
    writeDb(db);
  }
}

export function getSyncLogs(): SyncLog[] {
  const db = readDb();
  return db.syncLogs || [];
}

export function addSyncLog(log: Omit<SyncLog, 'id' | 'timestamp'>): void {
  const db = readDb();
  if (!db.syncLogs) {
    db.syncLogs = [];
  }
  const newLog: SyncLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    trigger: log.trigger || 'manual',
    results: log.results,
  };
  
  db.syncLogs = [newLog, ...db.syncLogs].slice(0, 100);
  writeDb(db);
}
