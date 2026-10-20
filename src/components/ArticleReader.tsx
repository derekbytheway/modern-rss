import { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Star,
  CheckCircle,
  Clock,
  StickyNote,
  Type,
  Link2,
  Check,
  BookOpen,
} from 'lucide-react';
import type { FeedItem, FeedSource, ReaderPreferences } from '../types/feed';
import { safeSetArticleHTML } from '../utils/sanitizeHtml';

interface ArticleReaderProps {
  article: FeedItem | null;
  source?: FeedSource;
  onToggleRead: (id: string) => void;
  onToggleStar: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  preferences: ReaderPreferences;
  onUpdatePreferences: (prefs: ReaderPreferences) => void;
}

const THEME_CLASSES: Record<
  ReaderPreferences['theme'],
  {
    bg: string;
    headerBg: string;
    text: string;
    heading: string;
    muted: string;
    prose: string;
  }
> = {
  dark: {
    bg: 'bg-neutral-950',
    headerBg: 'bg-neutral-950/90 border-neutral-800',
    text: 'text-neutral-300',
    heading: 'text-neutral-100',
    muted: 'text-neutral-400',
    prose: 'prose-invert prose-neutral [&_a]:text-orange-400',
  },
  oled: {
    bg: 'bg-black',
    headerBg: 'bg-black/90 border-neutral-900',
    text: 'text-neutral-200',
    heading: 'text-white',
    muted: 'text-neutral-500',
    prose: 'prose-invert prose-neutral [&_a]:text-orange-400',
  },
  sepia: {
    bg: 'bg-[#f4ecd8]',
    headerBg: 'bg-[#efe4ca]/95 border-[#dccbb0]',
    text: 'text-[#3c3124]',
    heading: 'text-[#231b12]',
    muted: 'text-[#736049]',
    prose: 'prose-stone [&_a]:text-[#b45309]',
  },
  light: {
    bg: 'bg-stone-50',
    headerBg: 'bg-stone-100/95 border-stone-200',
    text: 'text-stone-800',
    heading: 'text-stone-950',
    muted: 'text-stone-500',
    prose: 'prose-stone [&_a]:text-orange-600',
  },
};

const FONT_FAMILY_CLASSES: Record<ReaderPreferences['fontFamily'], string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

const FONT_SIZE_CLASSES: Record<ReaderPreferences['fontSize'], string> = {
  sm: 'text-sm leading-relaxed',
  base: 'text-base leading-relaxed',
  lg: 'text-lg leading-relaxed',
  xl: 'text-xl leading-loose',
};

const MAX_WIDTH_CLASSES: Record<ReaderPreferences['maxWidth'], string> = {
  narrow: 'max-w-xl',
  comfort: 'max-w-3xl',
  wide: 'max-w-5xl',
};

