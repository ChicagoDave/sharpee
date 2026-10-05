/**
 * compositions.ts — the block's composition line: kind nouns (`a room`),
 * trait adjectives (`lockable`, `dark while …`), personality adjectives,
 * and a cognitive profile.
 *
 * The reserved bare word `playable` is consumed first, so it never reaches
 * vocabulary. A `cognitive-profile` composition compiles into character
 * data, as does a bare composition that reads as a personality adjective;
 * consumed words never enter parser vocabulary. What remains is a kind
 * (with an article) or a trait (without), each with its `with` config,
 * list values resolved to entity ids, and its `while` condition resolved in
 * the entity's scope. Extension vocabulary is admitted only under its
 * `use`, and its config keys and value kinds are the manifest's closed set;
 * `[ … ]` list values exist only as manifest list fields. Every block names
 * exactly one kind, and it leads the block.
 *
 * Public interface: compositionsBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-327 D10 — `playable` is a reserved bare composition.
 * - ADR-310 D2/D4 — personality adjectives and `cognitive-profile` compile to character data.
 * - ADR-215 — extension vocabulary, `use` gating, and the typed config set.
 */
import type { CreateDecl } from '../../ast.js';
import { KIND_NOUNS } from '../../catalog.js';
import type { IRPersonalityEntry } from '../../ir.js';
import { manifestForAdjective } from '../../manifests/index.js';
import type { EntityBuildContext, EntityLineBuilder } from './context.js';

export const compositionsBuilder: EntityLineBuilder = {
  name: 'compositions',
  requires: [],
  build(decl, entity, context) {
    const { isPerson, scope } = entity;
    const { kinds, traits, personality } = entity;
    let profile: Record<string, string> | undefined;
    let sawProfileLine = false;
    for (const comp of decl.compositions) {
      // ADR-327 D10: `playable` is a reserved bare composition. Consumed here,
      // ahead of profile/personality/trait routing, so the word never enters
      // parser vocabulary and never reaches the unknown-trait census gate.
      if (!comp.article && comp.words.length === 1 && comp.words[0].toLowerCase() === 'playable') {
        continue;
      }
      // ADR-310 D4: `cognitive-profile <name> [with …]` rides the
      // composition grammar and compiles into character data.
      if (!comp.article && comp.words[0]?.toLowerCase() === 'cognitive-profile') {
        const built = context.routeProfileComposition(comp, isPerson, decl.name.words.join(' '), sawProfileLine);
        sawProfileLine = true;
        if (built) profile = built;
        continue;
      }
      // ADR-310 D2: a bare composition that reads as a personality
      // adjective (`very honest`, `cowardly`) compiles into character data.
      // Consumed words never reach trait composition, so they never enter
      // parser vocabulary (the D2 no-parser-vocabulary rule) and never hit
      // the census-15 unknown-trait gate.
      if (!comp.article && context.routeCharacterComposition(comp, isPerson, decl.name.words.join(' '), personality)) {
        continue;
      }
      const built = {
        name: comp.words.join(' ').toLowerCase(),
        config: comp.config.map((c) => ({
          key: c.key.join(' '),
          value: c.value,
          valueKind: c.valueKind,
          // `[ … ]` list entries resolve to entity IDs here (ADR-215) —
          // unresolved names report through the standard unknown-entity gate.
          ...(c.valueKind === 'list'
            ? { values: (c.listValues ?? []).map((ref) => context.resolveEntityId(ref) ?? '').filter((id) => id !== '') }
            : {}),
        })),
        condition: comp.condition ? context.resolveCondition(comp.condition, scope) : null,
        span: comp.span,
      };
      if (comp.article) kinds.push(built);
      else traits.push(built);

      // ADR-215: extension vocabulary is admitted only when its `use` is
      // declared (core manifests — npc — are always admitted), and its
      // `with`-fields are the manifest's closed, typed set — unknown keys
      // and mistyped values are compile errors, never a silent drop at the
      // loader. `[ … ]` list values exist only as manifest list fields.
      if (!comp.article) {
        const contributed = manifestForAdjective(built.name);
        if (!contributed) {
          for (const cfg of comp.config) {
            if (cfg.valueKind === 'list') {
              context.diagnostics.error(
                'analysis.config-list-host',
                `\`[ … ]\` list values belong to extension fields that declare them (e.g. \`patrol route [ … ]\`) — \`${built.name}\` has none.`,
                cfg.span,
              );
            }
          }
        }
        if (contributed) {
          if (!contributed.manifest.core && !context.usedExtensions.has(contributed.manifest.name)) {
            context.diagnostics.error(
              'analysis.extension-not-used',
              `\`${built.name}\` is \`${contributed.manifest.name}\` extension vocabulary — add \`use ${contributed.manifest.name}\` to the story header.`,
              comp.span,
            );
          } else {
            for (const cfg of comp.config) {
              const key = cfg.key.join(' ');
              const field = contributed.adjective.fields.find((f) => f.key === key);
              if (!field) {
                const known = contributed.adjective.fields.map((f) => f.key).join(', ');
                context.diagnostics.error(
                  'analysis.extension-config-key',
                  `\`${key}\` is not a \`${built.name}\` field — known fields: ${known}.`,
                  cfg.span,
                );
              } else if (field.valueKind !== cfg.valueKind) {
                context.diagnostics.error(
                  'analysis.extension-config-value',
                  `\`${key}\` takes a ${field.valueKind} value, not ${cfg.valueKind === 'name' ? 'an entity name' : `a ${cfg.valueKind}`}.`,
                  cfg.span,
                );
              }
            }
          }
        }
      }
    }

    checkKindLine(decl, context);
    entity.profile = profile;
  },
};

/**
 * Every block names its kind, and the kind leads the block: it is the first
 * item of the first composition line. A kind noun written bare already has
 * its own diagnostic (the composition-legality pass), so it does not also
 * report as missing.
 *
 * References:
 * - ADR-359 D1 — `analysis.missing-kind-noun`; kind-first in the block (clarified 2026-10-05).
 */
function checkKindLine(decl: CreateDecl, context: EntityBuildContext): void {
  const name = decl.name.words.join(' ');
  const kindIndex = decl.compositions.findIndex((c) => c.article !== null);
  if (kindIndex === -1) {
    const bareKind = decl.compositions.some((c) => KIND_NOUNS.has(c.words.join(' ').toLowerCase()));
    if (bareKind) return;
    context.diagnostics.error(
      'analysis.missing-kind-noun',
      `\`${name}\` names no kind. Begin its block with one: \`a room\`, \`a door\`, \`a person\`, \`a container\`, \`a supporter\`, \`a region\`, or \`a thing\` for anything that is not a room, door, person, container, supporter or region.`,
      decl.name.span,
    );
    return;
  }
  if (kindIndex > 0) {
    const kind = decl.compositions[kindIndex];
    context.diagnostics.error(
      'analysis.kind-not-first',
      `\`${name}\`: the kind leads the block — move \`${kind.article} ${kind.words.join(' ')}\` to the front of the first composition line.`,
      kind.span,
    );
  }
}
