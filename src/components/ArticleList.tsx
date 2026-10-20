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
    <section className="w-96 border-r border-neutral-800 flex flex-col h-screen bg-neutral-950 shrink-0">
      {/* Top Header & Controls */}
      <div className="p-3.5 border-b border-neutral-800 bg-neutral-900/30 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-100 truncate">
              {viewTitle}
            </h2>
            <p className="text-[11px] text-neutral-500">
              {articles.length} {articles.length === 1 ? 'article' : 'articles'}
              {unreadInView > 0 ? ` · ${unreadInView} unread` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={cycleSortOrder}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-[11px] text-neutral-300 hover:text-neutral-100 transition-colors"
              title="Change sort order"
            >
              <ArrowUpDown className="w-3 h-3 text-orange-400" />
              <span>{SORT_LABELS[sortOrder]}</span>
            </button>

            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadInView === 0}
              className="p-1.5 rounded-md border border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-emerald-400 disabled:opacity-35 transition-colors"
              title="Mark all visible articles as read (Shift+A)"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter articles, authors, notes... (/)"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-orange-500/80 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Article Cards Feed */}
      {articles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-sm text-neutral-500 space-y-1">
          <p>No articles match this view.</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-xs text-orange-400 hover:underline mt-1"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-900">
          {articles.map((article, index) => {
            const isSelected = article.id === selectedArticleId;
            const source = sourcesMap.get(article.sourceId);
            // Apply content-visibility: auto ONLY to items strictly below the initial fold (index >= 10)
            const deferredClass = index >= 10 ? 'article-card-deferred' : '';

            return (
              <div
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className={`${deferredClass} p-4 cursor-pointer transition-colors relative flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-neutral-800/70 border-l-2 border-l-orange-500'
                    : 'hover:bg-neutral-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!article.isRead && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
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
                      <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[130px]">
                        {source.title}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-600">·</span>
                    <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                      {formatRelativeTime(article.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {article.readingTimeMinutes && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-neutral-500 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {article.readingTimeMinutes}m
                      </span>
                    )}
                    {article.note && (
                      <span title="Has personal note">
                        <StickyNote className="w-3 h-3 text-emerald-400" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => onToggleStar(article.id, e)}
                      className="text-neutral-600 hover:text-amber-400 transition-colors"
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
                  className={`text-sm leading-snug line-clamp-2 ${
                    article.isRead
                      ? 'text-neutral-400 font-normal'
                      : 'text-neutral-100 font-medium'
                  }`}
                >
                  {article.title}
                </h3>

                {article.snippet && (
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {article.snippet}
                  </p>
                )}

                {article.note && (
                  <div className="mt-1 px-2 py-1 rounded bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 line-clamp-1 flex items-center gap-1.5">
                    <StickyNote className="w-3 h-3 shrink-0 text-emerald-400" />
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
