'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Artist {
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

interface LiveEvent {
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

interface ConsoleLog {
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'default';
}

const PRESETS = [
  {
    name: '米津玄師 (Kenshi Yonezu)',
    liveUrl: 'https://reissuerecords.net/live/',
    selectorItem: 'li.news_list_body',
    selectorTitle: 'h1',
    selectorDate: '.news_list_date',
    selectorVenue: 'p',
    selectorLink: 'a',
  },
  {
    name: 'Official髭男dism (Official Hige Dandism)',
    liveUrl: 'https://higedan.com/news/7/?range=future_event_end_time&sort=asc',
    selectorItem: '.list--live .inner',
    selectorTitle: '.tit',
    selectorDate: '.date',
    selectorVenue: '.tit',
    selectorLink: 'a',
  },
  {
    name: '櫻坂46 (Sakurazaka46 - News)',
    liveUrl: 'https://sakurazaka46.com/s/s46/news/list',
    selectorItem: 'ul.com-news-part li.box',
    selectorTitle: '.lead',
    selectorDate: '.date',
    selectorVenue: '.type',
    selectorLink: 'a',
  },
  {
    name: 'King Gnu (News - JSON)',
    liveUrl: 'https://www.sonymusic.co.jp/json/v2/artist/kinggnu/information/list/start/0/count/10',
    selectorItem: 'json',
    selectorTitle: '',
    selectorDate: '',
    selectorVenue: '',
    selectorLink: '',
  },
  {
    name: 'パソコン音楽クラブ (Pasocom Music Club)',
    liveUrl: 'https://www.pasoconongaku.club/',
    selectorItem: 'json',
    selectorTitle: '',
    selectorDate: '',
    selectorVenue: '',
    selectorLink: '',
  },
  {
    name: 'サカナクション (Sakanaction)',
    liveUrl: 'https://sakanaction.jp/news/',
    selectorItem: '#posts li.post',
    selectorTitle: '.tit',
    selectorDate: '.date',
    selectorVenue: '',
    selectorLink: 'a',
  },
  {
    name: 'MONO NO AWARE',
    liveUrl: 'https://mono-no-aware.jp/news/',
    selectorItem: '.sec04 ul li',
    selectorTitle: '.ttl',
    selectorDate: '.live_detail_inner div p:first-child',
    selectorVenue: '.schedule',
    selectorLink: 'a',
  },
  {
    name: 'Tempalay',
    liveUrl: 'https://tempalay.jp/news/',
    selectorItem: '#news .list .post',
    selectorTitle: 'h3',
    selectorDate: '.date',
    selectorVenue: '',
    selectorLink: 'a',
  },
  {
    name: '≠ME (Not Equal Me)',
    liveUrl: 'https://not-equal-me.jp/news/1/',
    selectorItem: '.infoList li',
    selectorTitle: '.tit',
    selectorDate: '.date',
    selectorVenue: '',
    selectorLink: 'a',
  },
  {
    name: '=LOVE (Equal Love)',
    liveUrl: 'https://equal-love.jp/news/',
    selectorItem: '.infoList li',
    selectorTitle: '.tit',
    selectorDate: '.date',
    selectorVenue: '',
    selectorLink: 'a',
  },
  {
    name: 'Mr.Children (News - XML)',
    liveUrl: 'https://www.mrchildren.jp/news/news.xml',
    selectorItem: 'news',
    selectorTitle: 'news_header',
    selectorDate: '@date',
    selectorVenue: 'news_content',
    selectorLink: 'news_content a@href',
  },
  {
    name: '藤井風 (Fujii Kaze)',
    liveUrl: 'https://natalie.mu/music/artist/115314',
    selectorItem: '#news div.NA_card',
    selectorTitle: 'p.NA_card_title',
    selectorDate: 'div.NA_card_date',
    selectorVenue: '',
    selectorLink: 'a@href',
  },
  {
    name: 'YOASOBI',
    liveUrl: 'https://natalie.mu/music/artist/116642',
    selectorItem: '#news div.NA_card',
    selectorTitle: 'p.NA_card_title',
    selectorDate: 'div.NA_card_date',
    selectorVenue: '',
    selectorLink: 'a@href',
  },
  {
    name: 'ずっと真夜中でいいのに。 (ZUTOMAYO)',
    liveUrl: 'https://natalie.mu/music/artist/110261',
    selectorItem: '#news div.NA_card',
    selectorTitle: 'p.NA_card_title',
    selectorDate: 'div.NA_card_date',
    selectorVenue: '',
    selectorLink: 'a@href',
  },
  {
    name: 'BREIMEN',
    liveUrl: 'https://natalie.mu/music/artist/119338',
    selectorItem: '#news div.NA_card',
    selectorTitle: 'p.NA_card_title',
    selectorDate: 'div.NA_card_date',
    selectorVenue: '',
    selectorLink: 'a@href',
  },
  {
    name: 'MILLENNIUM PARADE',
    liveUrl: 'https://natalie.mu/music/artist/118029',
    selectorItem: '#news div.NA_card',
    selectorTitle: 'p.NA_card_title',
    selectorDate: 'div.NA_card_date',
    selectorVenue: '',
    selectorLink: 'a@href',
  },
  {
    name: 'Custom Artist (Manually Configure)',
    liveUrl: '',
    selectorItem: '',
    selectorTitle: '',
    selectorDate: '',
    selectorVenue: '',
    selectorLink: '',
  }
];

export default function Dashboard() {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'feed' | 'artists'>('feed');

  // Notion Settings State
  const [notionApiKey, setNotionApiKey] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [isNotionConfigured, setIsNotionConfigured] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Notification Settings State
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showDiscordHelp, setShowDiscordHelp] = useState(false);
  const [showLineHelp, setShowLineHelp] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [isDashboardUrlCopied, setIsDashboardUrlCopied] = useState(false);
  const [dashboardUrlCopyError, setDashboardUrlCopyError] = useState('');
  const [healthCheckUrl, setHealthCheckUrl] = useState('/api/health');
  const [isHealthUrlCopied, setIsHealthUrlCopied] = useState(false);
  const [healthUrlCopyError, setHealthUrlCopyError] = useState('');

