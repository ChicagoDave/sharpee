/**
 * dotted-phrase-keys.test.ts — ADR-230 D5: `phrase-key = WORD { "." WORD }`
 * (the EBNF) is honored by the parser. Previously the parser silently
 * registered only the first dot segment (`define phrase
 * if.action.taking.fixed_in_place` registered key `if`), which made
 * story-wide overrides of platform message ids impossible in Chord.
 * Registration is the whole feature: extendLanguage puts the story phrase
 * into the same flat message map every template renders from, and story
 * registration wins over the platform default (resolution path verified
 * already wired — plan research finding 2).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const STORY = `story "Dots" by "T"
  id: dots
  version: 0.0.1

create the Shed
  a room

  A shed.

create the player
  starts in the Shed

  You.

define phrase if.action.taking.fixed_in_place
  It won't budge, not for you.
end phrase

define phrase plain-key
  A plain one.
end phrase
`;

describe('dotted phrase keys (ADR-230 D5)', () => {
  it('registers the FULL dotted key, not the first segment', () => {
    const story = createStory(compileSource(STORY), { seed: 11 });
    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);

    // THE assertion: the whole dotted id — a story-wide platform override.
    expect(registered.get('if.action.taking.fixed_in_place')).toContain("won't budge");
    // The old bug registered the first segment; that must be gone.
    expect(registered.has('if')).toBe(false);
    // Plain keys unaffected.
    expect(registered.get('plain-key')).toContain('plain one');
  });
});
