/**
 * CommentaryPanel - Streaming event log display
 *
 * Shows real-time game events in a scrolling log.
 * Each event is categorized and formatted for easy reading.
 */

import React, { useEffect, useRef } from 'react';
import { useCommentary, type CommentaryEntry } from '../../hooks/useCommentary';

interface CommentaryPanelProps {
  className?: string;
  /** Auto-scroll to latest entry (default: true) */
  autoScroll?: boolean;
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
  const { entries, totalCount } = useCommentary();

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

  return (
    <div className={`commentary-panel ${className}`}>
      {/* Status bar */}
      <div className="commentary-status">
        <span>{totalCount} events</span>
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

