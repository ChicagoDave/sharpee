/**
 * action-about-rows.test.ts — a `define action`'s `about` rows (ADR-383 D9):
 * parsed with the topic table's row form, lowered to `IRActionDef.topics`
 * with the topic table's checks, keyed under the action. Rows need a topic
 * slot; a topic slot needs no rows. Rows are behavior, so an `extend action`
 * and a grammar file refuse them, and a row body is an action body, so the
 * conversation-only statements stay refused there.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';
const WORLD =
  'create the Chapel\n  a room\n\n  A chapel.\n\ncreate the altar\n  a thing\n  in the Chapel\n\n  A stone altar.\n\n' +
  'create Alex\n  a person\n  playable\n  starts in the Chapel\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n';
const PHRASES = '\n  phrases en-US\n    knelt:\n      You kneel.\n    prayed:\n      You pray.\n    unheard:\n      Nothing.\n\n';

const praying = (lines: string) =>
  `${HEADER}define action praying\n  grammar\n    pray about the subject\n${lines}  otherwise refuse unheard\n${PHRASES}${WORLD}`;

const errorsOf = (source: string) => compile(source).diagnostics.filter((d) => d.severity === 'error');
const codesOf = (source: string) => errorsOf(source).map((d) => d.code);

describe('about rows on a define action (ADR-383 D9)', () => {
  it('lower to IRActionDef.topics: an entity row, a quoted row with its aliases, in written order', () => {
    const result = compile(
      praying('  the subject is a topic\n  about the altar:\n    phrase knelt\n  about "rain", "the harvest": phrase prayed\n'),
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const action = result.ir!.actions.find((a) => a.name === 'praying')!;
    expect(action.topics?.map((row) => row.filter)).toEqual([
      { kind: 'entity', id: 'altar' },
      { kind: 'text', primary: 'rain', aliases: ['the harvest'] },
    ]);
    expect(action.topics?.every((row) => row.body.length === 1)).toBe(true);
    expect(action.otherwise).toBe('unheard');
  });

  it("a row body's select keys its occurrence counter under the action, by IR row index", () => {
    const result = compile(
      praying(
        '  the subject is a topic\n  about "storms":\n    phrase knelt\n  about "rain":\n    select cycling\n      phrase knelt\n    or\n      phrase prayed\n    end select\n',
      ),
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const select = result.ir!.actions.find((a) => a.name === 'praying')!.topics![1].body[0];
    expect(select).toMatchObject({ kind: 'select-strategy', id: 'action.praying.topic.row-1.0' });
  });

  it('a topic slot with no rows compiles, and the IR carries no topics field', () => {
    const result = compile(praying('  the subject is a topic\n'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir!.actions.find((a) => a.name === 'praying')!.topics).toBeUndefined();
  });

  it('rows on an action with no topic slot are analysis.about-without-topic', () => {
    const errors = errorsOf(praying('  about "rain":\n    phrase prayed\n'));
    const error = errors.find((d) => d.code === 'analysis.about-without-topic');
    expect(error, errors.map((d) => d.code).join(' | ')).toBeDefined();
    expect(error!.message).toContain('`praying`');
    expect(error!.message).toContain('is a topic');
  });

  it('a spelling written twice, alias included, is analysis.duplicate-topic', () => {
    expect(codesOf(praying('  the subject is a topic\n  about "rain":\n    phrase prayed\n  about "storms", "rain":\n    phrase knelt\n'))).toContain(
      'analysis.duplicate-topic',
    );
  });

  it('an entity written twice is analysis.duplicate-topic', () => {
    expect(codesOf(praying('  the subject is a topic\n  about the altar:\n    phrase prayed\n  about the altar:\n    phrase knelt\n'))).toContain(
      'analysis.duplicate-topic',
    );
  });

  it("a quoted row spelling an entity row's name is analysis.topic-entity-collision", () => {
    expect(codesOf(praying('  the subject is a topic\n  about the altar:\n    phrase prayed\n  about "altar":\n    phrase knelt\n'))).toContain(
      'analysis.topic-entity-collision',
    );
  });

  it('a row body is an action body: `deflect to` is refused there', () => {
    expect(codesOf(praying('  the subject is a topic\n  about "rain":\n    deflect to "the weather"\n'))).toContain('parse.deflect-context');
  });

  it('an extend action carrying a row is analysis.alteration-behavior', () => {
    const source = `${HEADER}extend action asking\n  grammar\n    beseech the recipient about the topic\n  about "rain":\n    phrase prayed\n${PHRASES.replace('\n  phrases', 'define phrases').replace(/^  /gm, '')}${WORLD}`;
    const error = errorsOf(source).find((d) => d.code === 'analysis.alteration-behavior');
    expect(error, errorsOf(source).map((d) => d.code).join(' | ')).toBeDefined();
    expect(error!.message).toContain('`about` row');
  });
});