export function ArticleReader({
  article,
  source,
  onToggleRead,
  onToggleStar,
  onUpdateNote,
  preferences,
  onUpdatePreferences,
}: ArticleReaderProps) {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [noteOpen, setNoteOpen] = useState(() => Boolean(article?.note));
  const [noteDraft, setNoteDraft] = useState(() => article?.note || '');
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll reader container to top when article mounts
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [article?.id]);

  // Safely sanitize and inject HTML whenever article content changes
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container || !article) return;

    const rawHtml = article.content || article.snippet || '';
    safeSetArticleHTML(container, rawHtml);
  }, [article]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(100);
      return;
    }
    const pct = Math.min(100, Math.max(0, (el.scrollTop / maxScroll) * 100));
    setScrollProgress(pct);
  };

  const handleCopyLink = async () => {
    if (!article?.link) return;
    await navigator.clipboard.writeText(article.link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveNote = () => {
    if (!article) return;
    onUpdateNote(article.id, noteDraft);
    if (!noteDraft.trim()) {
      setNoteOpen(false);
    }
  };

  const themeStyle = THEME_CLASSES[preferences.theme];

  if (!article) {
    return (
      <main className="flex-1 h-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-500 text-sm p-8 text-center">
        <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 mb-3">
          <BookOpen className="w-7 h-7 text-orange-500/70" />
        </div>
        <p className="font-medium text-neutral-300">Select an article to start reading</p>
        <p className="text-xs text-neutral-500 mt-1">
          Use <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-orange-400">j</kbd> /{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-orange-400">k</kbd> to navigate or press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-orange-400">?</kbd> for all shortcuts
        </p>
      </main>
    );
  }

  return (
    <main
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`flex-1 h-screen flex flex-col overflow-y-auto transition-colors duration-200 ${themeStyle.bg}`}
    >
      {/* Sticky Top Action Bar + Progress Indicator */}
      <div
        className={`sticky top-0 z-10 border-b backdrop-blur-md ${themeStyle.headerBg}`}
      >
        {/* Reading Progress Bar */}
        <div className="h-0.5 w-full bg-transparent overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-100"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-8 py-3">
          <div className="flex items-center gap-3">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-orange-400 transition-colors"
            >
              <span>Open Original</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Copy article link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Personal Note Button */}
            <button
              type="button"
              onClick={() => setNoteOpen((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                article.note || noteOpen
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title="Add or edit personal reading note"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>{article.note ? 'Edit Note' : 'Note'}</span>
            </button>

            {/* Reader Typography & Theme Popover Toggle */}
            <button
              type="button"
              onClick={() => setShowAppearanceMenu((v) => !v)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                showAppearanceMenu
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                  : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title="Reader typography & theme settings"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Aa</span>
            </button>

            {showAppearanceMenu && (
              <div className="absolute right-0 top-10 z-20 w-64 p-4 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl space-y-4">
                {/* Theme Selector */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Theme
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'dark', label: 'Dark', swatch: 'bg-neutral-900 border-neutral-700' },
                        { id: 'oled', label: 'OLED', swatch: 'bg-black border-neutral-800' },
                        { id: 'sepia', label: 'Sepia', swatch: 'bg-[#f4ecd8] border-[#d3c0a3] text-stone-900' },
                        { id: 'light', label: 'Paper', swatch: 'bg-stone-100 border-stone-300 text-stone-900' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          onUpdatePreferences({ ...preferences, theme: t.id })
                        }
                        className={`py-1.5 px-1 rounded-md border text-[11px] font-medium transition-all ${
                          t.swatch
                        } ${
                          preferences.theme === t.id
                            ? 'ring-2 ring-orange-500'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Typeface
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'sans', label: 'Sans' },
                        { id: 'serif', label: 'Serif' },
                        { id: 'mono', label: 'Mono' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          onUpdatePreferences({ ...preferences, fontFamily: f.id })
                        }
                        className={`py-1 rounded-md border text-xs transition-colors ${
                          preferences.fontFamily === f.id
                            ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-medium'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Text Size
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'sm', label: 'S' },
                        { id: 'base', label: 'M' },
                        { id: 'lg', label: 'L' },
                        { id: 'xl', label: 'XL' },
                      ] as const
                    ).map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() =>
                          onUpdatePreferences({ ...preferences, fontSize: sz.id })
                        }
                        className={`py-1 rounded-md border text-xs transition-colors ${
                          preferences.fontSize === sz.id
                            ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-medium'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Width */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Line Width
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'narrow', label: 'Focus' },
                        { id: 'comfort', label: 'Comfort' },
                        { id: 'wide', label: 'Wide' },
                      ] as const
                    ).map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() =>
                          onUpdatePreferences({ ...preferences, maxWidth: w.id })
                        }
                        className={`py-1 rounded-md border text-xs transition-colors ${
                          preferences.maxWidth === w.id
                            ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-medium'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onToggleRead(article.id)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                article.isRead
                  ? 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  : 'border-orange-500/30 text-orange-400 hover:bg-orange-950/20'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {article.isRead ? 'Mark Unread' : 'Mark Read'}
            </button>

            <button
              type="button"
              onClick={() => onToggleStar(article.id)}
              className={`p-1.5 rounded-md hover:bg-neutral-800/60 transition-colors ${
                article.isStarred ? 'text-amber-400' : 'text-neutral-400'
              }`}
              title={article.isStarred ? 'Unstar (s)' : 'Star (s)'}
            >
              <Star
                className={`w-4 h-4 ${
                  article.isStarred ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Reader Body */}
      <article
        className={`${MAX_WIDTH_CLASSES[preferences.maxWidth]} ${FONT_FAMILY_CLASSES[preferences.fontFamily]} w-full mx-auto px-8 py-10`}
      >
        <header className="mb-8 space-y-3">
          {source && (
            <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
              {source.favicon && (
                <img
                  src={source.favicon}
                  alt=""
                  className="w-4 h-4 rounded-xs"
                  loading="lazy"
                />
              )}
              <span>{source.title}</span>
              {source.category && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-300">
                  {source.category}
                </span>
              )}
            </div>
          )}

          <h1
            className={`text-2xl sm:text-3xl font-bold tracking-tight leading-tight ${themeStyle.heading}`}
          >
            {article.title}
          </h1>

          <div className={`flex flex-wrap items-center gap-3 text-xs ${themeStyle.muted}`}>
            {article.author && <span>By {article.author}</span>}
            {article.pubDate && (
              <span>
                {new Date(article.pubDate).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {article.readingTimeMinutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {article.readingTimeMinutes} min read
              </span>
            )}
          </div>

          {/* Personal Note Editor */}
          {noteOpen && (
            <div className="mt-4 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" />
                  Personal Reading Note
                </span>
                {article.note && (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteDraft('');
                      onUpdateNote(article.id, '');
                      setNoteOpen(false);
                    }}
                    className="text-[11px] text-neutral-400 hover:text-red-400"
                  >
                    Delete note
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write a personal takeaway, highlight, or reminder for this article..."
                className="w-full rounded-lg bg-neutral-950/80 border border-neutral-800 p-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNoteOpen(false)}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Sanitized Content Render Container */}
        <div
          ref={contentContainerRef}
          className={`prose max-w-none ${themeStyle.prose} ${themeStyle.text} ${FONT_SIZE_CLASSES[preferences.fontSize]} space-y-4 [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full [&_pre]:bg-neutral-900 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-orange-500/60 [&_blockquote]:pl-4 [&_blockquote]:italic`}
        />
      </article>
    </main>
  );
}
