/**
 * hosts.js — finds the Chord inside each kind of file and carries the kind-line
 * plan (core.js) back to that file's own offsets.
 *
 * A host extracts one or more *views*: a stretch of Chord text plus a map from
 * each view offset to the file offset it came from. The planner runs on the
 * view; each edit maps back through the view and is re-encoded for the host
 * (escaped for a string literal, re-indented for an indented literal).
 *
 *   story     `.story` / `.chord` — the whole file is one view
 *   markdown  `.md` / `.mdx` — each ```chord fence is a view
 *   script    `.ts` / `.tsx` / `.js` / `.mjs` / `.cjs` — each string or
 *             template literal holding a `create` line is a view, found with
 *             the TypeScript AST; a `${}` inside a create block skips that
 *             block and reports it
 *
 * Swift and C# hosts are not handled: `reportForeign` lists their create
 * lines for a manual edit.
 *
 * Public interface: migrateFile(fileName, text) → { text, blocks, skipped,
 * reports, parseErrorViews }; hostOf(fileName); reportForeign(text).
 * Owner context: tools/ — a one-time corpus migration.
 */

'use strict';

const ts = require('typescript');
const { planChordText, indexLines } = require('./core.js');

/** Word substituted for a `${}` so the surrounding Chord still parses. */
const INTERPOLATION_STAND_IN = 'interpolated';

/**
 * Which host handles a file, by extension.
 * @returns {'story'|'markdown'|'script'|'swift'|'foreign'|null}
 */
