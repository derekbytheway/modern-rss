import { useEffect, useRef, useId } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['j', '↓'], label: 'Select next article' },
  { keys: ['k', '↑'], label: 'Select previous article' },
  { keys: ['m'], label: 'Toggle read / unread status' },
  { keys: ['s'], label: 'Star / unstar current article' },
  { keys: ['o'], label: 'Open original article in new tab' },
  { keys: ['r'], label: 'Refresh all subscribed feeds' },
  { keys: ['/'], label: 'Focus article search bar' },
  { keys: ['Shift', 'A'], label: 'Mark all visible articles as read' },
  { keys: ['i'], label: 'Open OPML Import / Export modal' },
  { keys: ['?'], label: 'Toggle this keyboard shortcuts guide' },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

    const handleClose = () => onClose();
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

  return (
    <dialog
      id="shortcuts-modal"
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="m-auto w-full max-w-md rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#121212] text-gray-900 dark:text-neutral-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs p-0 overflow-hidden"
    >
      <div
        id="shortcuts-modal-header"
        className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50"
      >
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-orange-500 dark:text-orange-400" />
          <h2 id={titleId} className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
            Keyboard Shortcuts
          </h2>
        </div>
        <button
          id="shortcuts-modal-close-btn"
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close shortcuts guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        id="shortcuts-modal-list"
        className="p-5 divide-y divide-gray-200 dark:divide-neutral-800/70"
      >
        {SHORTCUTS.map((item) => (
          <div
            key={item.label}
            className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
          >
            <span className="text-gray-700 dark:text-neutral-300">{item.label}</span>
            <div className="flex items-center gap-1">
              {item.keys.map((k) => (
                <kbd
                  key={k}
                  className="px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 font-mono text-[11px] text-orange-600 dark:text-orange-400 shadow-xs"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </dialog>
  );
}

