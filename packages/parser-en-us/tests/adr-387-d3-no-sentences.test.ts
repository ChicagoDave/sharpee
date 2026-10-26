/**
 * adr-387-d3-no-sentences.test.ts — the parser builds no English sentence
 * (ADR-387 D3).
 *
 * A parse error carries a message id and its params and nothing a player
 * reads; the language owns the wording. The structural half greps the
 * parser's source for a quote-delimited sentence (a capital, a space, a
 * final `.` or `?`) outside the generated grammar.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { WorldModel, EntityType, ActorTrait, ContainerTrait, LockableTrait, OpenableTrait, DoorTrait, IdentityTrait } from '@sharpee/world-model';

const SRC = join(__dirname, '..', 'src');
const GENERATED = ['grammar.ts'];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.ts$/.test(entry) && !GENERATED.includes(relative(SRC, full))) out.push(full);
  }
  return out;
}

/** A quoted sentence: opens with a capital letter, holds a space, ends in `.` or `?`. */
const SENTENCE = /"[A-Z][^"\n]* [^"\n]*[.?]"|'[A-Z][^'\n]* [^'\n]*[.?]'|`[A-Z][^`\n]* [^`\n]*[.?]`/;

function parserOverDoor() {
  const provider = new EnglishLanguageProvider();
  const parser = new EnglishParser(provider);
  const world = new WorldModel();
  world.setLanguageWords(provider.getLanguageWords());
  const room = world.createEntity('Hall', EntityType.ROOM);
  const player = world.createEntity('you', EntityType.ACTOR);
  player.add(new ActorTrait());
  player.add(new ContainerTrait());
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);
  const door = world.createEntity('oak door', EntityType.DOOR);
  door.add(new IdentityTrait({ name: 'oak door', aliases: ['door'] }));
  door.add(new DoorTrait({ room1: room.id, room2: room.id }));
  door.add(new OpenableTrait());
  door.add(new LockableTrait({ isLocked: true }));
  world.moveEntity(door.id, room.id);
  const key = world.createEntity('brass key', EntityType.ITEM);
  key.add(new IdentityTrait({ name: 'brass key', aliases: ['key'] }));
  world.moveEntity(key.id, player.id);
  parser.setWorldContext(world, player.id, room.id);
  return parser;
}

describe('ADR-387 D3: the parser builds no sentence', () => {
  it('holds no quote-delimited sentence in its source outside the generated grammar', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      // Comments and console diagnostics are a developer's words, not a player's
      const text = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^[ \t]*\/\/.*$/gm, '')
        .replace(/console\.\w+\([\s\S]*?\);/g, '');
      const hit = SENTENCE.exec(text);
      if (hit) offenders.push(`${relative(SRC, file)}: ${hit[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('a missing indirect object carries the id and the verb, and no message', () => {
    const result = parserOverDoor().parse('unlock door with');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.messageId).toBe('parser.error.missingIndirect');
    expect(result.error.params).toMatchObject({ verb: 'unlock' });
    expect('message' in result.error).toBe(false);
  });

  it('a bare verb, an unknown verb and an empty line each carry their id and params', () => {
    const parser = parserOverDoor();
    const bare = parser.parse('take');
    expect(!bare.success && bare.error.messageId).toBe('parser.error.missingObject');
    expect(!bare.success && bare.error.params).toEqual({ verb: 'take' });
    const unknown = parser.parse('frobnicate the door');
    expect(!unknown.success && unknown.error.messageId).toBe('parser.error.unknownVerb');
    expect(!unknown.success && unknown.error.params).toEqual({ verb: 'frobnicate' });
    // An empty line reaches the unknown-verb branch with nothing to name, as
    // it did when the parser worded it ("I don't understand that sentence.")
    const empty = parser.parse('');
    expect(!empty.success && empty.error.messageId).toBe('parser.error.unknownVerb.noVerb');
    expect(!empty.success && empty.error.params).toEqual({});
  });

  it('a phrase naming nothing at a constrained slot carries the id and the content words', () => {
    const parser = parserOverDoor();
    parser.getStoryGrammar().define('wind :target').where('target', (s) => s.carried()).mapsTo('story.winding').build();
    const result = parser.parse('wind the widget');
    expect(!result.success && result.error.messageId).toBe('parser.error.entityNotFound');
    expect(!result.success && result.error.params).toMatchObject({ verb: 'wind', noun: 'widget' });
  });
});
