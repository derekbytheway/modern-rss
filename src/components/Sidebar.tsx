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
  FolderPlus,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import type { FeedItem, FeedSource } from '../types/feed';

function toIdSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

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
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
  unreadCount,
  starredCount,
  notesCount,
  onOpenPortabilityModal,
  onOpenShortcutsModal,
}: SidebarProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('rss_custom_folders');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });
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
    const allKnownCategories = Array.from(
      new Set([...sortedCategories, ...customFolders])
    ).sort((a, b) => a.localeCompare(b));

    return {
      categorizedGroups: sortedCategories.map((cat) => ({
        category: cat,
        items: groups.get(cat) || [],
      })),
      uncategorizedSources: uncategorized,
      existingCategories: allKnownCategories,
    };
  }, [sources, customFolders]);

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

  const persistCustomFolder = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomFolders((prev) => {
      if (prev.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const next = [...prev, trimmed];
      try {
        localStorage.setItem('rss_custom_folders', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleCreateNewFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    persistCustomFolder(trimmed);
    setNewCategory(trimmed);
    setNewFolderName('');
    setIsCreatingFolder(false);
    setCategoryMenuOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || isSubmitting) return;

    const effectiveCategory = (isCreatingFolder && newFolderName.trim())
      ? newFolderName.trim()
      : newCategory.trim();
    if (effectiveCategory) {
      persistCustomFolder(effectiveCategory);
    }

    setIsSubmitting(true);
    const success = await onAddFeed(newUrl.trim(), effectiveCategory || undefined);
    setIsSubmitting(false);

    if (success) {
      setNewUrl('');
      setNewCategory('');
      setNewFolderName('');
      setIsCreatingFolder(false);
      setCategoryMenuOpen(false);
      setInputOpen(false);
    }
  };

  const handleSaveCategoryEdit = (sourceId: string) => {
    const trimmed = editingCategoryValue.trim();
    if (trimmed) {
      persistCustomFolder(trimmed);
    }
    onUpdateSourceCategory(sourceId, trimmed || undefined);
    setEditingCategorySourceId(null);
    setEditingCategoryValue('');
  };

  const renderSourceRow = (source: FeedSource, indented = false) => {
    const sourceUnread = unreadBySource.get(source.id) || 0;
    const isEditingCat = editingCategorySourceId === source.id;

    if (isEditingCat) {
      return (
        <div
          id={`source-edit-row-${source.id}`}
          key={source.id}
          className="px-2.5 py-1.5 rounded bg-gray-100 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 space-y-1.5"
        >
          <div className="text-[11px] text-gray-500 dark:text-neutral-400 truncate">
            Folder for <span className="text-gray-900 dark:text-neutral-200 font-medium">{source.title}</span>:
          </div>
          <div className="flex items-center gap-1.5">
            <input
              id={`source-edit-input-${source.id}`}
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
              className="flex-1 min-w-0 text-xs px-2 py-1 rounded bg-white dark:bg-[#121212] border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:border-orange-500"
            />
            <button
              id={`source-edit-save-${source.id}`}
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
        id={`source-row-${source.id}`}
        key={source.id}
        className={`group flex items-center justify-between h-8 ${
          indented ? 'pl-6 pr-2' : 'px-2.5'
        } rounded-md text-sm transition-colors cursor-pointer ${
          activeFilter === source.id
            ? 'bg-gray-200/80 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-medium'
            : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800/50'
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
            <Rss className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 shrink-0" />
          )}
          <span className="truncate text-xs">{source.title}</span>
        </div>

        <div className="flex items-center justify-end gap-1 shrink-0 h-6">
          {sourceUnread > 0 && (
            <span
              id={`source-unread-${source.id}`}
              className="group-hover:hidden text-[11px] font-mono leading-4 px-1.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300"
            >
              {sourceUnread}
            </span>
          )}
          <button
            id={`source-move-btn-${source.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCategorySourceId(source.id);
              setEditingCategoryValue(source.category || '');
            }}
            className="hidden group-hover:inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            title="Move to folder"
          >
            <FolderInput className="w-3 h-3" />
          </button>
          <button
            id={`source-delete-btn-${source.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSource(source.id);
            }}
            className="hidden group-hover:inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Delete Feed"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside
      id="sidebar"
      className="w-64 border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex flex-col h-screen select-none shrink-0"
    >
      {/* App Header */}
      <div
        id="sidebar-header"
        className="p-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between"
      >
        <div
          id="app-brand"
          className="flex items-center gap-2 font-semibold text-gray-900 dark:text-neutral-100 tracking-tight"
        >
          <div
            id="app-brand-icon"
            className="p-1 rounded-md bg-orange-500/15 border border-orange-500/30"
          >
            <Rss className="w-4 h-4 text-orange-500" />
          </div>
          <span id="app-brand-title">ModernRSS</span>
        </div>
        <div id="sidebar-header-actions" className="flex items-center gap-1">
          <button
            id="theme-switcher-btn"
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 transition-colors"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            id="refresh-feeds-btn"
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshing || sources.length === 0}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 disabled:opacity-40 transition-colors"
            title="Refresh All Feeds (r)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500 dark:text-orange-400' : ''}`} />
          </button>
          <button
            id="add-feed-toggle-btn"
            type="button"
            onClick={() => setInputOpen((v) => !v)}
            className={`p-1.5 rounded-md transition-colors ${
              inputOpen
                ? 'bg-orange-500/20 text-orange-500 dark:text-orange-400'
                : 'hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200'
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
          id="add-feed-form"
          onSubmit={handleSubmit}
          className="p-3 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50 space-y-2"
        >
          <input
            id="add-feed-url-input"
            type="url"
            placeholder="https://site.com/feed.xml"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            className="w-full text-xs px-2.5 py-1.5 rounded bg-white dark:bg-[#121212] border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-orange-500"
          />
          {isCreatingFolder ? (
            <div id="add-feed-new-folder-row" className="flex items-center gap-1.5">
              <input
                id="add-feed-new-folder-input"
                type="text"
                placeholder="New folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateNewFolder();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }
                }}
                className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded bg-white dark:bg-[#121212] border border-orange-500 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none"
              />
              <button
                id="add-feed-new-folder-confirm-btn"
                type="button"
                onClick={handleCreateNewFolder}
                disabled={!newFolderName.trim()}
                className="text-xs px-2 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-40"
              >
                Add
              </button>
              <button
                id="add-feed-new-folder-cancel-btn"
                type="button"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="text-xs px-1.5 py-1.5 text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div id="add-feed-category-picker" className="relative">
              <button
                id="add-feed-category-trigger"
                type="button"
                disabled={isSubmitting}
                onClick={() => setCategoryMenuOpen((v) => !v)}
                className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded bg-white dark:bg-[#121212] border border-gray-300 dark:border-neutral-700 text-left hover:border-gray-400 dark:hover:border-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
              >
                <span className={newCategory ? 'text-gray-900 dark:text-neutral-100 truncate' : 'text-gray-400 dark:text-neutral-500 truncate'}>
                  {newCategory || 'Folder / Category (optional)'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 shrink-0 transition-transform ${categoryMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryMenuOpen && (
                <div
                  id="add-feed-category-menu"
                  className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl py-1 max-h-48 overflow-y-auto"
                >
                  {newCategory && (
                    <button
                      id="add-feed-category-none-btn"
                      type="button"
                      onClick={() => {
                        setNewCategory('');
                        setCategoryMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 text-left"
                    >
                      <span>No Folder (optional)</span>
                    </button>
                  )}

                  {existingCategories.map((cat) => (
                    <button
                      id={`add-feed-category-option-${toIdSlug(cat)}`}
                      key={cat}
                      type="button"
                      onClick={() => {
                        setNewCategory(cat);
                        setCategoryMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 text-left"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Folder className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                        <span className="truncate">{cat}</span>
                      </span>
                      {newCategory === cat && (
                        <Check className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                      )}
                    </button>
                  ))}

                  <div className="my-1 border-t border-gray-200 dark:border-neutral-800" />

                  <button
                    id="add-feed-new-folder-btn"
                    type="button"
                    onClick={() => {
                      setCategoryMenuOpen(false);
                      setIsCreatingFolder(true);
                      setNewFolderName('');
                    }}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-left"
                  >
                    <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>New Folder</span>
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-0.5">
            <button
              id="add-feed-cancel-btn"
              type="button"
              onClick={() => setInputOpen(false)}
              className="text-xs px-2 py-1 text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              id="add-feed-submit-btn"
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
      <div id="sidebar-nav" className="flex-1 overflow-y-auto p-2 space-y-5">
        <div id="sidebar-filters" className="space-y-0.5">
          <button
            id="filter-all-btn"
            type="button"
            onClick={() => onSelectFilter('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-gray-200/80 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5 text-gray-500 dark:text-neutral-400" />
              All Articles
            </span>
            {articles.length > 0 && (
              <span
                id="filter-all-count"
                className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300"
              >
                {articles.length}
              </span>
            )}
          </button>

          <button
            id="filter-unread-btn"
            type="button"
            onClick={() => onSelectFilter('unread')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'unread'
                ? 'bg-gray-200/80 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 ml-0.5 mr-0.5" />
              Unread
            </span>
            {unreadCount > 0 && (
              <span
                id="filter-unread-count"
                className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400"
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            id="filter-starred-btn"
            type="button"
            onClick={() => onSelectFilter('starred')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'starred'
                ? 'bg-gray-200/80 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Starred
            </span>
            {starredCount > 0 && (
              <span
                id="filter-starred-count"
                className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-amber-600 dark:text-amber-400"
              >
                {starredCount}
              </span>
            )}
          </button>

          <button
            id="filter-notes-btn"
            type="button"
            onClick={() => onSelectFilter('notes')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'notes'
                ? 'bg-gray-200/80 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Reading Notes
            </span>
            {notesCount > 0 && (
              <span
                id="filter-notes-count"
                className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400"
              >
                {notesCount}
              </span>
            )}
          </button>
        </div>

        {/* Subscriptions & Folders */}
        <div id="subscriptions-section">
          <div
            id="subscriptions-header"
            className="px-2.5 mb-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider"
          >
            <span>Subscriptions ({sources.length})</span>
            <button
              id="subscriptions-opml-btn"
              type="button"
              onClick={() => onOpenPortabilityModal('opml')}
              className="text-orange-600 dark:text-orange-400/90 hover:text-orange-500 dark:hover:text-orange-300 normal-case font-normal"
              title="Import or export OPML file"
            >
              OPML
            </button>
          </div>

          {sources.length === 0 ? (
            <div
              id="subscriptions-empty-state"
              className="mx-1.5 mt-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/40 text-center space-y-2.5"
            >
              <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">
                No feeds yet. Import an OPML backup or try our curated starter bundle!
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  id="empty-starter-feeds-btn"
                  type="button"
                  onClick={() => onOpenPortabilityModal('starter')}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Explore Starter Feeds
                </button>
                <button
                  id="empty-import-opml-btn"
                  type="button"
                  onClick={() => onOpenPortabilityModal('opml')}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  Import OPML File
                </button>
              </div>
            </div>
          ) : (
            <div id="subscriptions-list" className="space-y-1">
              {/* Categorized Folders */}
              {categorizedGroups.map(({ category, items }) => {
                const isCollapsed = collapsedCategories.has(category);
                const categoryFilterKey = `category:${category}`;
                const isCatActive = activeFilter === categoryFilterKey;
                const folderSlug = toIdSlug(category);
                const folderUnread = items.reduce(
                  (acc, s) => acc + (unreadBySource.get(s.id) || 0),
                  0
                );

                return (
                  <div id={`folder-group-${folderSlug}`} key={category} className="space-y-0.5">
                    <div
                      id={`folder-row-${folderSlug}`}
                      onClick={() => onSelectFilter(categoryFilterKey)}
                      className={`group flex items-center justify-between h-8 px-2 rounded-md text-xs cursor-pointer transition-colors ${
                        isCatActive
                          ? 'bg-gray-200/80 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-medium'
                          : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          id={`folder-toggle-${folderSlug}`}
                          type="button"
                          onClick={(e) => toggleCategoryCollapse(category, e)}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-500 dark:text-neutral-400"
                          aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isCollapsed ? (
                          <Folder className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400/90 shrink-0" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                        )}
                        <span className="truncate font-medium">{category}</span>
                      </div>

                      {folderUnread > 0 && (
                        <span
                          id={`folder-count-${folderSlug}`}
                          className="text-[11px] font-mono leading-4 px-1.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300"
                        >
                          {folderUnread}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div id={`folder-items-${folderSlug}`} className="space-y-0.5">
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
      <div
        id="sidebar-footer"
        className="p-2.5 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/40 flex items-center justify-between gap-1.5"
      >
        <button
          id="footer-opml-btn"
          type="button"
          onClick={() => onOpenPortabilityModal('opml')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 bg-white dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-neutral-800 text-xs font-medium text-gray-700 dark:text-neutral-200 transition-colors"
          title="OPML Export / Import & Backups (i)"
        >
          <FileCode2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
          <span>OPML / Backup</span>
        </button>

        <button
          id="footer-starter-btn"
          type="button"
          onClick={() => onOpenPortabilityModal('starter')}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 bg-white dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          title="Explore Curated Starter Feeds"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <button
          id="footer-shortcuts-btn"
          type="button"
          onClick={onOpenShortcutsModal}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 bg-white dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
