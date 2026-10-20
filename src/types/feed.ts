export interface FeedItem {
    id: string;
    sourceId: string;
    title: string;
    link: string;
    author: string;
    pubDate: string;
    timestamp: number;
    content: string;
    snippet: string;
    isRead: boolean;
    isStarred: boolean;
    note?: string;
    readingTimeMinutes?: number;
}

export interface FeedSource {
    id: string;
    title: string;
    url: string;
    siteUrl: string;
    favicon?: string;
    category?: string;
    lastUpdated: number;
}

export interface OpmlOutlineItem {
    title: string;
    xmlUrl: string;
    htmlUrl?: string;
    category?: string;
}

export interface ReaderPreferences {
    fontFamily: 'sans' | 'serif' | 'mono';
    fontSize: 'sm' | 'base' | 'lg' | 'xl';
    maxWidth: 'narrow' | 'comfort' | 'wide';
    theme: 'dark' | 'oled' | 'sepia' | 'light';
}
