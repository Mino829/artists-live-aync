import * as cheerio from 'cheerio';
import { extractJsonLdEvents, scrapeLiveInfo, ScraperOptions, ScrapedEvent } from '@/lib/scraper';

export type DiscoveryResult = {
  parserType: 'html' | 'jsonld-event' | 'legacy-json';
  selectors: Omit<ScraperOptions, 'liveUrl' | 'parserType'>;
  sourceLabel: string;
  confidence: 'high' | 'medium' | 'low';
  suggestedName: string;
  warnings: string[];
  items: ScrapedEvent[];
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DATE_PATTERN = /(?:20\d{2}|令和\s*\d+|\d{1,2})[./年-]\s*\d{1,2}(?:[./月-]\s*\d{1,2}日?)?|\d{1,2}月\s*\d{1,2}日/;

function validateSourceUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('有効なURLを入力してください。');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('http または https のURLを入力してください。');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const blockedHost = hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal') ||
    hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) && (
      hostname.startsWith('10.') || hostname.startsWith('127.') || hostname.startsWith('169.254.') ||
      hostname.startsWith('192.168.') || /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname) || hostname === '0.0.0.0'
    );
  if (blockedHost) throw new Error('ローカルネットワークのURLは解析できません。公開サイトのURLを入力してください。');
  return url;
}

function simpleSelector(element: any): string {
  const tag = (element.tagName || '').toLowerCase();
  if (!tag) return '';
  const id = element.attribs?.id;
  if (id && /^[a-zA-Z_][\w-]*$/.test(id)) return `#${id}`;
  const classes = (element.attribs?.class || '')
    .split(/\s+/)
    .filter((name: string) => /^[a-zA-Z_][\w-]*$/.test(name))
    .slice(0, 2);
  return `${tag}${classes.map((name: string) => `.${name}`).join('')}`;
}

function relativeSelector(node: any, root: any): string {
  if (node === root) return '';
  const segments: string[] = [];
  let current = node;
  while (current && current !== root && current.tagName) {
    const selector = simpleSelector(current);
    if (!selector) return '';
    segments.unshift(selector);
    current = current.parent;
  }
  return current === root ? segments.join(' > ') : '';
}

function inferHtmlCandidate(content: string) {
  const $ = cheerio.load(content);
  const counts = new Map<string, number>();

  $('a[href]').each((_, anchor) => {
    let node: any = anchor;
    for (let depth = 0; depth <= 4 && node && node.tagName; depth++, node = node.parent) {
      const selector = simpleSelector(node);
      if (selector) counts.set(selector, (counts.get(selector) || 0) + 1);
    }
  });

  const candidates = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([selector]) => {
      const items = $(selector).toArray().filter((node) => $(node).find('a[href]').length > 0 || $(node).is('a[href]'));
      if (items.length < 2 || items.length > 100) return null;
      const coverage = items.map((node) => {
        const item = $(node);
        const anchor = item.is('a[href]') ? item : item.find('a[href]').first();
        const title = item.find('h1,h2,h3,h4,[class*="title"],[class*="tit"]').first().text().trim() || anchor.text().trim();
        const texts = item.find('time,[class*="date"],[class*="schedule"],[class*="day"]').toArray();
        const dateNode = texts.find((date) => {
          const value = $(date).attr('datetime') || $(date).text();
          return DATE_PATTERN.test(value || '');
        });
        const dateCoverage = Boolean(dateNode);
        return { node, anchor: anchor.get(0), title, dateNode, dateCoverage };
      });
      const titleCoverage = coverage.filter((item) => item.title.length >= 2).length;
      const dateCoverage = coverage.filter((item) => item.dateCoverage).length;
      const linkCoverage = coverage.filter((item) => Boolean($(item.anchor).attr('href'))).length;
      const classBoost = selector.includes('.') || selector.startsWith('#') ? 2 : 0;
      const score = titleCoverage * 2 + dateCoverage * 4 + linkCoverage * 2 + classBoost - Math.max(items.length - 20, 0);
      return { selector, items, coverage, titleCoverage, dateCoverage, linkCoverage, score };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null && candidate.titleCoverage >= 2 && candidate.linkCoverage >= 2)
    .sort((a, b) => b.score - a.score || a.items.length - b.items.length);

  const candidate = candidates[0];
  if (!candidate) return null;

  const sample = candidate.coverage[0];
  const root = sample.node;
  const item = $(root);
  const titleNode = item.find('h1,h2,h3,h4,[class*="title"],[class*="tit"]').first().get(0) || sample.anchor;
  const dateNode = sample.dateNode;
  const venueNode = item.find('[class*="venue"],[class*="place"],[class*="hall"],[class*="location"]').first().get(0) ||
    item.find('*').toArray().find((node) => /(?:会場|開催場所|場所)\s*[:：]/.test($(node).text().trim()));
  const linkNode = sample.anchor;
  const dateSelector = dateNode
    ? `${relativeSelector(dateNode, root)}${$(dateNode).attr('datetime') ? '@datetime' : ''}`
    : '';
  const venueSelector = venueNode ? relativeSelector(venueNode, root) : '';
  const titleSelector = titleNode === root ? '' : relativeSelector(titleNode, root);
  const linkSelector = linkNode === root ? '@href' : `${relativeSelector(linkNode, root)}@href`;
  const selectors = {
    selectorItem: candidate.selector,
    selectorTitle: titleSelector,
    selectorDate: dateSelector,
    selectorVenue: venueSelector,
    selectorLink: linkSelector,
  };

  const warnings: string[] = [];
  if (candidate.dateCoverage < candidate.items.length / 2) warnings.push('日程を読み取れないサンプルがあります。公演日が告知本文にある場合は詳細設定で調整してください。');
  if (!venueSelector) warnings.push('会場欄は自動判定できませんでした。必要なら詳細設定で指定してください。');
  if (candidate.items.length < 3) warnings.push('繰り返し項目が少ないため、候補の確度は限定的です。');

  return {
    selectors,
    confidence: candidate.dateCoverage >= candidate.items.length * 0.75 && candidate.items.length >= 3 ? 'medium' as const : 'low' as const,
    warnings,
    itemCount: candidate.items.length,
  };
}

