/**
 * CommentaryPanel - Streaming event log display
 *
 * Shows real-time game events in a scrolling, filterable log.
 * Each event is categorized and formatted for easy reading.
 */

import React, { useEffect, useRef } from 'react';
import { useCommentary, type CommentaryCategory, type CommentaryEntry } from '../../hooks/useCommentary';

interface CommentaryPanelProps {
  className?: string;
  /** Auto-scroll to latest entry (default: true) */
  autoScroll?: boolean;
}

/**
 * Category button for filtering
 */
interface CategoryButtonProps {
  category: CommentaryCategory;
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function CategoryButton({ category, icon, label, active, onClick }: CategoryButtonProps) {
  return (
    <button
      className={`commentary-filter__btn ${active ? 'commentary-filter__btn--active' : ''}`}
      onClick={onClick}
      title={label}
      aria-pressed={active}
    >
      <span className="commentary-filter__icon">{icon}</span>
      <span className="commentary-filter__label">{label}</span>
    </button>
  );
}

/**
 * Single commentary entry row
 */
interface EntryRowProps {
  entry: CommentaryEntry;
}

function EntryRow({ entry }: EntryRowProps) {
  return (
    <div className={`commentary-entry commentary-entry--${entry.category}`}>
      <span className="commentary-entry__icon" title={entry.category}>
        {entry.icon}
      </span>
      <span className="commentary-entry__turn">T{entry.turn}</span>
      <span className="commentary-entry__text">{entry.text}</span>
      {entry.details && (
        <span className="commentary-entry__details">{entry.details}</span>
      )}
    </div>
  );
}

/**
 * CommentaryPanel component
 */
export function CommentaryPanel({ className = '', autoScroll = true }: CommentaryPanelProps) {
  const {
    entries,
    filter,
    toggleCategory,
    toggleSystemEvents,
    clearHistory,
    totalCount,
    filteredCount,
  } = useCommentary();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  // Track scroll position
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 10;
  };

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const categories: { category: CommentaryCategory; icon: string; label: string }[] = [
    { category: 'movement', icon: '\u2192', label: 'Movement' },
    { category: 'manipulation', icon: '\u270B', label: 'Items' },
    { category: 'state', icon: '\u2699', label: 'State' },
    { category: 'perception', icon: '\u{1F441}', label: 'Look' },
    { category: 'combat', icon: '\u2694', label: 'Combat' },
    { category: 'score', icon: '\u2605', label: 'Score' },
  ];

  return (
    <div className={`commentary-panel ${className}`}>
      {/* Filter bar */}
      <div className="commentary-filter">
        <div className="commentary-filter__categories">
          {categories.map(({ category, icon, label }) => (
            <CategoryButton
              key={category}
              category={category}
              icon={icon}
              label={label}
              active={filter.categories.has(category)}
              onClick={() => toggleCategory(category)}
            />
          ))}
        </div>
        <div className="commentary-filter__actions">
          <button
            className={`commentary-filter__btn commentary-filter__btn--system ${
              filter.showSystemEvents ? 'commentary-filter__btn--active' : ''
            }`}
            onClick={toggleSystemEvents}
            title="Show system events"
          >
            <span className="commentary-filter__icon">{'\u2139'}</span>
          </button>
          <button
            className="commentary-filter__btn commentary-filter__btn--clear"
            onClick={clearHistory}
            title="Clear history"
          >
            <span className="commentary-filter__icon">{'\u2715'}</span>
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="commentary-status">
        {filteredCount < totalCount ? (
          <span>
            Showing {filteredCount} of {totalCount} events
          </span>
        ) : (
          <span>{totalCount} events</span>
        )}
      </div>

      {/* Event log */}
      <div className="commentary-log" ref={scrollRef} onScroll={handleScroll}>
        {entries.length === 0 ? (
          <div className="commentary-empty">No events yet. Start playing to see game events here.</div>
        ) : (
          entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}

/**
 * CSS styles for CommentaryPanel
 */
export const commentaryPanelStyles = `
.commentary-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Filter bar */
.commentary-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.commentary-filter__categories {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.commentary-filter__actions {
  display: flex;
  gap: 0.25rem;
}

.commentary-filter__btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s, background 0.15s;
}

.commentary-filter__btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.commentary-filter__btn--active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.commentary-filter__btn--clear {
  opacity: 0.7;
}

.commentary-filter__btn--clear:hover {
  opacity: 1;
  background: rgba(255, 0, 0, 0.2);
}

.commentary-filter__icon {
  font-size: 0.875rem;
}

.commentary-filter__label {
  display: none;
}

@media (min-width: 600px) {
  .commentary-filter__label {
    display: inline;
  }
}

/* Status bar */
.commentary-status {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  opacity: 0.6;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

/* Event log */
.commentary-log {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.commentary-empty {
  padding: 1rem;
  text-align: center;
  opacity: 0.5;
  font-style: italic;
}

/* Entry styling */
.commentary-entry {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.8125rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.commentary-entry:last-child {
  border-bottom: none;
}

.commentary-entry__icon {
  flex-shrink: 0;
  width: 1.25em;
  text-align: center;
}

.commentary-entry__turn {
  flex-shrink: 0;
  opacity: 0.4;
  font-size: 0.6875rem;
  min-width: 2.5em;
}

.commentary-entry__text {
  font-weight: 500;
}

.commentary-entry__details {
  opacity: 0.7;
  font-size: 0.75rem;
}

/* Category colors */
.commentary-entry--movement .commentary-entry__icon { color: #4ecdc4; }
.commentary-entry--manipulation .commentary-entry__icon { color: #f7dc6f; }
.commentary-entry--state .commentary-entry__icon { color: #bb8fce; }
.commentary-entry--perception .commentary-entry__icon { color: #85c1e9; }
.commentary-entry--combat .commentary-entry__icon { color: #e74c3c; }
.commentary-entry--score .commentary-entry__icon { color: #f39c12; }
.commentary-entry--system .commentary-entry__icon { color: #7f8c8d; }
.commentary-entry--error .commentary-entry__icon { color: #e74c3c; }

/* Infocom theme adjustments */
.game-shell--infocom .commentary-entry--movement .commentary-entry__icon { color: #00ffff; }
.game-shell--infocom .commentary-entry--manipulation .commentary-entry__icon { color: #ffff55; }
.game-shell--infocom .commentary-entry--state .commentary-entry__icon { color: #ff55ff; }
.game-shell--infocom .commentary-entry--perception .commentary-entry__icon { color: #55ffff; }
.game-shell--infocom .commentary-entry--score .commentary-entry__icon { color: #ffff00; }

/* Modern theme adjustments */
.game-shell--modern .commentary-filter__btn--active {
  border-color: #e94560;
}

.game-shell--modern .commentary-entry--movement .commentary-entry__icon { color: #4ecdc4; }
.game-shell--modern .commentary-entry--score .commentary-entry__icon { color: #e94560; }
`;
