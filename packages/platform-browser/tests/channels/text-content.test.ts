/**
 * Tests for `renderTextContent` — IDecoration → DOM span translation.
 *
 * @see ADR-174 §Wire shape
 * @see plan-20260509-phase1.md §Sub-phase 1.7 test C4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderTextContent,
  flattenTextContent,
} from '../../src/channels/text-content';
import type { TextContent } from '@sharpee/text-blocks';

describe('renderTextContent', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  it('renders plain string content as a text node (no wrapping span)', () => {
    const content: TextContent[] = ['hello world'];
    const fragment = renderTextContent(document, content);
    host.appendChild(fragment);

    expect(host.innerHTML).toBe('hello world');
    expect(host.querySelectorAll('span')).toHaveLength(0);
  });

  it('C4: translates a single platform IDecoration to <span class="sharpee-em">', () => {
    const content: TextContent[] = [
      { className: 'sharpee-em', content: ['emphasized'] },
    ];
    const fragment = renderTextContent(document, content);
    host.appendChild(fragment);

    expect(host.innerHTML).toBe('<span class="sharpee-em">emphasized</span>');
  });

  it('translates an author IDecoration to <span class="..."> with the bare class', () => {
    const content: TextContent[] = [
      { className: 'thief-taunt', content: ["You'll regret this."] },
    ];
    const fragment = renderTextContent(document, content);
    host.appendChild(fragment);

    const span = host.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.className).toBe('thief-taunt');
    expect(span!.textContent).toBe("You'll regret this.");
  });

  it('renders nested decorations as nested <span> elements', () => {
    const content: TextContent[] = [
      {
        className: 'sharpee-em',
        content: [{ className: 'sharpee-strong', content: ['bold italic'] }],
      },
    ];
    const fragment = renderTextContent(document, content);
    host.appendChild(fragment);

    expect(host.innerHTML).toBe(
      '<span class="sharpee-em"><span class="sharpee-strong">bold italic</span></span>',
    );
  });

  it('mixes plain strings and decorations in document order', () => {
    const content: TextContent[] = [
      'You take ',
      { className: 'sharpee-item', content: ['the brass lantern'] },
      '.',
    ];
    const fragment = renderTextContent(document, content);
    host.appendChild(fragment);

    expect(host.innerHTML).toBe(
      'You take <span class="sharpee-item">the brass lantern</span>.',
    );
  });

  it('renders an empty-className decoration as its inner content with no wrapping span', () => {
    // Defensive: parser shouldn't emit empty className per AC-12, but
    // renderer must not crash if one slips through.
    const content: TextContent[] = [
      { className: '', content: ['unwrapped'] },
    ];
    const fragment = renderTextContent(document, content);
    host.appendChild(fragment);

    expect(host.innerHTML).toBe('unwrapped');
    expect(host.querySelectorAll('span')).toHaveLength(0);
  });

  it('returns an empty fragment for empty content array', () => {
    const fragment = renderTextContent(document, []);
    host.appendChild(fragment);

    expect(host.innerHTML).toBe('');
  });
});

describe('flattenTextContent', () => {
  it('strips decorations and concatenates text', () => {
    const content: TextContent[] = [
      'You take ',
      { className: 'sharpee-item', content: ['the brass lantern'] },
      '.',
    ];

    expect(flattenTextContent(content)).toBe('You take the brass lantern.');
  });

  it('flattens nested decorations', () => {
    const content: TextContent[] = [
      {
        className: 'sharpee-em',
        content: [{ className: 'sharpee-strong', content: ['bold italic'] }],
      },
    ];

    expect(flattenTextContent(content)).toBe('bold italic');
  });

  it('returns empty string for empty content', () => {
    expect(flattenTextContent([])).toBe('');
  });
});
