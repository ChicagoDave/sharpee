/**
 * @file ADR-194 — Contents atom: read a container's live contents through the
 * entity→NounPhrase bridge and render as a grouped list; graceful "nothing".
 */

import { describe, it, expect } from 'vitest';
import type { IEntity } from '@sharpee/core';
import type { NounPhrase, Phrase, RenderContext, RenderWorld } from '@sharpee/if-domain';
import { parsePhraseTemplate } from '../../src/parser';
import { EnglishAssembler } from '../../src/assembler';

const asm = new EnglishAssembler();

const np = (id: string, name: string, over: Partial<NounPhrase> = {}): NounPhrase => ({
  kind: 'noun', name, number: 'singular', articleType: 'indefinite', referableId: id, ...over,
});

/** A render world whose containers hold the given contents and whose bridge knows their names. */
function makeWorld(contents: Record<string, NounPhrase[]>, opts: { bridge?: boolean } = { bridge: true }): RenderWorld {
  const world: RenderWorld = {
    getEntity: (id) => ({ id } as unknown as IEntity),
    getEntityContents: (id) => (contents[id] ?? []).map((n) => ({ id: n.referableId } as unknown as IEntity)),
    getContainingRoom: () => undefined,
  };
  if (opts.bridge !== false) {
    const byId: Record<string, NounPhrase> = {};
    for (const list of Object.values(contents)) for (const n of list) byId[n.referableId!] = n;
    world.nounPhraseFor = (id) => byId[id];
  }
  return world;
}

function makeCtx(params: Record<string, unknown>, world: RenderWorld): RenderContext {
  return {
    world, params, settings: { serialComma: true }, narrative: { person: 'third' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

function render(template: string, params: Record<string, unknown>, world: RenderWorld): string {
  const tree: Phrase = parsePhraseTemplate(template, params);
  return asm.realize(tree, makeCtx(params, world)).flatMap((b) => b.content).map((c) => (typeof c === 'string' ? c : '')).join('');
}

describe('Contents atom (ADR-194)', () => {
  it('AC-1: renders the container contents as an indefinite, serial-comma list', () => {
    const world = makeWorld({ 'box-1': [np('a', 'lamp'), np('b', 'brass key')] });
    expect(render('You see {contents:box} here.', { box: np('box-1', 'box') }, world))
      .toBe('You see a lamp and a brass key here.');
  });

  it('AC-1: groups identical contents ("two coins")', () => {
    const world = makeWorld({ 'box-1': [np('c1', 'coin'), np('c2', 'coin'), np('p', 'parrot')] });
    expect(render('{contents:box}', { box: np('box-1', 'box') }, world)).toBe('two coins and a parrot');
  });

  it('accepts a bare string container id too', () => {
    const world = makeWorld({ 'box-1': [np('a', 'lamp')] });
    expect(render('{contents:box}', { box: 'box-1' }, world)).toBe('a lamp');
  });

  it('AC-2: an empty container → "nothing"', () => {
    const world = makeWorld({ 'box-1': [] });
    expect(render('{contents:box}', { box: np('box-1', 'box') }, world)).toBe('nothing');
  });

  it('AC-3: contents are read at realize time (mutating the world before realize changes output)', () => {
    const live: Record<string, NounPhrase[]> = { 'box-1': [np('a', 'lamp')] };
    const world = makeWorld(live);
    live['box-1'] = [np('a', 'lamp'), np('b', 'ring')]; // change after the tree was parsed/bound
    world.nounPhraseFor = (id) => ({ a: np('a', 'lamp'), b: np('b', 'ring') } as Record<string, NounPhrase>)[id];
    expect(render('{contents:box}', { box: np('box-1', 'box') }, world)).toBe('a lamp and a ring');
  });

  it('AC-4: graceful — no bridge wired → "nothing", no throw', () => {
    const world = makeWorld({ 'box-1': [np('a', 'lamp')] }, { bridge: false });
    expect(render('{contents:box}', { box: np('box-1', 'box') }, world)).toBe('nothing');
  });
});
