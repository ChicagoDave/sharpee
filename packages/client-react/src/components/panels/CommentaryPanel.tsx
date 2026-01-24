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
        <CategoryButton
          category="system"
          icon={'\u2139'}
          label="System"
          active={filter.showSystemEvents}
          onClick={toggleSystemEvents}
        />
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

