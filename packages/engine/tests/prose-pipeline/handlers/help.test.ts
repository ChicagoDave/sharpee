/**
 * Tests for `handleHelpDisplayed` — ported from text-service.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

import { describe, it, expect } from 'vitest';
import { handleHelpDisplayed } from '../../../src/prose-pipeline/handlers/help';
import { makeEvent, makeContext } from '../test-helpers';

function joinBlocks(blocks: ReadonlyArray<{ content: ReadonlyArray<unknown> }>): string {
  return blocks
    .map((b) => b.content.map((n) => (typeof n === 'string' ? n : '')).join(''))
    .join('\n');
}

describe('handleHelpDisplayed', () => {
  it('should return a stream of help.text blocks (post pre-line removal)', () => {
    const event = makeEvent('if.event.help_displayed', {});

    const blocks = handleHelpDisplayed(event, makeContext());

    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(block.key).toBe('help.text');
    }
  });

  it('first block opens with the HOW TO PLAY header', () => {
    const event = makeEvent('if.event.help_displayed', {});

    const blocks = handleHelpDisplayed(event, makeContext());

    expect(blocks[0].content[0]).toBe('HOW TO PLAY INTERACTIVE FICTION');
    // The first block of a packet must NOT be tight.
    expect(blocks[0].tight).toBeUndefined();
  });

  it('continuation blocks within a paragraph are tight', () => {
    const event = makeEvent('if.event.help_displayed', {});

    const blocks = handleHelpDisplayed(event, makeContext());

    // Find a `tight` block somewhere in the middle (post-MOVING AROUND
    // section, which has continuation lines inside a single paragraph).
    const hasTight = blocks.some((b) => b.tight === true);
    expect(hasTight).toBe(true);
  });

  it('should contain major command categories across blocks', () => {
    const event = makeEvent('if.event.help_displayed', {});

    const blocks = handleHelpDisplayed(event, makeContext());
    const allText = joinBlocks(blocks);

    expect(allText).toContain('MOVING AROUND');
    expect(allText).toContain('LOOKING AND EXAMINING');
    expect(allText).toContain('INTERACTING WITH OBJECTS');
    expect(allText).toContain('TALKING TO CHARACTERS');
    expect(allText).toContain('OTHER COMMANDS');
  });

  it('should ignore event data', () => {
    const event = makeEvent('if.event.help_displayed', {
      irrelevant: 'data',
      should: 'be ignored',
    });

    const blocks = handleHelpDisplayed(event, makeContext());

    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(block.key).toBe('help.text');
    }
  });
});
