/**
 * Scopes story CSS by prefixing all rule selectors with a container selector.
 * Prevents story styles from bleeding into runner UI.
 */

/**
 * Prefix every CSS rule selector with the given scope selector.
 * Handles @media blocks (recurse), passes through @font-face, @keyframes, :root unchanged.
 */
export function scopeCSS(css: string, scope: string): string {
  return processBlock(css, scope);
}

function processBlock(css: string, scope: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < css.length) {
    // Skip whitespace
    while (i < css.length && /\s/.test(css[i])) {
      result.push(css[i]);
      i++;
    }
    if (i >= css.length) break;

    // Skip comments
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const commentEnd = end === -1 ? css.length : end + 2;
      result.push(css.slice(i, commentEnd));
      i = commentEnd;
      continue;
    }

    // Find the next block or statement
    const blockStart = css.indexOf('{', i);
    if (blockStart === -1) {
      // No more blocks, append remainder
      result.push(css.slice(i));
      break;
    }

    const preamble = css.slice(i, blockStart).trim();

    // Find matching closing brace
    const bodyStart = blockStart + 1;
    const bodyEnd = findMatchingBrace(css, blockStart);
    const body = css.slice(bodyStart, bodyEnd);

    if (preamble.startsWith('@media') || preamble.startsWith('@supports')) {
      // Recurse into nested at-rules
      result.push(preamble + ' {\n');
      result.push(processBlock(body, scope));
      result.push('}\n');
    } else if (
      preamble.startsWith('@font-face') ||
      preamble.startsWith('@keyframes') ||
      preamble.startsWith('@-webkit-keyframes')
    ) {
      // Pass through unchanged
      result.push(preamble + ' {' + body + '}\n');
    } else if (preamble.startsWith('@')) {
      // Other at-rules (e.g. @import, @charset) — pass through
      result.push(preamble + ' {' + body + '}\n');
    } else {
      // Regular rule — scope the selectors
      const scopedSelectors = preamble
        .split(',')
        .map((sel) => scopeSelector(sel.trim(), scope))
        .join(', ');
      result.push(scopedSelectors + ' {' + body + '}\n');
    }

    i = bodyEnd + 1;
  }

  return result.join('');
}

function scopeSelector(selector: string, scope: string): string {
  // Don't scope :root, html, or body — these are inherently global
  if (/^(:root|html|body)$/i.test(selector)) {
    return scope;
  }
  // Don't scope selectors that already start with the scope
  if (selector.startsWith(scope)) {
    return selector;
  }
  return `${scope} ${selector}`;
}

function findMatchingBrace(css: string, openIndex: number): number {
  let depth = 1;
  let i = openIndex + 1;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    if (depth > 0) i++;
  }
  return i;
}

/**
 * Rewrite url() references in CSS to use blob URLs from the asset map.
 */
export function rewriteCSSUrls(css: string, assetMap: Map<string, string>): string {
  return css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (_match, path: string) => {
    // Try bare path, then with assets/ prefix
    const resolved = assetMap.get(path) ?? assetMap.get(`assets/${path}`);
    if (resolved) {
      return `url('${resolved}')`;
    }
    return _match;
  });
}