function hostOf(fileName) {
  // The story scaffold (devkit's `story.story.template`) is Chord with `{{…}}` fields.
  if (fileName.toLowerCase().endsWith('.story.template')) return 'story';
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (ext === '.story' || ext === '.chord') return 'story';
  if (ext === '.md' || ext === '.mdx') return 'markdown';
  if (['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) return 'script';
  if (ext === '.swift') return 'swift';
  if (ext === '.cs') return 'foreign';
  return null;
}

// --------------------------------------------------------------------------
// views
// --------------------------------------------------------------------------

/**
 * A view over file text.
 * @typedef {object} View
 * @property {string} text the Chord text the planner sees
 * @property {number[]} map map[i] = file offset of view offset i (length text.length + 1)
 * @property {(s: string) => string} encode turns view text into host text
 * @property {string} indent prefix re-added after each inserted newline
 * @property {Array<[number, number]>} holes view ranges standing in for `${}`
 * @property {number} line 1-based file line where the view starts, for reports
 */

/** Identity view over a slice of file text. */
function sliceView(fileText, start, end, line) {
  const map = [];
  for (let i = start; i <= end; i++) map.push(i);
  return { text: fileText.slice(start, end), map, encode: (s) => s, indent: '', holes: [], line };
}

/**
 * Strip a common leading indent so an indented literal's `create` headers
 * reach column 1. Blank lines do not count toward the common indent.
 * @returns {View} a view whose map skips the stripped characters
 */
function dedentView(view, fixed = null) {
  const { starts, ends } = indexLines(view.text);
  let common = fixed;
  if (common === null) {
    for (let l = 0; l < starts.length; l++) {
      const lineText = view.text.slice(starts[l], ends[l]);
      if (lineText.trim() === '') continue;
      let n = 0;
      while (n < lineText.length && lineText[n] === ' ') n++;
      common = common === null ? n : Math.min(common, n);
    }
  }
  if (!common) return view;
  let text = '';
  const map = [];
  const lineOrigin = new Map();
  for (let l = 0; l < starts.length; l++) {
    const lineEnd = l + 1 < starts.length ? starts[l + 1] : view.text.length;
    const lineText = view.text.slice(starts[l], ends[l]);
    const skip = lineText.trim() === '' ? Math.min(common, lineText.length) : common;
    lineOrigin.set(text.length, view.map[starts[l]]);
    for (let i = starts[l] + skip; i < lineEnd; i++) {
      map.push(view.map[i]);
      text += view.text[i];
    }
  }
  map.push(view.map[view.text.length]);
  return { ...view, text, map, lineOrigin, indent: view.indent + ' '.repeat(common), holes: [] };
}

/**
 * Map one planned edit from view offsets to a file splice.
 * @throws when a removal spans a gap in the map (text the view dropped)
 */
function toFileEdit(view, edit) {
  // A removal bounded by view line starts takes the stripped indent with it,
  // so the line that follows keeps its own indent.
  const origin = (i) => (edit.remove > 0 && view.lineOrigin?.has(i) ? view.lineOrigin.get(i) : view.map[i]);
  const at = origin(edit.at);
  const end = origin(edit.at + edit.remove);
  let insert = edit.insert;
  if (view.indent) insert = insert.split('\n').join(`\n${view.indent}`);
  const encode = view.encodeAt ? view.encodeAt(at) : view.encode;
  return { at, remove: end - at, insert: encode(insert) };
}

// --------------------------------------------------------------------------
// markdown
// --------------------------------------------------------------------------

/** Each ```chord fence's body as a view. */
function markdownViews(fileText) {
  const { starts, ends } = indexLines(fileText);
  const views = [];
  let open = null;
  for (let l = 0; l < starts.length; l++) {
    const lineText = fileText.slice(starts[l], ends[l]);
    const trimmed = lineText.trimStart();
    if (open === null) {
      if (trimmed.startsWith('```') && trimmed.slice(3).trim().split(/\s/)[0] === 'chord') {
        open = { bodyStart: starts[l + 1] ?? fileText.length, line: l + 2 };
      }
    } else if (trimmed.startsWith('```')) {
      const bodyEnd = starts[l];
      views.push(dedentView(sliceView(fileText, open.bodyStart, bodyEnd, open.line)));
      open = null;
    }
  }
  return views;
}

// --------------------------------------------------------------------------
// script (TS/JS literals)
// --------------------------------------------------------------------------

/**
 * Decode a literal's raw body into its cooked value with an index map.
 * @param {string} raw the source between the delimiters
 * @param {number} base file offset of raw[0]
 * @returns {{ cooked: string, map: number[] }} map[i] = file offset of cooked[i]
 */
function decodeLiteral(raw, base) {
  let cooked = '';
  const map = [];
  const singles = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === '\r' || next === '\n') {
        i += next === '\r' && raw[i + 2] === '\n' ? 3 : 2; // line continuation: no cooked char
        continue;
      }
      let value;
      let len = 2;
      if (next in singles) value = singles[next];
      else if (next === 'x') {
        value = String.fromCharCode(parseInt(raw.slice(i + 2, i + 4), 16));
        len = 4;
      } else if (next === 'u' && raw[i + 2] === '{') {
        const close = raw.indexOf('}', i);
        value = String.fromCodePoint(parseInt(raw.slice(i + 3, close), 16));
        len = close - i + 1;
      } else if (next === 'u') {
        value = String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16));
        len = 6;
      } else value = next;
      for (const c of value) {
        cooked += c;
        map.push(base + i);
      }
      i += len;
      continue;
    }
    if (ch === '\r' && raw[i + 1] === '\n') {
      cooked += '\n';
      map.push(base + i);
      i += 2;
      continue;
    }
    cooked += ch;
    map.push(base + i);
    i++;
  }
  map.push(base + raw.length);
  return { cooked, map };
}

/** Escape view text for a quoted string literal or a template literal. */
function encoderFor(quote) {
  if (quote === '`') return (s) => s.split('\\').join('\\\\').split('`').join('\\`').split('${').join('\\${');
  return (s) =>
    s
      .split('\\').join('\\\\')
      .split(quote).join(`\\${quote}`)
      .split('\n').join('\\n')
      .split('\r').join('\\r');
}

/** True when cooked text has a line that begins (after indent) with `create `. */
function hasCreateLine(cooked) {
  return cooked.split(/\r\n|\n|\r/).some((l) => l.trimStart().startsWith('create '));
}

/**
 * Every string/template literal in a script that carries a create line.
 * @returns {{ views: View[], reports: string[] }}
 */
