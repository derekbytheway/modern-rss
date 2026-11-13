# ModernRSS

**Version 1.0.1**

A fast, keyboard-first RSS & Atom feed reader built with React 19, TypeScript, Tailwind CSS v4, and IndexedDB.

**Live Demo:** [https://derekbytheway.github.io/modern-rss/](https://derekbytheway.github.io/modern-rss/)

## Features

- **OPML 2.0 Import & Export**: Drag-and-drop `.opml` / `.xml` import with interactive feed selection and live progress tracking, plus 1-click OPML 2.0 export that preserves folder hierarchies.
- **Curated Starter Pack**: Populate your reader in one click with high-signal feeds across *Tech & News*, *Web & Design*, and *Science & Space*.
- **Full JSON Database Snapshots**: Backup and restore your complete IndexedDB state including cached articles, starred items, read history, and personal notes.
- **Collapsible Folders & Categories**: Organize feeds into folders with per-feed and per-folder unread counts and favicons.
- **Customizable Reader Comfort (`Aa`)**:
  - 4 Reading Themes: *Dark*, *OLED*, *Warm Sepia*, and *Crisp Paper*
  - Typefaces: *Sans*, *Serif*, and *Mono*
  - Adjustable text sizes and column widths
  - Live reading progress bar & estimated reading times
- **Personal Reading Notes**: Attach personal takeaways to any article and filter them in the **Reading Notes** smart view.
- **Safe HTML Sanitization**: Uses the native browser Sanitizer API (`Element.prototype.setHTML`) with a code-split `DOMPurify` fallback.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `j` / `↓` | Select next article |
| `k` / `↑` | Select previous article |
| `m` | Toggle read / unread status |
| `s` | Star / unstar current article |
| `o` | Open original article in new tab |
| `r` | Refresh all subscribed feeds |
| `/` | Focus article search bar |
| `Shift` + `A` | Mark all visible articles as read |
| `i` | Open OPML Import / Export modal |
| `?` | Toggle keyboard shortcuts guide |

## Local Development

```bash
npm install
npm run dev
```
