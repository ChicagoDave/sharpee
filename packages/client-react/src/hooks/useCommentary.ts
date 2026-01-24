/**
 * useCommentary - Hook for managing game event commentary
 *
 * Tracks all game events and provides human-readable formatting
 * for the Commentary Panel's streaming event log.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState } from '../context/GameContext';
import type { GameEvent } from '../types/game-state';

/**
 * Formatted commentary entry for display
 */
export interface CommentaryEntry {
  id: string;
  turn: number;
  timestamp: number;
  type: string;
  category: CommentaryCategory;
  icon: string;
  text: string;
  details?: string;
}

/**
 * Category for filtering and styling
 */
export type CommentaryCategory =
  | 'movement'
  | 'manipulation'
  | 'state'
  | 'perception'
  | 'combat'
  | 'score'
  | 'system'
  | 'error';

/**
 * Filter options for the commentary display
 */
export interface CommentaryFilter {
  categories: Set<CommentaryCategory>;
  showSystemEvents: boolean;
}

const DEFAULT_FILTER: CommentaryFilter = {
  categories: new Set(['movement', 'manipulation', 'state', 'perception', 'combat', 'score']),
  showSystemEvents: false,
};

/**
 * Maximum entries to keep in history
 */
const MAX_HISTORY = 500;

/**
 * Event type to category mapping
 */
function getEventCategory(eventType: string): CommentaryCategory {
  // Movement events
  if (
    eventType.includes('moved') ||
    eventType.includes('entered') ||
    eventType.includes('exited') ||
    eventType.includes('room') ||
    eventType.includes('going')
  ) {
    return 'movement';
  }

  // Manipulation events
  if (
    eventType.includes('taken') ||
    eventType.includes('dropped') ||
    eventType.includes('put_') ||
    eventType.includes('removed') ||
    eventType.includes('given') ||
    eventType.includes('thrown')
  ) {
    return 'manipulation';
  }

  // State change events
  if (
    eventType.includes('opened') ||
    eventType.includes('closed') ||
    eventType.includes('locked') ||
    eventType.includes('unlocked') ||
    eventType.includes('switched') ||
    eventType.includes('worn') ||
    eventType.includes('eaten') ||
    eventType.includes('drunk') ||
    eventType.includes('light')
  ) {
    return 'state';
  }

  // Perception events
  if (
    eventType.includes('examined') ||
    eventType.includes('searched') ||
    eventType.includes('listened') ||
    eventType.includes('smelled') ||
    eventType.includes('touched') ||
    eventType.includes('read')
  ) {
    return 'perception';
  }

  // Combat events
  if (
    eventType.includes('attack') ||
    eventType.includes('combat') ||
    eventType.includes('damage') ||
    eventType.includes('killed') ||
    eventType.includes('died')
  ) {
    return 'combat';
  }

  // Score events
  if (eventType.includes('score')) {
    return 'score';
  }

  // Error events
  if (eventType.includes('error') || eventType.includes('failed')) {
    return 'error';
  }

  // System events (game lifecycle, etc.)
  return 'system';
}

/**
 * Get icon for event category
 */
function getCategoryIcon(category: CommentaryCategory): string {
  switch (category) {
    case 'movement':
      return '\u2192'; // →
    case 'manipulation':
      return '\u270B'; // ✋
    case 'state':
      return '\u2699'; // ⚙
    case 'perception':
      return '\u{1F441}'; // 👁
    case 'combat':
      return '\u2694'; // ⚔
    case 'score':
      return '\u2605'; // ★
    case 'error':
      return '\u26A0'; // ⚠
    case 'system':
      return '\u2139'; // ℹ
  }
}

/**
 * Format event type to human-readable text
 */
function formatEventType(eventType: string): string {
  // Remove namespace prefix (if.event., game., etc.)
  let text = eventType.replace(/^(if\.event\.|game\.|if\.action\.)/, '');

  // Convert snake_case to Title Case
  text = text
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return text;
}

/**
 * Extract entity name from event data
 */
function getEntityName(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const d = data as Record<string, unknown>;

  // Try various common fields
  if (typeof d.name === 'string') return d.name;
  if (typeof d.entityName === 'string') return d.entityName;
  if (typeof d.targetName === 'string') return d.targetName;
  if (typeof d.itemName === 'string') return d.itemName;
  if (typeof d.objectName === 'string') return d.objectName;

  // Try nested entity objects
  if (d.entity && typeof d.entity === 'object') {
    const entity = d.entity as Record<string, unknown>;
    if (typeof entity.name === 'string') return entity.name;
  }

  if (d.target && typeof d.target === 'object') {
    const target = d.target as Record<string, unknown>;
    if (typeof target.name === 'string') return target.name;
  }

  if (d.item && typeof d.item === 'object') {
    const item = d.item as Record<string, unknown>;
    if (typeof item.name === 'string') return item.name;
  }

  // Fall back to ID fields
  if (typeof d.entityId === 'string') return d.entityId;
  if (typeof d.targetId === 'string') return d.targetId;
  if (typeof d.itemId === 'string') return d.itemId;

  return undefined;
}

