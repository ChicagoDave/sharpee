/**
 * Tests for createBlock and extractValue assembly stage
 *
 * Verifies block creation with decoration detection and
 * value extraction from direct values and function wrappers.
 *
 * @see ADR-091 Text Decorations
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect } from 'vitest';
import { createBlock, extractValue } from '../../src/stages/assemble.js';

describe('createBlock', () => {
  it('should create a block with plain text content', () => {
    const block = createBlock('action.result', 'You open the chest.');

    expect(block.key).toBe('action.result');
    expect(block.content).toEqual(['You open the chest.']);
  });

  it('passes bracket markers through as plain text (decoration parsing moved to engine prose pipeline per ADR-174)', () => {
    const block = createBlock('action.result', 'You take [item:the sword].');

    expect(block.key).toBe('action.result');
    expect(block.content).toEqual(['You take [item:the sword].']);
    const hasDecoration = block.content.some(
      (c) => typeof c === 'object' && c !== null,
    );
    expect(hasDecoration).toBe(false);
  });

  it('passes asterisk markers through as plain text (legacy syntax retired per ADR-174)', () => {
    const block = createBlock('action.result', 'This is *important*.');

    expect(block.content).toEqual(['This is *important*.']);
    const hasDecoration = block.content.some(
      (c) => typeof c === 'object' && c !== null,
    );
    expect(hasDecoration).toBe(false);
  });

  it('should handle empty string', () => {
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
    // 0 is falsy → null
    expect(extractValue(0)).toBeNull();
  });

  it('should convert a boolean true to string', () => {
    expect(extractValue(true)).toBe('true');
  });
});
