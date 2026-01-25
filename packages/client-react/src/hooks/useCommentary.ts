/**
 * useCommentary - Hook for managing game event commentary
 *
 * Tracks all game events and provides human-readable formatting
 * for the Commentary Panel's streaming event log.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
// Note: CommentaryCategory is still used for styling individual entries
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
 * Format event into a complete human-readable sentence
 */
function formatEventText(eventType: string, data: unknown): { text: string; details?: string } {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  // Helper to get names from data
  const getName = (field: string): string | undefined => {
    const val = d[field];
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && 'name' in val) return String((val as { name: unknown }).name);
    return undefined;
  };

  const entityName = getName('entityName') || getName('name') || getName('targetName') || getName('itemName');
  const direction = getName('direction');
  const toRoom = getName('toRoom') || (d.destinationRoom as { name?: string })?.name;
  const fromRoom = getName('fromRoom') || getName('from');

  // Movement events
  if (eventType === 'if.event.actor_moved') {
    const firstVisit = d.firstVisit as boolean;
    if (direction && toRoom) {
      const details = fromRoom ? `from ${fromRoom}${firstVisit ? ' (first visit)' : ''}` : undefined;
      return { text: `Moved ${direction} to ${toRoom}`, details };
    }
    if (toRoom) {
      return { text: `Entered ${toRoom}`, details: firstVisit ? 'first visit' : undefined };
    }
    return { text: 'Moved to a new location' };
  }

  if (eventType === 'if.event.room_entered') {
    return { text: toRoom ? `Arrived at ${toRoom}` : 'Entered a room', details: fromRoom ? `from ${fromRoom}` : undefined };
  }

  // Taking/dropping
  if (eventType === 'if.event.taken') {
    const container = getName('container') || getName('previousLocation');
    const details = container ? `from ${container}` : undefined;
    return { text: entityName ? `Picked up ${entityName}` : 'Picked up something', details };
  }

  if (eventType === 'if.event.dropped') {
    const location = getName('toLocationName') || getName('toLocation');
    return { text: entityName ? `Dropped ${entityName}` : 'Dropped something', details: location ? `in ${location}` : undefined };
  }

  // Container events
  if (eventType === 'if.event.put_in') {
    const item = getName('itemName') || getName('entityName');
    const container = getName('containerName') || getName('targetName');
    if (item && container) {
      return { text: `Put ${item} in ${container}` };
    }
    return { text: 'Put something in a container' };
  }

  if (eventType === 'if.event.put_on') {
    const item = getName('itemName') || getName('entityName');
    const supporter = getName('supporterName') || getName('targetName');
    if (item && supporter) {
      return { text: `Put ${item} on ${supporter}` };
    }
    return { text: 'Put something on a surface' };
  }

  if (eventType === 'if.event.removed_from') {
    const item = getName('itemName') || getName('entityName');
    const container = getName('containerName') || getName('targetName');
    if (item && container) {
      return { text: `Took ${item} from ${container}` };
    }
    return { text: 'Removed something from a container' };
  }

  // Opening/closing
  if (eventType === 'if.event.opened') {
    const messageId = d.messageId as string;
    const customMsg = messageId && !messageId.includes('if.action') ? messageId.split('.').pop() : undefined;
    return { text: entityName ? `Opened ${entityName}` : 'Opened something', details: customMsg };
  }

  if (eventType === 'if.event.closed') {
    return { text: entityName ? `Closed ${entityName}` : 'Closed something' };
  }

  // Revealed contents (after opening container)
  if (eventType === 'if.event.revealed') {
    const containerName = getName('containerName');
    const items = d.items as Array<{ name?: string }>;
    const itemNames = items?.map(i => i.name).filter(Boolean).join(', ');
    if (containerName && itemNames) {
      return { text: `${containerName} contains`, details: itemNames };
    }
    return { text: 'Contents revealed' };
  }

  // Locking/unlocking
  if (eventType === 'if.event.locked') {
    const key = getName('keyName');
    if (entityName && key) {
      return { text: `Locked ${entityName} with ${key}` };
    }
    return { text: entityName ? `Locked ${entityName}` : 'Locked something' };
  }

  if (eventType === 'if.event.unlocked') {
    const key = getName('keyName');
    if (entityName && key) {
      return { text: `Unlocked ${entityName} with ${key}` };
    }
    return { text: entityName ? `Unlocked ${entityName}` : 'Unlocked something' };
  }

  // Switching on/off
  if (eventType === 'if.event.switched_on') {
    const isLightSource = d.isLightSource as boolean;
    const willIlluminate = d.willIlluminateLocation as boolean;
    const details = isLightSource && willIlluminate ? 'area now lit' : undefined;
    return { text: entityName ? `Turned on ${entityName}` : 'Turned something on', details };
  }

  if (eventType === 'if.event.switched_off') {
    const willDarken = d.willDarkenLocation as boolean;
    const details = willDarken ? 'area now dark' : undefined;
    return { text: entityName ? `Turned off ${entityName}` : 'Turned something off', details };
  }

  // NPC movement
  if (eventType === 'npc.moved') {
    const npcName = getName('npcName') || getName('npc');
    const npcDirection = d.direction as string;
    const to = getName('to');
    if (npcName && npcDirection) {
      return { text: `${npcName} moved ${npcDirection.toLowerCase()}`, details: to ? `to ${to}` : undefined };
    }
    return { text: 'NPC moved' };
  }

  // Perception
  if (eventType === 'if.event.examined') {
    return { text: entityName ? `Examined ${entityName}` : 'Looked at something' };
  }

  if (eventType === 'if.event.searched') {
    return { text: entityName ? `Searched ${entityName}` : 'Searched something' };
  }

  if (eventType === 'if.event.listened') {
    return { text: entityName ? `Listened to ${entityName}` : 'Listened' };
  }

  if (eventType === 'if.event.smelled') {
    return { text: entityName ? `Smelled ${entityName}` : 'Smelled the air' };
  }

  if (eventType === 'if.event.touched') {
    return { text: entityName ? `Touched ${entityName}` : 'Touched something' };
  }

  if (eventType === 'if.event.read') {
    return { text: entityName ? `Read ${entityName}` : 'Read something' };
  }

  // Wearing
  if (eventType === 'if.event.worn') {
    return { text: entityName ? `Put on ${entityName}` : 'Wore something' };
  }

  if (eventType === 'if.event.taken_off') {
    return { text: entityName ? `Took off ${entityName}` : 'Removed clothing' };
  }

  // Eating/drinking
  if (eventType === 'if.event.eaten') {
    return { text: entityName ? `Ate ${entityName}` : 'Ate something' };
  }

  if (eventType === 'if.event.drunk') {
    return { text: entityName ? `Drank ${entityName}` : 'Drank something' };
  }

  // Combat
  if (eventType.includes('attack') || eventType.includes('combat')) {
    const npc = getName('npc') || getName('npcName');
    const target = getName('target') || getName('targetName') || getName('victimName');
    const weapon = getName('weaponName');
    const hit = d.hit as boolean;
    const damage = d.damage as number;

    if (npc && target) {
      const result = hit ? (damage ? `hit for ${damage} damage` : 'hit') : 'missed';
      return { text: `${npc} attacked ${target}`, details: result };
    }
    if (target && weapon) {
      return { text: `Attacked ${target} with ${weapon}` };
    }
    return { text: target ? `Attacked ${target}` : 'Combat action' };
  }

  if (eventType.includes('damage')) {
    const amount = d.amount as number;
    const target = getName('targetName');
    if (amount && target) {
      return { text: `${target} took ${amount} damage` };
    }
    return { text: 'Damage dealt' };
  }

  if (eventType.includes('killed') || eventType.includes('died')) {
    const victim = getName('victimName') || getName('entityName');
    return { text: victim ? `${victim} was killed` : 'Something died' };
  }

  // Score
  if (eventType === 'game.score_changed') {
    const newScore = d.newScore as number;
    const points = d.points as number;
    const reason = d.reason as string;
    if (points !== undefined) {
      const prefix = points >= 0 ? '+' : '';
      const reasonText = reason ? ` for ${reason}` : '';
      return { text: `${prefix}${points} points${reasonText}`, details: `Total: ${newScore}` };
    }
    return { text: `Score: ${newScore}` };
  }

  // Light
  if (eventType.includes('illuminated') || eventType.includes('light_on')) {
    return { text: 'Area is now lit' };
  }

  if (eventType.includes('darkened') || eventType.includes('light_off')) {
    return { text: 'Area is now dark' };
  }

  // Game lifecycle
  if (eventType === 'game.started') {
    return { text: 'Game started' };
  }

  if (eventType === 'game.saved') {
    return { text: 'Game saved' };
  }

  if (eventType === 'game.restored') {
    return { text: 'Game restored' };
  }

  // Fallback: convert event type to readable format and extract key details
  let text = eventType.replace(/^(if\.event\.|game\.|if\.action\.|system\.)/, '');
  text = text
    .split(/[._]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Build details from available data
  const detailParts: string[] = [];
  if (entityName) detailParts.push(entityName);
  if (direction) detailParts.push(direction);
  if (toRoom) detailParts.push(`→ ${toRoom}`);

  // For system events, show command info if available
  const searchTerm = d.searchTerm as string;
  if (searchTerm) detailParts.push(`"${searchTerm}"`);

  const resolved = d.resolved as boolean;
  const entity = d.entity as string;
  if (resolved !== undefined) {
    detailParts.push(resolved ? `found: ${entity || 'yes'}` : 'not found');
  }

  return { text, details: detailParts.length > 0 ? detailParts.join(' ') : undefined };
}

/**
 * Format a game event into a commentary entry
 */
function formatEvent(event: GameEvent, index: number): CommentaryEntry {
  const category = getEventCategory(event.type);
  const icon = getCategoryIcon(category);
  const { text, details } = formatEventText(event.type, event.data);

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

  // Clear history
  const clearHistory = useCallback(() => {
    setEntries([]);
    processedTurns.current.clear();
  }, []);

  return {
    entries,
    clearHistory,
    totalCount: entries.length,
  };
}
