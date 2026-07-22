'use client';

/**
 * doc-search.tsx — client-side docs search over public/search-index.json.
 *
 * The index (title + breadcrumb + stripped body per page) is fetched lazily on
 * first focus, then matched with Fuse.js (fuzzy, title-weighted). Results show
 * in a dropdown with keyboard nav (↑/↓/Enter/Esc); Cmd/Ctrl-K focuses the box.
 * Colors come from the palette theme tokens only — no hex values here.
 *
 * Public interface: <DocSearch /> — rendered in the site shell header.
 * Owner: website (not the platform workspace).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';

interface Entry {
  href: string;
  title: string;
  crumb: string;
  excerpt: string;
  text: string;
}

const MAX_RESULTS = 8;

export function DocSearch({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load the index the first time the box is focused.
  const loadIndex = () => {
    if (index !== null) return;
    fetch('/search-index.json')
      .then((r) => r.json())
      .then((data: Entry[]) => setIndex(data))
      .catch(() => setIndex([]));
  };

  const fuse = useMemo(
    () =>
      index
        ? new Fuse(index, {
            keys: [
              { name: 'title', weight: 0.6 },
              { name: 'crumb', weight: 0.1 },
              { name: 'text', weight: 0.3 },
            ],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2,
          })
        : null,
    [index],
  );

  const results = useMemo(() => {
    if (!fuse || query.trim().length < 2) return [];
    return fuse.search(query.trim(), { limit: MAX_RESULTS }).map((r) => r.item);
  }, [fuse, query]);

  // Cmd/Ctrl-K focuses search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => setActive(0), [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active].href);
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="Search docs…"
        aria-label="Search documentation"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="doc-search-results"
        autoComplete="off"
        onFocus={() => {
          loadIndex();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-md bg-navy-600 px-3.5 py-1.5 text-[13px] text-white placeholder:text-taupe-200 focus:outline-none focus:ring-2 focus:ring-link"
      />

      {showDropdown && (
        <div
          id="doc-search-results"
          role="listbox"
          className="absolute right-0 z-40 mt-1.5 max-h-[70vh] w-[min(28rem,90vw)] overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-xl"
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">No matches for “{query.trim()}”.</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.href}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.href)}
                className={`block w-full cursor-pointer px-4 py-2 text-left no-underline ${
                  i === active ? 'bg-wash' : ''
                }`}
              >
                <div className="text-sm font-medium text-ink">{r.title}</div>
                {r.crumb && <div className="text-[11px] tracking-wide text-muted uppercase">{r.crumb}</div>}
                {r.excerpt && <div className="mt-0.5 line-clamp-1 text-[12px] text-muted">{r.excerpt}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
