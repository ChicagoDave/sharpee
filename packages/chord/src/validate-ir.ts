/**
 * validate-ir.ts — the Story IR's own invariants, checked once over the
 * finished IR: the targets and shapes of grammar alterations, the `use`
 * line every extension's construct and word needs, kind nouns and the
 * block that names none, composition and trait adjectives with their
 * settings, exits on a non-room, worn items, tool-gated gerunds, listeners,
 * conditional deadly exits, and every door's connection. Each is a fact of
 * the IR alone — no AST, no analyzer state —
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
import { manifestForAdjective, manifestForKindNoun, manifestForMovementType } from './manifests/index.js';
import { lowerParts, renderPattern, samePatternShape } from './patterns.js';
import type { Span } from './span.js';
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

  // ADR-261 D4, ADR-330 D1, ADR-376 D1, ADR-375 D1: a `use`-gated construct
  // is admitted only under its `use` line, and is never silently dead. The
  // declarations are read where they lie; the words inside clause bodies —
  // an `award`, a chapter condition, a sight read, a visibility write, a
  // `comes into sight` step — are found by one walk of the lowered tree,
  // each reported at the nearest enclosing span. One report per construct
  // kind for scoring, as the analyzer always gave.
  if (!usedExtensions.has('scoring')) {
    if (ir.scores.length > 0) {
      diagnostics.error(
        'analysis.scoring-needs-use',
        'A `score … worth N` line needs `use scoring` in the story header — without it the game has no score at all, and SCORE says so.',
        ir.scores[0].span,
      );
    }
    if (ir.ranks.length > 0) {
      diagnostics.error(
        'analysis.scoring-needs-use',
        'A `rank` rung needs `use scoring` in the story header — without it the game has no score at all, and SCORE says so.',
        ir.ranks[0].span,
      );
    }
  }
  if ((ir.chapters ?? []).length > 0 && !usedExtensions.has('chapters')) {
    diagnostics.error(
      'analysis.chapters-needs-use',
      'A `define chapters` block needs `use chapters` in the story header — chapters are an extension, on precisely when the header says so.',
      ir.chapters![0].span,
    );
  }
  let awardReported = false;
  for (const site of irNodes(ir, undefined)) {
    const kind = stringField(site.node, 'kind');
    const at = site.span ?? HEADER_SPAN;
    if (kind === 'award') {
      if (!usedExtensions.has('scoring') && !awardReported) {
        awardReported = true;
        diagnostics.error(
          'analysis.scoring-needs-use',
          'An `award` statement needs `use scoring` in the story header — without it the game has no score at all, and SCORE says so.',
          at,
        );
      }
    } else if (kind === 'chapter' && stringField(site.node, 'relation') !== undefined) {
      if (!usedExtensions.has('chapters')) {
        diagnostics.error(
          'analysis.chapters-needs-use',
          `\`${stringField(site.node, 'relation')} <chapter>\` reads a chapter — add \`use chapters\` and a \`define chapters\` block to the story.`,
          at,
        );
      }
    } else {
      if (!usedExtensions.has('expanses')) {
        // ADR-376 D6, D7: the sight reads, the visibility write and the
        // `comes into sight` step anchor (an `{ owner, state }` pair).
        const word =
          kind === 'in-sight'
            ? 'is in sight'
            : kind === 'sight-band'
              ? `is ${(stringField(site.node, 'band') ?? '').replace(/-/g, ' ')}`
              : kind === 'expanse-visibility'
                ? 'set … visibility'
                : kind === undefined && stringField(site.node, 'state') === 'in sight' && stringField(site.node, 'owner') !== undefined
                  ? 'comes into sight'
                  : null;
        if (word !== null) {
          diagnostics.error(
            'analysis.expanses-needs-use',
            `\`${word}\` is \`use expanses\` vocabulary — add \`use expanses\` to the story header.`,
            at,
          );
        }
      }
      if (!usedExtensions.has('sailing')) {
        // ADR-375 D2, D4, D5, D7: the wind and sails writes, a bearing on a
        // start or a heading read, `in irons` and the sails read. The sails
        // kind names a statement (it carries `stmtWhen`) or a condition.
        const hasBearing = numberField(site.node, 'bearing') !== undefined;
        const word =
          kind === 'expanse-wind'
            ? 'set … wind'
            : kind === 'vehicle-sails'
              ? hasOwnField(site.node, 'stmtWhen')
                ? 'set … sails'
                : 'sails are <setting>'
              : kind === 'vehicle-start' && hasBearing
                ? 'heading <n> degrees'
                : kind === 'vehicle-heading' && hasBearing
                  ? 'is heading <n> degrees'
                  : kind === 'in-irons'
                    ? 'is in irons'
                    : null;
        if (word !== null) {
          diagnostics.error(
            'analysis.sailing-needs-use',
            `\`${word}\` is \`use sailing\` vocabulary — add \`use sailing\` to the story header.`,
            at,
          );
        }
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

    // ADR-359 D1: every block names its kind. A kind noun written bare is
    // named as such below, so it does not also report as missing.
    if (entity.kinds.length === 0 && !entity.traits.some((t) => KIND_NOUNS.has(t.name))) {
      diagnostics.error(
        'analysis.missing-kind-noun',
        `\`${entity.name}\` names no kind. Begin its block with one: \`a room\`, \`a door\`, \`a person\`, \`a container\`, \`a supporter\`, \`a region\`, or \`a thing\` for anything that is not a room, door, person, container, supporter or region.`,
        entity.span,
      );
    }

    // ADR-366 D12, ADR-376 D1, ADR-375 D1: an extension's words on an
    // entity are admitted only under its `use` line — the movement type,
    // the expanse's lines and placement, the sailing lines. One report per
    // entity and extension; `an expanse` itself reported with the kinds.
    const movementManifest = entity.vehicle ? manifestForMovementType(entity.vehicle.movement) : null;
    if (entity.vehicle && movementManifest && !movementManifest.core && !usedExtensions.has(movementManifest.name)) {
      diagnostics.error(
        `analysis.${movementManifest.name}-needs-use`,
        `\`movement: ${entity.vehicle.movement}\` is \`use ${movementManifest.name}\` vocabulary — add \`use ${movementManifest.name}\` to the story header.`,
        entity.span,
      );
    }
    const isExpanse = entity.kinds.some((k) => k.name === 'expanse');
    const expansesNamed = isExpanse || movementManifest?.name === 'expanses';
    const writesExpanses =
      entity.expanse !== undefined ||
      entity.sight !== undefined ||
      entity.seenFromAfar !== undefined ||
      entity.placement?.at !== undefined;
    if (!usedExtensions.has('expanses') && writesExpanses && !expansesNamed) {
      diagnostics.error(
        'analysis.expanses-needs-use',
        `\`${entity.name}\` writes \`use expanses\` vocabulary — add \`use expanses\` to the story header.`,
        entity.span,
      );
    }
    const writesSailing =
      entity.expanse?.wind !== undefined ||
      entity.vehicle?.sailing !== undefined ||
      entity.vehicle?.sails !== undefined ||
      (entity.vehicle?.commands ?? []).includes('naval');
    if (!usedExtensions.has('sailing') && writesSailing) {
      diagnostics.error(
        'analysis.sailing-needs-use',
        `\`${entity.name}\` writes \`use sailing\` vocabulary — add \`use sailing\` to the story header.`,
        entity.span,
      );
    }

    // ADR-289 D6: exits leave a room. An expanse's blocked-exit lines are
    // its edges (ADR-376 D8), read as such by the expanse builder.
    const isRoom = entity.kinds.some((k) => k.name === 'room');
    if (!isRoom) {
      const stray = entity.exits[0] ?? (isExpanse ? undefined : entity.blockedExits[0]) ?? entity.deadlyExits[0];
      if (stray) {
        diagnostics.error(
          'analysis.exit-non-room',
          `Exits belong to rooms — \`${entity.name}\` is not a room. Remove the line, or make this block \`a room\`.`,
          stray.span,
        );
      }
    }

    // ADR-215: extension vocabulary is admitted only under its `use` line
    // (core manifests — npc — always), and its `with`-fields are the
    // manifest's closed, typed set — an unknown key or a mistyped value is
    // refused here, never dropped at the loader. `[ … ]` list values exist
    // only as manifest list fields.
    for (const comp of entity.traits) {
      const contributed = manifestForAdjective(comp.name);
      if (!contributed) {
        for (const cfg of comp.config) {
          if (cfg.valueKind === 'list') {
            diagnostics.error(
              'analysis.config-list-host',
              `\`[ … ]\` list values belong to extension fields that declare them (e.g. \`patrol route [ … ]\`) — \`${comp.name}\` has none.`,
              comp.span,
            );
          }
        }
        continue;
      }
      if (!contributed.manifest.core && !usedExtensions.has(contributed.manifest.name)) {
        diagnostics.error(
          'analysis.extension-not-used',
          `\`${comp.name}\` is \`${contributed.manifest.name}\` extension vocabulary — add \`use ${contributed.manifest.name}\` to the story header.`,
          comp.span,
        );
        continue;
      }
      for (const cfg of comp.config) {
        const field = contributed.adjective.fields.find((f) => f.key === cfg.key);
        if (!field) {
          const known = contributed.adjective.fields.map((f) => f.key).join(', ');
          diagnostics.error(
            'analysis.extension-config-key',
            `\`${cfg.key}\` is not a \`${comp.name}\` field — known fields: ${known}.`,
            comp.span,
          );
        } else if (field.valueKind !== cfg.valueKind) {
          diagnostics.error(
            'analysis.extension-config-value',
            `\`${cfg.key}\` takes a ${field.valueKind} value, not ${cfg.valueKind === 'name' ? 'an entity name' : `a ${cfg.valueKind}`}.`,
            comp.span,
          );
        }
      }
    }

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
      // the extension gate above owns the `use`-missing case. The
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
/** The span the header occupies: the site of a diagnostic on a node with no enclosing span. */
const HEADER_SPAN: Span = { line: 1, column: 1, endLine: 1, endColumn: 1 };