function scriptViews(fileName, fileText) {
  const kind = /\.(tsx|jsx)$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, fileText, ts.ScriptTarget.Latest, true, kind);
  const views = [];
  const reports = [];
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const visit = (node) => {
    if (ts.isArrayLiteralExpression(node) && isLineArray(node)) {
      const view = arrayView(sf, fileText, node, lineOf);
      if (view) {
        views.push(view);
        return;
      }
      reports.push(`${fileName}:${lineOf(node.getStart(sf))}: array of Chord lines with a line that is itself multi-line; edit by hand`);
      return;
    }
    if (isStringChain(node)) {
      const view = chainView(sf, fileText, node, lineOf);
      if (hasCreateLine(view.text)) {
        views.push(dedentWithHoles(view));
        return; // the operands are this view's, not views of their own
      }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const start = node.getStart(sf);
      const quote = fileText[start];
      const { cooked, map } = decodeLiteral(fileText.slice(start + 1, node.end - 1), start + 1);
      if (hasCreateLine(cooked)) {
        if (cooked !== node.text) reports.push(`${fileName}:${lineOf(start)}: literal did not decode cleanly; edit by hand`);
        else if (!/[\r\n]/.test(cooked)) reports.push(`${fileName}:${lineOf(start)}: one-line literal \`${cooked.trim()}\`; not treated as Chord`);
        else views.push(dedentView({ text: cooked, map, encode: encoderFor(quote), indent: '', holes: [], line: lineOf(start) }));
      }
    } else if (ts.isTemplateExpression(node)) {
      const view = templateView(sf, fileText, node, lineOf);
      if (hasCreateLine(view.text)) views.push(dedentWithHoles(view));
      return; // placeholders' own literals are not Chord hosts of this one
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { views, reports };
}

/** A plain string element of an array (quoted or substitution-free template). */
function isLineLiteral(e) {
  return ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e);
}

/** An array with an element that is a create header line: Chord written one line per element. */
function isLineArray(node) {
  return node.elements.some((e) => isLineLiteral(e) && e.text.startsWith('create '));
}

/**
 * An array of line strings as one view, the lines joined by `\n`.
 *
 * Each element's characters map to its own raw text; the joining newline
 * maps to the element's closing quote, so a splice there lands just inside
 * it. A newline the planner inserts becomes "close quote, separator, open
 * quote" — a new element, separated like its neighbours. A whole-line
 * removal runs from one element's opening quote to the next's, taking the
 * element and its separator. A non-literal element (a spread, a variable)
 * is a stand-in line the planner sees but never edits.
 * @returns {View|null} null when an element literal holds a newline itself
 */
function arrayView(sf, fileText, node, lineOf) {
  const els = node.elements;
  let text = '';
  const map = [];
  const holes = [];
  const lineOrigin = new Map();
  let quote = null;
  for (let k = 0; k < els.length; k++) {
    const e = els[k];
    const start = e.getStart(sf);
    lineOrigin.set(text.length, start);
    if (isLineLiteral(e)) {
      quote = quote ?? fileText[start];
      const { cooked, map: m } = decodeLiteral(fileText.slice(start + 1, e.end - 1), start + 1);
      if (/[\r\n]/.test(cooked)) return null;
      text += cooked;
      map.push(...m.slice(0, -1));
    } else {
      const holeStart = text.length;
      for (const c of INTERPOLATION_STAND_IN) {
        text += c;
        map.push(start);
      }
      holes.push([holeStart, text.length]);
    }
    if (k < els.length - 1) {
      text += '\n';
      map.push(isLineLiteral(e) ? e.end - 1 : e.end);
    }
  }
  const last = els[els.length - 1];
  map.push(isLineLiteral(last) ? last.end - 1 : last.end);

  // The separator between the first two elements (`,\n    `), reused for new elements.
  const separator = els.length > 1 ? fileText.slice(els[0].end, els[1].getStart(sf)) : ', ';
  const q = quote ?? "'";
  const escape = encoderFor(q);
  const encode = (s) => s.split('\n').map(escape).join(`${q}${separator}${q}`);
  return { text, map, lineOrigin, encode, indent: '', holes, line: lineOf(node.getStart(sf)) };
}

/**
 * Accumulates a view from literal text and `${}`-style holes.
 *
 * A hole inside a line is a stand-in word. A hole at the start of a line
 * (`${HEADER}create the keeper`) usually supplies whole lines, so it becomes
 * a stand-in LINE: the word, a newline, and the line's indent again — the
 * `create` after it then starts its own line, as it does when the program
 * runs. Either way the hole's range covers every stand-in character, so a
 * block that overlaps it is skipped, never edited.
 */
class ViewBuilder {
  constructor() {
    this.text = '';
    this.map = [];
    this.holes = [];
  }

