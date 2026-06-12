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

  // Access Authentication State
  const [accessPasswordInput, setAccessPasswordInput] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState('');

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
    }
  }, [isAuthenticated, accessPassword]);

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
          addLog(`Notion is connected to database: ${data.notionDatabaseId}`, 'success');
        } else {
          addLog('Notion integration is not configured yet. Pushes will be saved locally only.', 'info');
        }
      }
    } catch (e) {
      addLog('Failed to fetch Notion configuration status', 'error');
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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigFeedback(null);
    addLog('Connecting and validating Notion credentials...', 'info');

    // Parse Database ID if a full URL was pasted
    let parsedDbId = notionDatabaseId.trim();
    const urlMatch = parsedDbId.match(/notion\.(?:so|com)\/(?:[^/]+\/)?(?:p\/)?([a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12})/i);
    if (urlMatch) {
      parsedDbId = urlMatch[1];
    }
    
    // Normalize: remove any hyphens from the ID
    parsedDbId = parsedDbId.replace(/-/g, '');
    setNotionDatabaseId(parsedDbId); // Update input field value
    addLog(`Extracted Notion Database ID: ${parsedDbId}`, 'info');

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
        setIsNotionConfigured(true);
        setConfigFeedback({ type: 'success', message: data.message });
        addLog('Configuration saved and verified successfully!', 'success');
        setNotionApiKey(''); // Clear secret
      } else {
        setConfigFeedback({ type: 'error', message: data.error });
        addLog(`Connection failed: ${data.error}`, 'error');
      }
    } catch (err) {
      setConfigFeedback({ type: 'error', message: 'Failed to communicate with configuration API.' });
      addLog('Network error occurred during configuration', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestingNotification(true);
    setNotificationFeedback(null);
    addLog('Sending test notification...', 'info');

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
        setNotificationFeedback({ type: 'success', message: 'Test notification sent successfully!' });
        addLog('Test notification sent successfully!', 'success');
      } else {
        setNotificationFeedback({ type: 'error', message: data.error });
        addLog(`Test notification failed: ${data.error}`, 'error');
      }
    } catch (err) {
      setNotificationFeedback({ type: 'error', message: 'Failed to communicate with test notification API.' });
      addLog('Network error occurred during test notification', 'error');
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
        // fetch updated list
        fetchArtists();
      } else {
        setIsSyncingAll(false);
        fetchArtists();
      }
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
        <h1 className="header-title">Live Sync Aggregator</h1>
        <div className="header-subtitle">
          <span>Monitor live concert postings and compile them automatically to Notion.</span>
          <span className="status-indicator">
            <span className={`status-dot ${isNotionConfigured ? 'active' : 'inactive'}`}></span>
            {isNotionConfigured ? 'Notion Connected' : 'Notion Offline'}
          </span>
        </div>
      </header>

      {/* Main dashboard grid layout */}
      <div className="grid-dashboard">
        {/* Left Side Column: Notion Connection and Artist Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Notion configuration card */}
          <div className="glass-card">
            <h2 className="card-title">Notion Integration</h2>
            <form onSubmit={handleSaveConfig}>
              <div className="form-group">
                <label className="form-label">Notion Integration Token</label>
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
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Database ID (or Full URL)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Paste URL or 32-character ID"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  required
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
                    <span className="spinner">⌛</span> Connecting...
                  </>
                ) : (
                  'Connect & Save'
                )}
              </button>
            </form>
          </div>

          {/* Notification configuration card */}
          <div className="glass-card">
            <h2 className="card-title">Notification Integration</h2>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                id="notification-enabled"
                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
              />
              <label htmlFor="notification-enabled" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                Enable Notifications on Scrape
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Discord Webhook URL</label>
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
                <span>{showDiscordHelp ? '▼' : '▶'}</span> Discord Webhookの取得手順を表示
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
              <label className="form-label">Slack Webhook URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
              />
            </div>

            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '1.25rem 0', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 700 }}>LINE Push Notification</h3>
              
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
                {isTestingNotification ? 'Sending...' : 'Test Send'}
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ flex: 1 }}
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
              >
                {isSavingConfig ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Quick Stats / Control Panel */}
          <div className="glass-card">
            <h2 className="card-title">Orchestrator</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="btn"
                style={{ width: '100%', height: '3rem' }}
                onClick={() => triggerSync()}
                disabled={isSyncingAll || artists.length === 0}
              >
                {isSyncingAll ? (
                  <>
                    <span className="spinner">🌀</span> Scraping All...
                  </>
                ) : (
                  'Scrape & Sync All Artists'
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Artists</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-purple)' }}>{artists.length}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Synced Events</div>
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
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
              onClick={() => setActiveTab('feed')}
            >
              Live Event Feed
            </button>
            <button
              className={`tab-btn ${activeTab === 'artists' ? 'active' : ''}`}
              onClick={() => setActiveTab('artists')}
            >
              Artist Configurations ({artists.length})
            </button>
          </div>

          {/* TAB 1: EVENTS FEED */}
          {activeTab === 'feed' && (
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <h2 className="card-title">Aggregated Live Feeds</h2>
              
              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎵</div>
                  <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>No live events imported yet.</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Configure your scraper settings and click "Scrape & Sync" to download latest live items.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="events-table">
                    <thead>
                      <tr>
                        <th>Artist</th>
                        <th>Show Title</th>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Sync Status</th>
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
                                Synced
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
                                Local Only
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARTISTS / SCRAPERS CONFIGURATION */}
          {activeTab === 'artists' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Form to Add / Edit Artist Configuration */}
              <div className="glass-card">
                <h2 className="card-title">
                  {editingArtistId ? `Edit Config: ${artistNameInput}` : 'Register New Artist Scraper'}
                  {editingArtistId && (
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={resetArtistForm}>
                      Cancel Edit
                    </button>
                  )}
                </h2>

                {/* Presets selecting header */}
                {!editingArtistId && (
                  <div>
                    <span className="form-label" style={{ marginBottom: '0.35rem' }}>Select Preset Configuration</span>
                    <div className="presets-container">
                      {PRESETS.map((preset, index) => (
                        <div
                          key={index}
                          className="preset-pill"
                          onClick={() => handleApplyPreset(preset)}
                        >
                          {preset.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveArtist}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Artist Display Name</label>
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
                      <label className="form-label">Official Live URL</label>
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
                    CSS Selector Configuration (Cheerio / HTML parsing)
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        Container Selector <span style={{ color: 'var(--color-rose)' }}>*</span>
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
                      <label className="form-label">Title Selector</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. h1 or .title (relative)"
                        value={selectorTitleInput}
                        onChange={(e) => setSelectorTitleInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Date Selector</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. .date or time (relative)"
                        value={selectorDateInput}
                        onChange={(e) => setSelectorDateInput(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Venue Selector</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. .venue or p (relative)"
                        value={selectorVenueInput}
                        onChange={(e) => setSelectorVenueInput(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Link Selector</label>
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
                          {testResults.success ? `✅ Scraper Test Success! (Scraped ${testResults.count} items)` : '❌ Scraper Test Failed'}
                        </span>
                      </h4>

                      {testResults.success ? (
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {testResults.items.map((item, idx) => (
                            <div key={idx} className="preview-item">
                              <div>
                                <span className="preview-label">[{idx + 1}] Title:</span>
                                <span style={{ fontWeight: 600 }}>{item.title}</span>
                              </div>
                              <div style={{ marginTop: '0.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', opacity: 0.85 }}>
                                <div>
                                  <span className="preview-label">Date:</span>
                                  {item.date || 'N/A'}
                                </div>
                                <div>
                                  <span className="preview-label">Venue:</span>
                                  {item.venue || 'N/A'}
                                </div>
                              </div>
                              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span className="preview-label" style={{ color: 'var(--text-muted)' }}>Link:</span>
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
                          <strong>Error Details:</strong> {testResults.error}
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Possible issues: URL returns Javascript-rendered payload (SPA), or selectors are incorrect. Verify selectors by inspecting target element's HTML structures.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <button type="submit" className="btn" disabled={isSavingArtist}>
                      {isSavingArtist ? 'Saving...' : editingArtistId ? 'Save Configuration' : 'Register Scraper'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleTestScraper}
                      disabled={isTestingScraper || !artistLiveUrlInput || !selectorItemInput}
                    >
                      {isTestingScraper ? (
                        <>
                          <span className="spinner">⏳</span> Fetching Page...
                        </>
                      ) : (
                        'Test Scraper Live'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Registered Artists */}
              <div className="glass-card">
                <h2 className="card-title">Registered Artists Scrapers</h2>
                {isLoadingArtists ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>Loading configurations...</div>
                ) : artists.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No artists registered yet. Create one using the form above.
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
                              Edit
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDeleteArtist(artist.id, artist.name)}>
                              Delete
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
                            Last Synced: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatDate(artist.lastSyncedAt)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className={`badge ${artist.status}`}>{artist.status}</span>
                            <button
                              className="btn"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => triggerSync(artist.id)}
                              disabled={artist.status === 'syncing' || isSyncingAll}
                            >
                              {artist.status === 'syncing' ? 'Syncing...' : 'Sync'}
                            </button>
                          </div>
                        </div>

                        {artist.errorMessage && (
                          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-rose)', background: 'rgba(244,63,94,0.05)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(244,63,94,0.1)' }}>
                            <strong>Last Error:</strong> {artist.errorMessage}
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
              <span>Developer Live Console</span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', height: 'auto' }}
                onClick={() => setLogs([])}
              >
                Clear Console
              </button>
            </h2>
            <div className="terminal-console">
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Terminal idle. Waiting for events...</div>
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
