/**
 * SidePanelTabs — horizontal tab strip that hosts the right-side panel's
 * content (room chat in Plan 04 Phase 1; DM threads join in Phase 2).
 *
 * Public interface: {@link SidePanelTabs} default export,
 * {@link SidePanelTabsProps}, {@link TabDescriptor}.
 *
 * Bounded context: client room view (ADR-153 Decision 8). The tab
 * mechanics are deliberately generic — this component owns no state and
 * knows nothing about chat or DM semantics. Callers supply a `tabs` list
 * with ids + labels, the currently-active id, an `onSelect` callback,
 * and a render function for the active tab's body.
 *
 * Accessibility: implements the ARIA tablist pattern (role=tablist,
 * role=tab with aria-selected + aria-controls, role=tabpanel). Left/
 * Right arrow keys cycle between tabs; Home/End jump to ends.
 */

import { useCallback, useId, useRef } from 'react';

export interface TabDescriptor {
  /** Stable identifier used as a React key and the `id` field on callbacks. */
  id: string;
  label: string;
  /** Optional unread count; renders a small badge when > 0. */
  unread?: number;
}

export interface SidePanelTabsProps {
  tabs: TabDescriptor[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Render callback for the active tab's body. */
  renderBody: (activeId: string) => React.ReactNode;
  /** Accessible name for the tablist (e.g., "Side panel"). */
  ariaLabel?: string;
}

export default function SidePanelTabs({
  tabs,
  activeId,
  onSelect,
  renderBody,
  ariaLabel = 'Side panel',
}: SidePanelTabsProps): JSX.Element {
  const groupId = useId();
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (tabs.length === 0) return;
      const activeIdx = tabs.findIndex((t) => t.id === activeId);
      if (activeIdx < 0) return;
      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight') nextIdx = (activeIdx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') nextIdx = (activeIdx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabs.length - 1;
      if (nextIdx === null) return;
      e.preventDefault();
      const nextTab = tabs[nextIdx]!;
      onSelect(nextTab.id);
      // Focus moves to the newly active tab — keeps keyboard users oriented.
      tabsRef.current[nextIdx]?.focus();
    },
    [tabs, activeId, onSelect],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          gap: 2,
          borderBottom: '1px solid var(--sharpee-border)',
          background: 'var(--sharpee-bg-secondary)',
        }}
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${groupId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${groupId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={onKeyDown}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: selected ? 'var(--sharpee-bg)' : 'transparent',
                color: selected ? 'var(--sharpee-text)' : 'var(--sharpee-text-muted)',
                border: 'none',
                borderBottom: selected
                  ? '2px solid var(--sharpee-accent)'
                  : '2px solid transparent',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: '0.85rem',
                fontWeight: selected ? 600 : 500,
              }}
            >
              <span>{tab.label}</span>
              {tab.unread !== undefined && tab.unread > 0 && (
                <span
                  aria-label={`${tab.unread} unread`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    borderRadius: 9,
                    background: 'var(--sharpee-accent)',
                    color: 'var(--sharpee-bg)',
                  }}
                >
                  {tab.unread > 99 ? '99+' : tab.unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${groupId}-panel-${activeId}`}
        aria-labelledby={`${groupId}-tab-${activeId}`}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderBody(activeId)}
      </div>
    </div>
  );
}
