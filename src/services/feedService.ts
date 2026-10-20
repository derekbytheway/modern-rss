import { parseFeedXml, type ParseFeedOptions } from './feedParser';
import type { FeedItem, FeedSource } from '../types/feed';

async function fetchXmlWithTimeout(endpoint: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Keep request as a CORS-simple GET (no custom headers) to avoid OPTIONS preflights
    const res = await fetch(endpoint, {
      signal: controller.signal,
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

  const remoteProxies = [
    `https://cors-anywhere.pulkitpareekofficial.workers.dev/?url=${encoded}`,
    `https://dry-surf-6b16.joshua-ed.workers.dev/?url=${encoded}`,
    `https://cors.luckydesigner.workers.dev/?${cleanUrl}`,
    `https://api.allorigins.win/raw?url=${encoded}`,
  ];

  // Use Vite's local proxy route during dev; on static hosts (GitHub Pages), use fast Worker proxies
  const endpoints = import.meta.env.DEV
    ? [`/api/proxy?url=${encoded}`, ...remoteProxies]
    : remoteProxies;

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
