/**
 * assertion-core.ts — the claim language's one evaluator (ADR-340 D1).
 *
 * Both testing runtimes — `@sharpee/transcript-tester`'s text transcripts and
 * `@sharpee/branch-tester`'s tree documents — write the same claims: `[OK]`
 * output forms, channel claims over structured captures, event claims, and
 * `[STATE:]` expressions over the live world. This module evaluates them,
 * once, for both. It also carries the auto-assertion policy's synthesis, the
 * other half of "what a claim means".
 *
 * Browser-safe by construction: no Node import, no package barrel — the
 * IDE's testing surface bundles this file from source. Its one cross-package
 * import is `@sharpee/story-loader/pin-grammar`, a pure subpath the surface
 * aliases to source beside this file. Per-command execution,
 * directives, and session instruments are Node-bound and live in
 * `command-core.ts`.
 *
 * Public interface: `checkAssertion`, `checkEventAssertion`,
 * `checkStateAssertion`, `checkEmittedAssertion`, `evaluateStateExpression`,
 * `evaluateEmittedClaim`, `findEntity`,
 * `getEntityProperty`, `resolveValue`, `collectStrings`,
 * `captureEntityTraits`, `normalizeOutput`, `synthesizePolicyAssertions`,
 * `proseTextLinesOf`; the `WorldModel` seam; every shared type, re-exported.
 * Owner context: transcript-tester (testing tooling) — the home of the
 * assertion core; branch-tester imports it and carries no copy (D3).
 *
 * References: ADR-340 D1/D3 (one owner, drift is a test), ADR-300 D13
 * (channel claims), ADR-294 D2 (the auto-assertion boundary), GH #355 (the
 * Chord-spelled state claim), ADR-356 D2 (the pin grammar is parsed once,
 * in the loader, for the read and the write direction alike).
 */

import type {
  Assertion,
  AssertionResult,
  AutoAssertionPolicy,
  EntityTraitSnapshot,
  StoryStateKeys,
  TestEventInfo,
} from './types.js';
import { checkChannelAssertion } from './channel-assert.js';
// The pin grammar's one parser (ADR-356 D2): this module reads a pin, the
// loader's `arrange()` writes one, and neither carries a regex of its own.
// The subpath is pure and dependency-free, so the browser bundle stays
// runtime-free (the barrel would drag the whole loader in).
import { parsePin } from '@sharpee/story-loader/pin-grammar';

export type * from './types.js';

/**
 * Minimal interface for world model state queries ([STATE:] assertions).
 * Structural, so neither tester imports the world-model class.
 */
export interface WorldModel {
  getEntityById?(id: string): any;
  getEntity?(id: string): any;
  findEntityByName?(name: string): any;
  getAllEntities?(): any[];
  getLocation?(entityId: string): string | undefined;
  getContents?(containerId: string): any[];
  getPlayer?(): any;
  /** World-state lookup — carries the Chord story phase (`story.state` claims). */
  getStateValue?(key: string): unknown;
}

// ============================================================================
// Assertions
// ============================================================================

/**
 * Check one assertion against the turn: its output, its events, the world,
 * and the structured channel captures.
 *
 * @param assertion the parsed claim
 * @param actualOutput the turn's composed prose, normalized
 * @param expectedOutput the classic expected-output block, normalized
 * @param events the turn's captured events (system.* already filtered)
 * @param world the live world, for `[STATE:]` claims
 * @param channels channel id → structured emissions this turn (ADR-300 D13)
 * @param storyStateKeys how the story runtime keys declared states, when the
 *   session has one (the Chord claim forms); absent → those forms are not
 *   recognized
 * @returns the verdict, with a message on a miss
 */
