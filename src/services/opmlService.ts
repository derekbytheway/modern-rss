import type { FeedItem, FeedSource, OpmlOutlineItem } from '../types/feed';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getAttrCaseInsensitive(el: Element, name: string): string {
  const direct = el.getAttribute(name);
  if (direct !== null) return direct.trim();
  const lower = name.toLowerCase();
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.toLowerCase() === lower) {
      return attr.value.trim();
    }
  }
  return '';
}

/**
 * Generates an OPML 2.0 compliant XML string from a list of FeedSource objects.
 * Feeds with a `category` are grouped into parent folder `<outline>` nodes.
 */
export function exportToOpml(sources: FeedSource[]): string {
  const now = new Date().toUTCString();
  const categorized = new Map<string, FeedSource[]>();
  const uncategorized: FeedSource[] = [];

  for (const source of sources) {
    const cat = source.category?.trim();
    if (cat) {
      const list = categorized.get(cat) || [];
      list.push(source);
      categorized.set(cat, list);
    } else {
      uncategorized.push(source);
    }
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>ModernRSS Subscriptions</title>',
    `    <dateCreated>${escapeXml(now)}</dateCreated>`,
    '    <docs>http://opml.org/spec2.opml</docs>',
    '  </head>',
    '  <body>',
  ];

  // Sorted category folders
  const sortedCategories = Array.from(categorized.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  for (const category of sortedCategories) {
    const escapedCat = escapeXml(category);
    lines.push(`    <outline text="${escapedCat}" title="${escapedCat}">`);
    const group = categorized.get(category) || [];
    for (const feed of group) {
      const title = escapeXml(feed.title || 'Untitled Feed');
      const xmlUrl = escapeXml(feed.url);
      const htmlUrl = escapeXml(feed.siteUrl || feed.url);
      lines.push(
        `      <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" />`
      );
    }
    lines.push('    </outline>');
  }

  // Uncategorized feeds at top-level
  for (const feed of uncategorized) {
    const title = escapeXml(feed.title || 'Untitled Feed');
    const xmlUrl = escapeXml(feed.url);
    const htmlUrl = escapeXml(feed.siteUrl || feed.url);
    lines.push(
      `    <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" />`
    );
  }

  lines.push('  </body>');
  lines.push('</opml>');

  return lines.join('\n');
}

/**
 * Triggers a browser file download of the OPML XML string.
 */
export function downloadOpmlFile(sources: FeedSource[], customFilename?: string): void {
  const xml = exportToOpml(sources);
  const blob = new Blob([xml], { type: 'text/x-opml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `modern-rss-feeds-${dateStamp}.opml`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Parses an OPML 1.0 / 2.0 XML document and extracts all RSS/Atom feed outlines,
 * preserving folder hierarchies as categories.
 */
export function parseOpmlXml(xmlText: string): OpmlOutlineItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText.trim(), 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid OPML file: XML could not be parsed.');
  }

  const opmlRoot = doc.querySelector('opml, body');
  if (!opmlRoot) {
    throw new Error('Invalid OPML file: missing <opml> or <body> root element.');
  }

  const results: OpmlOutlineItem[] = [];
  const seenUrls = new Set<string>();

  function walkOutline(node: Element, parentCategory?: string) {
    const xmlUrl = getAttrCaseInsensitive(node, 'xmlUrl');
    const title =
      getAttrCaseInsensitive(node, 'title') ||
      getAttrCaseInsensitive(node, 'text') ||
      'Untitled Feed';
    const htmlUrl = getAttrCaseInsensitive(node, 'htmlUrl') || undefined;
    const inlineCategory = getAttrCaseInsensitive(node, 'category') || undefined;

    if (xmlUrl) {
      const normalizedUrl = xmlUrl.trim();
      if (!seenUrls.has(normalizedUrl.toLowerCase())) {
        seenUrls.add(normalizedUrl.toLowerCase());
        results.push({
          title,
          xmlUrl: normalizedUrl,
          htmlUrl,
          category: parentCategory || inlineCategory,
        });
      }
    }

    // Recurse into child <outline> elements (folder grouping)
    const childOutlines = Array.from(node.children).filter(
      (child) => child.tagName.toLowerCase() === 'outline'
    );

    if (childOutlines.length > 0) {
      const folderName = !xmlUrl ? title : parentCategory;
      for (const child of childOutlines) {
        walkOutline(child, folderName);
      }
    }
  }

  const body = doc.querySelector('body') || doc.documentElement;
  const topOutlines = Array.from(body.children).filter(
    (el) => el.tagName.toLowerCase() === 'outline'
  );

  if (topOutlines.length > 0) {
    for (const outline of topOutlines) {
      walkOutline(outline, undefined);
    }
  } else {
    // Fallback if outlines are nested differently
    const allOutlines = Array.from(doc.querySelectorAll('outline'));
    for (const outline of allOutlines) {
      const xmlUrl = getAttrCaseInsensitive(outline, 'xmlUrl');
      if (xmlUrl && !seenUrls.has(xmlUrl.toLowerCase())) {
        seenUrls.add(xmlUrl.toLowerCase());
        const parent = outline.parentElement;
        const parentIsFolder =
          parent &&
          parent.tagName.toLowerCase() === 'outline' &&
          !getAttrCaseInsensitive(parent, 'xmlUrl');
        const category = parentIsFolder
          ? getAttrCaseInsensitive(parent, 'title') ||
            getAttrCaseInsensitive(parent, 'text') ||
            undefined
          : undefined;

        results.push({
          title:
            getAttrCaseInsensitive(outline, 'title') ||
            getAttrCaseInsensitive(outline, 'text') ||
            'Untitled Feed',
          xmlUrl,
          htmlUrl: getAttrCaseInsensitive(outline, 'htmlUrl') || undefined,
          category,
        });
      }
    }
  }

  return results;
}

export interface FullBackupPayload {
  version: number;
  exportedAt: string;
  sources: FeedSource[];
  articles: FeedItem[];
}

export function exportFullBackupJson(sources: FeedSource[], articles: FeedItem[]): string {
  const payload: FullBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sources,
    articles,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadFullBackupJson(sources: FeedSource[], articles: FeedItem[]): void {
  const json = exportFullBackupJson(sources, articles);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `modern-rss-backup-${dateStamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function parseFullBackupJson(jsonText: string): {
  sources: FeedSource[];
  articles: FeedItem[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON backup file.');
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as FullBackupPayload).sources) ||
    !Array.isArray((parsed as FullBackupPayload).articles)
  ) {
    throw new Error('Backup JSON is missing valid "sources" or "articles" arrays.');
  }

  const data = parsed as FullBackupPayload;
  return {
    sources: data.sources,
    articles: data.articles,
  };
}

export const CURATED_STARTER_FEEDS: OpmlOutlineItem[] = [
  {
    title: 'Hacker News (Frontpage)',
    xmlUrl: 'https://hnrss.org/frontpage',
    htmlUrl: 'https://news.ycombinator.com',
    category: 'Tech & News',
  },
  {
    title: 'Ars Technica',
    xmlUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    htmlUrl: 'https://arstechnica.com',
    category: 'Tech & News',
  },
  {
    title: 'The Verge',
    xmlUrl: 'https://www.theverge.com/rss/index.xml',
    htmlUrl: 'https://www.theverge.com',
    category: 'Tech & News',
  },
  {
    title: 'CSS-Tricks',
    xmlUrl: 'https://css-tricks.com/feed/',
    htmlUrl: 'https://css-tricks.com',
    category: 'Web & Design',
  },
  {
    title: 'Smashing Magazine',
    xmlUrl: 'https://www.smashingmagazine.com/feed/',
    htmlUrl: 'https://www.smashingmagazine.com',
    category: 'Web & Design',
  },
  {
    title: 'web.dev Blog',
    xmlUrl: 'https://web.dev/feed.xml',
    htmlUrl: 'https://web.dev',
    category: 'Web & Design',
  },
  {
    title: 'NASA Breaking News',
    xmlUrl: 'https://www.nasa.gov/news-release/feed/',
    htmlUrl: 'https://www.nasa.gov',
    category: 'Science & Space',
  },
  {
    title: 'Quanta Magazine',
    xmlUrl: 'https://www.quantamagazine.org/feed/',
    htmlUrl: 'https://www.quantamagazine.org',
    category: 'Science & Space',
  },
];

