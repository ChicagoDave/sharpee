/**
 * phrase-render.test.ts — ADR-250 D4: the phrasebook read point in
 * `renderViaPhrase`. A book resolution from `world.evaluate` wins before
 * the `getTemplate` fork and renders via `renderTemplate` with the
 * resolution's params merged; every miss falls through to the exact
 * pre-existing behavior. The key convention is pinned here (the read
 * point) and in the story-loader registrar test — nowhere else.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider, NounPhrase, RenderContext } from '@sharpee/if-domain';
import { ACTOR_PARAM_KEY } from '@sharpee/if-domain';
import {
  phrasebookTemplateKey,
  renderViaPhrase,
  type PhrasebookResolution,
} from '../../src/prose-pipeline/phrase-render';
import type { HandlerContext } from '../../src/prose-pipeline/handlers/types';

const block = (key: string, text: string): ITextBlock => ({ key, content: [text] });

function makePhraseContext(opts: {
  templates?: Record<string, string>;
  resolutions?: Record<string, PhrasebookResolution>;
  withRenderTemplate?: boolean;
  withWorld?: boolean;
}) {
  const renderMessage = vi.fn((id: string) => [block('msg', `msg:${id}`)]);
  const renderTemplate = vi.fn((template: string) => [block('msg', `tpl:${template}`)]);
  const lp = {
    languageCode: 'en-us',
    getMessage: (id: string) => id,
    getTemplate: (id: string) => opts.templates?.[id],
    renderMessage,
    ...(opts.withRenderTemplate === false ? {} : { renderTemplate }),
  } as unknown as LanguageProvider;
  const evaluate = vi.fn((key: string) => opts.resolutions?.[key]);
  const context: HandlerContext = {
    languageProvider: lp,
    makeRenderContext: () => ({}) as RenderContext,
    ...(opts.withWorld === false ? {} : { world: { evaluate } as never }),
  };
  return { context, renderMessage, renderTemplate, evaluate };
}

describe('phrasebookTemplateKey (ADR-240 D6 — pinned string)', () => {
  it('builds phrasebook.template.<messageId>', () => {
    expect(phrasebookTemplateKey('cold-returns')).toBe('phrasebook.template.cold-returns');
  });
});

describe('the phrasebook read point (ADR-250 D4.3)', () => {
  const HIT: PhrasebookResolution = {
    book: 'winter',
    key: 'cold-returns',
    template: 'The cold finds you.',
    params: { variants: { kind: 'choice' } },
  };

  it('a book hit renders via renderTemplate with merged params — renderMessage never runs', () => {
    const { context, renderMessage, renderTemplate, evaluate } = makePhraseContext({
      resolutions: { [phrasebookTemplateKey('cold-returns')]: HIT },
    });
    const blocks = renderViaPhrase(context, 'cold-returns', { actor: 'you' }, 'story');
    expect(evaluate).toHaveBeenCalledWith('phrasebook.template.cold-returns');
    expect(renderTemplate).toHaveBeenCalledOnce();
    expect(renderTemplate.mock.calls[0][0]).toBe('The cold finds you.');
    expect(renderTemplate.mock.calls[0][1]).toMatchObject({ actor: 'you', variants: { kind: 'choice' } });
    expect(renderMessage).not.toHaveBeenCalled();
    expect(blocks![0]).toEqual({ key: 'story', content: ['tpl:The cold finds you.'] });
  });

  it('no hit + registered id falls through to renderMessage exactly as before', () => {
    const { context, renderMessage, renderTemplate } = makePhraseContext({
      templates: { 'story.msg': 'T' },
    });
    const blocks = renderViaPhrase(context, 'story.msg', {}, 'story');
    expect(renderMessage).toHaveBeenCalledOnce();
    expect(renderTemplate).not.toHaveBeenCalled();
    expect(blocks![0].content).toEqual(['msg:story.msg']);
  });

  it('no hit + unregistered id returns null (inline fallback)', () => {
    const { context } = makePhraseContext({});
    expect(renderViaPhrase(context, 'nope', {}, 'story')).toBeNull();
  });

  it('a world-less context skips the book path entirely', () => {
    const { context, renderMessage } = makePhraseContext({
      templates: { 'story.msg': 'T' },
      resolutions: { [phrasebookTemplateKey('story.msg')]: HIT },
      withWorld: false,
    });
    renderViaPhrase(context, 'story.msg', {}, 'story');
    expect(renderMessage).toHaveBeenCalledOnce();
  });

  it('a provider without renderTemplate skips the book path (older providers degrade)', () => {
    const { context, evaluate } = makePhraseContext({
      resolutions: { [phrasebookTemplateKey('cold-returns')]: HIT },
      withRenderTemplate: false,
    });
    expect(renderViaPhrase(context, 'cold-returns', {}, 'story')).toBeNull();
    expect(evaluate).not.toHaveBeenCalled();
  });
});

describe('the actor binding (ADR-328 D4)', () => {
  const thief: NounPhrase = { kind: 'noun', name: 'thief', number: 'singular', articleType: 'definite', referableId: 'npc-1' };

  /** A context whose render world carries the entity→phrase bridge (ADR-194). */
  function makeActorContext(opts: { bridge?: boolean } = {}) {
    const renderMessage = vi.fn((id: string) => [block('msg', `msg:${id}`)]);
    const lp = {
      languageCode: 'en-us',
      getMessage: (id: string) => id,
      getTemplate: (id: string) => (id === 'story.msg' ? 'T' : undefined),
      renderMessage,
    } as unknown as LanguageProvider;
    const nounPhraseFor = vi.fn((id: string) => (id === 'npc-1' ? thief : undefined));
    const world = opts.bridge === false ? {} : { nounPhraseFor };
    const context: HandlerContext = {
      languageProvider: lp,
      makeRenderContext: (params) => ({ params, world }) as unknown as RenderContext,
    };
    return { context, renderMessage, nounPhraseFor };
  }

  it('binds the actor NounPhrase under ACTOR_PARAM_KEY when an actorId is given', () => {
    const { context, renderMessage } = makeActorContext();
    renderViaPhrase(context, 'story.msg', { item: 'x' }, 'story', 'npc-1');
    const params = renderMessage.mock.calls[0][1] as Record<string, unknown>;
    expect(params[ACTOR_PARAM_KEY]).toEqual(thief);
    expect(params.item).toBe('x');
  });

  it("an emitter's own binding wins over the event actor", () => {
    const { context, renderMessage, nounPhraseFor } = makeActorContext();
    const own = { kind: 'noun', name: 'guard', number: 'singular', articleType: 'definite', referableId: 'npc-2' };
    renderViaPhrase(context, 'story.msg', { [ACTOR_PARAM_KEY]: own }, 'story', 'npc-1');
    expect((renderMessage.mock.calls[0][1] as Record<string, unknown>)[ACTOR_PARAM_KEY]).toBe(own);
    expect(nounPhraseFor).not.toHaveBeenCalled();
  });

  it('no actorId, an unknown actor, or a world without the bridge leaves params untouched', () => {
    const a = makeActorContext();
    renderViaPhrase(a.context, 'story.msg', { item: 'x' }, 'story');
    expect(a.renderMessage.mock.calls[0][1]).toEqual({ item: 'x' });

    const b = makeActorContext();
    renderViaPhrase(b.context, 'story.msg', { item: 'x' }, 'story', 'nobody');
    expect(b.renderMessage.mock.calls[0][1]).toEqual({ item: 'x' });

    const c = makeActorContext({ bridge: false });
    renderViaPhrase(c.context, 'story.msg', { item: 'x' }, 'story', 'npc-1');
    expect(c.renderMessage.mock.calls[0][1]).toEqual({ item: 'x' });
  });
});
