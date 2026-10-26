/**
 * @file direction-lines.test.ts
 * @description The climbing, throwing and going lines that name a direction
 *   receive the parser's `Direction` constant from stdlib and render it as
 *   its English word here (alignment ledger F24, F25).
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { RenderContext } from '@sharpee/if-domain';
import { markedNode } from './test-utils/flatten';

function makeCtx(): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings: { serialComma: true },
    narrative: { person: 'second' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

function render(provider: EnglishLanguageProvider, id: string, params: Record<string, unknown>): string {
  return provider.renderMessage(id, params, makeCtx())
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : markedNode(c)))
    .join('');
}

describe('direction lines render the Direction constant as a word', () => {
  const provider = new EnglishLanguageProvider();

  it('climbing refuses a direction it cannot climb in the word, not the constant', () => {
    const line = render(provider, 'if.action.climbing.cant_go_that_way', { direction: 'NORTH' });
    expect(line).toContain('climb north from here');
    expect(line).not.toContain('NORTH');
  });

  it('throwing names the direction thrown as a word', () => {
    expect(render(provider, 'if.action.throwing.thrown_direction', { item: 'coin', direction: 'WEST' })).toContain('coin west.');
    expect(render(provider, 'if.action.throwing.no_exit', { direction: 'UP' })).toBe("There's no exit up.");
    expect(render(provider, 'if.action.throwing.sails_through', { item: 'coin', direction: 'EAST' })).toContain('to the east.');
  });

  it('throwing refuses a way it cannot read with a line it can speak', () => {
    expect(render(provider, 'if.action.throwing.cant_throw_that_way', { item: 'coin' })).toBe("You can't throw the coin that way.");
  });

  it("going's stock refusal for a block with no phrase is lang's line", () => {
    expect(render(provider, 'if.action.going.cant_go', { direction: 'NORTH' })).toBe("You can't go that way.");
  });
});
