import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useFeeds } from './hooks/useFeeds';
import { Sidebar } from './components/Sidebar';
import { ArticleList, type SortOrder } from './components/ArticleList';
import { ArticleReader } from './components/ArticleReader';
import { DataPortabilityModal } from './components/DataPortabilityModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  DEFAULT_READER_PREFERENCES,
  loadReaderPreferences,
  saveReaderPreferences,
} from './services/storageService';
import type { FeedItem, FeedSource, ReaderPreferences } from './types/feed';

export default function App() {
  const {
    sources,
    articles,
    isLoading,
    isRefreshing,
    error,
    clearError,
    addFeed,
    refreshAllFeeds,
    importOpmlFeeds,
    importFullBackup,
    toggleRead,
    markAllRead,
    toggleStar,
    updateArticleNote,
    updateSourceCategory,
    deleteSource,
  } = useFeeds();

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(
    DEFAULT_READER_PREFERENCES
  );

  // Modal states
  const [portabilityModalOpen, setPortabilityModalOpen] = useState(false);
  const [portabilityTab, setPortabilityTab] = useState<'opml' | 'starter' | 'backup'>('opml');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved reader preferences on mount
  useEffect(() => {
    loadReaderPreferences().then(setReaderPrefs);
  }, []);

  const handleUpdateReaderPrefs = (next: ReaderPreferences) => {
    setReaderPrefs(next);
    saveReaderPreferences(next);
  };

  // Map sourceId -> FeedSource for fast lookup
  const sourcesMap = useMemo(() => {
    const map = new Map<string, FeedSource>();
    for (const s of sources) {
      map.set(s.id, s);
    }
    return map;
  }, [sources]);

  // Compute human-readable title for the current view
  const viewTitle = useMemo(() => {
    switch (activeFilter) {
      case 'all':
        return 'All Articles';
      case 'unread':
        return 'Unread Articles';
      case 'starred':
        return 'Starred Articles';
      case 'notes':
        return 'Reading Notes';
      default:
        if (activeFilter.startsWith('category:')) {
          return activeFilter.slice('category:'.length);
        }
        return sourcesMap.get(activeFilter)?.title || 'Feed';
    }
  }, [activeFilter, sourcesMap]);

  // Filter & sort articles based on sidebar selection, search query, and sort order
  const filteredArticles = useMemo(() => {
    let base: FeedItem[];

    switch (activeFilter) {
      case 'unread':
        base = articles.filter((a) => !a.isRead);
        break;
      case 'starred':
        base = articles.filter((a) => a.isStarred);
        break;
      case 'notes':
        base = articles.filter((a) => Boolean(a.note));
        break;
      case 'all':
        base = articles;
        break;
      default:
        if (activeFilter.startsWith('category:')) {
          const catName = activeFilter.slice('category:'.length);
          const sourceIdsInCat = new Set(
            sources.filter((s) => s.category === catName).map((s) => s.id)
          );
          base = articles.filter((a) => sourceIdsInCat.has(a.sourceId));
        } else {
          base = articles.filter((a) => a.sourceId === activeFilter);
        }
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base.filter((a) => {
        const sourceTitle = sourcesMap.get(a.sourceId)?.title.toLowerCase() || '';
        return (
          a.title.toLowerCase().includes(q) ||
          a.snippet.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          (a.note && a.note.toLowerCase().includes(q)) ||
          sourceTitle.includes(q)
        );
      });
    }

    const sorted = [...base];
    if (sortOrder === 'newest') {
      sorted.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortOrder === 'oldest') {
      sorted.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortOrder === 'unread_first') {
      sorted.sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return b.timestamp - a.timestamp;
      });
    }

    return sorted;
  }, [articles, sources, sourcesMap, activeFilter, searchQuery, sortOrder]);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  const unreadCount = useMemo(
    () => articles.filter((a) => !a.isRead).length,
    [articles]
  );
  const starredCount = useMemo(
    () => articles.filter((a) => a.isStarred).length,
    [articles]
  );
  const notesCount = useMemo(
    () => articles.filter((a) => Boolean(a.note)).length,
    [articles]
  );

  const handleSelectArticle = useCallback(
    (article: FeedItem) => {
      setSelectedArticleId(article.id);
      if (!article.isRead) {
        toggleRead(article.id);
      }
    },
    [toggleRead]
  );

  const handleStarClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar(id);
  };

  const handleDeleteSource = (sourceId: string) => {
    if (activeFilter === sourceId) {
      setActiveFilter('all');
    }
    deleteSource(sourceId);
  };

  const handleMarkVisibleRead = useCallback(() => {
    const ids = filteredArticles.filter((a) => !a.isRead).map((a) => a.id);
    if (ids.length > 0) {
      markAllRead(ids);
    }
  }, [filteredArticles, markAllRead]);

  const openPortabilityModal = (tab: 'opml' | 'starter' | 'backup' = 'opml') => {
    setPortabilityTab(tab);
    setPortabilityModalOpen(true);
  };

  // Global Vim-style Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen((v) => !v);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'i' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openPortabilityModal('opml');
        return;
      }

      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        refreshAllFeeds();
        return;
      }

      if (e.key === 'A' && e.shiftKey) {
        e.preventDefault();
        handleMarkVisibleRead();
        return;
      }

      if (filteredArticles.length === 0) return;

      const currentIndex = filteredArticles.findIndex(
        (a) => a.id === selectedArticleId
      );

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown': {
          e.preventDefault();
          const nextIndex =
            currentIndex < filteredArticles.length - 1 ? currentIndex + 1 : 0;
          handleSelectArticle(filteredArticles[nextIndex]);
          break;
        }
        case 'k':
        case 'arrowup': {
          e.preventDefault();
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : filteredArticles.length - 1;
          handleSelectArticle(filteredArticles[prevIndex]);
          break;
        }
        case 'm': {
          if (selectedArticleId) {
            e.preventDefault();
            toggleRead(selectedArticleId);
          }
          break;
        }
        case 's': {
          if (selectedArticleId) {
            e.preventDefault();
            toggleStar(selectedArticleId);
          }
          break;
        }
        case 'o': {
          if (selectedArticle?.link) {
            e.preventDefault();
            window.open(selectedArticle.link, '_blank', 'noopener,noreferrer');
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    filteredArticles,
    selectedArticleId,
    selectedArticle,
    toggleRead,
    toggleStar,
    refreshAllFeeds,
    handleSelectArticle,
    handleMarkVisibleRead,
  ]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-950 text-neutral-400 text-sm">
        Loading subscriptions...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-950/95 border border-red-700 text-red-200 text-xs px-3.5 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5">
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-red-400 hover:text-red-200"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Sidebar
        sources={sources}
        articles={articles}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        onAddFeed={addFeed}
        onDeleteSource={handleDeleteSource}
        onUpdateSourceCategory={updateSourceCategory}
        onRefreshAll={refreshAllFeeds}
        isRefreshing={isRefreshing}
        unreadCount={unreadCount}
        starredCount={starredCount}
        notesCount={notesCount}
        onOpenPortabilityModal={openPortabilityModal}
        onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
      />

      <ArticleList
        viewTitle={viewTitle}
        articles={filteredArticles}
        sourcesMap={sourcesMap}
        selectedArticleId={selectedArticleId}
        onSelectArticle={handleSelectArticle}
        onToggleStar={handleStarClick}
        onMarkAllRead={handleMarkVisibleRead}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <ArticleReader
        key={selectedArticle?.id ?? 'none'}
        article={selectedArticle}
        source={
          selectedArticle ? sourcesMap.get(selectedArticle.sourceId) : undefined
        }
        onToggleRead={toggleRead}
        onToggleStar={toggleStar}
        onUpdateNote={updateArticleNote}
        preferences={readerPrefs}
        onUpdatePreferences={handleUpdateReaderPrefs}
      />

      <DataPortabilityModal
        isOpen={portabilityModalOpen}
        activeTab={portabilityTab}
        onTabChange={setPortabilityTab}
        onClose={() => setPortabilityModalOpen(false)}
        sources={sources}
        articles={articles}
        onImportOpml={importOpmlFeeds}
        onImportFullBackup={importFullBackup}
      />

      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}