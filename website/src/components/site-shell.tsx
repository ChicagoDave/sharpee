'use client';

/**
 * site-shell.tsx — the WF-B shell (David's pick, 2026-07-19): sticky slim
 * top bar, sticky hierarchical left rail (single-open accordion: exactly one
 * top-level group is expanded at a time — it defaults to the group the reader
 * is in, and a manual summary click moves the open group; a nav item's
 * children show only on its branch — David's minimal-scroll ruling,
 * 2026-07-19), content column; the rail
 * becomes a drawer on mobile. Colors come exclusively from the palette
 * theme tokens (globals.css ← generated palette.css); no hex values here.
 *
 * Public interface: <SiteShell>{page}</SiteShell> — used once, in the root
 * layout. Active-state and breadcrumbs derive from src/lib/nav.ts.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, type NavItem } from '@/lib/nav';
import { DocSearch } from '@/components/doc-search';

/** True when the reader is on this item's page or one of its child pages. */
function onBranch(item: NavItem, pathname: string): boolean {
  return pathname === item.href || (item.children ?? []).some((c) => c.href === pathname);
}

/** Section-qualified key of the group the reader is currently within, or null. */
function activeGroupKey(pathname: string): string | null {
  for (const section of NAV) {
    for (const group of section.groups) {
      if (group.items.some((item) => onBranch(item, pathname))) {
        return `${section.title}::${group.title}`;
      }
    }
  }
  return null;
}

function RailLink({
  href,
  title,
  onNavigate,
  depth = 0,
}: {
  href: string;
  title: string;
  onNavigate: () => void;
  depth?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`block py-1.5 pr-4 no-underline ${depth > 0 ? 'pl-10 text-[13px]' : 'pl-7 text-sm'} ${
        active
          ? 'border-l-2 border-link font-medium text-link'
          : 'border-l-2 border-transparent text-ink hover:text-link'
      }`}
    >
      {title}
    </Link>
  );
}

/** A nav item plus its children; children render only while the reader is on this branch. */
function RailItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  const expanded = onBranch(item, pathname);
  return (
    <>
      <RailLink href={item.href} title={item.title} onNavigate={onNavigate} />
      {expanded && item.children?.map((child) => (
        <RailLink key={child.href} href={child.href} title={child.title} onNavigate={onNavigate} depth={1} />
      ))}
    </>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [override, setOverride] = useState<{ path: string; key: string | null } | null>(null);
  const close = () => setDrawerOpen(false);
  const pathname = usePathname();

  // Single-open accordion: the open group defaults to the one the reader is in;
  // a manual summary click overrides that choice until the next navigation
  // (the override is scoped to the current path, so navigating re-syncs).
  const openKey = override && override.path === pathname ? override.key : activeGroupKey(pathname);
  const toggleGroup = (key: string) =>
    setOverride({ path: pathname, key: openKey === key ? null : key });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-4 bg-navy-700 px-5 py-3 text-white">
        <Link href="/" className="text-[17px] font-bold no-underline" onClick={close}>
          Sharpee
        </Link>
        <DocSearch className="ml-auto hidden w-56 sm:block" />
        <button
          className="ml-auto rounded-md border border-taupe-200 px-2.5 py-1 text-sm sm:hidden"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-expanded={drawerOpen}
          aria-label="Toggle navigation"
        >
          ☰ Docs
        </button>
      </header>

      <div className="flex min-h-[calc(100vh-49px)]">
        <aside
          className={`w-[250px] flex-none border-r border-border bg-surface py-5 sm:sticky sm:top-[49px] sm:h-[calc(100vh-49px)] sm:overflow-y-auto max-sm:fixed max-sm:top-[49px] max-sm:bottom-0 max-sm:z-20 max-sm:overflow-y-auto max-sm:shadow-xl max-sm:transition-[left] ${
            drawerOpen ? 'max-sm:left-0' : 'max-sm:-left-[260px]'
          }`}
        >
          {NAV.map((section) => (
            <div key={section.title}>
              <div className="px-5 pt-4 pb-1 text-[13px] font-bold tracking-widest text-muted uppercase">
                {section.title}
              </div>
              {section.groups.map((group) => {
                const key = `${section.title}::${group.title}`;
                const isOpen = openKey === key;
                return (
                  <details key={key} open={isOpen}>
                    <summary
                      onClick={(e) => {
                        e.preventDefault();
                        toggleGroup(key);
                      }}
                      className="flex cursor-pointer list-none select-none items-center justify-between border-b border-border bg-wash px-5 py-2 text-sm font-semibold text-ink hover:text-link"
                    >
                      <span>{group.title}</span>
                      <svg
                        viewBox="0 0 12 12"
                        aria-hidden
                        className={`h-3 w-3 flex-none text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4.5 2.5 8 6 4.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    {group.items.map((item) => (
                      <RailItem key={item.href} item={item} onNavigate={close} />
                    ))}
                  </details>
                );
              })}
              {/* Ungrouped section items (e.g. Play) read as top-level peers of
                  the section labels: flush-left, one size up from child links. */}
              {section.items?.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={`block px-5 py-1.5 text-[13px] font-semibold no-underline ${
                      active ? 'text-link' : 'text-ink hover:text-link'
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>
        {drawerOpen && (
          <div className="fixed inset-0 top-[49px] z-10 bg-black/30 sm:hidden" onClick={close} aria-hidden />
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