function suggestedNameFromHtml(content: string, url: URL): string {
  const $ = cheerio.load(content);
  return ($('meta[property="og:site_name"]').attr('content') || $('title').first().text() || url.hostname)
    .replace(/\s*[|｜-].*$/, '')
    .trim();
}

function qualityWarnings(items: ScrapedEvent[], initial: string[] = []): string[] {
  const warnings = [...initial];
  if (items.some((item) => !item.date)) warnings.push('公演日が空欄のサンプルがあります。日付が告知本文だけにあるページでは手動調整が必要です。');
  if (items.some((item) => !item.venue)) warnings.push('会場が空欄のサンプルがあります。');
  const links = items.map((item) => item.link).filter(Boolean);
  if (new Set(links).size !== links.length) warnings.push('同じ詳細リンクが複数の候補に含まれています。内容を確認してください。');
  return [...new Set(warnings)];
}

export async function discoverArtistSource(rawUrl: string, manualSelectors?: DiscoveryResult['selectors']): Promise<DiscoveryResult> {
  const url = validateSourceUrl(rawUrl.trim());
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`ページを取得できませんでした（HTTP ${response.status}）。`);
  const content = await response.text();
  const suggestedName = suggestedNameFromHtml(content, url);

  const jsonLdEvents = extractJsonLdEvents(content, url.href);
  if (jsonLdEvents.length > 0) {
    const items = jsonLdEvents.slice(0, 10);
    return {
      parserType: 'jsonld-event',
      selectors: { selectorItem: '', selectorTitle: '', selectorDate: '', selectorVenue: '', selectorLink: '' },
      sourceLabel: 'Schema.org 公演データ',
      confidence: jsonLdEvents.every((item) => item.date) &&
        new Set(jsonLdEvents.map((item) => item.link)).size === jsonLdEvents.length
        ? 'high'
        : 'medium',
      suggestedName,
      warnings: qualityWarnings(items),
      items,
    };
  }

  const inferred = manualSelectors?.selectorItem
    ? { selectors: manualSelectors, confidence: 'medium' as const, warnings: [], itemCount: 0 }
    : inferHtmlCandidate(content);
  if (!inferred) {
    throw new Error('自動で一覧を特定できませんでした。詳細設定でCSSセレクターを入力するか、プリセットを選んで再解析してください。');
  }

  const parserType = inferred.selectors.selectorItem === 'json' ? 'legacy-json' as const : 'html' as const;
  const items = (await scrapeLiveInfo({
    liveUrl: url.href,
    ...inferred.selectors,
    parserType,
  })).slice(0, 10);
  if (items.length === 0) throw new Error('一覧候補は見つかりましたが、公演名を読み取れませんでした。詳細設定を確認してください。');
  const sourceWarnings = parserType === 'legacy-json'
    ? ['JSON項目の日付が公演日か確認してください。公開日しかない形式では日程を空欄にしてください。']
    : ['ページ内の一覧から推定しています。サンプルがすべて公演情報か確認してください。'];
  const allWarnings = qualityWarnings(items, [...inferred.warnings, ...sourceWarnings]);
  const completeSamples = items.filter((item) => item.title && item.link && item.date).length;
  const confidence = completeSamples >= Math.min(items.length, 3) && allWarnings.length === 0
    ? 'medium' as const
    : 'low' as const;

  return {
    parserType,
    selectors: inferred.selectors,
    sourceLabel: 'ページ内の繰り返し項目',
    confidence,
    suggestedName,
    warnings: allWarnings,
    items,
  };
}