  // Access Authentication State
  const [accessPasswordInput, setAccessPasswordInput] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Sync Log State
  interface SyncLog {
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
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [activeFeedTab, setActiveFeedTab] = useState<'events' | 'syncLogs'>('events');

  // Artists State
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);

  // Events State
  const [events, setEvents] = useState<LiveEvent[]>([]);

  // Add/Edit Artist Form State
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [artistNameInput, setArtistNameInput] = useState('');
  const [artistLiveUrlInput, setArtistLiveUrlInput] = useState('');
  const [selectorItemInput, setSelectorItemInput] = useState('');
  const [selectorTitleInput, setSelectorTitleInput] = useState('');
  const [selectorDateInput, setSelectorDateInput] = useState('');
  const [selectorVenueInput, setSelectorVenueInput] = useState('');
  const [selectorLinkInput, setSelectorLinkInput] = useState('');
  const [isSavingArtist, setIsSavingArtist] = useState(false);

  // Scraper Test State
  const [isTestingScraper, setIsTestingScraper] = useState(false);
  const [testResults, setTestResults] = useState<{ success: boolean; count: number; items: any[]; error?: string } | null>(null);

  // Console Logs State
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Global Scrape State
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Verify saved password on boot
  useEffect(() => {
    const saved = localStorage.getItem('access_password');
    if (saved) {
      verifySavedPassword(saved);
    } else {
      setAuthChecking(false);
      setIsLoadingArtists(false);
    }
  }, []);

  // Fetch initial data when authenticated
  useEffect(() => {
    if (isAuthenticated && accessPassword) {
      fetchConfig();
      fetchArtists();
      fetchSyncLogs();
    }
  }, [isAuthenticated, accessPassword]);

  useEffect(() => {
    if (isAuthenticated) {
      const currentUrl = window.location.origin;
      setDashboardUrl(currentUrl);
      setHealthCheckUrl(`${currentUrl}/api/health`);
    }
  }, [isAuthenticated]);

