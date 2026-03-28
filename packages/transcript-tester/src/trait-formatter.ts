/**
 * Trait-to-prose formatter.
 *
 * Converts raw trait snapshots into human-readable summaries.
 * Each trait type has a dedicated template; unknown traits fall back to compact JSON.
 *
 * Public interface: formatEntityTraits(), formatTraitProse()
 * Owner context: transcript-tester display layer
 */

import { EntityTraitSnapshot } from './types';

/**
 * Format all entity trait snapshots as prose lines for CLI display.
 * Returns an array of formatted lines (no leading whitespace — caller indents).
 */
export function formatEntityTraitLines(snapshots: EntityTraitSnapshot[]): string[] {
  const lines: string[] = [];
  for (const snapshot of snapshots) {
    const identity = snapshot.traits['identity'] as Record<string, any> | undefined;
    const name = identity?.name || snapshot.entityId;
    const header = buildHeader(snapshot.entityId, identity);

    lines.push(`┌ ${header}`);

    for (const [traitType, props] of Object.entries(snapshot.traits)) {
      if (traitType === 'identity') continue; // already in header
      const prose = formatTraitProse(traitType, props);
      lines.push(`│ ${prose}`);
    }

    if (identity?.aliases?.length) {
      lines.push(`│ aliases: ${identity.aliases.join(', ')}`);
    }

    lines.push(`└`);
  }
  return lines;
}

/**
 * Build the entity header line from identity trait.
 */
function buildHeader(entityId: string, identity?: Record<string, any>): string {
  if (!identity) return entityId;

  const parts: string[] = [];
  const name = identity.name || entityId;
  parts.push(`${name} (${entityId})`);

  const tags: string[] = [];
  if (identity.weight != null) tags.push(`wt ${identity.weight}`);
  if (identity.points != null) tags.push(`take-pts ${identity.points}`);
  if (identity.concealed) tags.push('concealed');

  if (tags.length) {
    parts.push(` — ${tags.join(', ')}`);
  }

  return parts.join('');
}

/**
 * Format a single trait's properties as a prose string.
 */
export function formatTraitProse(traitType: string, props: Record<string, any>): string {
  switch (traitType) {
    case 'room':
      return formatRoom(props);
    case 'actor':
      return formatActor(props);
    case 'container':
      return formatContainer(props);
    case 'openable':
      return formatOpenable(props);
    case 'lockable':
      return formatLockable(props);
    case 'lightSource':
      return formatLightSource(props);
    case 'switchable':
      return formatSwitchable(props);
    case 'weapon':
      return formatWeapon(props);
    case 'combatant':
      return formatCombatant(props);
    case 'npc':
      return formatNpc(props);
    case 'scenery':
      return 'scenery';
    case 'pushable':
      return formatPushable(props);
    case 'dungeo.trait.treasure':
      return formatTreasure(props);
    case 'dungeo.trait.trophy_case':
      return 'trophy case';
    default:
      return formatUnknown(traitType, props);
  }
}

function formatRoom(p: Record<string, any>): string {
  const parts: string[] = [];

  // Exits
  if (p.exits && typeof p.exits === 'object') {
    const exitList = Object.entries(p.exits)
      .map(([dir, info]: [string, any]) => {
        const dest = info?.destination || '?';
        const via = info?.via ? ` via ${info.via}` : '';
        return `${dir[0]}${dir.slice(1).toLowerCase()}→${dest}${via}`;
      });
    if (exitList.length) parts.push(`exits: ${exitList.join(', ')}`);
    else parts.push('no exits');
  }

  // Flags
  const flags: string[] = [];
  if (p.isDark) flags.push('dark');
  if (p.isOutdoors) flags.push('outdoors');
  if (p.isUnderground) flags.push('underground');
  if (p.visited === false) flags.push('unvisited');
  if (flags.length) parts.push(flags.join(', '));

  return `room: ${parts.join('; ')}`;
}

function formatActor(p: Record<string, any>): string {
  if (p.isPlayer) return 'player';
  return 'NPC actor';
}