export function checkAssertion(
  assertion: Assertion,
  actualOutput: string,
  expectedOutput: string,
  events: TestEventInfo[],
  world?: WorldModel,
  channels?: Record<string, unknown[]>,
  storyStateKeys?: StoryStateKeys
): AssertionResult {
  switch (assertion.type) {
    case 'ok': {
      // Exact match (after normalization). ADR-287 D1: when a text block is present
      // it supplies the expected text in place of the classic expected-output
      // block — the parser guarantees a command never carries both.
      const expected = assertion.block
        ? normalizeOutput(assertion.block.join("\n"))
        : expectedOutput;
      const matches = actualOutput === expected;
      return {
        assertion,
        passed: matches,
        message: matches ? undefined : `Output did not match expected`
      };
    }

    case 'ok-contains': {
      // ADR-287 D1: a block fragment may span lines, so it is normalized the
      // same way the actual output is. The INLINE form matches its raw value.
      const fragment = assertion.block
        ? normalizeOutput(assertion.block.join("\n"))
        : assertion.value!;
      const contains = actualOutput.toLowerCase().includes(fragment.toLowerCase());
      return {
        assertion,
        passed: contains,
        message: contains
          ? undefined
          : assertion.block
            ? "Output does not contain the text block fragment"
            : `Output does not contain "${assertion.value}"`
      };
    }

    case 'ok-not-contains': {
      const notContains = !actualOutput.toLowerCase().includes(assertion.value!.toLowerCase());
      return {
        assertion,
        passed: notContains,
        message: notContains ? undefined : `Output should not contain "${assertion.value}"`
      };
    }

    case 'channel-contains':
    case 'channel-not-contains':
    case 'channel-is':
    case 'channel-is-not':
    case 'channel-absent':
    case 'channel-present':
      // ADR-300 D13: dotted paths into records, list any-element matching,
      // typed comparison, and absence as a claim. Evaluated against the
      // STRUCTURED capture — a flattened line cannot answer `banner.title`.
      return checkChannelAssertion(assertion, channels);

    case 'fail':
      // This is handled at the command level
      return {
        assertion,
        passed: false,
        message: assertion.reason
      };

    case 'skip':
    case 'todo':
      return {
        assertion,
        passed: true,
        message: assertion.reason
      };

    case 'event-assert': {
      return checkEventAssertion(assertion, events);
    }

    case 'state-assert': {
      // `emitted <message-id>` (ADR-356 D3) is written where state pins are
      // written — a tree card's `states:`, a derived test's claims — but it
      // is a claim about the turn's events, not the world, so it is read
      // here where the events are in hand.
      if (assertion.stateExpression && parsePin(assertion.stateExpression).kind === 'emitted') {
        return checkEmittedAssertion(assertion, events);
      }
      return checkStateAssertion(assertion, world, storyStateKeys);
    }

    default:
      return {
        assertion,
        passed: false,
        message: `Unknown assertion type: ${(assertion as Assertion).type}`
      };
  }
}

/**
 * Check an event assertion: the event exists (or does not), at a position or
 * anywhere, with matching data properties.
 *
 * @param assertion the `event-assert` claim
 * @param events the turn's captured events
 * @returns the verdict, naming what was found instead on a miss
 */
export function checkEventAssertion(assertion: Assertion, events: TestEventInfo[]): AssertionResult {
  const { assertTrue, eventPosition, eventType, eventData } = assertion;

  const eventMatches = (event: TestEventInfo): boolean => {
    if (event.type !== eventType) return false;
    if (eventData) {
      for (const [key, value] of Object.entries(eventData)) {
        if (event.data[key] !== value) return false;
      }
    }
    return true;
  };

  let found = false;

  if (eventPosition !== undefined) {
    // Check specific position (1-based)
    const index = eventPosition - 1;
    if (index >= 0 && index < events.length) {
      found = eventMatches(events[index]);
    }
  } else {
    found = events.some(eventMatches);
  }

  const passed = assertTrue ? found : !found;

  let message: string | undefined;
  if (!passed) {
    if (assertTrue) {
      if (eventPosition !== undefined) {
        const actualAtPos = events[eventPosition - 1];
        if (actualAtPos) {
          message = `Event ${eventPosition}: expected ${eventType}, got ${actualAtPos.type}`;
          if (eventData) {
            message += `. Expected data: ${JSON.stringify(eventData)}, got: ${JSON.stringify(actualAtPos.data)}`;
          }
        } else {
          message = `Event ${eventPosition}: position out of range (${events.length} events total)`;
        }
      } else {
        message = `No event matching ${eventType}`;
        if (eventData) {
          message += ` with ${JSON.stringify(eventData)}`;
        }
        message += `. Events: ${events.map(e => e.type).join(', ')}`;
      }
    } else {
      message = `Event ${eventType} should not exist but was found`;
      if (eventData) {
        message += ` with matching data ${JSON.stringify(eventData)}`;
      }
    }
  }

  return { assertion, passed, message };
}