  const verifySavedPassword = async (saved: string) => {
    try {
      const res = await fetch('/api/auth/check', {
        headers: { 'x-api-key': saved }
      });
      if (res.ok) {
        setAccessPassword(saved);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('access_password');
      }
    } catch (e) {
      localStorage.removeItem('access_password');
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessPasswordInput.trim()) return;

    setIsVerifyingPassword(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: accessPasswordInput }),
      });

      if (res.ok) {
        setAccessPassword(accessPasswordInput);
        setIsAuthenticated(true);
        localStorage.setItem('access_password', accessPasswordInput);
        addLog('Successfully authenticated.', 'success');
      } else {
        const data = await res.json().catch(() => ({ error: 'Invalid password' }));
        setLoginError(data.error || 'Invalid password');
        addLog('Authentication attempt failed: Invalid password.', 'error');
      }
    } catch (err) {
      setLoginError('Failed to contact server for authentication.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Poll for events list when tab or artists update
  useEffect(() => {
    fetchEvents();
  }, [artists, activeTab]);

  // Scroll terminal to bottom when logs are added
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'default' = 'default') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, text, type }]);
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        headers: { 'x-api-key': accessPassword }
      });
      if (res.ok) {
        const data = await res.json();
        setIsNotionConfigured(data.configured);
        setDiscordWebhookUrl(data.discordWebhookUrl || '');
        setSlackWebhookUrl(data.slackWebhookUrl || '');
        setLineChannelAccessToken(data.lineChannelAccessToken || '');
        setLineUserId(data.lineUserId || '');
        setNotificationEnabled(data.notificationEnabled || false);
        if (data.configured) {
          setNotionDatabaseId(data.notionDatabaseId);
          addLog(`Notion同期先に接続しました: ${data.notionDatabaseId}`, 'success');
        } else {
          addLog('Notionは未設定です。公演情報はアプリ内に保存されます。', 'info');
        }
      }
    } catch (e) {
      addLog('Notionの設定状態を取得できませんでした。', 'error');
    }
  };

  const fetchArtists = async () => {
    setIsLoadingArtists(true);
    try {
      const res = await fetch('/api/artists', {
        headers: { 'x-api-key': accessPassword }
      });
      if (res.ok) {
        const data = await res.json();
        setArtists(data);
      }
    } catch (e) {
      addLog('Failed to load artists list', 'error');
    } finally {
      setIsLoadingArtists(false);
    }
  };

  const fetchEvents = async () => {
    try {
      // Get all artists to trigger event loads
      const res = await fetch('/api/artists', {
        headers: { 'x-api-key': accessPassword }
      });
      if (res.ok) {
        // We fetch events from a simple local endpoint. 
        // For standard setup we can fetch the database directly, or load from the JSON file since we read the db
        // Let's call our api to get events. Oh wait, do we have an API endpoint `/api/events`?
        // Wait, did we implement `GET /api/events`? No, we didn't write it yet! 
        // Let's fetch it, or wait, we can fetch all events by requesting a sync status or making a small route.
        // Let's create `GET /api/artists` but we can also return events as part of artists, OR let's implement a small route `/api/events`!
        // That is very clean. Let's see: we can fetch events by hitting an endpoint, or we can fetch them via artists.
        // Wait! Let's check how we can fetch events. We can write a route for `GET /api/events` next.
        // For now, let's fetch `/api/events` and I will write that small endpoint in a second.
        const eventsRes = await fetch('/api/events', {
          headers: { 'x-api-key': accessPassword }
        });
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setEvents(data);
        }
      }
    } catch (e) {
      // Quietly ignore or log
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const res = await fetch('/api/logs', {
        headers: { 'x-api-key': accessPassword }
      });
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handleSaveConfig = async (
    e: React.SyntheticEvent,
    feedbackTarget: 'notion' | 'notifications' = 'notion'
  ) => {
    e.preventDefault();
    setIsSavingConfig(true);
    const isNotionSetup = Boolean(notionApiKey.trim() || notionDatabaseId.trim());
    const useNotionFeedback = feedbackTarget === 'notion';
    if (useNotionFeedback) {
      setConfigFeedback(null);
    } else {
      setNotificationFeedback(null);
    }
    addLog(isNotionSetup ? 'Notion接続を確認して設定を保存します...' : '通知設定を保存します...', 'info');

    // Parse Database ID if a full URL was pasted
    let parsedDbId = notionDatabaseId.trim();
    const urlMatch = parsedDbId.match(/notion\.(?:so|com)\/(?:[^/]+\/)?(?:p\/)?([a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12})/i);
    if (urlMatch) {
      parsedDbId = urlMatch[1];
    }
    
    // Normalize: remove any hyphens from the ID
    parsedDbId = parsedDbId.replace(/-/g, '');
    setNotionDatabaseId(parsedDbId); // Update input field value
    if (urlMatch) addLog('Notion URLからデータベースIDを読み取りました。', 'info');

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': accessPassword
        },
        body: JSON.stringify({
          notionApiKey,
          notionDatabaseId: parsedDbId,
          discordWebhookUrl,
          slackWebhookUrl,
          lineChannelAccessToken,
          lineUserId,
          notificationEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsNotionConfigured(Boolean(data.configured));
        if (useNotionFeedback) {
          setConfigFeedback({ type: 'success', message: data.message });
        } else {
          setNotificationFeedback({ type: 'success', message: '通知設定を保存しました。' });
        }
        addLog('設定を保存しました。', 'success');
        setNotionApiKey(''); // Clear secret
      } else {
        if (useNotionFeedback) {
          setConfigFeedback({ type: 'error', message: data.error });
        } else {
          setNotificationFeedback({ type: 'error', message: data.error });
        }
        addLog(`設定を保存できませんでした: ${data.error}`, 'error');
      }
    } catch (err) {
      const message = '設定APIに接続できませんでした。';
      if (useNotionFeedback) {
        setConfigFeedback({ type: 'error', message });
      } else {
        setNotificationFeedback({ type: 'error', message });
      }
      addLog('設定の保存中に通信エラーが発生しました。', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyHealthUrl = async () => {
    try {
      await navigator.clipboard.writeText(healthCheckUrl);
      setHealthUrlCopyError('');
      setIsHealthUrlCopied(true);
      window.setTimeout(() => setIsHealthUrlCopied(false), 2000);
    } catch {
      setHealthUrlCopyError('URLをコピーできませんでした。URLを選択してコピーしてください。');
    }
  };

  const handleCopyDashboardUrl = async () => {
    try {
      await navigator.clipboard.writeText(dashboardUrl);
      setDashboardUrlCopyError('');
      setIsDashboardUrlCopied(true);
      window.setTimeout(() => setIsDashboardUrlCopied(false), 2000);
    } catch {
      setDashboardUrlCopyError('URLをコピーできませんでした。URLを選択してコピーしてください。');
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestingNotification(true);
    setNotificationFeedback(null);
    addLog('テスト通知を送信しています...', 'info');

    try {
      const res = await fetch('/api/config/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': accessPassword
        },
        body: JSON.stringify({
          discordWebhookUrl,
          slackWebhookUrl,
          lineChannelAccessToken,
          lineUserId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotificationFeedback({ type: 'success', message: 'テスト通知を送信しました。' });
        addLog('テスト通知を送信しました。', 'success');
      } else {
        setNotificationFeedback({ type: 'error', message: data.error });
        addLog(`テスト通知に失敗しました: ${data.error}`, 'error');
      }
    } catch (err) {
      setNotificationFeedback({ type: 'error', message: '通知テストAPIに接続できませんでした。' });
      addLog('通知テスト中に通信エラーが発生しました。', 'error');
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setArtistNameInput(preset.name === 'Custom Artist (Manually Configure)' ? '' : preset.name);
    setArtistLiveUrlInput(preset.liveUrl);
    setSelectorItemInput(preset.selectorItem);
    setSelectorTitleInput(preset.selectorTitle);
    setSelectorDateInput(preset.selectorDate);
    setSelectorVenueInput(preset.selectorVenue);
    setSelectorLinkInput(preset.selectorLink);
    setTestResults(null);
    addLog(`Applied preset: ${preset.name}`, 'default');
  };

  const handleTestScraper = async () => {
    if (!artistLiveUrlInput || !selectorItemInput) {
      addLog('Live URL and Item Selector are required to test the scraper', 'error');
      return;
    }

    setIsTestingScraper(true);
    setTestResults(null);
    addLog(`Testing scraper selectors on page: ${artistLiveUrlInput}...`, 'info');

    try {
      const res = await fetch('/api/scrape/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': accessPassword
        },
        body: JSON.stringify({
          liveUrl: artistLiveUrlInput,
          selectorItem: selectorItemInput,
          selectorTitle: selectorTitleInput,
          selectorDate: selectorDateInput,
          selectorVenue: selectorVenueInput,
          selectorLink: selectorLinkInput,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResults({
          success: true,
          count: data.count,
          items: data.items,
        });
        addLog(`Scraper test successful! Parsed ${data.count} items.`, 'success');
      } else {
        setTestResults({
          success: false,
          count: 0,
          items: [],
          error: data.error,
        });
        addLog(`Scraper test failed: ${data.error}`, 'error');
      }
    } catch (e) {
      setTestResults({
        success: false,
        count: 0,
        items: [],
        error: 'Failed to reach scraper test API',
      });
      addLog('Network error during scraper test execution', 'error');
    } finally {
      setIsTestingScraper(false);
    }
  };

  const handleSaveArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistNameInput || !artistLiveUrlInput || !selectorItemInput) {
      return;
    }

    setIsSavingArtist(true);
    addLog(`Saving configuration for artist: ${artistNameInput}...`, 'info');

    try {
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': accessPassword
        },
        body: JSON.stringify({
          id: editingArtistId,
          name: artistNameInput,
          liveUrl: artistLiveUrlInput,
          selectorItem: selectorItemInput,
          selectorTitle: selectorTitleInput,
          selectorDate: selectorDateInput,
          selectorVenue: selectorVenueInput,
          selectorLink: selectorLinkInput,
        }),
      });

      if (res.ok) {
        addLog(`Artist "${artistNameInput}" saved successfully!`, 'success');
        resetArtistForm();
        fetchArtists();
      } else {
        const err = await res.json();
        addLog(`Failed to save artist: ${err.error}`, 'error');
      }
    } catch (error) {
      addLog('Network error while saving artist configuration', 'error');
    } finally {
      setIsSavingArtist(false);
    }
  };

  const handleDeleteArtist = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name} and all its scraped events?`)) {
      return;
    }

    addLog(`Deleting artist: ${name}...`, 'info');
    try {
      const res = await fetch(`/api/artists?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': accessPassword }
      });

      if (res.ok) {
        addLog(`Deleted artist: ${name}`, 'success');
        fetchArtists();
      } else {
        const err = await res.json();
        addLog(`Failed to delete artist: ${err.error}`, 'error');
      }
    } catch (e) {
      addLog('Network error while deleting artist', 'error');
    }
  };

  const handleEditArtist = (artist: Artist) => {
    setEditingArtistId(artist.id);
    setArtistNameInput(artist.name);
    setArtistLiveUrlInput(artist.liveUrl);
    setSelectorItemInput(artist.selectorItem);
    setSelectorTitleInput(artist.selectorTitle);
    setSelectorDateInput(artist.selectorDate);
    setSelectorVenueInput(artist.selectorVenue);
    setSelectorLinkInput(artist.selectorLink);
    setTestResults(null);
    setActiveTab('artists');
  };

  const resetArtistForm = () => {
    setEditingArtistId(null);
    setArtistNameInput('');
    setArtistLiveUrlInput('');
    setSelectorItemInput('');
    setSelectorTitleInput('');
    setSelectorDateInput('');
    setSelectorVenueInput('');
    setSelectorLinkInput('');
    setTestResults(null);
  };

  const triggerSync = async (id?: string) => {
    if (id) {
      addLog(`Triggering scrape and Notion sync for artist ID: ${id}...`, 'info');
      // Optimistic state update
      setArtists((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'syncing' } : a))
      );
    } else {
      setIsSyncingAll(true);
      addLog('Triggering global scrape and sync for all artists...', 'info');
      setArtists((prev) =>
        prev.map((a) => ({ ...a, status: 'syncing' }))
      );
    }

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': accessPassword
        },
        body: JSON.stringify({ artistId: id }),
      });

      const data = await res.json();
      if (res.ok) {
        // Detailed log prints
        data.results.forEach((r: any) => {
          if (r.status === 'success') {
            addLog(
              `Sync Success [${r.artistName}]: Scraped ${r.scrapedCount} shows, found ${r.newCount} new, uploaded ${r.syncedCount} to Notion!`,
              'success'
            );
          } else {
            addLog(`Sync Failed [${r.artistName}]: ${r.errorMessage}`, 'error');
          }
        });
      } else {
        addLog(`Global sync operation failed: ${data.error || 'Server error'}`, 'error');
      }
    } catch (e) {
      addLog('Network error occurred during scrape sync trigger', 'error');
    } finally {
      if (id) {
        fetchArtists();
      } else {
        setIsSyncingAll(false);
        fetchArtists();
      }
      fetchSyncLogs();
    }
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (authChecking) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ fontSize: '2.5rem', display: 'inline-block', marginBottom: '1rem' }}>🌀</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Checking security credentials...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h1 className="header-title" style={{ fontSize: '1.75rem', marginTop: '1rem', marginBottom: '0.5rem', textAlign: 'center' }}>Security Lock</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>This dashboard is protected. Enter the access password to unlock.</div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Access Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={accessPasswordInput}
                onChange={(e) => setAccessPasswordInput(e.target.value)}
                required
                autoFocus
              />
            </div>

            {loginError && (
              <div
                style={{
                  fontSize: '0.85rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1.25rem',
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: 'var(--color-rose)',
                  textAlign: 'center',
                }}
              >
                {loginError}
              </div>
            )}

            <button type="submit" className="btn" style={{ width: '100%', height: '2.75rem' }} disabled={isVerifyingPassword}>
              {isVerifyingPassword ? 'Unlocking...' : 'Unlock Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header section */}
      <header>
        <h1 className="header-title">ライブ情報ダッシュボード</h1>
        <div className="header-subtitle">
          <span>アーティストの公演情報を集めて、Notionや通知先へ同期します。</span>
          <span className="status-indicator">
            <span className={`status-dot ${isNotionConfigured ? 'active' : 'warning'}`}></span>
            {isNotionConfigured ? 'Notion同期: 設定済み' : 'Notion同期: 未設定'}
          </span>
        </div>
      </header>

      {/* Main dashboard grid layout */}
      <div className="grid-dashboard">
        {/* Left Side Column: Service settings and sync controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section className="glass-card" aria-labelledby="uptime-title">
            <h2 className="card-title" id="uptime-title">Uptime KumaのDiscord通知</h2>
            <p className="helper-text">
              すでに監視中のURLがある場合は、モニターを追加する必要はありません。
              Uptime KumaでDiscord通知先を登録し、既存モニターに割り当ててください。
            </p>
            <div className="monitor-url-row">
              <code>{dashboardUrl || 'アプリのURLを読み込み中...'}</code>
              <button type="button" className="btn btn-secondary" onClick={handleCopyDashboardUrl} disabled={!dashboardUrl}>
                {isDashboardUrlCopied ? 'コピー済み' : 'URLをコピー'}
              </button>
            </div>
            {dashboardUrlCopyError && <p className="helper-error">{dashboardUrlCopyError}</p>}
            <details className="setup-details">
              <summary>既存モニターにDiscord通知を設定する</summary>
              <ol>
                <li><a href="https://github.com/louislam/uptime-kuma/wiki/Notification-Methods" target="_blank" rel="noopener noreferrer">通知設定</a>でDiscord通知先を追加し、テストして保存します。</li>
                <li>すでに監視中のこのアプリのモニターを編集し、通知先に手順1のDiscord通知先を選びます。</li>
                <li>モニターを保存します。Uptime Kumaでは通知設定をモニターに割り当てて使います。</li>
              </ol>
            </details>
            <details className="setup-details optional-health-check">
              <summary>専用の監視URLを使う場合（任意）</summary>
              <div className="monitor-url-row">
                <code>{healthCheckUrl}</code>
                <button type="button" className="btn btn-secondary" onClick={handleCopyHealthUrl}>
                  {isHealthUrlCopied ? 'コピー済み' : 'ヘルスチェックURLをコピー'}
                </button>
              </div>
              {healthUrlCopyError && <p className="helper-error">{healthUrlCopyError}</p>}
              <p>このURLはアプリがHTTP応答できるかだけを確認します。使う場合は、既存モニターのURL欄をこのURLに変更してください。</p>
            </details>
            <p className="helper-note">
              Uptime Kumaも監視対象と同じサーバー上で動いている場合、そのサーバーの電源断やネットワーク断は通知できません。
              その場合はUptime Kumaを別の端末またはホストで動かしてください。
              チェック間隔を60秒程度にすると、停止を検知しやすくなります。
            </p>
          </section>

          {/* Notion configuration card */}
          <section className="glass-card" aria-labelledby="notion-title">
            <h2 className="card-title" id="notion-title">Notionへの保存（任意）</h2>
            <p className="helper-text">
              未設定でも公演情報はこのアプリ内に保存されます。Notionへ同期したい場合に設定してください。
            </p>
            <form onSubmit={(event) => handleSaveConfig(event, 'notion')}>
              <div className="form-group">
                <label className="form-label">Notionインテグレーショントークン</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="form-input"
                    placeholder={isNotionConfigured ? '••••••••••••••••••••••••' : 'secret_xxxxxxxxx'}
                    value={notionApiKey}
                    onChange={(e) => setNotionApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '隠す' : '表示'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">データベースIDまたはNotion URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="NotionのURLまたは32文字のID"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                />
              </div>

              {configFeedback && (
                <div
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    background: configFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    border: `1px solid ${configFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                    color: configFeedback.type === 'success' ? 'var(--color-emerald)' : 'var(--color-rose)',
                  }}
                >
                  {configFeedback.message}
                </div>
              )}

              <button type="submit" className="btn" style={{ width: '100%' }} disabled={isSavingConfig}>
                {isSavingConfig ? (
                  <>
                    <span className="spinner">⌛</span> 保存中...
                  </>
                ) : (
                  notionApiKey.trim() || notionDatabaseId.trim() ? 'Notionを確認して保存' : '設定を保存'
                )}
              </button>
            </form>
          </section>

          {/* Notification configuration card */}
          <section className="glass-card" aria-labelledby="live-notification-title">
            <h2 className="card-title" id="live-notification-title">新着公演の通知</h2>
            <p className="helper-text">
              スクレイピングで新しい公演が見つかったときの通知先です。サーバー停止の通知は上のUptime Kumaで設定します。
            </p>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                id="notification-enabled"
                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
              />
              <label htmlFor="notification-enabled" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                新しい公演が見つかったときに通知する
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Discord Webhook URL（新着公演用）</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordWebhookUrl}
                onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              />
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-cyan)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '0.25rem 0',
                  marginTop: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: 600,
                }}
                onClick={() => setShowDiscordHelp(!showDiscordHelp)}
              >
                <span>{showDiscordHelp ? '▼' : '▶'}</span> Discord Webhookの取得方法
              </button>

              {showDiscordHelp && (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4',
                  }}
                >
                  <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                    <li style={{ marginBottom: '0.25rem' }}>Discordで通知を送りたいテキストチャンネルの横にある<strong>「チャンネルの編集（⚙️）」</strong>をクリックします。</li>
                    <li style={{ marginBottom: '0.25rem' }}>左メニューから<strong>「連携サービス（Integrations）」</strong>を選択します。</li>
                    <li style={{ marginBottom: '0.25rem' }}><strong>「ウェブフックを作成（Create Webhook）」</strong>をクリックします。</li>
                    <li style={{ marginBottom: '0.25rem' }}>名前やチャンネルを確認し、<strong>「ウェブフックURLをコピー」</strong>ボタンを押して、ここに貼り付けます。</li>
                  </ol>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Slack Webhook URL（新着公演用）</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
              />
            </div>

            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '1.25rem 0', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 700 }}>LINE通知（新着公演用）</h3>
              
              <div className="form-group">
                <label className="form-label">LINE Channel Access Token</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="eyJhbGciOiJIUzI1Ni..."
                  value={lineChannelAccessToken}
                  onChange={(e) => setLineChannelAccessToken(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LINE User ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="U1234567890abcdef..."
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                />
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-cyan)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: '0.25rem 0',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontWeight: 600,
                  }}
                  onClick={() => setShowLineHelp(!showLineHelp)}
                >
                  <span>{showLineHelp ? '▼' : '▶'}</span> LINE通知キーの取得手順を表示
                </button>

                {showLineHelp && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      marginTop: '0.5rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4',
                    }}
                  >
                    <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      <li style={{ marginBottom: '0.25rem' }}><a href="https://developers.line.me/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-cyan)', textDecoration: 'underline' }}>LINE Developers</a>にログインします。</li>
                      <li style={{ marginBottom: '0.25rem' }}>プロバイダーと「Messaging API」チャネルを作成します。</li>
                      <li style={{ marginBottom: '0.25rem' }}><strong>「Messaging API設定」</strong>タブ最下部にある「チャネルアクセストークン（長期）」を発行してコピーし、上に貼り付けます。</li>
                      <li style={{ marginBottom: '0.25rem' }}><strong>「チャネル基本設定」</strong>タブの「あなたのユーザーID（Uで始まる英数字）」をコピーして、上に貼り付けます。</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {notificationFeedback && (
              <div
                style={{
                  fontSize: '0.85rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  background: notificationFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  border: `1px solid ${notificationFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  color: notificationFeedback.type === 'success' ? 'var(--color-emerald)' : 'var(--color-rose)',
                }}
              >
                {notificationFeedback.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={handleSendTestNotification}
                disabled={isTestingNotification || (!discordWebhookUrl && !slackWebhookUrl && !(lineChannelAccessToken && lineUserId))}
              >
                {isTestingNotification ? '送信中...' : '通知をテスト'}
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ flex: 1 }}
                onClick={(event) => handleSaveConfig(event, 'notifications')}
                disabled={isSavingConfig}
              >
                {isSavingConfig ? '保存中...' : '通知設定を保存'}
              </button>
            </div>
          </section>

          {/* Quick Stats / Control Panel */}
          <div className="glass-card">
            <h2 className="card-title">公演情報の同期</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="btn"
                style={{ width: '100%', height: '3rem' }}
                onClick={() => triggerSync()}
                disabled={isSyncingAll || artists.length === 0}
              >
                {isSyncingAll ? (
                  <>
                    <span className="spinner">🌀</span> 取得中...
                  </>
                ) : (
                  '登録アーティストを一括取得'
                )}
              </button>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>登録アーティスト</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-purple)' }}>{artists.length}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Notion同期済み</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-cyan)' }}>
                    {events.filter((e) => e.notionPageId).length} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {events.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Column: Content Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tabs header */}
          <div className="tabs-container" role="tablist" aria-label="ダッシュボード">
            <button
              role="tab"
              aria-selected={activeTab === 'feed'}
              className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
              onClick={() => setActiveTab('feed')}
            >
              公演一覧
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'artists'}
              className={`tab-btn ${activeTab === 'artists' ? 'active' : ''}`}
              onClick={() => setActiveTab('artists')}
            >
              アーティスト設定 ({artists.length})
            </button>
          </div>

          {/* TAB 1: EVENTS FEED */}
          {activeTab === 'feed' && (
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>取得した公演情報</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`preset-pill ${activeFeedTab === 'events' ? 'active' : ''}`}
                    style={{ margin: 0 }}
                    onClick={() => setActiveFeedTab('events')}
                  >
                    📺 公演一覧 ({events.length})
                  </button>
                  <button
                    type="button"
                    className={`preset-pill ${activeFeedTab === 'syncLogs' ? 'active' : ''}`}
                    style={{ margin: 0 }}
                    onClick={() => {
                      setActiveFeedTab('syncLogs');
                      fetchSyncLogs();
                    }}
                  >
                    📜 実行履歴 ({syncLogs.length})
                  </button>
                </div>
              </div>
              
              {activeFeedTab === 'events' ? (
                events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎵</div>
                    <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>公演情報はまだありません。</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      「アーティスト設定」で登録してから「登録アーティストを一括取得」を実行してください。
                    </p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>アーティスト</th>
                          <th>公演名</th>
                          <th>日程</th>
                          <th>会場</th>
                          <th>Notion同期</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((event) => (
                          <tr key={event.id}>
                            <td style={{ fontWeight: 700, color: 'var(--color-purple)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                              {event.artistName}
                            </td>
                            <td>
                              <a
                                href={event.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="event-title"
                              >
                                {event.title}
                                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>↗</span>
                              </a>
                            </td>
                            <td>
                              <span className="event-date">{event.date}</span>
                            </td>
                            <td>
                              <div className="event-venue" title={event.venue}>
                                {event.venue}
                              </div>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {event.notionPageId ? (
                                <span
                                  className="status-indicator"
                                  style={{
                                    color: 'var(--color-emerald)',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                  }}
                                >
                                  <span className="status-dot active"></span>
                                  Notion同期済み
                                </span>
                              ) : (
                                <span
                                  className="status-indicator"
                                  style={{
                                    color: 'var(--color-amber)',
                                    background: 'rgba(245, 158, 11, 0.08)',
                                    border: '1px solid rgba(245, 158, 11, 0.2)'
                                  }}
                                >
                                  <span className="status-dot warning"></span>
                                  アプリ内に保存
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* SYNC LOGS VIEW */
                syncLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📜</div>
                    <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>実行履歴はまだありません。</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      手動取得または定期実行の結果がここに表示されます。
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {syncLogs.map((log) => {
                      const totalNew = log.results.reduce((acc, curr) => acc + curr.newCount, 0);
                      const totalScraped = log.results.reduce((acc, curr) => acc + curr.scrapedCount, 0);
                      const hasFailures = log.results.some((r) => r.status === 'failed');

                      return (
                        <div
                          key={log.id}
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1rem' }}>
                                {log.trigger === 'cron' ? '⏰' : '👤'}
                              </span>
                              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {log.trigger === 'cron' ? '定期実行' : '手動実行'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({new Date(log.timestamp).toLocaleString()})
                              </span>
                            </div>
                            <div>
                              {hasFailures ? (
                                <span
                                  className="status-indicator"
                                  style={{
                                    color: 'var(--color-rose)',
                                    background: 'rgba(244, 63, 94, 0.08)',
                                    border: '1px solid rgba(244, 63, 94, 0.2)',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  一部失敗
                                </span>
                              ) : (
                                <span
                                  className="status-indicator"
                                  style={{
                                    color: 'var(--color-emerald)',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  すべて成功
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                            <div>取得件数: <strong style={{ color: 'var(--text-primary)' }}>{totalScraped}</strong></div>
                            <div>新着件数: <strong style={{ color: 'var(--color-cyan)' }}>{totalNew}</strong></div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {log.results.map((res, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  background: 'rgba(0, 0, 0, 0.15)',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.75rem',
                                  border: '1px solid rgba(255, 255, 255, 0.02)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {res.artistName}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: res.status === 'success' ? 'var(--color-emerald)' : 'var(--color-rose)' }}>
                                    {res.status === 'success' ? '✓ 成功' : '✗ 失敗'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <div>取得: <strong style={{ color: 'var(--text-secondary)' }}>{res.scrapedCount}</strong></div>
                                  <div>新着: <strong style={{ color: 'var(--color-cyan)' }}>{res.newCount}</strong></div>
                                  <div>同期: <strong style={{ color: 'var(--color-purple)' }}>{res.syncedCount}</strong></div>
                                </div>
                                {res.errorMessage && (
                                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-rose)', background: 'rgba(244,63,94,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                    {res.errorMessage}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 2: ARTISTS / SCRAPERS CONFIGURATION */}
          {activeTab === 'artists' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Form to Add / Edit Artist Configuration */}
              <div className="glass-card">
                <h2 className="card-title">
                  {editingArtistId ? `${artistNameInput}の設定を編集` : 'アーティストの取得設定を追加'}
                  {editingArtistId && (
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={resetArtistForm}>
                      編集をキャンセル
                    </button>
                  )}
                </h2>

                {/* Presets selecting header */}
                {!editingArtistId && (
                  <div>
                    <span className="form-label" style={{ marginBottom: '0.35rem' }}>プリセットから選ぶ（選択後に取得テストできます）</span>
                    <div className="presets-container">
                      {PRESETS.map((preset, index) => (
                        <button
                          type="button"
                          key={index}
                          className="preset-pill"
                          onClick={() => handleApplyPreset(preset)}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveArtist}>
                  <div className="responsive-form-grid two-columns">
                    <div className="form-group">
                      <label className="form-label">アーティスト名</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 米津玄師 (Kenshi Yonezu)"
                        value={artistNameInput}
                        onChange={(e) => setArtistNameInput(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">公式サイトの公演・ニュースURL</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://example.com/live/"
                        value={artistLiveUrlInput}
                        onChange={(e) => setArtistLiveUrlInput(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', margin: '1.5rem 0 1rem 0' }}>
                    取得項目の指定（CSSセレクター）
                  </h3>

                  <p className="helper-text">一覧の各項目から、公演名・日程・会場・リンクを見つけるための指定です。プリセットを使う場合は自動で入力されます。</p>
                  <div className="responsive-form-grid two-columns">
                    <div className="form-group">
                      <label className="form-label">
                        公演一覧の繰り返し要素（必須） <span style={{ color: 'var(--color-rose)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. li.news_list_body or div.live-item"
                        value={selectorItemInput}
                        onChange={(e) => setSelectorItemInput(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">公演名のセレクター</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. h1 or .title (relative)"
                        value={selectorTitleInput}
                        onChange={(e) => setSelectorTitleInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="responsive-form-grid three-columns">
                    <div className="form-group">
                      <label className="form-label">日程のセレクター</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. .date or time (relative)"
                        value={selectorDateInput}
                        onChange={(e) => setSelectorDateInput(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">会場のセレクター</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. .venue or p (relative)"
                        value={selectorVenueInput}
                        onChange={(e) => setSelectorVenueInput(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">詳細リンクのセレクター</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. a or .btn (relative)"
                        value={selectorLinkInput}
                        onChange={(e) => setSelectorLinkInput(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Realtime test results pane */}
                  {testResults && (
                    <div className="test-preview-container">
                      <h4 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', color: testResults.success ? 'var(--color-emerald)' : 'var(--color-rose)' }}>
                        <span>
                          {testResults.success ? `✅ 取得テスト成功（${testResults.count}件）` : '❌ 取得テストに失敗しました'}
                        </span>
                      </h4>

                      {testResults.success ? (
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {testResults.items.map((item, idx) => (
                            <div key={idx} className="preview-item">
                              <div>
                                <span className="preview-label">[{idx + 1}] 公演名:</span>
                                <span style={{ fontWeight: 600 }}>{item.title}</span>
                              </div>
                              <div style={{ marginTop: '0.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', opacity: 0.85 }}>
                                <div>
                                  <span className="preview-label">日程:</span>
                                  {item.date || 'N/A'}
                                </div>
                                <div>
                                  <span className="preview-label">会場:</span>
                                  {item.venue || 'N/A'}
                                </div>
                              </div>
                              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span className="preview-label" style={{ color: 'var(--text-muted)' }}>リンク:</span>
                                {item.link}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            background: 'rgba(244,63,94,0.1)',
                            border: '1px solid rgba(244,63,94,0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            color: 'var(--color-rose)',
                            fontSize: '0.875rem',
                          }}
                        >
                          <strong>エラー:</strong> {testResults.error}
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            URLがJavaScriptで描画されるページか、セレクターが合っていない可能性があります。公式サイトのHTMLを確認してください。
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <button type="submit" className="btn" disabled={isSavingArtist}>
                      {isSavingArtist ? '保存中...' : editingArtistId ? '変更を保存' : 'アーティストを登録'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleTestScraper}
                      disabled={isTestingScraper || !artistLiveUrlInput || !selectorItemInput}
                    >
                      {isTestingScraper ? (
                        <>
                          <span className="spinner">⏳</span> ページを取得中...
                        </>
                      ) : (
                        '取得テスト'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Registered Artists */}
              <div className="glass-card">
                <h2 className="card-title">登録済みアーティスト</h2>
                {isLoadingArtists ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>設定を読み込み中...</div>
                ) : artists.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    まだ登録がありません。上のフォームから追加してください。
                  </div>
                ) : (
                  <div className="artist-list">
                    {artists.map((artist) => (
                      <div key={artist.id} className="artist-card">
                        <div className="artist-header">
                          <div>
                            <h3 className="artist-name">{artist.name}</h3>
                            <a
                              href={artist.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="artist-url"
                            >
                              {artist.liveUrl}
                            </a>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleEditArtist(artist)}>
                              編集
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDeleteArtist(artist.id, artist.name)}>
                              削除
                            </button>
                          </div>
                        </div>

                        {/* Display scraper debug settings */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '6px', margin: '0.75rem 0', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>item:</span> {artist.selectorItem}</div>
                          {artist.selectorTitle && <div><span style={{ color: 'var(--text-muted)' }}>title:</span> {artist.selectorTitle}</div>}
                          {artist.selectorDate && <div><span style={{ color: 'var(--text-muted)' }}>date:</span> {artist.selectorDate}</div>}
                          {artist.selectorVenue && <div><span style={{ color: 'var(--text-muted)' }}>venue:</span> {artist.selectorVenue}</div>}
                          {artist.selectorLink && <div><span style={{ color: 'var(--text-muted)' }}>link:</span> {artist.selectorLink}</div>}
                        </div>

                        <div className="artist-meta">
                          <div>
                            最終取得: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatDate(artist.lastSyncedAt)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className={`badge ${artist.status}`}>{artist.status}</span>
                            <button
                              className="btn"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => triggerSync(artist.id)}
                              disabled={artist.status === 'syncing' || isSyncingAll}
                            >
                              {artist.status === 'syncing' ? '取得中...' : '今すぐ取得'}
                            </button>
                          </div>
                        </div>

                        {artist.errorMessage && (
                          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-rose)', background: 'rgba(244,63,94,0.05)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(244,63,94,0.1)' }}>
                            <strong>前回のエラー:</strong> {artist.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scrolling Terminal for Console Logs */}
          <div className="glass-card">
            <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <span>処理ログ</span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', height: 'auto' }}
                onClick={() => setLogs([])}
              >
                ログを消去
              </button>
            </h2>
            <div className="terminal-console">
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>ログはまだありません。</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`terminal-line ${log.type}`}>
                    <span style={{ color: '#6ee7b7', marginRight: '0.5rem' }}>[{log.timestamp}]</span>
                    {log.text}
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