  /** Append decoded literal text; `m` maps each char to a file offset (no end entry). */
  literal(cooked, m) {
    this.text += cooked;
    for (let i = 0; i < cooked.length; i++) this.map.push(m[i]);
  }

  /** Append a stand-in for a hole whose file position is `at`. */
  hole(at) {
    const lineStart = this.text.lastIndexOf('\n') + 1;
    const prefix = this.text.slice(lineStart);
    const atLineStart = prefix.trim() === '';
    const standIn = atLineStart ? `${INTERPOLATION_STAND_IN}\n${prefix}` : INTERPOLATION_STAND_IN;
    const start = this.text.length;
    for (const c of standIn) {
      this.text += c;
      this.map.push(at);
    }
    this.holes.push([start, this.text.length]);
  }

  /** Close the view; `end` is the file offset just past the last character. */
  done(end, rest) {
    this.map.push(end);
    return { text: this.text, map: this.map, holes: this.holes, indent: '', ...rest };
  }
}

/** Add a template literal's segments and `${}` holes to a builder. */
function addTemplate(builder, sf, fileText, node) {
  const segments = [node.head, ...node.templateSpans.map((s) => s.literal)];
  let end = node.end;
  segments.forEach((seg, idx) => {
    const start = seg.getStart(sf);
    const close = ts.isTemplateTail(seg) ? 1 : 2; // tail ends with ` ; head/middle with ${
    const { cooked, map: m } = decodeLiteral(fileText.slice(start + 1, seg.end - close), start + 1);
    builder.literal(cooked, m);
    if (idx < segments.length - 1) builder.hole(seg.end - close);
    else end = m[m.length - 1];
  });
  return end;
}

/** A template with substitutions: segments joined by a stand-in per `${}`. */
function templateView(sf, fileText, node, lineOf) {
  const builder = new ViewBuilder();
  const end = addTemplate(builder, sf, fileText, node);
  return builder.done(end, { encode: encoderFor('`'), line: lineOf(node.getStart(sf)) });
}

/** The operands of a `+` chain, left to right (`a + b + c` parses as `(a + b) + c`). */
function plusOperands(node) {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return [...plusOperands(node.left), ...plusOperands(node.right)];
  }
  return [node];
}

/** True for the outermost `+` of a chain that joins at least one string. */
function isStringChain(node) {
  if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.PlusToken) return false;
  const p = node.parent;
  if (p && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken) return false;
  return plusOperands(node).some((o) => isLineLiteral(o) || ts.isTemplateExpression(o));
}

/**
 * A `+` chain of strings as one view: `'create Kemp\n' + '  a person\n'`
 * reads as the program builds it. Each operand keeps its own quote, so a
 * splice is escaped for the literal it lands in; any operand that is not a
 * literal is a hole.
 */
function chainView(sf, fileText, node, lineOf) {
  const builder = new ViewBuilder();
  const encoders = [];
  let end = node.end;
  for (const op of plusOperands(node)) {
    const start = op.getStart(sf);
    if (isLineLiteral(op)) {
      const { cooked, map: m } = decodeLiteral(fileText.slice(start + 1, op.end - 1), start + 1);
      builder.literal(cooked, m);
      encoders.push({ from: start, to: op.end, encode: encoderFor(fileText[start]) });
      end = op.end - 1;
    } else if (ts.isTemplateExpression(op)) {
      end = addTemplate(builder, sf, fileText, op);
      encoders.push({ from: start, to: op.end, encode: encoderFor('`') });
    } else {
      builder.hole(start);
      end = op.end;
    }
  }
  const encodeAt = (at) => (encoders.find((e) => at > e.from && at < e.to) ?? encoders[encoders.length - 1]).encode;
  return builder.done(end, { encode: encoders[0]?.encode ?? ((s) => s), encodeAt, line: lineOf(node.getStart(sf)) });
}

/** dedentView that carries the holes through (holes shift with the stripped text). */
function dedentWithHoles(view, fixed = null) {
  if (view.holes.length === 0) return dedentView(view, fixed);
  const marked = dedentView(view, fixed);
  // Recompute each hole in dedented offsets: the span of view offsets whose
  // characters came from the hole's stand-in.
  const holes = [];
  for (const [hs] of view.holes) {
    const fo = view.map[hs];
    const s = marked.map.indexOf(fo);
    if (s < 0) continue;
    let e = s;
    while (e < marked.text.length && marked.map[e] === fo) e++;
    holes.push([s, Math.max(e, s + 1)]);
  }
  return { ...marked, holes };
}

