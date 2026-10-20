import type { FeedItem, FeedSource } from '../types/feed';

/**
 * Strips HTML tags and common aggregator metadata boilerplate for crisp snippets
 */
function cleanSnippet(html: string, maxLength = 160): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let text = doc.body.textContent || '';

  // Clean boilerplate injected by Hacker News / Reddit feeds
  text = text
    .replace(/Article URL:\s*https?:\/\/\S+/gi, '')
    .replace(/Comments URL:\s*https?:\/\/\S+/gi, '')
    .replace(/Points:\s*\d+/gi, '')
    .replace(/# Comments:\s*\d+/gi, '')
    .trim();

  return text.slice(0, maxLength).replace(/\s+/g, ' ');
}

function estimateReadingTime(html: string): number {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = (doc.body.textContent || '').trim();
  if (!text) return 1;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

function resolveFavicon(siteUrl: string, fallbackUrl: string): string | undefined {
  try {
    const parsed = new URL(siteUrl || fallbackUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=32`;
  } catch {
    try {
      const fallbackParsed = new URL(fallbackUrl);
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(fallbackParsed.hostname)}&sz=32`;
    } catch {
      return undefined;
    }
  }
}

function getTagText(parent: Element, tagName: string): string {
  const node = parent.getElementsByTagName(tagName)[0];
  return node?.textContent?.trim() || '';
}

export interface ParseFeedOptions {
  sourceId?: string;
  category?: string;
  customTitle?: string;
}

export function parseFeedXml(
  xmlString: string,
  originalUrl: string,
  options?: ParseFeedOptions
): {
  source: FeedSource;
  items: FeedItem[];
} {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'application/xml');

  if (xml.querySelector('parsererror')) {
    throw new Error('Malformed XML feed structure.');
  }

  const isRss = !!xml.querySelector('rss, channel, rdf\\:RDF, RDF');
  const isAtom = !!xml.querySelector('feed');

  if (!isRss && !isAtom) {
    throw new Error('Unsupported feed format: must be RSS 2.0 or Atom.');
  }

  const sourceId = options?.sourceId || crypto.randomUUID();

  // RSS 2.0 / RSS 1.0
  if (isRss) {
    const channel = xml.querySelector('channel')!;
    const parsedTitle = channel ? getTagText(channel, 'title') : '';
    const title = options?.customTitle || parsedTitle || 'Untitled Feed';
    const siteUrl = (channel ? getTagText(channel, 'link') : '') || originalUrl;

    const source: FeedSource = {
      id: sourceId,
      title,
      url: originalUrl,
      siteUrl,
      favicon: resolveFavicon(siteUrl, originalUrl),
      category: options?.category,
      lastUpdated: Date.now(),
    };

    const itemNodes = Array.from(xml.querySelectorAll('item'));
    const items: FeedItem[] = itemNodes.map((node) => {
      const itemTitle = getTagText(node, 'title') || 'Untitled';
      const link = getTagText(node, 'link') || getTagText(node, 'guid') || '';
      const pubDate =
        getTagText(node, 'pubDate') ||
        getTagText(node, 'dc:date') ||
        new Date().toISOString();
      const rawContent =
        getTagText(node, 'content:encoded') ||
        getTagText(node, 'description') ||
        '';

      return {
        id: crypto.randomUUID(),
        sourceId,
        title: itemTitle,
        link,
        author: getTagText(node, 'author') || getTagText(node, 'dc:creator') || '',
        pubDate,
        timestamp: new Date(pubDate).getTime() || Date.now(),
        content: rawContent,
        snippet: cleanSnippet(rawContent),
        isRead: false,
        isStarred: false,
        readingTimeMinutes: estimateReadingTime(rawContent),
      };
    });

    return { source, items };
  }

  // Atom
  const feed = xml.querySelector('feed')!;
  const parsedTitle = getTagText(feed, 'title');
  const title = options?.customTitle || parsedTitle || 'Untitled Feed';
  const linkNode = feed.querySelector('link[rel="alternate"]') || feed.querySelector('link');
  const siteUrl = linkNode?.getAttribute('href') || originalUrl;

  const source: FeedSource = {
    id: sourceId,
    title,
    url: originalUrl,
    siteUrl,
    favicon: resolveFavicon(siteUrl, originalUrl),
    category: options?.category,
    lastUpdated: Date.now(),
  };

  const entryNodes = Array.from(xml.querySelectorAll('entry'));
  const items: FeedItem[] = entryNodes.map((node) => {
    const itemTitle = getTagText(node, 'title') || 'Untitled';
    const entryLink =
      node.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
      node.querySelector('link')?.getAttribute('href') ||
      '';
    const published =
      getTagText(node, 'published') ||
      getTagText(node, 'updated') ||
      new Date().toISOString();
    const rawContent =
      getTagText(node, 'content') ||
      getTagText(node, 'summary') ||
      '';

    const authorNode = node.querySelector('author name');
    const author = authorNode?.textContent?.trim() || getTagText(node, 'author') || '';

    return {
      id: crypto.randomUUID(),
      sourceId,
      title: itemTitle,
      link: entryLink,
      author,
      pubDate: published,
      timestamp: new Date(published).getTime() || Date.now(),
      content: rawContent,
      snippet: cleanSnippet(rawContent),
      isRead: false,
      isStarred: false,
      readingTimeMinutes: estimateReadingTime(rawContent),
    };
  });

  return { source, items };
}
