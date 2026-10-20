import { useState, useMemo } from 'react';
import {
  Rss,
  Star,
  Inbox,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode2,
  Sparkles,
  Keyboard,
  StickyNote,
  FolderInput,
} from 'lucide-react';
import type { FeedItem, FeedSource } from '../types/feed';

interface SidebarProps {
  sources: FeedSource[];
  articles: FeedItem[];
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  onAddFeed: (url: string, category?: string) => Promise<boolean>;
  onDeleteSource: (sourceId: string) => void;
  onUpdateSourceCategory: (sourceId: string, category?: string) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  unreadCount: number;
  starredCount: number;
  notesCount: number;
  onOpenPortabilityModal: (tab?: 'opml' | 'starter' | 'backup') => void;
  onOpenShortcutsModal: () => void;
}

export function Sidebar({
  sources,
  articles,
  activeFilter,
  onSelectFilter,
  onAddFeed,
  onDeleteSource,
  onUpdateSourceCategory,
  onRefreshAll,
  isRefreshing,
  unreadCount,
  starredCount,
  notesCount,
  onOpenPortabilityModal,
  onOpenShortcutsModal,
}: SidebarProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [editingCategorySourceId, setEditingCategorySourceId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // Calculate unread counts per source
  const unreadBySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      if (!article.isRead) {
        counts.set(article.sourceId, (counts.get(article.sourceId) || 0) + 1);
      }
    }
    return counts;
  }, [articles]);

  // Extract unique categories and group sources
  const { categorizedGroups, uncategorizedSources, existingCategories } = useMemo(() => {
    const groups = new Map<string, FeedSource[]>();
    const uncategorized: FeedSource[] = [];

    for (const source of sources) {
      const cat = source.category?.trim();
      if (cat) {
        const list = groups.get(cat) || [];
        list.push(source);
        groups.set(cat, list);
      } else {
        uncategorized.push(source);
      }
    }

    const sortedCategories = Array.from(groups.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    return {
      categorizedGroups: sortedCategories.map((cat) => ({
        category: cat,
        items: groups.get(cat) || [],
      })),
      uncategorizedSources: uncategorized,
      existingCategories: sortedCategories,
    };
  }, [sources]);

  const toggleCategoryCollapse = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onAddFeed(newUrl.trim(), newCategory.trim() || undefined);
    setIsSubmitting(false);

    if (success) {
      setNewUrl('');
      setNewCategory('');
      setInputOpen(false);
    }
  };

  const handleSaveCategoryEdit = (sourceId: string) => {
    onUpdateSourceCategory(sourceId, editingCategoryValue.trim() || undefined);
    setEditingCategorySourceId(null);
    setEditingCategoryValue('');
  };

  const renderSourceRow = (source: FeedSource, indented = false) => {
    const sourceUnread = unreadBySource.get(source.id) || 0;
    const isEditingCat = editingCategorySourceId === source.id;

    if (isEditingCat) {
      return (
        <div
          key={source.id}
          className="px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 space-y-1.5"
        >
          <div className="text-[11px] text-neutral-400 truncate">
            Folder for <span className="text-neutral-200 font-medium">{source.title}</span>:
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              list="existing-rss-categories"
              value={editingCategoryValue}
              onChange={(e) => setEditingCategoryValue(e.target.value)}
              placeholder="e.g. Tech, Design (blank for none)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCategoryEdit(source.id);
                if (e.key === 'Escape') setEditingCategorySourceId(null);
              }}
              className="flex-1 min-w-0 text-xs px-2 py-1 rounded bg-neutral-950 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-orange-500"
            />
            <button
              type="button"
              onClick={() => handleSaveCategoryEdit(source.id)}
              className="text-[11px] px-2 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-medium"
            >
              Save
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={source.id}
        className={`group flex items-center justify-between ${
          indented ? 'pl-6 pr-2' : 'px-2.5'
        } py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
          activeFilter === source.id
            ? 'bg-neutral-800 text-neutral-100 font-medium'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
        }`}
        onClick={() => onSelectFilter(source.id)}
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          {source.favicon ? (
            <img
              src={source.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-xs shrink-0 opacity-90"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Rss className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          )}
          <span className="truncate text-xs">{source.title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {sourceUnread > 0 && (
            <span className="group-hover:hidden text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-800/90 text-neutral-400">
              {sourceUnread}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCategorySourceId(source.id);
              setEditingCategoryValue(source.category || '');
            }}
            className="hidden group-hover:inline-flex p-1 rounded hover:bg-neutral-700/60 hover:text-orange-400 transition-colors"
            title="Move to folder"
          >
            <FolderInput className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSource(source.id);
            }}
            className="hidden group-hover:inline-flex p-1 rounded hover:bg-neutral-700/60 hover:text-red-400 transition-colors"
            title="Delete Feed"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 flex flex-col h-screen select-none shrink-0">
      {/* App Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-neutral-100 tracking-tight">
          <div className="p-1 rounded-md bg-orange-500/15 border border-orange-500/30">
            <Rss className="w-4 h-4 text-orange-500" />
          </div>
          <span>ModernRSS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshing || sources.length === 0}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-40 transition-colors"
            title="Refresh All Feeds (r)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setInputOpen((v) => !v)}
            className={`p-1.5 rounded-md transition-colors ${
              inputOpen
                ? 'bg-orange-500/20 text-orange-400'
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Add Feed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Datalist for category autocomplete */}
      <datalist id="existing-rss-categories">
        {existingCategories.map((cat) => (
          <option key={cat} value={cat} />
        ))}
      </datalist>

      {/* Add Feed Input Bar */}
      {inputOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-3 border-b border-neutral-800 bg-neutral-900 space-y-2"
        >
          <input
            type="url"
            placeholder="https://site.com/feed.xml"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            className="w-full text-xs px-2.5 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-orange-500"
          />
          <input
            type="text"
            list="existing-rss-categories"
            placeholder="Folder / Category (optional)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-xs px-2.5 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-orange-500"
          />
          <div className="flex justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setInputOpen(false)}
              className="text-xs px-2 py-1 text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newUrl.trim()}
              className="text-xs px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Subscribe
            </button>
          </div>
        </form>
      )}

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-5">
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5 text-neutral-400" />
              All Articles
            </span>
            {articles.length > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-800/80 text-neutral-400">
                {articles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('unread')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'unread'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 ml-0.5 mr-0.5" />
              Unread
            </span>
            {unreadCount > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('starred')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'starred'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Starred
            </span>
            {starredCount > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-800 text-amber-400">
                {starredCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('notes')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'notes'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5 text-emerald-400" />
              Reading Notes
            </span>
            {notesCount > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-800 text-emerald-400">
                {notesCount}
              </span>
            )}
          </button>
        </div>

        {/* Subscriptions & Folders */}
        <div>
          <div className="px-2.5 mb-1.5 flex items-center justify-between text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <span>Subscriptions ({sources.length})</span>
            <button
              type="button"
              onClick={() => onOpenPortabilityModal('opml')}
              className="text-orange-400/90 hover:text-orange-300 normal-case font-normal"
              title="Import or export OPML file"
            >
              OPML
            </button>
          </div>

          {sources.length === 0 ? (
            <div className="mx-1.5 mt-2 p-3 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/50 text-center space-y-2.5">
              <p className="text-xs text-neutral-400 leading-relaxed">
                No feeds yet. Import an OPML backup or try our curated starter bundle!
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenPortabilityModal('starter')}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Explore Starter Feeds
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPortabilityModal('opml')}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  Import OPML File
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Categorized Folders */}
              {categorizedGroups.map(({ category, items }) => {
                const isCollapsed = collapsedCategories.has(category);
                const categoryFilterKey = `category:${category}`;
                const isCatActive = activeFilter === categoryFilterKey;
                const folderUnread = items.reduce(
                  (acc, s) => acc + (unreadBySource.get(s.id) || 0),
                  0
                );

                return (
                  <div key={category} className="space-y-0.5">
                    <div
                      onClick={() => onSelectFilter(categoryFilterKey)}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                        isCatActive
                          ? 'bg-neutral-800 text-neutral-100 font-medium'
                          : 'text-neutral-300 hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => toggleCategoryCollapse(category, e)}
                          className="p-0.5 rounded hover:bg-neutral-700/60 text-neutral-400"
                          aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isCollapsed ? (
                          <Folder className="w-3.5 h-3.5 text-orange-400/90 shrink-0" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        )}
                        <span className="truncate font-medium">{category}</span>
                      </div>

                      {folderUnread > 0 && (
                        <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400">
                          {folderUnread}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="space-y-0.5">
                        {items.map((source) => renderSourceRow(source, true))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Uncategorized Feeds */}
              {uncategorizedSources.map((source) => renderSourceRow(source, false))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-2.5 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onOpenPortabilityModal('opml')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition-colors"
          title="OPML Export / Import & Backups (i)"
        >
          <FileCode2 className="w-3.5 h-3.5 text-orange-400" />
          <span>OPML / Backup</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenPortabilityModal('starter')}
          className="p-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-orange-400 transition-colors"
          title="Explore Curated Starter Feeds"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenShortcutsModal}
          className="p-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