/**
 * Check an `emitted <message-id>` claim (ADR-356 D3) against the turn's
 * captured events.
 *
 * @param assertion the `state-assert` claim whose expression is the emitted form
 * @param events the turn's captured events
 * @returns the verdict, naming what was emitted instead on a miss
 */
export function checkEmittedAssertion(assertion: Assertion, events: TestEventInfo[]): AssertionResult {
  const pin = parsePin(assertion.stateExpression ?? '');
  if (pin.kind !== 'emitted') {
    return { assertion, passed: false, message: `Not an emitted claim: ${assertion.stateExpression}` };
  }
  const result = evaluateEmittedClaim(pin.messageId, events);
  const assertTrue = assertion.assertTrue !== false;
  const passed = assertTrue ? result.matches : !result.matches;
  let message: string | undefined;
  if (!passed) {
    message = assertTrue
      ? `Emitted assertion failed: ${assertion.stateExpression}. ${result.details ?? ''}`
      : `"${pin.messageId}" should not have been emitted but was`;
  }
  return { assertion, passed, message };
}

/**
 * Whether the turn emitted a message id: a phrase or refusal rides an event
 * whose data carries `messageId` (a story action's `chord.phrase`, a standard
 * action's own event), and an author `emit` is an event of that type. A
 * phrase an entity defines for itself is emitted owner-qualified
 * (`solicitor's-letter.summons-text`) while the story names it bare
 * (`summons-text`), so a bare id matches the last segment of a qualified one.
 *
 * @param messageId the phrase key or event id a claim wrote
 * @param events the turn's captured events
 * @returns whether it was emitted, with what was emitted instead on a miss
 */
export function evaluateEmittedClaim(
  messageId: string,
  events: TestEventInfo[]
): { matches: boolean; details?: string } {
  const named = (candidate: unknown): boolean =>
    typeof candidate === 'string' && (candidate === messageId || candidate.endsWith(`.${messageId}`));
  const matches = events.some((event) => named(event.type) || named(event.data?.messageId));
  if (matches) return { matches: true };
  const emitted = events
    .map((event) => (typeof event.data?.messageId === 'string' ? `${event.type} (${event.data.messageId})` : event.type))
    .join(', ');
  return { matches: false, details: `"${messageId}" was not emitted. Emitted: ${emitted || '(nothing)'}` };
}

/**
 * Check a state assertion against the world model.
 *
 * @param assertion the `state-assert` claim
 * @param world the live world; absent → a named failure, never a pass
 * @param storyStateKeys the story runtime's state keys, for the Chord forms
 * @returns the verdict; an evaluator throw is reported, never propagated
 */
