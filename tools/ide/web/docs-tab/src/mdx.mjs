/**
 * mdx.mjs — reduces sharpee.net's MDX content to plain markdown.
 *
 * Purpose: the corpus is MDX, but only barely — a survey of every
 *   `content.mdx` under `website/src/app/chord` and `.../learn` finds exactly
 *   two components in use, `<GrammarBlock>` (55) and `<Callout>` (4), plus a
 *   handful of `import`/`export` lines. Everything else is ordinary markdown.
 *   So the tab does not need an MDX engine; it needs those two components
 *   turned into markdown the renderer already handles.
 *
 *   Anything else that looks like JSX is REPORTED, not dropped. A component
 *   added to the website later must fail this build loudly rather than vanish
 *   from the IDE's copy of the page.
 *
 * Public interface: reduceMdx(source, {grammarBlocks, versions}),
 *   parseGrammarBlocks(ts).
 * Owner context: tools/ide — the Documentation tab's web bundle.
 */

/**
 * Parse the generated `grammar-blocks.ts` data module.
 *
 * It is generated (`repokit grammar`) and its body is a plain object of
 * double-quoted string pairs, so the object literal is JSON once the TypeScript
 * wrapper is off.
 *
 * @param {string} source contents of website/src/app/chord/stdlib/reference/grammar-blocks.ts
 * @returns {Record<string,string>} action id -> `define action` block text
 * @throws when the module's shape has changed — silently returning {} would
 *   empty 55 grammar blocks out of the stdlib reference with no signal.
 */
export function parseGrammarBlocks(source) {
  const start = source.indexOf('{', source.indexOf('grammarBlocks'));
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('grammar-blocks.ts: could not find the grammarBlocks object literal');
  }
  const literal = source.slice(start, end + 1).replace(/,(\s*})$/, '$1');
  return JSON.parse(literal);
}

/**
 * Reduce one MDX document to markdown.
 *
 * @param {string} source the `content.mdx` text
 * @param {{grammarBlocks: Record<string,string>, versions: Record<string,string>}} context
 * @returns {{markdown: string, unsupported: string[]}} `unsupported` lists any
 *   JSX left over; a caller that ignores it ships silently-missing content.
 */
export function reduceMdx(source, { grammarBlocks, versions }) {
  let text = source.replace(/\r\n/g, '\n');

  // `import x from '…'` / `export const … = …` lines are module plumbing for
  // the website's bundler and have no rendered form.
  text = text.replace(/^(import|export)\s+[^\n]*\n/gm, '');

  // <GrammarBlock action="id" /> — the generated `define action` block,
  // verbatim, as a chord fence. Same content and same code path as every other
  // chord block on the page.
  text = text.replace(/<GrammarBlock\s+action="([^"]+)"\s*\/>/g, (all, action) => {
    const block = grammarBlocks[action];
    if (block === undefined) {
      // Mirrors the website component, which throws at build time on an
      // unknown id rather than rendering an empty block.
      throw new Error(`<GrammarBlock action="${action}">: no such action in grammar-blocks.ts`);
    }
    return '```chord\n' + block + '\n```';
  });

  // <Callout [kind="note"|"warn"] [title="…"]> body </Callout> — an admonition.
  // Both attributes are optional on the website component, so both are optional
  // here. Markdown's nearest primitive is a blockquote, led by the bolded title
  // when there is one.
  text = text.replace(/<Callout\b([^>]*)>\n([\s\S]*?)\n<\/Callout>/g, (all, attrs, body) => {
    const title = attrs.match(/\btitle="([^"]*)"/)?.[1];
    const quoted = body
      .split('\n')
      .map((line) => ('> ' + line.replace(/^\s{0,2}/, '')).trimEnd())
      .join('\n');
    return title ? `> **${title}**\n>\n${quoted}` : quoted;
  });

  // <Screenshot name="dir/file" caption="…" /> — an app screenshot. The website
  // resolves `name` through a registry of static imports; here the name IS the
  // path, because build.mjs copies website/src/images/ into the bundle whole.
  // Attributes are written across several lines in the source, hence [\s\S].
  text = text.replace(/<Screenshot\b([\s\S]*?)\/>/g, (all, attrs) => {
    const name = attrs.match(/\bname="([^"]*)"/)?.[1];
    if (!name) {
      throw new Error('<Screenshot> without a name attribute');
    }
    const caption = attrs.match(/\bcaption="([^"]*)"/)?.[1];
    // Markdown image + emphasised caption: the renderer already handles both,
    // and no new HTML path is introduced for one component.
    const img = `![](images/${name}.png)`;
    return caption ? `${img}\n\n*${caption}*` : img;
  });

  // <StatusBarExample [title="…"] /> — Chord Writer's own status-bar line, with
  // the repository's real version numbers in it. The website component reads
  // `website/src/lib/versions.json`; so does this build, so the two pages cannot
  // disagree about what shipped. It renders through the website's CodeBlock,
  // whose markdown equivalent is a plain fence.
  text = text.replace(/<StatusBarExample\b([\s\S]*?)\/>/g, (all, attrs) => {
    for (const field of ['chordWriter', 'sharpee', 'chord']) {
      if (!versions?.[field]) {
        throw new Error(`<StatusBarExample>: versions.json has no \`${field}\``);
      }
    }
    const line = `Chord Writer ${versions.chordWriter} \u00B7 Sharpee ${versions.sharpee} / Chord ${versions.chord}`;
    const fence = '```\n' + line + '\n```';
    const title = attrs.match(/\btitle="([^"]*)"/)?.[1];
    return title ? `**${title}**\n\n${fence}` : fence;
  });

  // Whatever is left that opens like a component.
  const unsupported = [...new Set((text.match(/<[A-Z][A-Za-z]*/g) ?? []).map((m) => m.slice(1)))];

  return { markdown: text, unsupported };
}
