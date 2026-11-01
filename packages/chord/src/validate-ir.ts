/**
 * validate-ir.ts — the Story IR's own invariants, checked once over the
 * finished IR: the targets and shapes of grammar alterations, kind nouns,
 * composition and trait adjectives with their settings, worn items,
 * tool-gated gerunds, listeners, conditional deadly exits, and every door's
 * connection. Each is a fact of the IR alone — no AST, no analyzer state —
 * so the compile reports it as its last analysis pass and the loader asks
 * the same function once before it builds a world. One rule, two callers.
 *
 * Public interface: validateIR(ir): Diagnostic[].
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * References:
 * - ADR-389 D4 — the IR's invariants live here; the loader's backstop is one call.
 * - ADR-276 D1 (as amended by ADR-389) — compile is authoritative; the rule has one home.
 * - ADR-336 D3 — `ANALYSIS_PASSES` is the named list this joins as the last entry.
 * - ADR-270 D2/D3, ADR-382 D6 — alteration targets resolve story-first; removals match by shape.
 */
import { KIND_NOUNS, TRAIT_ADJECTIVES } from './catalog.js';
import { type Diagnostic, DiagnosticBag } from './diagnostics.js';
import { nearest } from './edit-distance.js';
import type { IROnClause, StoryIR } from './ir.js';
import { manifestForAdjective, manifestForKindNoun } from './manifests/index.js';
import { lowerParts, renderPattern, samePatternShape } from './patterns.js';
import { STDLIB_MANIFEST } from './stdlib-manifest.js';

/**
 * Check every invariant of a finished Story IR.
 *
 * @param ir the compiled Story IR
 * @returns the diagnostics, in report order; empty when the IR is sound
 */
