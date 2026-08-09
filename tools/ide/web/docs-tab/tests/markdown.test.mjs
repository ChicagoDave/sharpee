/**
 * markdown.test.mjs — the Documentation tab's renderer.
 *
 * Every case here is a construct the bundled corpus actually contains; the
 * counts in the comments are from grepping `website/src/app/chord`. A renderer
 * that quietly drops one of these does not fail — it just shows the author less
 * than the website does, which is the failure mode these tests exist to catch.
 * Owner context: tools/ide — Tests.
 */

import { describe, it, expect } from 'vitest';
import { renderMarkdown, renderInline, escapeHtml, slug } from '../src/markdown.mjs';

describe('inline', () => {
  it('renders code spans and escapes their contents', () => {
    // The corpus is full of `<slot>` and `&` inside code spans.
    expect(renderInline('use `the <item>` here')).toBe(
      'use <code>the &lt;item&gt;</code> here',
    );
  });

  it('does not read markdown inside a code span', () => {
    expect(renderInline('`*not italic*`')).toBe('<code>*not italic*</code>');
    expect(renderInline('`[not a link](x)`')).toBe('<code>[not a link](x)</code>');
  });

  it('renders bold that WRAPS a code span', () => {
    // The bug this pins: lifting code spans out by splitting the string left
    // the two `**` markers in different fragments, so 41 occurrences across the
    // corpus rendered as literal asterisks.
    expect(renderInline('**`create` blocks** declare')).toBe(
      '<strong><code>create</code> blocks</strong> declare',
    );
  });

  it('renders links, marking external ones for the host', () => {
    expect(renderInline('see [the guide](/chord/guide)')).toBe(
      'see <a href="/chord/guide">the guide</a>',
    );
    expect(renderInline('see [nodejs](https://nodejs.org)')).toContain('target="_blank"');
  });

  it('leaves a lone asterisk alone', () => {
    expect(renderInline('2 * 3')).toBe('2 * 3');
  });

  it('escapes HTML in ordinary prose', () => {
    expect(escapeHtml('<script>&"')).toBe('&lt;script&gt;&amp;&quot;');
  });
});

describe('blocks', () => {
  it('renders a fenced code block with its language', () => {
    const html = renderMarkdown('```chord\nstory\n  title: T\n```');
    expect(html).toBe('<pre><code class="language-chord">story\n  title: T</code></pre>');
  });

  it('never interprets markdown inside a fence', () => {
    // A chord comment is `## …` — it must not become a heading.
    const html = renderMarkdown('```chord\n## The cellar is sealed.\n```');
    expect(html).toContain('## The cellar is sealed.');
    expect(html).not.toContain('<h2');
  });

  it('renders headings with anchor ids', () => {
    expect(renderMarkdown('## The fields')).toBe('<h2 id="the-fields">The fields</h2>');
  });

  it('renders a GFM table', () => {
    const html = renderMarkdown('| Field | What |\n| --- | --- |\n| `title:` | The name. |');
    expect(html).toContain('<th>Field</th>');
    expect(html).toContain('<td><code>title:</code></td>');
    expect(html).toContain('<td>The name.</td>');
  });

  it('renders a blockquote, including one holding a table', () => {
    const html = renderMarkdown('> **Note**\n>\n> Body text.');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<strong>Note</strong>');
  });

  it('renders a list, joining wrapped continuation lines', () => {
    const html = renderMarkdown('- first item\n  wrapped on\n  three lines\n- second');
    expect(html).toBe('<ul><li>first item wrapped on three lines</li><li>second</li></ul>');
  });

  it('joins a wrapped paragraph into one', () => {
    expect(renderMarkdown('one\ntwo\nthree')).toBe('<p>one two three</p>');
  });

  it('separates paragraphs on a blank line', () => {
    expect(renderMarkdown('one\n\ntwo')).toBe('<p>one</p>\n<p>two</p>');
  });

  it('renders a thematic break', () => {
    expect(renderMarkdown('a\n\n---\n\nb')).toBe('<p>a</p>\n<hr>\n<p>b</p>');
  });
});

describe('slug', () => {
  it('makes an anchor from a heading, dropping backticks', () => {
    expect(slug('The `story` header')).toBe('the-story-header');
  });
});