/** A node of the lowered tree, with the span of the nearest enclosing node that carries one. */
interface IRNodeSite {
  readonly node: object;
  readonly span: Span | undefined;
}

/**
 * Walk every object in the lowered IR, depth first, carrying the nearest
 * enclosing span down to the nodes — conditions carry none of their own.
 * @param root the node to start from (the IR, or any node inside it)
 * @param enclosing the span of the nearest ancestor that carries one
 */
function* irNodes(root: object, enclosing: Span | undefined): Generator<IRNodeSite> {
  const own =
    'span' in root && typeof root.span === 'object' && root.span !== null && 'line' in root.span && typeof root.span.line === 'number'
      ? (root.span as Span)
      : enclosing;
  yield { node: root, span: own };
  const children: ReadonlyArray<object | string | number | boolean | null | undefined> = Object.values(root);
  for (const child of children) {
    if (typeof child === 'object' && child !== null) yield* irNodes(child, own);
  }
}

/** A string-valued field of a node, or undefined when absent or not a string. */
function stringField(node: object, key: string): string | undefined {
  const value: object | string | number | boolean | null | undefined = Object.getOwnPropertyDescriptor(node, key)?.value;
  return typeof value === 'string' ? value : undefined;
}

/** A number-valued field of a node, or undefined when absent or not a number. */
function numberField(node: object, key: string): number | undefined {
  const value: object | string | number | boolean | null | undefined = Object.getOwnPropertyDescriptor(node, key)?.value;
  return typeof value === 'number' ? value : undefined;
}

/** True when the node carries the field at all, whatever its value (a statement's `stmtWhen` may be null). */
function hasOwnField(node: object, key: string): boolean {
  return Object.getOwnPropertyDescriptor(node, key) !== undefined;
}

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