export function validateIR(ir: StoryIR): Diagnostic[] {
  const diagnostics = new DiagnosticBag();
  const usedExtensions = new Set(ir.uses ?? []);
  const traitDefs = new Map(ir.traits.map((t) => [t.name, t]));

  // Grammar alterations name their targets against the story's own actions
  // and the generated stdlib manifest (ADR-276 census 1–3).
  const storyActionNames = new Set(ir.actions.map((a) => a.name));
  const stdlibBareNames = [...STDLIB_MANIFEST.actionIds].map((id) => id.slice('if.action.'.length));

  for (const ext of ir.grammarExtensions ?? []) {
    // Story-first (the shadowing semantic): a story-defined action of the
    // same name wins and needs no stdlib id.
    if (storyActionNames.has(ext.action)) continue;
    if (!STDLIB_MANIFEST.actionIds.has(`if.action.${ext.action}`)) {
      diagnostics.error(
        'analysis.extend-target',
        `\`extend action ${ext.action}\` — no story action or standard action has that name${suggestText(ext.action, [...storyActionNames, ...stdlibBareNames])}.`,
        ext.span,
      );
    }
  }
  for (const removal of ir.grammarRemovals ?? []) {
    // Removals name STANDARD actions only (ADR-270 D3) — a story action
    // has no standard-tier rules to remove.
    if (!STDLIB_MANIFEST.actionIds.has(`if.action.${removal.action}`)) {
      diagnostics.error(
        'analysis.removal-target',
        `\`remove from action ${removal.action}\` — no standard action has that name${suggestText(removal.action, stdlibBareNames)}.`,
        removal.span,
      );
      continue;
    }
    // Census 3: each removal pattern must match a standard-grammar shape,
    // by shape (ADR-382 D6): slot names ignored, words lowercased,
    // alternations as sets — the same samePatternShape the loader removes
    // by. The manifest's shapes are lowered by the same module that
    // lowers the registered rules, so agreement is structural. The loader
    // still checks the LIVE grammar when it removes: a shape the manifest
    // carries but the running parser does not is its own load-time fact.
    const shapes = STDLIB_MANIFEST.locales['en-US'].grammarShapes[`if.action.${removal.action}`] ?? [];
    for (const pattern of removal.patterns) {
      const parts = lowerParts(pattern.parts);
      if (!shapes.some((shape) => samePatternShape(shape, parts))) {
        diagnostics.error(
          'analysis.unmatched-removal-pattern',
          `\`remove from action ${removal.action}\` — no standard rule matches \`${renderPattern(parts)}\`. The action's standard patterns are: ${shapes.map((s) => `\`${renderPattern(s)}\``).join(', ') || '(none)'}.`,
          removal.span,
        );
      }
    }
  }

  for (const entity of ir.entities) {
    // ADR-227: `<direction> is deadly while <condition>: <phrase>` is
    // parsed and lowered, but the conditional deadly exit is post-scope —
    // the loader has no wiring for the condition, so the IR refuses it.
    for (const deadly of entity.deadlyExits) {
      if (deadly.condition !== null) {
        diagnostics.error(
          'analysis.deadly-while-unsupported',
          '`is deadly while <condition>` is not wired yet — the conditional deadly exit is post-scope. Use an unconditional `is deadly:` or an `on going` clause with `kill the player when <condition>`.',
          deadly.span,
        );
      }
    }
    // Census 17 (discovered in Phase 1 — the phrasebook fixtures compiled
    // `a thing` clean): kind nouns are the closed catalog set the loader's
    // entity builder switches on.
    for (const k of entity.kinds) {
      // ADR-366 D12, ADR-376 D2: an extension's kind noun is admitted only
      // under its `use` line.
      const contributedKind = manifestForKindNoun(k.name);
      if (contributedKind && !contributedKind.core && !usedExtensions.has(contributedKind.name)) {
        diagnostics.error(
          `analysis.${contributedKind.name}-needs-use`,
          `\`${entity.name}\`: \`a ${k.name}\` is \`use ${contributedKind.name}\` vocabulary — add \`use ${contributedKind.name}\` to the story header.`,
          k.span,
        );
      } else if (!KIND_NOUNS.has(k.name) && !contributedKind) {
        diagnostics.error(
          'analysis.unknown-kind-noun',
          `\`${entity.name}\`: unknown kind noun \`${k.name}\`.`,
          k.span,
        );
      }
      // ADR-359 D1: a kind cannot come and go, so it never takes `while`.
      if (k.condition !== null) {
        diagnostics.error(
          'analysis.conditional-kind',
          `\`${entity.name}\`: a kind cannot come and go — remove the \`while\` condition from \`a ${k.name}\`.`,
          k.span,
        );
      }
    }
    // ADR-359 D1: `a thing` beside another kind names the fix — every
    // kind but room and region is already a thing.
    const hasThing = entity.kinds.some((k) => k.name === 'thing');
    const kindWithThing = hasThing ? entity.kinds.find((k) => k.name !== 'thing') : undefined;
    if (kindWithThing) {
      diagnostics.error(
        'analysis.thing-with-kind',
        thingWithKindMessage(entity.name, kindWithThing.name),
        kindWithThing.span,
      );
    } else if (entity.kinds.length > 1) {
      // Census 18 (discovered in Phase 1): one kind noun per entity.
      diagnostics.error(
        'analysis.multiple-kind-nouns',
        `\`${entity.name}\` declares more than one kind noun.`,
        entity.kinds[1].span,
      );
    }

    const isRoom = entity.kinds.some((k) => k.name === 'room');
    for (const comp of entity.traits) {
      // ADR-359 D1: a kind noun written bare (`scenery, container`) reads
      // as a trait; name the fix instead of an undeclared-trait error.
      if (KIND_NOUNS.has(comp.name)) {
        if (hasThing && comp.name !== 'thing') {
          diagnostics.error('analysis.thing-with-kind', thingWithKindMessage(entity.name, comp.name), comp.span);
        } else {
          diagnostics.error(
            'analysis.kind-noun-needs-article',
            `\`${entity.name}\`: \`${comp.name}\` is a kind and takes an article — write \`a ${comp.name}\`.`,
            comp.span,
          );
        }
        continue;
      }
      // ADR-369 D1: `transparent` is a container word, and unconditional —
      // the flag is a property of the thing, not a state the story toggles.
      // Checked ahead of the generic conditional gate so its message wins.
      // ADR-371 D3: `settable` reads the thing's own `states, reversible:`
      // line — a dial goes anywhere; a forward-only set is a phase, not a dial.
      if (comp.name === 'settable') {
        if (entity.states.length === 0) {
          diagnostics.error(
            'analysis.settable-states',
            `\`settable\` needs the values to set \`${entity.name}\` to — add a \`states, reversible: <first>, <second>, …\` line to its block.`,
            comp.span,
          );
          continue;
        }
        if (!entity.statesReversible) {
          diagnostics.error(
            'analysis.settable-irreversible',
            `\`${entity.name}\` is settable but its states march forward only — a dial goes anywhere, so write \`states, reversible: …\`.`,
            comp.span,
          );
          continue;
        }
      }
      // ADR-374 D10: power is what is inside a device — so a switchable
      // container, nothing else.
      if (comp.name === 'powered') {
        if (!entity.traits.some((t) => t.name === 'switchable')) {
          diagnostics.error(
            'analysis.powered-not-switchable',
            `\`powered by\` says what \`${entity.name}\` needs inside it to run — a thing that runs is \`switchable\`. Add it beside \`powered by\`.`,
            comp.span,
          );
          continue;
        }
        if ((entity.kinds[0]?.name ?? 'thing') !== 'container') {
          diagnostics.error(
            'analysis.powered-not-container',
            `\`${entity.name}\` holds its power inside it, so it is \`a container\` — write \`a container, switchable, powered by …\`.`,
            comp.span,
          );
          continue;
        }
      }
      // ADR-374 D3: night vision is a property of whoever looks — a
      // person, and unconditionally.
      if (comp.name === 'night-vision') {
        const kind = entity.kinds[0]?.name ?? 'thing';
        if (kind !== 'person') {
          diagnostics.error(
            'analysis.night-vision-not-person',
            `\`night-vision\` is how a person sees — \`${entity.name}\` is a ${kind}. Give it to the one who looks.`,
            comp.span,
          );
          continue;
        }
        if (comp.condition !== null) {
          diagnostics.error(
            'analysis.conditional-composition-unsupported',
            `\`night-vision\` is what \`${entity.name}\` is, not a state it changes — write it without \`while\`.`,
            comp.span,
          );
          continue;
        }
      }
      if (comp.name === 'transparent') {
        const kind = entity.kinds[0]?.name ?? 'thing';
        // ADR-366 D2, D3: a vehicle the player is in composes a container,
        // and the enclosure rule reads `transparent` on it for seeing out.
        if (kind !== 'container' && kind !== 'vehicle') {
          diagnostics.error(
            'analysis.transparent-not-container',
            `\`transparent\` is a container word — \`${entity.name}\` is a ${kind}. A thing that shows what is inside it is \`a container, transparent\`.`,
            comp.span,
          );
          continue;
        }
        if (comp.condition !== null) {
          diagnostics.error(
            'analysis.transparent-conditional',
            `\`transparent\` is what \`${entity.name}\` is, not a state it changes — write it without \`while\`.`,
            comp.span,
          );
          continue;
        }
      }
      // ADR-373 D1/D4: `detachable` qualifies `attached to`, `fragile`
      // qualifies `breakable` — neither means anything alone.
      if (comp.name === 'detachable' && !entity.traits.some((t) => t.name === 'attached')) {
        diagnostics.error(
          'analysis.detachable-not-attached',
          `\`detachable\` says how \`${entity.name}\` comes free of what holds it — add \`attached to <the thing>\` beside it.`,
          comp.span,
        );
        continue;
      }
      if (comp.name === 'fragile' && !entity.traits.some((t) => t.name === 'breakable')) {
        diagnostics.error(
          'analysis.fragile-not-breakable',
          `\`fragile\` says \`${entity.name}\` breaks when dropped or thrown — add \`breakable\` beside it.`,
          comp.span,
        );
        continue;
      }
      // Census 14: conditional composition legality — room-`dark`, or a
      // declared trait whose clauses are ALL NPC-behavior-shaped (`on
      // every turn …`). `proper` has its own earlier gates (ADR-242 D1).
      if (comp.condition !== null && comp.name !== 'proper') {
        const def = traitDefs.get(comp.name);
        const npcShaped =
          def !== undefined && def.onClauses.length > 0 && def.onClauses.every((c) => c.binding === 'every-turn');
        if (!(comp.name === 'dark' && isRoom) && !npcShaped) {
          diagnostics.error(
            'analysis.conditional-composition-unsupported',
            `Conditional composition isn't supported for \`${comp.name}\` — move the condition inside the trait (\`on the player <action>\` clauses can test it) or split the behavior.`,
            comp.span,
          );
          continue;
        }
      }
      // Census 11: `dark` is room-only (the room builder consumes it).
      if (comp.name === 'dark' && !isRoom) {
        diagnostics.error('analysis.dark-rooms-only', '`dark` applies to rooms only.', comp.span);
        continue;
      }
      // Census 10 (ADR-276 Phase 6): the hiding-position domain is the
      // manifest's closed set (ratchet G3, one source with the loader).
      if (comp.name === 'hiding-spot') {
        const position = comp.config.find((c) => c.key === 'position')?.value;
        if (position !== undefined && !STDLIB_MANIFEST.hidingPositions.includes(position)) {
          const list = [...STDLIB_MANIFEST.hidingPositions];
          const listed = `${list.slice(0, -1).join(', ')}, or ${list[list.length - 1]}`;
          diagnostics.error(
            'analysis.unknown-hiding-position',
            `\`${position}\` is not a hiding position — use ${listed}.`,
            comp.span,
          );
        }
      }

      // Census 9: a `patrol` NPC needs a route. A route whose entries all
      // failed to resolve has already errored through the unknown-entity
      // gate — only a MISSING route reports here (an emptied list is
      // hand-built IR, refused where the behavior is built).
      if (comp.name === 'patrol' && !comp.config.some((c) => c.key === 'route')) {
        diagnostics.error(
          'analysis.patrol-needs-route',
          'A `patrol` NPC needs `with route [ … ]` naming its rooms.',
          comp.span,
        );
      }
      // ADR-372 D5: a price is a whole number in a currency some playable
      // character carries as a counter — the buyer's own purse.
      if (comp.name === 'costs') {
        const price = comp.config.find((c) => c.key === 'price');
        const currency = comp.config.find((c) => c.key === 'currency');
        if (price && !/^\d+$/.test(price.value)) {
          diagnostics.error(
            'analysis.costs-price',
            `\`costs ${price.value}\` — a price is a whole number of a currency, e.g. \`costs 3 credits\`.`,
            comp.span,
          );
        } else if (price && currency && !ir.entities.some((e) => e.isPlayable && e.counters.some((k) => k.name === currency.value))) {
          diagnostics.error(
            'analysis.costs-counter-unknown',
            `\`costs ${price.value} ${currency.value}\` on \`${entity.name}\` — no playable character carries a \`${currency.value}\` counter, so nothing could pay. Give the player character \`counter ${currency.value} starts <n>\`.`,
            comp.span,
          );
        }
      }
      // Census 15: neither a v1 adjective, nor extension vocabulary, nor
      // a declared `define trait`.
      if (!TRAIT_ADJECTIVES.has(comp.name) && !manifestForAdjective(comp.name) && !traitDefs.has(comp.name)) {
        diagnostics.error(
          'analysis.trait-not-declared',
          `Trait \`${comp.name}\` is not declared (\`define trait ${comp.name}\`) and is not a v1 adjective.`,
          comp.span,
        );
      }

      // Census 4/6 (ADR-276 Phase 5): setting value domains from the
      // manifest's schema slice. Extension traits run only when admitted —
      // buildEntity's extension gates own the `use`-missing case. The
      // number domain needs no check here: valueKind mismatch is already
      // `analysis.extension-config-value` (census 5 was pre-gated).
      const schema = STDLIB_MANIFEST.settingSchema[comp.name];
      if (schema) {
        const contributed = manifestForAdjective(comp.name);
        const admitted =
          !contributed || contributed.manifest.core || usedExtensions.has(contributed.manifest.name);
        if (admitted) {
          for (const cfg of comp.config) {
            // Keyless v1 entity ref (`lockable with the iron key`): the
            // parser stores it under the empty key; the schema's one
            // entity-ref entry supplies the message label.
            const label =
              cfg.key !== '' ? cfg.key : Object.keys(schema).find((k) => schema[k] === 'entity-ref') ?? cfg.key;
            const type = schema[label];
            if (type === 'boolean' && cfg.value !== 'true' && cfg.value !== 'false') {
              diagnostics.error(
                'analysis.setting-not-boolean',
                `\`${entity.name}\`: \`${label}\` takes \`true\` or \`false\`, got \`${cfg.value}\`.`,
                comp.span,
              );
            } else if (type === 'entity-ref' && cfg.valueKind === 'name' && !resolveConfigEntity(ir, cfg.value)) {
              diagnostics.error(
                'analysis.setting-names-no-entity',
                `\`${cfg.value}\` (config \`${label}\`) names no entity.`,
                comp.span,
              );
            }
          }
        }
      } else if (traitDefs.has(comp.name)) {
        // Census 6 (declared traits, IR-internal): a `with <key> <name>`
        // value resolves against the story's entities — mirroring the
        // loader's duck-typing on valueKind exactly (the declared field
        // type is not consulted; behavior parity over strictness).
        for (const cfg of comp.config) {
          if (cfg.valueKind === 'name' && !resolveConfigEntity(ir, cfg.value)) {
            diagnostics.error(
              'analysis.setting-names-no-entity',
              `\`${cfg.value}\` (config \`${cfg.key}\`) names no entity.`,
              comp.span,
            );
          }
        }
      }
    }

    // Census 12: what a character wears must be wearable — every wearer,
    // since the loader dresses NPCs and the role holder alike (ADR-327 D10).
    for (const wornId of entity.wears) {
      const worn = ir.entities.find((e) => e.id === wornId);
      if (worn && !worn.traits.some((t) => t.name === 'wearable')) {
        diagnostics.error(
          'analysis.worn-not-wearable',
          `\`${wornId}\` is worn by \`${entity.name}\` but is not wearable.`,
          worn.span,
        );
      }
    }
  }

  // Census 13: tool-gated gerunds (ADR-230 D3c) — exactly one
  // implementation. The Chord surfaces (entity clause, composed-trait
  // clause) are the only surfaces a Chord story has: the ADR-090
  // capability surface was reachable only through a TS hatch, and hatches
  // are gone (ADR-361), so both halves are decided here.
  // ADR-374 D6: only a listener hears — `after hearing` on anything else
  // would never fire.
  for (const entity of ir.entities) {
    if (entity.traits.some((t) => t.name === 'listener')) continue;
    for (const clause of entity.onClauses) {
      if (clause.action !== 'hearing' || clause.binding === 'every-turn') continue;
      diagnostics.error(
        'analysis.hearing-not-listener',
        `\`${entity.name}\` reacts to a sound but cannot hear one — add \`listener\` to it.`,
        clause.span,
      );
    }
  }

  const TOOL_GATED_GERUNDS = [
    { adjective: 'cuttable', gerund: 'cutting' },
    { adjective: 'diggable', gerund: 'digging' },
    { adjective: 'flammable', gerund: 'burning' }, // ADR-371 D2
  ] as const;
  const gerundSurface = (c: IROnClause, gerund: string): boolean =>
    c.clauseKind === 'on' && c.action === gerund && c.binding !== 'every-turn';
  for (const { adjective, gerund } of TOOL_GATED_GERUNDS) {
    for (const entity of ir.entities) {
      const site = entity.traits.find((t) => t.name === adjective);
      if (!site) continue;
      let surfaces = 0;
      if (entity.onClauses.some((c) => gerundSurface(c, gerund))) surfaces++;
      for (const comp of entity.traits) {
        const def = traitDefs.get(comp.name);
        if (def?.onClauses.some((c) => gerundSurface(c, gerund))) surfaces++;
      }
      if (surfaces > 1) {
        diagnostics.error(
          'analysis.gerund-implementation',
          `\`${entity.name}\` has ${surfaces} ${gerund} implementations — a ${adjective} entity registers exactly one (one \`on ${gerund} it\` clause or one capability behavior).`,
          site.span,
        );
      } else if (surfaces === 0) {
        diagnostics.error(
          'analysis.gerund-implementation',
          `\`${entity.name}\` is ${adjective} but registers no ${gerund} implementation — add \`on ${gerund} it:\` (or compose a trait that has one).`,
          site.span,
        );
      }
    }
  }

  // ADR-234 D3: a declared door no `through` exit line references is
  // unanswerable — its room pair could never resolve — so it is refused
  // here, over the IR's exits, the same hard class as a memberless region.
  const referencedDoors = new Set<string>();
  for (const owner of ir.entities) {
    for (const exit of owner.exits) {
      if (exit.via !== null && exit.via !== '') referencedDoors.add(exit.via);
    }
  }
  for (const door of ir.entities) {
    if (!door.kinds.some((k) => k.name === 'door') || referencedDoors.has(door.id)) continue;
    diagnostics.error(
      'analysis.door-unconnected',
      `Door \`${door.name}\` is never referenced by a \`through\` exit line — an unconnected door is unanswerable (its room pair could never resolve). Add \`<direction> to the <room> through the ${door.name}\` on a room.`,
      door.span,
    );
  }

  return [...diagnostics.all()];
}

