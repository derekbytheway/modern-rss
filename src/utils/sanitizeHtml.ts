let domPurifyPromise: Promise<typeof import('dompurify').default> | undefined;

function loadDOMPurify() {
  // Code-split with Vite bundler so DOMPurify is only downloaded when needed
  domPurifyPromise ??= import('dompurify').then((mod) => mod.default);
  return domPurifyPromise;
}

const ALLOWED_ELEMENTS = [
  'p', 'b', 'i', 'u', 's', 'strong', 'em', 'small', 'mark', 'del', 'ins', 'sub', 'sup',
  'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'pre', 'code', 'kbd', 'samp',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img', 'figure', 'figcaption', 'picture', 'source',
  'br', 'hr', 'span', 'div', 'section', 'article', 'aside', 'header', 'footer',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'details', 'summary', 'video', 'audio',
];

const ALLOWED_ATTRIBUTES = [
  'href', 'src', 'srcset', 'alt', 'title', 'width', 'height',
  'loading', 'decoding', 'colspan', 'rowspan', 'open', 'controls', 'type',
];

/**
 * Safely sanitizes and renders untrusted RSS/Atom HTML into a target Element
 * using the native Sanitizer API (`Element.prototype.setHTML`) with a code-split
 * DOMPurify fallback when native support is unavailable.
 */
export async function safeSetArticleHTML(el: HTMLElement, html: string): Promise<void> {
  if ('setHTML' in Element.prototype) {
    (el as unknown as {
      setHTML: (
        input: string,
        options: { sanitizer: { elements: string[]; attributes: string[] } }
      ) => void;
    }).setHTML(html, {
      sanitizer: {
        elements: ALLOWED_ELEMENTS,
        attributes: ALLOWED_ATTRIBUTES,
      },
    });
  } else {
    const DOMPurify = await loadDOMPurify();
    el.innerHTML = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [...ALLOWED_ELEMENTS, '#text'],
      ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
      // Match native Sanitizer behavior: strip aria-*/data-* and disallowed element content
      ALLOW_ARIA_ATTR: false,
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: false,
    });
  }

  // Post-process links and images for safe external navigation & lazy loading
  const links = el.querySelectorAll('a[href]');
  links.forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });

  const images = el.querySelectorAll('img');
  images.forEach((img) => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
  });
}
