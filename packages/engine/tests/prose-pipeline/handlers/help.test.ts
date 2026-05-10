/**
 * Tests for `handleHelpDisplayed` — ported from text-service.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

import { describe, it, expect } from 'vitest';
import { handleHelpDisplayed } from '../../../src/prose-pipeline/handlers/help';
import { makeEvent, makeContext } from '../test-helpers';

describe('handleHelpDisplayed', () => {
  it('should return exactly one help.text block', () => {
    const event = makeEvent('if.event.help_displayed', {});

    const blocks = handleHelpDisplayed(event, makeContext());

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('help.text');
  });

  it('should contain HOW TO PLAY header', () => {
    const event = makeEvent('if.event.help_displayed', {});

    const blocks = handleHelpDisplayed(event, makeContext());
    const text = blocks[0].content[0] as string;

    expect(text).toContain('HOW TO PLAY INTERACTIVE FICTION');
  });

  it('should contain major command categories', () => {
    const event = makeEvent('if.event.help_displayed', {});

    const blocks = handleHelpDisplayed(event, makeContext());
    const text = blocks[0].content[0] as string;

    expect(text).toContain('MOVING AROUND');
    expect(text).toContain('LOOKING AND EXAMINING');
    expect(text).toContain('INTERACTING WITH OBJECTS');
    expect(text).toContain('TALKING TO CHARACTERS');
    expect(text).toContain('OTHER COMMANDS');
  });

  it('should ignore event data', () => {
    const event = makeEvent('if.event.help_displayed', {
      irrelevant: 'data',
      should: 'be ignored',
    });

    const blocks = handleHelpDisplayed(event, makeContext());

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('help.text');
  });
});
