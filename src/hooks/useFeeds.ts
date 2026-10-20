import { useState, useEffect, useCallback, useRef } from 'react';
import type { FeedItem, FeedSource, OpmlOutlineItem } from '../types/feed';
import { fetchFeed } from '../services/feedService';
import {
    loadSavedSources,
    saveSources,
    loadSavedArticles,
    saveArticles,
} from '../services/storageService';

export interface ImportProgress {
    completed: number;
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
    currentTitle?: string;
}

export function useFeeds() {
    const [sources, setSources] = useState<FeedSource[]>([]);
    const [articles, setArticles] = useState<FeedItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const sourcesRef = useRef<FeedSource[]>([]);
    const articlesRef = useRef<FeedItem[]>([]);

    useEffect(() => {
        sourcesRef.current = sources;
    }, [sources]);

    useEffect(() => {
        articlesRef.current = articles;
    }, [articles]);

    // Initial load from IndexedDB
    useEffect(() => {
        async function init() {
            setIsLoading(true);
            try {
                const [savedSources, savedArticles] = await Promise.all([
                    loadSavedSources(),
                    loadSavedArticles(),
                ]);
                setSources(savedSources);
                setArticles(savedArticles);
                sourcesRef.current = savedSources;
                articlesRef.current = savedArticles;
            } catch {
                setError('Error loading saved feeds.');
            } finally {
                setIsLoading(false);
            }
        }
        init();
    }, []);

    const clearError = useCallback(() => setError(null), []);

    // Add a new feed by URL (with optional category and custom title)
    const addFeed = useCallback(
        async (feedUrl: string, category?: string, customTitle?: string) => {
            setError(null);
            const cleanUrl = feedUrl.trim();
            try {
                if (
                    sourcesRef.current.some(
                        (s) => s.url.toLowerCase() === cleanUrl.toLowerCase()
                    )
                ) {
                    throw new Error('This feed is already in your subscriptions.');
                }

                const { source, items } = await fetchFeed(cleanUrl, {
                    category: category?.trim() || undefined,
                    customTitle: customTitle?.trim() || undefined,
                });

                setSources((prevSources) => {
                    if (
                        prevSources.some(
                            (s) => s.url.toLowerCase() === source.url.toLowerCase()
                        )
                    ) {
                        return prevSources;
                    }
                    const updated = [...prevSources, source];
                    sourcesRef.current = updated;
                    saveSources(updated);
                    return updated;
                });

                setArticles((prevArticles) => {
                    const existingLinks = new Set(prevArticles.map((item) => item.link));
                    const newItems = items.filter(
                        (item) => item.link && !existingLinks.has(item.link)
                    );
                    const updated = [...newItems, ...prevArticles].sort(
                        (a, b) => b.timestamp - a.timestamp
                    );
                    articlesRef.current = updated;
                    saveArticles(updated);
                    return updated;
                });

                return true;
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : 'Failed to add feed.';
                setError(message);
                return false;
            }
        },
        []
    );

    // Refresh a single source by ID
    const refreshSource = useCallback(async (sourceId: string) => {
        const target = sourcesRef.current.find((s) => s.id === sourceId);
        if (!target) return false;

        setIsRefreshing(true);
        setError(null);
        try {
            const { source: refreshedSource, items } = await fetchFeed(target.url, {
                sourceId: target.id,
                category: target.category,
                customTitle: target.title,
            });

            setSources((prev) => {
                const updated = prev.map((s) =>
                    s.id === sourceId
                        ? {
                              ...s,
                              lastUpdated: Date.now(),
                              favicon: s.favicon || refreshedSource.favicon,
                          }
                        : s
                );
                sourcesRef.current = updated;
                saveSources(updated);
                return updated;
            });

            setArticles((prevArticles) => {
                const existingLinks = new Set(prevArticles.map((item) => item.link));
                const newItems = items.filter(
                    (item) => item.link && !existingLinks.has(item.link)
                );
                if (newItems.length === 0) return prevArticles;
                const updated = [...newItems, ...prevArticles].sort(
                    (a, b) => b.timestamp - a.timestamp
                );
                articlesRef.current = updated;
                saveArticles(updated);
                return updated;
            });

            return true;
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : `Failed to refresh ${target.title}`;
            setError(message);
            return false;
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    // Refresh all subscribed feeds in parallel batches
    const refreshAllFeeds = useCallback(async () => {
        const currentSources = sourcesRef.current;
        if (currentSources.length === 0 || isRefreshing) return;

        setIsRefreshing(true);
        setError(null);

        try {
            const batchSize = 4;
            const collectedItems: FeedItem[] = [];
            const updatedTimestamps = new Map<string, { lastUpdated: number; favicon?: string }>();

            for (let i = 0; i < currentSources.length; i += batchSize) {
                const batch = currentSources.slice(i, i + batchSize);
                const results = await Promise.allSettled(
                    batch.map((src) =>
                        fetchFeed(src.url, {
                            sourceId: src.id,
                            category: src.category,
                            customTitle: src.title,
                        })
                    )
                );

                results.forEach((res, idx) => {
                    const src = batch[idx];
                    if (res.status === 'fulfilled') {
                        updatedTimestamps.set(src.id, {
                            lastUpdated: Date.now(),
                            favicon: src.favicon || res.value.source.favicon,
                        });
                        collectedItems.push(...res.value.items);
                    }
                });
            }

            if (updatedTimestamps.size > 0) {
                setSources((prev) => {
                    const updated = prev.map((s) => {
                        const meta = updatedTimestamps.get(s.id);
                        return meta
                            ? {
                                  ...s,
                                  lastUpdated: meta.lastUpdated,
                                  favicon: meta.favicon || s.favicon,
                              }
                            : s;
                    });
                    sourcesRef.current = updated;
                    saveSources(updated);
                    return updated;
                });
            }

            if (collectedItems.length > 0) {
                setArticles((prevArticles) => {
                    const existingLinks = new Set(prevArticles.map((item) => item.link));
                    const newItems = collectedItems.filter(
                        (item) => item.link && !existingLinks.has(item.link)
                    );
                    if (newItems.length === 0) return prevArticles;
                    const updated = [...newItems, ...prevArticles].sort(
                        (a, b) => b.timestamp - a.timestamp
                    );
                    articlesRef.current = updated;
                    saveArticles(updated);
                    return updated;
                });
            }
        } catch {
            setError('Some feeds could not be refreshed.');
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing]);

    // Batch import OPML outline items with live progress reporting
    const importOpmlFeeds = useCallback(
        async (
            outlines: OpmlOutlineItem[],
            onProgress?: (progress: ImportProgress) => void
        ): Promise<ImportProgress> => {
            setError(null);
            const existingUrls = new Map(
                sourcesRef.current.map((s) => [s.url.toLowerCase(), s])
            );

            const toFetch: OpmlOutlineItem[] = [];
            let skipped = 0;
            const categoryUpdates = new Map<string, string>();

            for (const item of outlines) {
                const cleanUrl = item.xmlUrl.trim();
                const existing = existingUrls.get(cleanUrl.toLowerCase());
                if (existing) {
                    skipped++;
                    if (!existing.category && item.category) {
                        categoryUpdates.set(existing.id, item.category);
                    }
                } else {
                    existingUrls.set(cleanUrl.toLowerCase(), {
                        id: 'pending',
                        title: item.title,
                        url: cleanUrl,
                        siteUrl: item.htmlUrl || cleanUrl,
                        lastUpdated: Date.now(),
                    });
                    toFetch.push(item);
                }
            }

            // Apply category updates to any existing feeds that lacked categories
            if (categoryUpdates.size > 0) {
                setSources((prev) => {
                    const updated = prev.map((s) =>
                        categoryUpdates.has(s.id)
                            ? { ...s, category: categoryUpdates.get(s.id) }
                            : s
                    );
                    sourcesRef.current = updated;
                    saveSources(updated);
                    return updated;
                });
            }

            const progress: ImportProgress = {
                completed: skipped,
                total: outlines.length,
                succeeded: 0,
                skipped,
                failed: 0,
            };

            onProgress?.({ ...progress });

            if (toFetch.length === 0) {
                return progress;
            }

            const newSources: FeedSource[] = [];
            const newArticles: FeedItem[] = [];
            const batchSize = 3;

            for (let i = 0; i < toFetch.length; i += batchSize) {
                const batch = toFetch.slice(i, i + batchSize);
                progress.currentTitle = batch[0]?.title;
                onProgress?.({ ...progress });

                const results = await Promise.allSettled(
                    batch.map((item) =>
                        fetchFeed(item.xmlUrl, {
                            category: item.category,
                            customTitle:
                                item.title && item.title !== 'Untitled Feed'
                                    ? item.title
                                    : undefined,
                        })
                    )
                );

                for (const res of results) {
                    progress.completed++;
                    if (res.status === 'fulfilled') {
                        progress.succeeded++;
                        newSources.push(res.value.source);
                        newArticles.push(...res.value.items);
                    } else {
                        progress.failed++;
                    }
                    onProgress?.({ ...progress });
                }
            }

            if (newSources.length > 0) {
                setSources((prev) => {
                    const existingSet = new Set(prev.map((s) => s.url.toLowerCase()));
                    const uniqueNew = newSources.filter(
                        (s) => !existingSet.has(s.url.toLowerCase())
                    );
                    const updated = [...prev, ...uniqueNew];
                    sourcesRef.current = updated;
                    saveSources(updated);
                    return updated;
                });

                setArticles((prev) => {
                    const existingLinks = new Set(prev.map((a) => a.link));
                    const uniqueArticles = newArticles.filter(
                        (a) => a.link && !existingLinks.has(a.link)
                    );
                    const updated = [...uniqueArticles, ...prev].sort(
                        (a, b) => b.timestamp - a.timestamp
                    );
                    articlesRef.current = updated;
                    saveArticles(updated);
                    return updated;
                });
            }

            progress.currentTitle = undefined;
            onProgress?.({ ...progress });
            return progress;
        },
        []
    );

    // Import full JSON backup (sources + articles with read/starred/notes intact)
    const importFullBackup = useCallback(
        (backupSources: FeedSource[], backupArticles: FeedItem[]) => {
            setError(null);
            setSources((prevSources) => {
                const urlMap = new Map(
                    prevSources.map((s) => [s.url.toLowerCase(), s])
                );
                for (const incoming of backupSources) {
                    if (!urlMap.has(incoming.url.toLowerCase())) {
                        urlMap.set(incoming.url.toLowerCase(), incoming);
                    }
                }
                const updated = Array.from(urlMap.values());
                sourcesRef.current = updated;
                saveSources(updated);
                return updated;
            });

            setArticles((prevArticles) => {
                const linkMap = new Map(prevArticles.map((a) => [a.link, a]));
                for (const incoming of backupArticles) {
                    const existing = linkMap.get(incoming.link);
                    if (!existing) {
                        linkMap.set(incoming.link, incoming);
                    } else {
                        // Preserve starred, read, or note states from backup
                        linkMap.set(incoming.link, {
                            ...existing,
                            isRead: existing.isRead || incoming.isRead,
                            isStarred: existing.isStarred || incoming.isStarred,
                            note: existing.note || incoming.note,
                        });
                    }
                }
                const updated = Array.from(linkMap.values()).sort(
                    (a, b) => b.timestamp - a.timestamp
                );
                articlesRef.current = updated;
                saveArticles(updated);
                return updated;
            });
        },
        []
    );

    // Mark article read/unread
    const toggleRead = useCallback((articleId: string) => {
        setArticles((prev) => {
            const updated = prev.map((item) =>
                item.id === articleId ? { ...item, isRead: !item.isRead } : item
            );
            articlesRef.current = updated;
            saveArticles(updated);
            return updated;
        });
    }, []);

    // Mark multiple articles as read at once
    const markAllRead = useCallback((articleIds?: string[]) => {
        setArticles((prev) => {
            const idSet = articleIds ? new Set(articleIds) : null;
            const updated = prev.map((item) =>
                (!idSet || idSet.has(item.id)) && !item.isRead
                    ? { ...item, isRead: true }
                    : item
            );
            articlesRef.current = updated;
            saveArticles(updated);
            return updated;
        });
    }, []);

    // Mark article starred/unstarred
    const toggleStar = useCallback((articleId: string) => {
        setArticles((prev) => {
            const updated = prev.map((item) =>
                item.id === articleId ? { ...item, isStarred: !item.isStarred } : item
            );
            articlesRef.current = updated;
            saveArticles(updated);
            return updated;
        });
    }, []);

    // Save or clear a personal note on an article
    const updateArticleNote = useCallback((articleId: string, note: string) => {
        const cleanNote = note.trim();
        setArticles((prev) => {
            const updated = prev.map((item) =>
                item.id === articleId
                    ? { ...item, note: cleanNote || undefined }
                    : item
            );
            articlesRef.current = updated;
            saveArticles(updated);
            return updated;
        });
    }, []);

    // Update feed category / folder
    const updateSourceCategory = useCallback(
        (sourceId: string, category?: string) => {
            const cleanCategory = category?.trim() || undefined;
            setSources((prev) => {
                const updated = prev.map((s) =>
                    s.id === sourceId ? { ...s, category: cleanCategory } : s
                );
                sourcesRef.current = updated;
                saveSources(updated);
                return updated;
            });
        },
        []
    );

    // Delete feed source and its associated articles
    const deleteSource = useCallback((sourceId: string) => {
        setSources((prevSources) => {
            const updatedSources = prevSources.filter((s) => s.id !== sourceId);
            sourcesRef.current = updatedSources;
            saveSources(updatedSources);
            return updatedSources;
        });

        setArticles((prevArticles) => {
            const updatedArticles = prevArticles.filter(
                (a) => a.sourceId !== sourceId
            );
            articlesRef.current = updatedArticles;
            saveArticles(updatedArticles);
            return updatedArticles;
        });
    }, []);

    return {
        sources,
        articles,
        isLoading,
        isRefreshing,
        error,
        clearError,
        addFeed,
        refreshSource,
        refreshAllFeeds,
        importOpmlFeeds,
        importFullBackup,
        toggleRead,
        markAllRead,
        toggleStar,
        updateArticleNote,
        updateSourceCategory,
        deleteSource,
    };
}
