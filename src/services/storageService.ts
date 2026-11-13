import { get, set } from 'idb-keyval';
import type { FeedItem, FeedSource, ReaderPreferences } from '../types/feed';

const STORAGE_KEYS = {
    SOURCES: 'rss_sources',
    ARTICLES: 'rss_articles',
    PREFERENCES: 'rss_reader_preferences',
} as const;

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
    fontFamily: 'sans',
    fontSize: 'base',
    lineHeight: 'relaxed',
    maxWidth: 'comfort',
    theme: 'dark',
};

export async function loadSavedSources(): Promise<FeedSource[]> {
    try {
        const sources = await get<FeedSource[]>(STORAGE_KEYS.SOURCES);
        return sources || [];
    } catch (err) {
        console.error('Failed to load sources from IndexedDB:', err);
        return [];
    }
}

export async function saveSources(sources: FeedSource[]): Promise<void> {
    try {
        await set(STORAGE_KEYS.SOURCES, sources);
    } catch (err) {
        console.error('Failed to save sources to IndexedDB:', err);
    }
}

export async function loadSavedArticles(): Promise<FeedItem[]> {
    try {
        const articles = await get<FeedItem[]>(STORAGE_KEYS.ARTICLES);
        return articles || [];
    } catch (err) {
        console.error('Failed to load articles from IndexedDB:', err);
        return [];
    }
}

export async function saveArticles(articles: FeedItem[]): Promise<void> {
    try {
        await set(STORAGE_KEYS.ARTICLES, articles);
    } catch (err) {
        console.error('Failed to save articles to IndexedDB:', err);
    }
}

export async function loadReaderPreferences(): Promise<ReaderPreferences> {
    try {
        const prefs = await get<ReaderPreferences>(STORAGE_KEYS.PREFERENCES);
        return prefs ? { ...DEFAULT_READER_PREFERENCES, ...prefs } : DEFAULT_READER_PREFERENCES;
    } catch (err) {
        console.error('Failed to load preferences from IndexedDB:', err);
        return DEFAULT_READER_PREFERENCES;
    }
}

export async function saveReaderPreferences(prefs: ReaderPreferences): Promise<void> {
    try {
        await set(STORAGE_KEYS.PREFERENCES, prefs);
    } catch (err) {
        console.error('Failed to save preferences to IndexedDB:', err);
    }
}
