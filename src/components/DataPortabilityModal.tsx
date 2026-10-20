import { useState, useRef, useEffect, useId } from 'react';
import {
  Download,
  Upload,
  FileCode2,
  Sparkles,
  Check,
  Copy,
  X,
  Folder,
  Loader2,
  Database,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { FeedItem, FeedSource, OpmlOutlineItem } from '../types/feed';
import type { ImportProgress } from '../hooks/useFeeds';
import {
  exportToOpml,
  downloadOpmlFile,
  parseOpmlXml,
  downloadFullBackupJson,
  parseFullBackupJson,
  CURATED_STARTER_FEEDS,
} from '../services/opmlService';

interface DataPortabilityModalProps {
  isOpen: boolean;
  activeTab: 'opml' | 'starter' | 'backup';
  onTabChange: (tab: 'opml' | 'starter' | 'backup') => void;
  onClose: () => void;
  sources: FeedSource[];
  articles: FeedItem[];
  onImportOpml: (
    outlines: OpmlOutlineItem[],
    onProgress?: (progress: ImportProgress) => void
  ) => Promise<ImportProgress>;
  onImportFullBackup: (sources: FeedSource[], articles: FeedItem[]) => void;
}

export function DataPortabilityModal({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  sources,
  articles,
  onImportOpml,
  onImportFullBackup,
}: DataPortabilityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [parsedOutlines, setParsedOutlines] = useState<OpmlOutlineItem[] | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [loadingStarterUrl, setLoadingStarterUrl] = useState<string | null>(null);

  // Manage native <dialog> showModal() and close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback for browsers without <dialog closedby="any"> support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  const existingUrls = new Set(sources.map((s) => s.url.toLowerCase()));

  const handleOpmlFile = async (file: File) => {
    setParseError(null);
    setImportProgress(null);
    try {
      const text = await file.text();
      const outlines = parseOpmlXml(text);
      if (outlines.length === 0) {
        setParseError('No RSS/Atom feed outlines with xmlUrl found in this OPML file.');
        setParsedOutlines(null);
        return;
      }
      setParsedOutlines(outlines);
      // Pre-select feeds not yet subscribed (or all if all are already subscribed)
      const unsubscribed = outlines
        .filter((o) => !existingUrls.has(o.xmlUrl.toLowerCase()))
        .map((o) => o.xmlUrl);
      setSelectedUrls(
        new Set(unsubscribed.length > 0 ? unsubscribed : outlines.map((o) => o.xmlUrl))
      );
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse OPML file.');
      setParsedOutlines(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleOpmlFile(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedOutlines || selectedUrls.size === 0 || isImporting) return;
    const toImport = parsedOutlines.filter((o) => selectedUrls.has(o.xmlUrl));
    setIsImporting(true);
    try {
      await onImportOpml(toImport, (prog) => {
        setImportProgress(prog);
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyOpml = async () => {
    const xml = exportToOpml(sources);
    await navigator.clipboard.writeText(xml);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  const handleImportStarterPack = async (items: OpmlOutlineItem[]) => {
    if (isImporting) return;
    setIsImporting(true);
    setImportProgress(null);
    try {
      await onImportOpml(items, (prog) => {
        setImportProgress(prog);
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSingleStarter = async (item: OpmlOutlineItem) => {
    setLoadingStarterUrl(item.xmlUrl);
    try {
      await onImportOpml([item]);
    } finally {
      setLoadingStarterUrl(null);
    }
  };

  const handleJsonUpload = async (file: File) => {
    setParseError(null);
    setBackupMessage(null);
    try {
      const text = await file.text();
      const { sources: restoredSources, articles: restoredArticles } =
        parseFullBackupJson(text);
      onImportFullBackup(restoredSources, restoredArticles);
      setBackupMessage(
        `Restored ${restoredSources.length} feeds and ${restoredArticles.length} articles!`
      );
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to restore JSON backup.');
    }
  };

  const toggleOutlineSelection = (xmlUrl: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(xmlUrl)) {
        next.delete(xmlUrl);
      } else {
        next.add(xmlUrl);
      }
      return next;
    });
  };

  const categoryCount = new Set(
    sources.map((s) => s.category).filter(Boolean)
  ).size;

  const starredCount = articles.filter((a) => a.isStarred).length;
  const notesCount = articles.filter((a) => a.note).length;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="m-auto w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-xs p-0 overflow-hidden"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-semibold text-neutral-100">
              OPML &amp; Feed Portability Center
            </h2>
            <p className="text-xs text-neutral-400">
              Import or export OPML 2.0 subscriptions, explore starter packs, or snapshot your reader state
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-950/30 px-6 gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            onTabChange('opml');
            setParseError(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'opml'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          OPML Import / Export
        </button>
        <button
          type="button"
          onClick={() => {
            onTabChange('starter');
            setParseError(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'starter'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Curated Starter Pack
        </button>
        <button
          type="button"
          onClick={() => {
            onTabChange('backup');
            setParseError(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'backup'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Full JSON Backup
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-6 max-h-[72vh] overflow-y-auto space-y-6">
        {parseError && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* TAB 1: OPML IMPORT / EXPORT */}
        {activeTab === 'opml' && (
          <div className="space-y-6">
            {/* Export OPML Section */}
            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-medium text-neutral-100 flex items-center gap-2">
                    <Download className="w-4 h-4 text-orange-400" />
                    Export Subscriptions to OPML 2.0
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Currently storing{' '}
                    <span className="text-neutral-200 font-medium">{sources.length} feeds</span>
                    {categoryCount > 0 && (
                      <>
                        {' '}
                        organized across{' '}
                        <span className="text-neutral-200 font-medium">
                          {categoryCount} folders
                        </span>
                      </>
                    )}
                    . Compatible with Feedly, NetNewsWire, Inoreader, and Reeder.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={sources.length === 0}
                    onClick={handleCopyOpml}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-600 bg-neutral-900 text-xs font-medium text-neutral-200 disabled:opacity-40 transition-colors"
                  >
                    {copiedXml ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied XML
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy XML
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={sources.length === 0}
                    onClick={() => downloadOpmlFile(sources)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-medium text-white disabled:opacity-40 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export .opml
                  </button>
                </div>
              </div>

              {sources.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowXmlPreview((v) => !v)}
                    className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2"
                  >
                    {showXmlPreview ? 'Hide OPML XML Preview' : 'Preview generated OPML 2.0 XML'}
                  </button>
                  {showXmlPreview && (
                    <pre className="mt-2 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-44">
                      {exportToOpml(sources)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Import OPML Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-orange-400" />
                  Import Subscriptions from OPML File
                </h3>
                {parsedOutlines && (
                  <button
                    type="button"
                    onClick={() => {
                      setParsedOutlines(null);
                      setImportProgress(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Choose another file
                  </button>
                )}
              </div>

              {!parsedOutlines ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".opml,.xml,text/xml,application/xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleOpmlFile(file);
                      e.target.value = '';
                    }}
                  />
                  <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2.5" />
                  <p className="text-sm font-medium text-neutral-200">
                    Drop your <code className="text-orange-400">.opml</code> or{' '}
                    <code className="text-orange-400">.xml</code> file here, or click to browse
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Automatically preserves OPML folder hierarchies as feed categories
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                    <span className="text-xs font-medium text-neutral-300">
                      Found {parsedOutlines.length} feeds in OPML ({selectedUrls.size} selected)
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedUrls(new Set(parsedOutlines.map((o) => o.xmlUrl)))
                        }
                        className="text-neutral-400 hover:text-neutral-200"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUrls(new Set())}
                        className="text-neutral-400 hover:text-neutral-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto divide-y divide-neutral-900">
                    {parsedOutlines.map((item) => {
                      const alreadyInFeeds = existingUrls.has(item.xmlUrl.toLowerCase());
                      const checked = selectedUrls.has(item.xmlUrl);
                      return (
                        <label
                          key={item.xmlUrl}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-900/40 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOutlineSelection(item.xmlUrl)}
                              className="rounded border-neutral-700 bg-neutral-900 text-orange-500 focus:ring-orange-500"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-neutral-200 truncate">
                                {item.title}
                              </div>
                              <div className="text-neutral-500 truncate text-[11px]">
                                {item.xmlUrl}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.category && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-[11px]">
                                <Folder className="w-3 h-3 text-orange-400" />
                                {item.category}
                              </span>
                            )}
                            {alreadyInFeeds && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[10px]">
                                Subscribed
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Progress & Import Action Footer */}
                  <div className="p-4 border-t border-neutral-800 bg-neutral-900/40 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      {importProgress ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-300 flex items-center gap-1.5">
                              {isImporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              {isImporting
                                ? `Fetching ${importProgress.currentTitle || 'feeds'}... (${importProgress.completed}/${importProgress.total})`
                                : `Import complete: ${importProgress.succeeded} added, ${importProgress.skipped} already subscribed${
                                    importProgress.failed > 0
                                      ? `, ${importProgress.failed} unreachable`
                                      : ''
                                  }`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                            <div
                              className="h-full bg-orange-500 transition-all duration-200"
                              style={{
                                width: `${Math.round(
                                  (importProgress.completed /
                                    Math.max(1, importProgress.total)) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">
                          Ready to fetch and import {selectedUrls.size} selected feed
                          {selectedUrls.size === 1 ? '' : 's'}.
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isImporting || selectedUrls.size === 0}
                      onClick={handleConfirmImport}
                      className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isImporting ? 'Importing...' : `Import ${selectedUrls.size} Feeds`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CURATED STARTER PACK */}
        {activeTab === 'starter' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <div>
                <h3 className="text-sm font-medium text-neutral-100">
                  Instant Curated OPML Bundle
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Populate ModernRSS with 8 high-signal feeds across Tech, Web Development, and Science.
                </p>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => handleImportStarterPack(CURATED_STARTER_FEEDS)}
                className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Import All Starter Feeds
              </button>
            </div>

            {importProgress && (
              <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950 text-xs text-neutral-300 flex items-center justify-between">
                <span>
                  {isImporting
                    ? `Importing starter pack (${importProgress.completed}/${importProgress.total})...`
                    : `Added ${importProgress.succeeded} feeds (${importProgress.skipped} already subscribed).`}
                </span>
                <span className="font-mono text-orange-400">
                  {Math.round(
                    (importProgress.completed / Math.max(1, importProgress.total)) * 100
                  )}
                  %
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CURATED_STARTER_FEEDS.map((item) => {
                const isSubscribed = existingUrls.has(item.xmlUrl.toLowerCase());
                const isLoadingThis = loadingStarterUrl === item.xmlUrl;

                return (
                  <div
                    key={item.xmlUrl}
                    className="p-3 rounded-xl border border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-neutral-100 truncate">
                          {item.title}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                        <Folder className="w-3 h-3 text-orange-400" />
                        {item.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isSubscribed || isLoadingThis || isImporting}
                      onClick={() => handleSingleStarter(item)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors ${
                        isSubscribed
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                      }`}
                    >
                      {isSubscribed ? (
                        <>
                          <Check className="w-3 h-3" />
                          Added
                        </>
                      ) : isLoadingThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: FULL JSON SNAPSHOT */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-100">
                    Export Full Reader Database (.json)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Unlike standard OPML (which only backs up feed URLs and folders), a Full JSON Snapshot preserves all{' '}
                    <span className="text-neutral-200">{articles.length} cached articles</span>,{' '}
                    <span className="text-amber-400">{starredCount} starred items</span>, and{' '}
                    <span className="text-orange-400">{notesCount} personal notes</span>.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sources.length === 0 && articles.length === 0}
                  onClick={() => downloadFullBackupJson(sources, articles)}
                  className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download JSON
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-100">
                  Restore from JSON Snapshot
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Merges feeds, starred articles, read status, and notes from a previous backup file.
                </p>
              </div>
              <div>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleJsonUpload(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-xs font-medium text-neutral-200 flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Restore JSON File
                </button>
              </div>
            </div>

            {backupMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{backupMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}

