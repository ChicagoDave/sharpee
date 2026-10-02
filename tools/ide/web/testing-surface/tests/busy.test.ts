/**
 * busy.test.ts — the busy bar's label while the driver replays.
 */
import { describe, expect, it } from 'vitest';
import { busyLabel } from '../src/busy';

describe('busyLabel', () => {
  it('counts a line replay step by step', () => {
    expect(busyLabel('line', 0, 40)).toBe('Replaying line — 0 of 40…');
    expect(busyLabel('line', 12, 40)).toBe('Replaying line — 12 of 40…');
    expect(busyLabel('line', 40, 40)).toBe('Replaying line — 40 of 40…');
  });

  it('names the session restore on open', () => {
    expect(busyLabel('restore', 5, 60)).toBe('Restoring session — 5 of 60…');
  });

  it('drops the count when nothing is known yet', () => {
    expect(busyLabel('restore', 0, 0)).toBe('Restoring session…');
    expect(busyLabel('line', 3, 0)).toBe('Replaying line…');
  });

  it('never counts past the total or below zero', () => {
    expect(busyLabel('line', 41, 40)).toBe('Replaying line — 40 of 40…');
    expect(busyLabel('line', -1, 40)).toBe('Replaying line — 0 of 40…');
  });
});