function formatContainer(p: Record<string, any>): string {
  const cap = p.capacity;
  if (!cap) return 'container';
  const parts: string[] = [];
  if (cap.maxItems != null) parts.push(`${cap.maxItems} items`);
  if (cap.maxWeight != null) parts.push(`${cap.maxWeight} wt`);
  return `container: ${parts.join(' / ') || 'unlimited'}`;
}

function formatOpenable(p: Record<string, any>): string {
  return p.isOpen ? 'open' : 'closed';
}

function formatLockable(p: Record<string, any>): string {
  const parts: string[] = [p.isLocked ? 'locked' : 'unlocked'];
  if (p.keyId) parts.push(`key: ${p.keyId}`);
  return parts.join(', ');
}

function formatLightSource(p: Record<string, any>): string {
  const parts: string[] = [p.isLit ? 'lit' : 'unlit'];
  parts.push(`brightness ${p.brightness ?? '?'}`);
  if (p.fuelRemaining != null && p.maxFuel != null) {
    parts.push(`fuel ${p.fuelRemaining}/${p.maxFuel}`);
  }
  return `light: ${parts.join(', ')}`;
}

function formatSwitchable(p: Record<string, any>): string {
  return p.isOn ? 'on' : 'off';
}

function formatWeapon(p: Record<string, any>): string {
  const parts: string[] = [];
  if (p.weaponType) parts.push(p.weaponType);
  if (p.damage != null) parts.push(`dmg ${p.damage}`);
  if (p.skillBonus) parts.push(`skill +${p.skillBonus}`);
  if (p.twoHanded) parts.push('two-handed');
  if (p.isBlessed) parts.push('blessed');
  if (p.glowsNearDanger && p.isGlowing) parts.push('GLOWING');
  return `weapon: ${parts.join(', ')}`;
}

function formatCombatant(p: Record<string, any>): string {
  const parts: string[] = [];
  if (p.health != null && p.maxHealth != null) parts.push(`HP ${p.health}/${p.maxHealth}`);
  if (p.skill != null) parts.push(`skill ${p.skill}`);
  if (p.baseDamage != null) parts.push(`dmg ${p.baseDamage}`);
  if (p.hostile) parts.push('HOSTILE');
  if (!p.isAlive) parts.push('DEAD');
  if (!p.isConscious) parts.push('unconscious');
  return `combat: ${parts.join(', ')}`;
}

function formatNpc(p: Record<string, any>): string {
  const parts: string[] = [];
  if (!p.isAlive) {
    parts.push('DEAD');
  } else {
    parts.push('alive');
  }
  if (!p.isConscious) parts.push('unconscious');
  if (p.isHostile) parts.push('hostile');

  // Custom state
  const custom = p.customProperties;
  if (custom?.state) parts.push(custom.state.toLowerCase());

  // Forbidden rooms as count
  if (p.forbiddenRooms?.length) {
    parts.push(`${p.forbiddenRooms.length} forbidden rooms`);
  }

  return `npc: ${parts.join(', ')}`;
}

function formatPushable(p: Record<string, any>): string {
  const parts: string[] = [];
  if (p.pushType) parts.push(p.pushType);
  if (p.pushCount > 0) parts.push(`pushed ${p.pushCount}x`);
  if (p.state && p.state !== 'default') parts.push(p.state);
  return `pushable: ${parts.join(', ') || 'moveable'}`;
}

function formatTreasure(p: Record<string, any>): string {
  const parts: string[] = [];
  if (p.trophyCaseValue != null) parts.push(`trophy case ${p.trophyCaseValue} pts`);
  if (p.trophyCaseDescription) parts.push(p.trophyCaseDescription);
  return `treasure: ${parts.join(', ')}`;
}

function formatUnknown(traitType: string, props: Record<string, any>): string {
  const keys = Object.keys(props);
  if (keys.length === 0) return traitType;
  // Compact single-line JSON
  const compact = JSON.stringify(props);
  if (compact.length <= 80) return `${traitType}: ${compact}`;
  // Truncate if very long
  return `${traitType}: ${compact.substring(0, 77)}...`;
}
