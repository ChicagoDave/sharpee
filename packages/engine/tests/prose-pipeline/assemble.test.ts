/**
 * Tests for `createBlock` and `extractValue` in the engine prose
 * pipeline's assemble stage.
 *
 * @see ADR-174 §Wire shape
 * @see plan-20260509-phase1.md §Sub-phase 1.3 (port from text-service,
 *   adapted to the new bracket-only decoration model)
 */

import { describe, it, expect } from 'vitest';
import {
  createBlock,
  extractValue,
} from '../../src/prose-pipeline/assemble';
import type { IDecoration, TextContent } from '@sharpee/text-blocks';

function isDecoration(item: TextContent): item is IDecoration {
  return typeof item === 'object' && item !== null && 'className' in item;
}

describe('createBlock', () => {
  it('should create a block with plain text content', () => {
    const block = createBlock('action.result', 'You open the chest.');

    expect(block.key).toBe('action.result');
    expect(block.content).toEqual(['You open the chest.']);
  });

  it('should parse bracket decorations into structured IDecoration nodes', () => {
    const block = createBlock('action.result', 'You take [item:the sword].');

    expect(block.key).toBe('action.result');
    expect(block.content).toHaveLength(3);
    expect(block.content[0]).toBe('You take ');
    const dec = block.content[1];
    expect(isDecoration(dec)).toBe(true);
    if (!isDecoration(dec)) return;
    expect(dec.className).toBe('sharpee-item');
    expect(dec.content).toEqual(['the sword']);
    expect(block.content[2]).toBe('.');
  });

  it('should emit author classes verbatim (no sharpee- prefix)', () => {
    const block = createBlock('action.result', 'He whispers [thief-taunt:hello].');

    const dec = block.content[1];
    expect(isDecoration(dec)).toBe(true);
    if (!isDecoration(dec)) return;
    expect(dec.className).toBe('thief-taunt');
  });

  it('should NOT treat asterisks as markup (post-ADR-174)', () => {
    const block = createBlock('action.result', 'This is *important*.');
    expect(block.content).toEqual(['This is *important*.']);
  });

  it('should handle empty string with a single empty-string content entry', () => {
    const block = createBlock('action.result', '');

    expect(block.key).toBe('action.result');
    expect(block.content).toEqual(['']);
  });

  it('should preserve the key exactly as given', () => {
    const block = createBlock('room.description', 'A dark room.');

    expect(block.key).toBe('room.description');
  });
});

describe('extractValue', () => {
  it('should return a string value directly', () => {
    expect(extractValue('hello')).toBe('hello');
  });

  it('should convert a number to string', () => {
    expect(extractValue(42)).toBe('42');
  });

  it('should call a function and return its string result', () => {
    expect(extractValue(() => 'world')).toBe('world');
  });

  it('should return null when function returns falsy', () => {
    expect(extractValue(() => '')).toBeNull();
    expect(extractValue(() => null)).toBeNull();
    expect(extractValue(() => undefined)).toBeNull();
  });

  it('should return null when function throws', () => {
    expect(extractValue(() => { throw new Error('boom'); })).toBeNull();
  });

  it('should return null for null input', () => {
    expect(extractValue(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(extractValue(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractValue('')).toBeNull();
  });

  it('should return null for zero', () => {
    expect(extractValue(0)).toBeNull();
  });

  it('should convert a boolean true to string', () => {
    expect(extractValue(true)).toBe('true');
  });
});
