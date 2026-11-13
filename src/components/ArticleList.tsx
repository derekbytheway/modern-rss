import {
  Star,
  Search,
  X,
  CheckCheck,
  ArrowUpDown,
  Clock,
  StickyNote,
} from 'lucide-react';
import type { FeedItem, FeedSource } from '../types/feed';

export type SortOrder = 'newest' | 'oldest' | 'unread_first';

interface ArticleListProps {
  viewTitle: string;
  articles: FeedItem[];
  sourcesMap: Map<string, FeedSource>;
  selectedArticleId: string | null;
  onSelectArticle: (article: FeedItem) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onMarkAllRead: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d`;
}

const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  unread_first: 'Unread First',
};

export function ArticleList({
  viewTitle,
  articles,
  sourcesMap,
  selectedArticleId,
  onSelectArticle,
  onToggleStar,
  onMarkAllRead,
  searchQuery,
  onSearchChange,
  searchInputRef,
  sortOrder,
  onSortOrderChange,
}: ArticleListProps) {
  const unreadInView = articles.filter((a) => !a.isRead).length;

  const cycleSortOrder = () => {
    const order: SortOrder[] = ['newest', 'unread_first', 'oldest'];
    const next = order[(order.indexOf(sortOrder) + 1) % order.length];
    onSortOrderChange(next);
  };

  return (
    <section
      id="article-list-section"
      className="w-96 border-r border-gray-200 dark:border-neutral-800 flex flex-col h-screen bg-white dark:bg-[#121212] shrink-0"
    >
      {/* Top Header & Controls */}
      <div
        id="article-list-header"
        className="p-3.5 border-b border-gray-200 dark:border-neutral-800 bg-gray-50/70 dark:bg-neutral-900/30 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div id="article-list-title-group" className="min-w-0">
            <h2
              id="article-list-title"
              className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate"
            >
              {viewTitle}
            </h2>
            <p id="article-list-meta" className="text-[11px] text-gray-500 dark:text-neutral-400">
              {articles.length} {articles.length === 1 ? 'article' : 'articles'}
              {unreadInView > 0 ? ` · ${unreadInView} unread` : ''}
            </p>
          </div>

          <div id="article-list-actions" className="flex items-center gap-1 shrink-0">
            <button
              id="sort-order-btn"
              type="button"
              onClick={cycleSortOrder}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 bg-white dark:bg-[#121212] text-[11px] text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-neutral-100 transition-colors"
              title="Change sort order"
            >
              <ArrowUpDown className="w-3 h-3 text-orange-500 dark:text-orange-400" />
              <span>{SORT_LABELS[sortOrder]}</span>
            </button>

            <button
              id="mark-all-read-btn"
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadInView === 0}
              className="p-1.5 rounded-md border border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 bg-white dark:bg-[#121212] text-gray-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-35 transition-colors"
              title="Mark all visible articles as read (Shift+A)"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div id="article-search-wrapper" className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="article-search-input"
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter articles, authors, notes... (/)"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-neutral-900/60 border border-gray-200 dark:border-neutral-800 text-xs text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-orange-500/80 transition-colors"
          />
          {searchQuery && (
            <button
              id="article-search-clear-btn"
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Article Cards Feed */}
      {articles.length === 0 ? (
        <div
          id="article-list-empty"
          className="flex-1 flex flex-col items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-neutral-400 space-y-1"
        >
          <p>No articles match this view.</p>
          {searchQuery && (
            <button
              id="article-list-clear-search-btn"
              type="button"
              onClick={() => onSearchChange('')}
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline mt-1"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div
          id="article-list-items"
          className="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-neutral-800/70"
        >
          {articles.map((article, index) => {
            const isSelected = article.id === selectedArticleId;
            const source = sourcesMap.get(article.sourceId);
            // Apply content-visibility: auto ONLY to items strictly below the initial fold (index >= 10)
            const deferredClass = index >= 10 ? 'article-card-deferred' : '';

            return (
              <div
                id={`article-card-${article.id}`}
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className={`${deferredClass} p-4 cursor-pointer transition-colors relative flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-neutral-800/70 border-l-2 border-l-orange-500'
                    : 'hover:bg-gray-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!article.isRead && (
                      <span
                        id={`article-unread-dot-${article.id}`}
                        className="w-2 h-2 rounded-full bg-orange-500 shrink-0"
                      />
                    )}
                    {source?.favicon && (
                      <img
                        src={source.favicon}
                        alt=""
                        className="w-3.5 h-3.5 rounded-xs shrink-0 opacity-80"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {source && (
                      <span className="text-[11px] text-gray-500 dark:text-neutral-400 font-medium truncate max-w-[130px]">
                        {source.title}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 dark:text-neutral-500">·</span>
                    <span className="text-[11px] text-gray-500 dark:text-neutral-400 font-mono shrink-0">
                      {formatRelativeTime(article.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {article.readingTimeMinutes && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-neutral-400 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {article.readingTimeMinutes}m
                      </span>
                    )}
                    {article.note && (
                      <span title="Has personal note">
                        <StickyNote className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </span>
                    )}
                    <button
                      id={`article-star-btn-${article.id}`}
                      type="button"
                      onClick={(e) => onToggleStar(article.id, e)}
                      className="text-gray-400 dark:text-neutral-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                      title={article.isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          article.isStarred ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <h3
                  id={`article-title-${article.id}`}
                  className={`text-sm leading-snug line-clamp-2 ${
                    article.isRead
                      ? 'text-gray-500 dark:text-neutral-400 font-normal'
                      : 'text-gray-900 dark:text-neutral-100 font-medium'
                  }`}
                >
                  {article.title}
                </h3>

                {article.snippet && (
                  <p
                    id={`article-snippet-${article.id}`}
                    className="text-xs text-gray-500 dark:text-neutral-400 line-clamp-2 leading-relaxed"
                  >
                    {article.snippet}
                  </p>
                )}

                {article.note && (
                  <div
                    id={`article-note-preview-${article.id}`}
                    className="mt-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-700 dark:text-emerald-300 line-clamp-1 flex items-center gap-1.5"
                  >
                    <StickyNote className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">{article.note}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
