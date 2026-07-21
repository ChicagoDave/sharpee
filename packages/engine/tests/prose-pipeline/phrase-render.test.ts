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
import type { LanguageProvider, RenderContext } from '@sharpee/if-domain';
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