/**
 * Format event data to details string
 */
function formatEventDetails(eventType: string, data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const d = data as Record<string, unknown>;

  // Movement events
  if (eventType.includes('actor_moved') || eventType.includes('room_entered')) {
    const from = (d.fromRoom as string) || (d.from as string);
    const to =
      (d.toRoom as string) ||
      (d.to as string) ||
      ((d.destinationRoom as { id?: string })?.id as string);
    const direction = d.direction as string;

    if (direction && to) {
      return `${direction} to ${to}`;
    }
    if (from && to) {
      return `${from} \u2192 ${to}`;
    }
    if (to) {
      return `to ${to}`;
    }
  }

  // Taking/dropping events
  if (eventType.includes('taken') || eventType.includes('dropped')) {
    const name = getEntityName(d);
    return name || undefined;
  }

  // Container events
  if (eventType.includes('put_in') || eventType.includes('put_on')) {
    const item = getEntityName(d) || (d.itemId as string);
    const container = (d.containerName as string) || (d.containerId as string);
    const supporter = (d.supporterName as string) || (d.supporterId as string);
    const target = container || supporter;

    if (item && target) {
      return `${item} \u2192 ${target}`;
    }
  }

  // Score events
  if (eventType.includes('score')) {
    const points = (d.points as number) || (d.amount as number);
    const newScore = d.newScore as number;
    const reason = d.reason as string;

    if (points !== undefined) {
      const prefix = points >= 0 ? '+' : '';
      return reason ? `${prefix}${points} (${reason})` : `${prefix}${points}`;
    }
    if (newScore !== undefined) {
      return `Score: ${newScore}`;
    }
  }

  // Light events
  if (eventType.includes('light') || eventType.includes('illuminat') || eventType.includes('darken')) {
    const source = (d.sourceName as string) || (d.sourceId as string);
    if (source) return source;
  }

  // Opening/closing events
  if (eventType.includes('opened') || eventType.includes('closed')) {
    const name = getEntityName(d);
    return name || undefined;
  }

  // Locking/unlocking events
  if (eventType.includes('locked') || eventType.includes('unlocked')) {
    const name = getEntityName(d);
    const key = (d.keyName as string) || (d.keyId as string);
    if (name && key) {
      return `${name} with ${key}`;
    }
    return name || undefined;
  }

  // Generic entity name fallback
  const name = getEntityName(d);
  return name || undefined;
}

/**
 * Format a game event into a commentary entry
 */
function formatEvent(event: GameEvent, index: number): CommentaryEntry {
  const category = getEventCategory(event.type);
  const icon = getCategoryIcon(category);
  const text = formatEventType(event.type);
  const details = formatEventDetails(event.type, event.data);

  return {
    id: `event-${event.turn}-${index}-${Date.now()}`,
    turn: event.turn,
    timestamp: Date.now(),
    type: event.type,
    category,
    icon,
    text,
    details,
  };
}

/**
 * Hook for managing game event commentary
 */
export function useCommentary() {
  const gameState = useGameState();
  const [entries, setEntries] = useState<CommentaryEntry[]>([]);
  const [filter, setFilter] = useState<CommentaryFilter>(DEFAULT_FILTER);
  const processedTurns = useRef(new Set<number>());

  // Process new events when they arrive
  useEffect(() => {
    const events = gameState.lastTurnEvents;
    if (events.length === 0) return;

    // Check if we've already processed this turn's events
    const turnKey = gameState.turns;
    if (processedTurns.current.has(turnKey)) return;
    processedTurns.current.add(turnKey);

    // Format new events
    const newEntries = events.map((event, index) => formatEvent(event, index));

    // Add to history, limiting size
    setEntries((prev) => {
      const combined = [...prev, ...newEntries];
      if (combined.length > MAX_HISTORY) {
        return combined.slice(combined.length - MAX_HISTORY);
      }
      return combined;
    });
  }, [gameState.lastTurnEvents, gameState.turns]);

  // Filter entries based on current filter
  const filteredEntries = entries.filter((entry) => {
    if (entry.category === 'system' && !filter.showSystemEvents) {
      return false;
    }
    return filter.categories.has(entry.category);
  });

  // Toggle category filter
  const toggleCategory = useCallback((category: CommentaryCategory) => {
    setFilter((prev) => {
      const newCategories = new Set(prev.categories);
      if (newCategories.has(category)) {
        newCategories.delete(category);
      } else {
        newCategories.add(category);
      }
      return { ...prev, categories: newCategories };
    });
  }, []);

  // Toggle system events
  const toggleSystemEvents = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      showSystemEvents: !prev.showSystemEvents,
    }));
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setEntries([]);
    processedTurns.current.clear();
  }, []);

  return {
    entries: filteredEntries,
    allEntries: entries,
    filter,
    toggleCategory,
    toggleSystemEvents,
    clearHistory,
    totalCount: entries.length,
    filteredCount: filteredEntries.length,
  };
}