/**
 * Resolve a trait-config entity NAME the way the loader's entityRefFor
 * does — display-name or `aka` alias, lowercased, first match — so the
 * census-6 compile gate is exactly as strict as the load check it fronts.
 */
function resolveConfigEntity(ir: StoryIR, name: string): boolean {
  const lower = name.toLowerCase();
  return ir.entities.some((e) => e.name.toLowerCase() === lower || e.aka.includes(lower));
}

/** `— did you mean \`x\`?` when a near match exists, else empty. */
function suggestText(input: string, candidates: string[]): string {
  const best = nearest(input, candidates);
  return best ? ` — did you mean \`${best}\`?` : '';
}

/**
 * The fix for `a thing` written beside another kind (ADR-359 D1).
 *
 * @param entityName the entity the block creates
 * @param kind the other kind noun (`container`)
 * @returns "a container is already a kind of thing; write `a container`",
 *   or for a room or region, which are not things, the plain instruction to
 *   keep one kind
 */
function thingWithKindMessage(entityName: string, kind: string): string {
  if (kind === 'room' || kind === 'region') {
    return `\`${entityName}\`: a ${kind} is not a thing — write \`a ${kind}\` alone.`;
  }
  return `\`${entityName}\`: a ${kind} is already a kind of thing; write \`a ${kind}\`.`;
}
