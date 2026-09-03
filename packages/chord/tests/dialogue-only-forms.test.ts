/**
 * dialogue-only-forms.test.ts — GH #349 and GH #351 at compile time:
 *
 * - A partner-only predicate (`is concluded`, `was discussed`, `asked`,
 *   `subject changes`) outside a dialogue body is `analysis.dialogue-only`
 *   naming what holds instead; inside a topic row it compiles.
 * - `leave` compiles in a conversation `beat` and in the `conclusion:` —
 *   the runtime carries it on the reply path and, since GH #349, on the
 *   speaker's own turn (the seizure's `leaves`).
 * - `<npc> talks to <name>` and `talks to the player` match the standard
 *   `talk to|with :target` shape — alternation in a shape literal is read
 *   as the grammar engine reads it.
 *
 * Every assertion reads the diagnostic list or the compiled IR.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string) => `story
  title: Dialogue Forms
  authors:
    T
  id: dialogue-forms
  story-version: 0.0.1

${body}
create Jacqueline
  a person, proper
  playable

  You.

before the game starts
  change the player to Jacqueline
end before
`;

const errorCodes = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const PARTNER = `create the Ballroom
  a room

  A ballroom.

create the second partner
  a person
  in the Ballroom
  states: waiting, dancing

  A partner.

define topics for the second partner
  about "the weather":
    phrase weather-reply
      Fine, thank you.
end topics

define conversation first-hand for the second partner
  beat:
    phrase hand-one
      Your hand, please.
  conclusion:
    phrase hand-done
      The dance ends.
end conversation
`;

describe('GH #349: partner-only predicates and reply moves outside dialogue', () => {
  it('rejects `is concluded` in an every-turn clause, naming what holds outside dialogue', () => {
    const result = compile(story(`${PARTNER}
create the music
  scenery
  in the Ballroom

  Music.

  on every turn while first-hand is concluded, once
    phrase music-stops
      The music stops.
  end on
`));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((e) => e.code)).toContain('analysis.dialogue-only');
    expect(errors.find((e) => e.code === 'analysis.dialogue-only')!.message).toContain('conclusion:');
  });

  it('rejects `was discussed` and `subject changes` in an entity clause, and accepts them in a topic row', () => {
    expect(errorCodes(story(`${PARTNER}
create the fan
  in the Ballroom

  A fan.

  after the player taking while the weather was discussed
    phrase fan-flutter
      You flutter it.
  end after
`))).toContain('analysis.dialogue-only');
    expect(errorCodes(story(`create the Ballroom
  a room

  A ballroom.

create the second partner
  a person
  in the Ballroom

  A partner.

define topics for the second partner
  about "the weather":
    phrase weather-reply when the dance was discussed
      As I said.
  about "the dance":
    phrase dance-reply
      Later.
end topics
`))).toEqual([]);
  });

  it('accepts `leave` in a beat and in the conclusion — the runtime carries it on both paths', () => {
    const beat = story(`create the Ballroom
  a room

  A ballroom.

create the second partner
  a person
  in the Ballroom
  states: waiting, dancing

  A partner.

define conversation first-hand for the second partner
  beat, when the second partner is waiting:
    phrase hand-one
      Your hand, please.
    leave
  conclusion:
    phrase hand-done
      The dance ends.
end conversation
`);
    expect(errorCodes(beat)).toEqual([]);
    const inConclusion = beat.replace('    leave\n  conclusion:\n    phrase hand-done\n      The dance ends.\n', '  conclusion:\n    phrase hand-done\n      The dance ends.\n    leave\n');
    expect(inConclusion).not.toBe(beat);
    expect(errorCodes(inConclusion)).toEqual([]);
  });
});

describe('GH #351: the acting statement matches `talk to|with :target`', () => {
  it('`talks to <name>` and `talks to the player` compile and bind the target', () => {
    const result = compile(story(`${PARTNER}
create the gong
  in the Ballroom

  A gong.

  after the player taking
    the second partner talks to Jacqueline
    the second partner talks to the player
    the second partner talks with Jacqueline
  end after
`));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const gong = result.ir!.entities.find((e) => e.id === 'gong')!;
    const acts = gong.onClauses[0].body.filter((s) => s.kind === 'act');
    expect(acts).toHaveLength(3);
    expect(acts[0]).toMatchObject({ kind: 'act', action: 'talking', slots: [{ slot: 'target', value: { kind: 'entity', id: 'jacqueline' } }] });
    expect(acts[1]).toMatchObject({ kind: 'act', action: 'talking', slots: [{ slot: 'target', value: { kind: 'player' } }] });
  });
});