// --------------------------------------------------------------------------
// swift
// --------------------------------------------------------------------------

/**
 * Decode a Swift string body: escapes cook, `\(…)` becomes a stand-in word.
 * @returns {{ text: string, map: number[], holes: Array<[number, number]> }}
 */
function decodeSwift(raw, base) {
  const singles = { n: '\n', t: '\t', r: '\r', 0: '\0', '\\': '\\', '"': '"', "'": "'" };
  let text = '';
  const map = [];
  const holes = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\' && raw[i + 1] === '(') {
      let depth = 1;
      let j = i + 2;
      while (j < raw.length && depth > 0) {
        if (raw[j] === '(') depth++;
        else if (raw[j] === ')') depth--;
        j++;
      }
      const s = text.length;
      for (const c of INTERPOLATION_STAND_IN) {
        text += c;
        map.push(base + i);
      }
      holes.push([s, text.length]);
      i = j;
      continue;
    }
    if (ch === '\\' && raw[i + 1] === 'u' && raw[i + 2] === '{') {
      const close = raw.indexOf('}', i);
      text += String.fromCodePoint(parseInt(raw.slice(i + 3, close), 16));
      map.push(base + i);
      i = close + 1;
      continue;
    }
    if (ch === '\\' && raw[i + 1] in singles) {
      text += singles[raw[i + 1]];
      map.push(base + i);
      i += 2;
      continue;
    }
    text += ch;
    map.push(base + i);
    i++;
  }
  map.push(base + raw.length);
  return { text, map, holes };
}

/** Escape view text for a Swift literal; a one-line literal also escapes newlines. */
function swiftEncoder(multiline) {
  return (s) => {
    let out = s.split('\\').join('\\\\');
    if (!multiline) out = out.split('"').join('\\"').split('\n').join('\\n');
    return out;
  };
}

/**
 * Every Swift string literal (`"…"` or `"""…"""`) that carries a create line.
 * Comments are skipped; raw strings (`#"…"#`) are reported, not read.
 * @returns {{ views: View[], reports: string[] }}
 */
