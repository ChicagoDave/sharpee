/**
 * claim-identity.ts — when two worlds are one state to the claims walk
 * (ADR-365 D2, D5; the 2026-11-12 note on D2).
 *
 * Purpose: the walk merges two worlds when their identities are equal, and
 * a `never` claim is held once the merged frontier runs out. So a field the
 * identity leaves out can hold a claim wrongly. The identity is therefore
 * built by exclusion: it hashes the world's whole snapshot, minus the parts
 * `IDENTITY_IGNORES` names, each with its reason. A field the platform or
 * the language adds later counts until someone lists it here — a forgotten
 * field costs the walk time, never soundness.
 *
 * Invariant: nothing is left out of the identity unless `IDENTITY_IGNORES`
 * names it. Three of its entries leave out state a story can read (the
 * random cursor, the clause firing counters and the prose pipeline's text
 * state): they change on every turn of a story that uses them, and with
 * them in the identity no walk of such a story ever exhausts its set. Each
 * entry says what a walk can miss because of it.
 *
 * Public interface: `necessaryIdentity`, `IDENTITY_IGNORES`,
 *   `IdentityIgnore`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { createHash } from 'node:crypto';
import { CHORD_IR_ID_ATTRIBUTE, CHORD_OCCURRENCE_PREFIX, CHORD_RNG_KEY } from '@sharpee/story-loader';
import type { NecessarySet } from './claim-set.js';
import type { SnapshotValue, WorldSnapshot } from './claims-game.js';

/** One part of the world's snapshot the identity leaves out, and why. */
export interface IdentityIgnore {
  /**
   * Where the part sits: an entity row, a top-level key of the snapshot, a
   * key of its spatial index, a capability by name, a field of every
   * capability, one world-state key, or every world-state key with a prefix.
   */
  readonly part: 'entity' | 'snapshot' | 'spatial-index' | 'capability' | 'capability-field' | 'state-key' | 'state-prefix';
  readonly name: string;
  readonly why: string;
}

/** Everything the identity leaves out. A part not named here is hashed. */
export const IDENTITY_IGNORES: readonly IdentityIgnore[] = [
  {
    part: 'entity',
    name: 'outside the set',
    why: 'ADR-365 D2: the author writes the set, and the walk prunes to it on both sides. An entity that is neither the player, a thing of the set nor a room of the set is left out, with its place in the spatial index.',
  },
  {
    part: 'snapshot',
    name: 'idCounters',
    why: 'The next id to allocate. An entity created during play is in the snapshot itself; the counter adds nothing a rule reads.',
  },
  {
    part: 'spatial-index',
    name: 'childToParent',
    why: 'The mirror of parentToChildren, which is hashed as sorted pairs. The order children were inserted in is not state either.',
  },
  {
    part: 'capability',
    name: 'commandHistory',
    why: 'What was typed, with a timestamp on each row. It grows every turn and no rule reads it.',
  },
  {
    part: 'capability',
    name: 'textState',
    why: 'The prose pipeline\'s counters for varying text. They change on every turn that prints a varying phrase. Left out so a walk can exhaust; a walk can therefore merge two worlds whose next printed variant differs.',
  },
  {
    part: 'capability-field',
    name: 'schema',
    why: 'The shape of a capability\'s data, fixed at registration. Only the data is state.',
  },
  {
    part: 'state-key',
    name: CHORD_RNG_KEY,
    why: 'The random cursor, which moves on every draw. Left out so a walk can exhaust; a walk can therefore merge two worlds whose later draws differ, and miss a state only one of them reaches.',
  },
  {
    part: 'state-prefix',
    name: CHORD_OCCURRENCE_PREFIX,
    why: 'How many times each clause and select has fired. An every-turn clause moves its counter every turn. Left out so a walk can exhaust; a walk can therefore merge two worlds a rule tells apart by ordinal (the third time).',
  },
];

function ignored(part: IdentityIgnore['part']): ReadonlySet<string> {
  return new Set(IDENTITY_IGNORES.filter((entry) => entry.part === part).map((entry) => entry.name));
}

const IGNORED_SNAPSHOT_KEYS = ignored('snapshot');
const IGNORED_CAPABILITIES = ignored('capability');
const IGNORED_CAPABILITY_FIELDS = ignored('capability-field');
const IGNORED_STATE_KEYS = ignored('state-key');
const IGNORED_STATE_PREFIXES = [...ignored('state-prefix')];

/** A snapshot value as text that does not depend on the order its keys were written in. */
function canonical(value: SnapshotValue | undefined): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${(value as readonly SnapshotValue[]).map(canonical).join(',')}]`;
  const record = value as { readonly [key: string]: SnapshotValue | undefined };
  const fields = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`);
  return `{${fields.join(',')}}`;
}

/**
 * Hash a world as one state under a necessary set: the whole snapshot,
 * minus what `IDENTITY_IGNORES` names. Entities are cut to the set (the
 * player, the set's things and the set's rooms); world state, the ending,
 * the score and every capability's data are hashed whole.
 *
 * @param snapshot the parsed world snapshot
 * @param set the necessary set
 * @returns a hex digest
 */
export function necessaryIdentity(snapshot: WorldSnapshot, set: NecessarySet): string {
  const inSet = new Set([...set.things, ...set.rooms]);
  const keptIds = new Set<string>();
  const entities = (snapshot.entities ?? []).filter((row) => {
    const irId = row.entity?.attributes?.[CHORD_IR_ID_ATTRIBUTE];
    const kept = row.id === snapshot.playerId || (typeof irId === 'string' && inSet.has(irId));
    if (kept) keptIds.add(row.id);
    return kept;
  });

  const hashed: Record<string, SnapshotValue> = {};
  for (const part of Object.keys(snapshot)) {
    if (IGNORED_SNAPSHOT_KEYS.has(part)) continue;
    switch (part) {
      case 'entities':
        hashed[part] = [...entities].sort((a, b) => (a.id < b.id ? -1 : 1));
        break;
      case 'spatialIndex': {
        const pairs: string[] = [];
        for (const row of snapshot.spatialIndex?.parentToChildren ?? []) {
          for (const child of row.children ?? []) if (keptIds.has(child)) pairs.push(`${row.parent}>${child}`);
        }
        hashed[part] = pairs.sort();
        break;
      }
      case 'state': {
        const state: Record<string, SnapshotValue | undefined> = {};
        for (const [key, value] of Object.entries(snapshot.state ?? {})) {
          if (IGNORED_STATE_KEYS.has(key) || IGNORED_STATE_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
          state[key] = value;
        }
        hashed[part] = state;
        break;
      }
      case 'capabilities':
        hashed[part] = (snapshot.capabilities ?? [])
          .filter((capability) => !IGNORED_CAPABILITIES.has(capability.name))
          .map((capability) => Object.fromEntries(Object.entries(capability).filter(([field]) => !IGNORED_CAPABILITY_FIELDS.has(field))))
          .sort((a, b) => (String(a.name) < String(b.name) ? -1 : 1));
        break;
      default: {
        const value = snapshot[part];
        if (value !== undefined) hashed[part] = value;
      }
    }
  }
  return createHash('sha1').update(canonical(hashed)).digest('hex');
}