export function checkStateAssertion(
  assertion: Assertion,
  world?: WorldModel,
  storyStateKeys?: StoryStateKeys
): AssertionResult {
  const { assertTrue, stateExpression } = assertion;

  if (!world) {
    return {
      assertion,
      passed: false,
      message: 'World model not available for state assertions'
    };
  }

  if (!stateExpression) {
    return {
      assertion,
      passed: false,
      message: 'No state expression provided'
    };
  }

  try {
    const result = evaluateStateExpression(stateExpression, world, storyStateKeys);
    const passed = assertTrue ? result.matches : !result.matches;

    let message: string | undefined;
    if (!passed) {
      if (assertTrue) {
        message = `State assertion failed: ${stateExpression}. ${result.details || ''}`;
      } else {
        message = `State assertion should be false but was true: ${stateExpression}`;
      }
    }

    return { assertion, passed, message };
  } catch (e) {
    return {
      assertion,
      passed: false,
      message: `Error evaluating state expression: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

// ============================================================================
// State expressions
// ============================================================================

/**
 * Evaluate a state expression against the world model.
 *
 * Recognition is the loader's `parsePin` (ADR-356 D2 — one grammar, one
 * parser, read here and written by `arrange()`); this function owns only
 * what each recognized form MEANS as a claim. The forms:
 *   story.state = value / story.state != value        (the story's phase)
 *   entity.location = value, entity.property = value (and != for both)
 *   entity.collection contains item / not-contains item
 *   [the] name is state / [the] name is not state     (a Chord entity's own
 *     `states:`, spelled the way Chord spells the condition — GH #355;
 *     `the story is state` reads the story's phase the same way)
 *   [the] name is gone / is not gone                   (a Chord `remove` took
 *     the entity out of play — ADR-356 D3; needs `entityGonePrefix`)
 *
 * With keys, an entity name in any form may also be the runtime id the
 * loader stamps (`silver-locket`), so a claim derived from the story's own
 * IR resolves without a display-name round trip.
 *
 * The `story.state` and `[the] name is state` forms read the story runtime's
 * declared states, keyed as `storyStateKeys` says; with no keys supplied
 * (a session without a story runtime that declares states) neither form is
 * recognized: `story.state` is then read as the entity form (an entity
 * named `story`, its `state` property) and the Chord-spelled form is not a
 * claim at all. The four shapes the grammar names but the floor does not
 * write (occurrence, topic history, timer phase, timer position) are not
 * claims either: no read of them is defined here. `emitted` is read by
 * `checkEmittedAssertion`, which has the events this function does not.
 *
 * @param expression - The pin text from a tree-document card or a `[STATE:]` line
 * @param world - The live world after the command ran
 * @param storyStateKeys - how the story runtime keys declared states, if any
 * @returns Whether the pin holds, with a details line on a miss
 */
export function evaluateStateExpression(
  expression: string,
  world: WorldModel,
  storyStateKeys?: StoryStateKeys
): { matches: boolean; details?: string } {
  const pin = parsePin(expression);
  const idAttribute = storyStateKeys?.entityIdAttribute;

  // Reserved head: the Chord story object's phase (`states:` in the header,
  // moved by `change the story to`). It is a world-state value, not an
  // entity property, so it cannot ride the entity form below.
  if (pin.kind === 'story-state' && storyStateKeys) {
    const actual = world.getStateValue?.(storyStateKeys.storyState);
    if (actual === undefined) {
      return { matches: false, details: 'story.state: this story declares no states' };
    }
    const isEqual = actual === pin.state;
    if (pin.operator === '=') {
      return { matches: isEqual, details: isEqual ? undefined : `story.state is "${actual}", expected "${pin.state}"` };
    }
    return { matches: !isEqual, details: !isEqual ? undefined : `story.state should not be "${pin.state}"` };
  }

  // "entity.property = value" / "entity.property != value" — `location`
  // is the same claim over the spatial property; without story keys the
  // `story.state` head is read here too, as an entity named `story`.
  if (pin.kind === 'property' || pin.kind === 'location' || pin.kind === 'story-state') {
    const entityName = pin.kind === 'story-state' ? 'story' : pin.entity;
    const property = pin.kind === 'story-state' ? 'state' : pin.kind === 'location' ? 'location' : pin.property;
    const expectedValue = pin.kind === 'story-state' ? pin.state : pin.kind === 'location' ? pin.place : pin.value;

    const entity = findEntity(entityName, world, idAttribute);
    if (!entity) {
      return { matches: false, details: `Entity "${entityName}" not found` };
    }

    const actualValue = getEntityProperty(entity, property, world);
    const expectedResolved = resolveValue(expectedValue, world, idAttribute);

    const isEqual = actualValue === expectedResolved ||
                    (actualValue?.id && actualValue.id === expectedResolved) ||
                    (typeof expectedResolved === 'string' && actualValue?.id === expectedResolved);

    if (pin.operator === '=') {
      return {
        matches: isEqual,
        details: isEqual ? undefined : `${entityName}.${property} is "${actualValue?.id || actualValue}", expected "${expectedResolved}"`
      };
    } else {
      return {
        matches: !isEqual,
        details: !isEqual ? undefined : `${entityName}.${property} should not be "${expectedResolved}"`
      };
    }
  }

  // "collection contains item" / "collection not-contains item"
  if (pin.kind === 'contains') {
    const { entity: entityName, collection: property, item: itemName } = pin;

    const entity = findEntity(entityName, world, idAttribute);
    if (!entity) {
      return { matches: false, details: `Entity "${entityName}" not found` };
    }

    const collection = getEntityProperty(entity, property, world);
    if (!Array.isArray(collection)) {
      return { matches: false, details: `${entityName}.${property} is not a collection` };
    }

    const item = findEntity(itemName, world, idAttribute);
    const itemId = item?.id || itemName;
    const hasItem = collection.some((c: any) => c === itemId || c?.id === itemId);

    if (pin.operator === 'contains') {
      return { matches: hasItem, details: hasItem ? undefined : `${entityName}.${property} does not contain "${itemName}"` };
    } else {
      return { matches: !hasItem, details: !hasItem ? undefined : `${entityName}.${property} should not contain "${itemName}"` };
    }
  }

  // Spelled the way Chord spells the condition (GH #355, ruled 2026-09-03):
  // "[the] <name> is <state>" / "[the] <name> is not <state>". The name may
  // carry spaces (`first partner`) and resolves through the same lookup as
  // the dotted head: name, id, IdentityTrait name, alias.
  if (pin.kind === 'declared-state' && storyStateKeys) {
    return evaluateChordStateClaim(pin.name, pin.negated, pin.state, world, storyStateKeys);
  }

  // "[the] <name> is gone" (ADR-356 D3): the loader's gone flag under the
  // entity's runtime id — an entity a Chord `remove` took out of play stays
  // in the world, so its location alone cannot answer this.
  if (pin.kind === 'gone' && storyStateKeys?.entityGonePrefix) {
    const entity = findEntity(pin.name, world, idAttribute);
    if (!entity) {
      return { matches: false, details: `Entity "${pin.name}" not found` };
    }
    const irId = entity.attributes?.[storyStateKeys.entityIdAttribute];
    if (typeof irId !== 'string') {
      return { matches: false, details: `the ${pin.name}: not a Chord entity (no IR id), so it cannot be gone` };
    }
    const gone = world.getStateValue?.(storyStateKeys.entityGonePrefix + irId) === true;
    if (!pin.negated) {
      return { matches: gone, details: gone ? undefined : `the ${pin.name} is not gone` };
    }
    return { matches: !gone, details: !gone ? undefined : `the ${pin.name} should not be gone` };
  }

  return { matches: false, details: `Could not parse expression: ${expression}` };
}

/**
 * The Chord-spelled state claim: `the story` reads the story-phase key; any
 * other name resolves to an entity and reads its state through the runtime
 * id attribute the loader stamps on every entity it creates, under the
 * prefix `keys` names.
 */
function evaluateChordStateClaim(
  name: string,
  negated: boolean,
  expected: string,
  world: WorldModel,
  keys: StoryStateKeys
): { matches: boolean; details?: string } {
  const label = `the ${name}`;
  let actual: unknown;
  if (name === 'story') {
    actual = world.getStateValue?.(keys.storyState);
    if (actual === undefined) {
      return { matches: false, details: `${label}: this story declares no states` };
    }
  } else {
    const entity = findEntity(name, world, keys.entityIdAttribute);
    if (!entity) {
      return { matches: false, details: `Entity "${name}" not found` };
    }
    const irId = entity.attributes?.[keys.entityIdAttribute];
    if (typeof irId !== 'string') {
      return { matches: false, details: `${label}: not a Chord entity (no IR id), so it has no states` };
    }
    actual = world.getStateValue?.(keys.entityStatePrefix + irId);
    if (actual === undefined) {
      return { matches: false, details: `${label}: declares no states` };
    }
  }
  const isEqual = actual === expected;
  if (!negated) {
    return { matches: isEqual, details: isEqual ? undefined : `${label} is "${actual}", expected "${expected}"` };
  }
  return { matches: !isEqual, details: !isEqual ? undefined : `${label} should not be "${expected}"` };
}

/**
 * Find an entity by name in the world model.
 *
 * `player` is a reserved word that always resolves to the player entity via
 * `world.getPlayer()`, regardless of what the story named it. With an
 * `idAttribute`, the token is next tried as the story runtime's own id for
 * an entity (the attribute the loader stamps). Otherwise entities match by
 * name, by id, by their IdentityTrait name, or by any of their IdentityTrait
 * aliases.
 *
 * @param name the token a claim wrote
 * @param world the live world
 * @param idAttribute the entity attribute carrying the story runtime's id, when the session has one
 * @returns the entity, or null when nothing matches
 */
export function findEntity(name: string, world: WorldModel, idAttribute?: string): any {
  // Reserved word: the player, whatever the story named it.
  if (name === 'player' && world.getPlayer) {
    const player = world.getPlayer();
    if (player) return player;
  }

  if (idAttribute && world.getAllEntities) {
    const stamped = world.getAllEntities().find((entity) => entity.attributes?.[idAttribute] === name);
    if (stamped) return stamped;
  }

  if (world.findEntityByName) {
    const entity = world.findEntityByName(name);
    if (entity) return entity;
  }

  if (world.getEntity) {
    const entity = world.getEntity(name);
    if (entity) return entity;
  }
  if (world.getEntityById) {
    const entity = world.getEntityById(name);
    if (entity) return entity;
  }

  if (world.getAllEntities) {
    const entities = world.getAllEntities();
    for (const entity of entities) {
      if (entity.name === name || entity.id === name) return entity;
      const identity =
        entity.get?.('identity') ?? entity.traits?.get?.('identity') ?? entity.traits?.identity;
      if (identity) {
        if (identity.name === name) return entity;
        if (identity.aliases?.includes(name)) return entity;
      }
    }
  }

  return null;
}

/**
 * Read a property off an entity. `location`, `contents`, and `inventory` are
 * spatial and go through the world; anything else reads the entity, then its
 * traits.
 *
 * @param entity the entity `findEntity` resolved
 * @param property the property name a claim wrote
 * @param world the live world, for the spatial properties
 * @returns the value, or undefined when the entity has no such property
 */
export function getEntityProperty(entity: any, property: string, world?: WorldModel): any {
  if (property === 'location') {
    if (world?.getLocation) {
      return world.getLocation(entity.id);
    }
    return entity.location || entity.containerId;
  }

  if (property === 'contents' || property === 'inventory') {
    if (world?.getContents) {
      return world.getContents(entity.id);
    }
    return entity.contents || entity.inventory || [];
  }

  if (property in entity) {
    return entity[property];
  }

  if (entity.traits && property in entity.traits) {
    return entity.traits[property];
  }

  return undefined;
}

/**
 * Resolve the right-hand side of a claim: an entity name becomes its id;
 * `null`/`undefined`/`nowhere` become undefined; `true`/`false` become
 * booleans; anything else stays the literal string.
 *
 * @param value the text a claim wrote
 * @param world the live world, for entity names
 * @param idAttribute the story runtime's id attribute, when the session has one
 * @returns the comparable value
 */
export function resolveValue(value: string, world: WorldModel, idAttribute?: string): any {
  const entity = findEntity(value, world, idAttribute);
  if (entity) {
    return entity.id;
  }

  if (value === 'null' || value === 'undefined' || value === 'nowhere') {
    return undefined;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;

  return value;
}

// ============================================================================
// Captures and normalization
// ============================================================================

/**
 * Recursively collect every string value in a data structure into `out`.
 *
 * @param value any event payload
 * @param out the accumulator, appended in encounter order
 */
export function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

/**
 * Extract entity ids from event data values and capture their trait snapshots.
 *
 * @param data the event payload; every string value is tried as an entity id
 * @param world the live world
 * @returns one snapshot per entity found with at least one trait
 */
export function captureEntityTraits(data: Record<string, any>, world: WorldModel): EntityTraitSnapshot[] {
  const candidates: string[] = [];
  collectStrings(data, candidates);

  const seen = new Set<string>();
  const snapshots: EntityTraitSnapshot[] = [];

  for (const value of candidates) {
    if (seen.has(value)) continue;
    seen.add(value);

    const entity = world.getEntity?.(value) ?? world.getEntityById?.(value);
    if (!entity) continue;

    const traits: Record<string, Record<string, any>> = {};

    const entityTraits = entity.getTraits?.() ?? (entity.traits instanceof Map ? Array.from(entity.traits.values()) : []);
    for (const trait of entityTraits) {
      const traitData: Record<string, any> = {};
      for (const [key, val] of Object.entries(trait)) {
        if (key === 'type') continue;
        traitData[key] = val;
      }
      traits[trait.type] = traitData;
    }

    if (Object.keys(traits).length > 0) {
      snapshots.push({ entityId: value, traits });
    }
  }

  return snapshots;
}

/**
 * Normalize output for assertion-tier comparison: CRLF → LF, every line
 * trimmed, leading and trailing blank lines dropped.
 *
 * @param output raw captured prose
 * @returns the comparable form
 */
export function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

// ============================================================================
// Auto-assertion synthesis (ADR-294 D2, Phase 6e #253)
// ============================================================================

/**
 * Build the assertions an `auto-assertion:` policy writes for a bare command's
 * first run, from the turn's real output.
 *
 * - `all-emitted-text` — `[OK]` + literal block of the whole composed turn
 *   (ADR-287 exact match): every ordered emission — before text, room name,
 *   description, list contents, NPC activity — in order, all of them.
 * - `room-description` / `room-name-and-description` — contains-form built
 *   from the turn's `room-name`/`room-description` STRUCTURED channel
 *   captures (churn survival is the point of choosing less than all-text;
 *   the flattened capture is a JSON rendering, so the text is read out of
 *   the structured values). A turn that emitted neither chosen channel gets
 *   `[SKIP]` — under a policy, "nothing of what I assert on was said" is a
 *   deliberate skip, and the file then distinguishes it from a command
 *   still awaiting its first run.
 *
 * @param policy the story's declared policy
 * @param actualOutput the turn's composed prose, as captured
 * @param channelValues the turn's structured channel captures (bootstrap
 *   auto-captures the two room channels whenever a room policy is declared)
 * @returns the assertions to push onto the command — never empty
 */
export function synthesizePolicyAssertions(
  policy: AutoAssertionPolicy,
  actualOutput: string,
  channelValues?: Record<string, unknown[]>
): Assertion[] {
  if (policy === 'all-emitted-text') {
    return [{ type: 'ok', block: actualOutput.replace(/\s+$/, '').split('\n') }];
  }

  /** Inline `[OK: contains "…"]` for a clean single line; block form when a
   *  quote would corrupt the inline grammar or the fragment spans lines. */
  const containsOf = (lines: string[]): Assertion =>
    lines.length === 1 && !lines[0].includes('"')
      ? { type: 'ok-contains', value: lines[0] }
      : { type: 'ok-contains', block: lines };

  const nameLines = proseTextLinesOf(channelValues?.['room-name']);
  const descriptionLines = proseTextLinesOf(channelValues?.['room-description']);

  const assertions: Assertion[] = [];
  if (policy === 'room-name-and-description' && nameLines.length > 0) {
    assertions.push(containsOf(nameLines));
  }
  if (descriptionLines.length > 0) {
    assertions.push(containsOf(descriptionLines));
  }
  return assertions.length > 0 ? assertions : [{ type: 'skip' }];
}

/**
 * Extract the player-visible text of a prose channel's structured capture,
 * one line per captured entry. A prose entry is `{ content: [...] }` where
 * content items are plain strings or decorations (`{ className, content }`,
 * ADR-174) — decorations flatten to their inner text, exactly what a
 * `contains` fragment should hold. Plain strings pass through, so unit
 * stubs and simple channels need no wrapping.
 *
 * @param values one channel's structured emissions this turn
 * @returns the non-empty trimmed lines, in order
 */
export function proseTextLinesOf(values: unknown[] | undefined): string[] {
  const textOf = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(textOf).join('');
    if (v !== null && typeof v === 'object' && 'content' in (v as Record<string, unknown>)) {
      return textOf((v as { content: unknown }).content);
    }
    return '';
  };
  return (values ?? [])
    .map(textOf)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