function swiftViews(fileName, fileText) {
  const views = [];
  const reports = [];
  const lineAt = (pos) => {
    let n = 1;
    for (let k = 0; k < pos; k++) if (fileText[k] === '\n') n++;
    return n;
  };
  let i = 0;
  while (i < fileText.length) {
    const ch = fileText[i];
    if (ch === '/' && fileText[i + 1] === '/') {
      while (i < fileText.length && fileText[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && fileText[i + 1] === '*') {
      let depth = 1;
      i += 2;
      while (i < fileText.length && depth > 0) {
        if (fileText.startsWith('/*', i)) (depth++, (i += 2));
        else if (fileText.startsWith('*/', i)) (depth--, (i += 2));
        else i++;
      }
      continue;
    }
    if (ch === '#' && fileText[i + 1] === '"') {
      const close = fileText.indexOf('"#', i + 2);
      if (hasCreateLine(fileText.slice(i, close))) reports.push(`${fileName}:${lineAt(i)}: raw string literal; edit by hand`);
      i = close + 2;
      continue;
    }
    if (fileText.startsWith('"""', i)) {
      const bodyStart = fileText.indexOf('\n', i) + 1;
      const close = fileText.indexOf('"""', bodyStart);
      const closeLineStart = fileText.lastIndexOf('\n', close) + 1;
      const closeIndent = close - closeLineStart;
      const bodyEnd = Math.max(bodyStart, closeLineStart - 1); // drop the newline before the closing line
      const d = decodeSwift(fileText.slice(bodyStart, bodyEnd), bodyStart);
      if (hasCreateLine(d.text)) {
        const view = { text: d.text, map: d.map, holes: d.holes, encode: swiftEncoder(true), indent: '', line: lineAt(bodyStart) };
        views.push(dedentWithHoles(view, closeIndent));
      }
      i = close + 3;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let depth = 0;
      while (j < fileText.length) {
        if (fileText[j] === '\\') {
          if (fileText[j + 1] === '(') {
            depth++;
            j += 2;
            continue;
          }
          j += 2;
          continue;
        }
        if (depth > 0) {
          if (fileText[j] === '(') depth++;
          else if (fileText[j] === ')') depth--;
          j++;
          continue;
        }
        if (fileText[j] === '"' || fileText[j] === '\n') break;
        j++;
      }
      const d = decodeSwift(fileText.slice(i + 1, j), i + 1);
      if (hasCreateLine(d.text)) {
        if (!d.text.includes('\n')) reports.push(`${fileName}:${lineAt(i)}: one-line literal \`${d.text.trim()}\`; not treated as Chord`);
        else views.push(dedentWithHoles({ text: d.text, map: d.map, holes: d.holes, encode: swiftEncoder(false), indent: '', line: lineAt(i) }));
      }
      i = j + 1;
      continue;
    }
    i++;
  }
  return { views, reports };
}

// --------------------------------------------------------------------------
// foreign hosts
// --------------------------------------------------------------------------

/** Lines of a Swift/C# file that look like a create header, for a manual edit list. */
function reportForeign(fileName, fileText) {
  const { starts, ends } = indexLines(fileText);
  const out = [];
  for (let l = 0; l < starts.length; l++) {
    const t = fileText.slice(starts[l], ends[l]);
    const at = t.indexOf('create ');
    if (at >= 0 && /^(the|a|an) /.test(t.slice(at + 7))) out.push(`${fileName}:${l + 1}: ${t.trim()}`);
  }
  return out;
}

// --------------------------------------------------------------------------
// entry
// --------------------------------------------------------------------------

/**
 * Migrate one file's Chord.
 * @param {string} fileName used for the host choice and in reports
 * @param {string} text the file's text
 * @returns {{ text: string, blocks: object[], skipped: object[], reports: string[], parseErrorViews: number }}
 *   text is the migrated file (unchanged when nothing applies); blocks and
 *   skipped carry file-relative lines; reports list what needs a hand edit
 */
function migrateFile(fileName, text) {
  const host = hostOf(fileName);
  if (host === 'foreign') return { text, blocks: [], skipped: [], reports: reportForeign(fileName, text), parseErrorViews: 0 };
  if (host === null) return { text, blocks: [], skipped: [], reports: [], parseErrorViews: 0 };

  let views;
  let reports = [];
  if (host === 'story') views = [sliceView(text, 0, text.length, 1)];
  else if (host === 'markdown') views = markdownViews(text);
  else if (host === 'swift') ({ views, reports } = swiftViews(fileName, text));
  else ({ views, reports } = scriptViews(fileName, text));

  const fileEdits = [];
  const blocks = [];
  const skipped = [];
  let parseErrorViews = 0;
  for (const view of views) {
    const plan = planChordText(view.text);
    if (plan.parseErrors > 0) parseErrorViews++;
    for (const s of plan.skipped) skipped.push({ ...s, line: view.line + s.line - 1 });
    for (const b of plan.blocks) {
      const line = view.line + b.line - 1;
      if (view.holes.some(([hs, he]) => hs < b.range[1] && he > b.range[0])) {
        skipped.push({ reason: '`${}` inside the block', line, name: b.name });
        continue;
      }
      // A header with nothing under it, followed by a hole, may take its
      // whole body from that value (`'create Kemp\n' + BODY`, `${safeLines}`).
      const headerOnly = !/[\r\n]/.test(view.text.slice(b.range[0], b.range[1]));
      let next = b.range[1];
      while (next < view.text.length && /\s/.test(view.text[next])) next++;
      if (headerOnly && view.holes.some(([hs]) => hs >= b.range[1] && hs <= next)) {
        skipped.push({ reason: '`${}` right after the header may supply the block', line, name: b.name });
        continue;
      }
      // An embedded literal that ends on the block's header may be a fragment
      // spliced into a larger story (`.replace('create the Alley', …)`).
      if (host !== 'story' && host !== 'markdown' && headerOnly && view.text.slice(b.range[1]).trim() === '') {
        skipped.push({ reason: 'the literal ends on the block header', line, name: b.name });
        continue;
      }
      fileEdits.push(...b.edits.map((e) => toFileEdit(view, e)));
      blocks.push({ rule: b.rule, line, name: b.name });
    }
  }
  const { applyEdits } = require('./core.js');
  return { text: applyEdits(text, fileEdits), blocks, skipped, reports, parseErrorViews };
}

module.exports = { migrateFile, hostOf, reportForeign, decodeLiteral };
