import { parseFeedXml, type ParseFeedOptions } from './feedParser';
import type { FeedItem, FeedSource } from '../types/feed';

async function fetchXmlWithTimeout(endpoint: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Feed request returned HTTP status ${res.status}`);
    }

    return await res.text();
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Connection timed out. The feed source took too long to respond.',
        { cause: err }
      );
    }
    throw err;
  }
}

export async function fetchFeed(
  targetUrl: string,
  options?: ParseFeedOptions
): Promise<{
  source: FeedSource;
  items: FeedItem[];
}> {
  const cleanUrl = targetUrl.trim();
  const encoded = encodeURIComponent(cleanUrl);

  // Use Vite's local proxy route during dev; on static hosts (GitHub Pages), use CORS proxies
  const endpoints = import.meta.env.DEV
    ? [
        `/api/proxy?url=${encoded}`,
        `https://api.allorigins.win/raw?url=${encoded}`,
        `https://corsproxy.io/?url=${encoded}`,
      ]
    : [
        `https://api.allorigins.win/raw?url=${encoded}`,
        `https://corsproxy.io/?url=${encoded}`,
      ];

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const rawXml = await fetchXmlWithTimeout(endpoint);
      return parseFeedXml(rawXml, cleanUrl, options);
    } catch (err: unknown) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to fetch feed from source.');
}
