/**
 * formatting.test.ts — loader mapping of the 2026-07-10 grammar-log
 * formatting constructs: `{br}` → hard line break, `\n\n` paragraphs,
 * `verbatim` phrases, plus the per-action interceptor dispatch fix
 * (two entities with `on <action> it` clauses must both keep working).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { IdentityTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join('; '));
  return result.ir;
}

const FMT_STORY = `story "Format" by "Nobody"
  id: format
  version: 0.0.1

create the Hall
  a room

  First paragraph of the hall.

  Second paragraph of the hall.

create the player
  starts in the Hall

  Fine.

create the plaque
  in the Hall
  scenery

  on reading it
    phrase verse
  end on

create the map
  in the Hall
  scenery

  on reading it
    phrase chart
  end on

define phrase chart, verbatim
      N
    W + E
      S
end phrase

define phrases en-US
  verse:
    Line one.{br}
    Line two.
`;

function load() {
  const story = createStory(compileSource(FMT_STORY));
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

function readTarget(story: ChordStory, world: WorldModel, playerId: string, irId: string) {
  const target = world.getEntity(story.entityId(irId)!)!;
  const lookup = world.getInterceptorForAction(target, 'if.action.reading');
  expect(lookup, `interceptor bound for ${irId}`).toBeDefined();
  const data = {};
  lookup!.interceptor.preValidate!(target, world, playerId, data);
  lookup!.interceptor.postValidate!(target, world, playerId, data);
  lookup!.interceptor.postExecute!(target, world, playerId, data);
  return lookup!.interceptor.postReport!(target, world, playerId, data);
}

describe('per-action interceptor dispatch (two on-reading entities)', () => {
  it('routes each target to its own clause — the second registration must not clobber the first', () => {
    const { story, world, playerId } = load();
    const plaque = readTarget(story, world, playerId, 'plaque');
    expect(plaque.override).toMatchObject({ messageId: 'verse' });
    const map = readTarget(story, world, playerId, 'map');
    expect(map.override).toMatchObject({ messageId: 'chart' });
  });
});

describe('{br} and paragraph mapping', () => {
  it('registers single-variant {br} phrases with a hard line break', () => {
    const { story } = load();
    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);
    expect(registered.get('verse')).toBe('Line one.\nLine two.');
  });

  it('writes multi-paragraph descriptions with \\n\\n into the identity trait', () => {
    const { story, world } = load();
    const hall = world.getEntity(story.entityId('hall')!)!;
    const identity = hall.get(TraitType.IDENTITY) as IdentityTrait;
    expect(identity.description).toBe('First paragraph of the hall.\n\nSecond paragraph of the hall.');
  });
});

describe('verbatim phrases', () => {
  it('registers the {verbatim:text} template and supplies the exact text at emit', () => {
    const { story, world, playerId } = load();
    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);
    expect(registered.get('chart')).toBe('{verbatim:text}');

    const result = readTarget(story, world, playerId, 'map');
    expect(result.override).toMatchObject({ messageId: 'chart' });
    // Common leading indent (4 here) is stripped; relative indent survives.
    expect((result.override!.params as Record<string, unknown>).text).toBe('  N\nW + E\n  S');
  });
});
