#!/usr/bin/env node
/**
 * generate-chord-appendices.cjs — regenerate the Chord manual's generated
 * appendices (docs/book/chord-v4.0.2/backmatter/) from the shipped sources.
 *
 * Purpose: one script owns Appendices A to G of *The Chord Manual*, so no
 * appendix is ever hand-edited.
 *
 * Usage: node scripts/generate-chord-appendices.cjs
 *          [--chord-module <dir holding @sharpee/chord's index.js>]
 *          [--sharpee-cli <path to the sharpee CLI's cli.js>]
 *          [--out <directory to write the appendix files into>]
 *        Defaults: the in-repo builds (packages/chord/dist, packages/devkit/dist/cli.js),
 *        which must exist, and the edition's backmatter directory.
 *
 * Sources, one per appendix:
 *   A  the grammar                      packages/chord/chord.ebnf (comments dropped)
 *   B  kinds, trait words, state words  @sharpee/chord catalog and manifest exports
 *   C  standard actions and gerunds     packages/parser-en-us/grammar/standard-en-us.story
 *   D  statements and conditions        packages/chord/chord.ebnf (one alternative per line)
 *   E  character vocabulary             @sharpee/chord CHARACTER_MANIFEST
 *   F  message aliases                  `sharpee messages`
 *   G  removed forms                    @sharpee/chord REMOVED_FORMS, each example compiled
 *
 * Invariants (each one throws when broken, so a drifted source fails loudly):
 *   - no output carries an "ADR-" reference (the manual cites none);
 *   - an appendix's entry count equals a count taken from its source by a
 *     second route (printed side by side; a mismatch exits 1). Appendix D has
 *     no second route, since its lines are the grammar's alternatives as this
 *     script splits them; its test pins known lines instead. Appendix G's
 *     guard is stronger than a count: every entry's example must raise its code;
 *   - output is a pure function of the sources: no dates, sorted where the
 *     source order carries no meaning, so a second run leaves no diff.
 *
 * Public interface: the CLI above; the pure helpers are exported for
 * scripts/__tests__/generate-chord-appendices.test.ts.
 * Owner context: docs/book authoring toolchain; the Chord manual plan
 * (docs/work/chord-manual/plan.md, Phase 6).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EBNF = path.join(ROOT, 'packages/chord/chord.ebnf');
const STANDARD_GRAMMAR = path.join(ROOT, 'packages/parser-en-us/grammar/standard-en-us.story');
const DEFAULT_OUT = path.join(ROOT, 'docs/book/chord-v4.0.2/backmatter');
const DEFAULT_CHORD = path.join(ROOT, 'packages/chord/dist');
const DEFAULT_CLI = path.join(ROOT, 'packages/devkit/dist/cli.js');
const SELF = 'scripts/generate-chord-appendices.cjs';

const FILES = {
  A: 'appendix-a-the-grammar.md',
  B: 'appendix-b-kinds-trait-words-and-state-words.md',
  C: 'appendix-c-the-standard-actions-and-their-gerunds.md',
  D: 'appendix-d-statements-and-conditions.md',
  E: 'appendix-e-character-vocabulary.md',
  F: 'appendix-f-message-aliases.md',
  G: 'appendix-g-removed-forms-and-their-replacements.md',
};

// ---------------------------------------------------------------- helpers

/** Throws with the given message unless the condition holds. */
function invariant(condition, message) {
  if (!condition) throw new Error(`generate-chord-appendices: ${message}`);
}

/** Removes every EBNF comment. The grammar's comments do not nest. */
function stripComments(ebnf) {
  const stripped = ebnf.replace(/\(\*[\s\S]*?\*\)/g, '');
  invariant(!stripped.includes('(*') && !stripped.includes('*)'), 'an EBNF comment did not close');
  return stripped;
}

/** Drops trailing blanks and empty lines from a block of grammar text. */
function tidyLines(text) {
  return text.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim() !== '');
}

/**
 * Splits an EBNF body at its top-level `|`: outside quotes and outside every
 * ( ), [ ] and { } group. Returns each alternative with its whitespace collapsed.
 */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of body) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
    } else if (ch === '|' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  invariant(depth === 0 && quote === null, `unbalanced EBNF body: ${body.slice(0, 60)}`);
  parts.push(current);
  return parts.map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p !== '');
}

/**
 * Parses comment-free EBNF into a Map of rule name to body. Every rule ends
 * at a `;` and the grammar writes no `;` inside a literal.
 */
function parseRules(strippedEbnf) {
  const rules = new Map();
  for (const chunk of strippedEbnf.split(';')) {
    const text = chunk.trim();
    if (text === '') continue;
    const match = /^([A-Za-z][A-Za-z0-9-]*)\s*=\s*([\s\S]*)$/.exec(text);
    invariant(match, `not a rule: ${text.slice(0, 60)}`);
    invariant(!rules.has(match[1]), `rule defined twice: ${match[1]}`);
    rules.set(match[1], match[2]);
  }
  return rules;
}

/**
 * The alternatives of a rule, one per entry. An alternative that is only the
 * name of another lowercase rule is replaced by that rule's alternatives, and
 * an alternative longer than 120 characters that ends in a parenthesized
 * choice is written once per choice.
 */
function alternativesOf(rules, name) {
  invariant(rules.has(name), `the grammar has no rule named ${name}`);
  const out = [];
  for (const alt of splitTopLevel(rules.get(name))) {
    if (/^[a-z][A-Za-z0-9-]*$/.test(alt) && rules.has(alt)) {
      out.push(...alternativesOf(rules, alt));
      continue;
    }
    out.push(...expandTrailingChoice(alt));
  }
  return out;
}

/** Writes `prefix ( a | b )` as `prefix a`, `prefix b` when the line is long. */
function expandTrailingChoice(alt) {
  if (alt.length <= 120 || !alt.endsWith(')')) return [alt];
  let depth = 0;
  let quote = null;
  let open = -1;
  for (let i = alt.length - 1; i >= 0; i--) {
    const ch = alt[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ')') {
      depth++;
    } else if (ch === '(') {
      depth--;
      if (depth === 0) { open = i; break; }
    }
  }
  invariant(open >= 0, `no opening parenthesis: ${alt.slice(0, 60)}`);
  const inner = splitTopLevel(alt.slice(open + 1, -1));
  if (inner.length < 2) return [alt];
  const prefix = alt.slice(0, open).trim();
  return inner.map((choice) => `${prefix} ${choice}`.trim());
}

/** A section title from the grammar's `---- title ----` comment, without citations. */
function sectionTitle(raw) {
  const title = raw
    .replace(/\([^)]*\)/g, '')
    .replace(/ADR-\d+\S*/g, '')
    .replace(/\s+—\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  invariant(title !== '', `empty section title from: ${raw}`);
  return title[0].toUpperCase() + title.slice(1);
}

/**
 * Splits the grammar file into its sections. Returns the notation legend from
 * the header comment and, per section, its title and comment-free lines.
 */
function parseGrammarSections(ebnf) {
  const marker = /^\(\* ---- (.+?) -{2,} \*\)\s*$/;
  const sections = [];
  let current = { title: null, raw: [] };
  for (const line of ebnf.split('\n')) {
    const match = marker.exec(line);
    if (match) {
      sections.push(current);
      current = { title: sectionTitle(match[1]), raw: [] };
    } else {
      current.raw.push(line);
    }
  }
  sections.push(current);
  const header = sections.shift().raw;
  const from = header.findIndex((l) => l.trim() === 'Notation:');
  const to = header.findIndex((l, i) => i > from && /^\s*=+\s*\*\)\s*$/.test(l));
  invariant(from >= 0 && to > from, 'the grammar header has no Notation block');
  const legend = header.slice(from, to).map((l) => l.replace(/^ {3}/, '').replace(/\s+$/, ''));
  return {
    legend,
    sections: sections
      .map((s) => ({ title: s.title, lines: tidyLines(stripComments(s.raw.join('\n'))) }))
      .filter((s) => s.lines.length > 0),
  };
}

/**
 * Parses the standard grammar file into its `define action` blocks, in file
 * order. Each block keeps its body lines as written, without comment lines.
 */
function parseStandardGrammar(source) {
  const blocks = [];
  let current = null;
  for (const line of source.split('\n')) {
    const head = /^define action (\S+)\s*$/.exec(line);
    if (head) {
      current = { name: head[1], lines: [] };
      blocks.push(current);
      continue;
    }
    if (line.trim() === '' || line.trim().startsWith('##')) continue;
    if (!current) {
      invariant(/^grammar "/.test(line), `unexpected line before the first action: ${line}`);
      continue;
    }
    invariant(/^ {2,}\S/.test(line), `unexpected line in ${current.name}: ${line}`);
    current.lines.push(line);
  }
  return blocks;
}

/** The first word of each typed pattern in a block (the 4-space lines). */
function verbsOf(block) {
  const verbs = new Set();
  for (const line of block.lines) {
    const pattern = /^ {4}(\S+)/.exec(line);
    if (pattern && /^[a-z']+$/.test(pattern[1])) verbs.add(pattern[1]);
  }
  return verbs;
}

/** Plain text for a table cell: every ASCII punctuation mark escaped, so Pandoc prints it as written. */
function escapeCell(text) {
  return text.replace(/[!-/:-@[-`{-~]/g, '\\$&');
}

/** A message template as one table cell. A line break is shown as the code `\n`. */
function templateCell(template) {
  if (template === '') return '(empty)';
  return template.split('\n').map(escapeCell).join(' `\\n` ');
}

/** An inline code span. */
function code(text) {
  invariant(!text.includes('`'), `backtick in a code span: ${text}`);
  return `\`${text}\``;
}

/** A pipe table from a header row and body rows. */
function table(header, rows) {
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [line(header), line(header.map(() => '---')), ...rows.map(line)].join('\n') + '\n';
}

/** A fenced block. The language is never `chord` or `shell`, which the snippet extractor collects. */
function fence(language, lines) {
  invariant(language !== 'chord' && language !== 'shell', 'appendix fences are not snippets');
  return `\`\`\`${language}\n${lines.join('\n')}\n\`\`\`\n`;
}

const byWord = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ------------------------------------------------------------- appendices

/** Appendix A: the grammar's productions by section, comments dropped. */
function buildAppendixA(ebnf, pin) {
  const { legend, sections } = parseGrammarSections(ebnf);
  const ruleCount = parseRules(stripComments(ebnf)).size;
  let md = `# Appendix A. The grammar {.unnumbered}

The Chord grammar in EBNF, as the compiler implements it: ${ruleCount} rules in ${sections.length} sections.
The grammar file's comments are left out, so this is the productions alone. Generated from
\`chord.ebnf\` (${pin}) by \`${SELF}\`.

`;
  md += fence('text', legend);
  for (const section of sections) {
    md += `\n## ${section.title} {.unnumbered .unlisted}\n\n${fence('ebnf', section.lines)}`;
  }
  const sourceCount = stripComments(ebnf).split(';').length - 1;
  return { md, count: ruleCount, sourceCount, unit: 'rules', source: 'rule terminators in chord.ebnf' };
}

/** Appendix B: kinds, trait words with their settings, state words and their pairings. */
function buildAppendixB(chord, pin) {
  const settingKind = { 'entity-ref': 'a thing' };
  const needs = (manifest) => (manifest.core ? '' : code(`use ${manifest.name}`));

  const kinds = [...chord.KIND_NOUNS].map((word) => [word, '']);
  const traits = [...chord.TRAIT_ADJECTIVES].map((word) => {
    const schema = chord.STDLIB_MANIFEST.settingSchema[word] || {};
    const settings = Object.entries(schema).map(([key, type]) => {
      invariant(settingKind[type], `no label for setting type ${type} on ${word}`);
      return `${key}: ${settingKind[type]}`;
    });
    return [word, settings.join('; '), ''];
  });
  let extensionKinds = 0;
  let extensionTraits = 0;
  for (const [, manifest] of chord.EXTENSION_MANIFESTS) {
    for (const word of manifest.kindNouns || []) {
      kinds.push([word, needs(manifest)]);
      extensionKinds++;
    }
    for (const adjective of manifest.traitAdjectives) {
      const settings = adjective.fields.map((f) => `${f.key}: a ${f.valueKind}`);
      traits.push([adjective.word, settings.join('; '), needs(manifest)]);
      extensionTraits++;
    }
  }
  for (const rows of [kinds, traits]) {
    const words = rows.map((r) => r[0]);
    invariant(new Set(words).size === words.length, 'a word is listed twice in Appendix B');
    rows.sort((a, b) => byWord(a[0], b[0]));
  }
  const states = [...chord.STATE_ADJECTIVES].sort(byWord);
  const pairs = chord.PLATFORM_STATE_PAIRS.map((p) => [code(p.pair[0]), code(p.pair[1]), code(p.trait)]);
  const starts = [...chord.STARTS_STATE_PAIRINGS].sort((a, b) => byWord(a[0], b[0]));
  const changes = [...chord.CHANGE_STATE_PAIRINGS].sort((a, b) => byWord(a[0], b[0]));

  const md = `# Appendix B. Kinds, trait words, state words and their pairings {.unnumbered}

The closed word lists the compiler checks a story against: ${kinds.length} kinds, ${traits.length} trait words
and ${states.length} state words. A word marked with a \`use\` line belongs to an opt-in system and needs
that line in the story. Generated from the \`@sharpee/chord\` vocabulary (${pin}) by
\`${SELF}\`.

## Kinds {.unnumbered .unlisted}

${table(['Kind', 'Needs'], kinds.map(([w, n]) => [code(w), n]))}
## Trait words and their settings {.unnumbered .unlisted}

${table(['Trait word', 'Settings', 'Needs'], traits.map(([w, s, n]) => [code(w), s, n]))}
## State words {.unnumbered .unlisted}

${table(['State word'], states.map((w) => [code(w)]))}
## State pairs the platform owns {.unnumbered .unlisted}

A thing with the trait word already has this pair, so a story does not declare it as states.

${table(['State', 'Opposite', 'Trait word'], pairs)}
## Words after \`starts\` {.unnumbered .unlisted}

${table(['Word', 'Needs the trait word'], starts.map(([w, t]) => [code(w), code(t)]))}
## Words after \`change … to\` {.unnumbered .unlisted}

${table(['Word', 'Needs the trait word'], changes.map(([w, t]) => [code(w), code(t)]))}`;

  const count = kinds.length + traits.length + states.length + pairs.length + starts.length + changes.length;
  const sourceCount =
    chord.KIND_NOUNS.size + extensionKinds + chord.TRAIT_ADJECTIVES.size + extensionTraits +
    chord.STATE_ADJECTIVES.size + chord.PLATFORM_STATE_PAIRS.length +
    chord.STARTS_STATE_PAIRINGS.size + chord.CHANGE_STATE_PAIRINGS.size;
  return { md, count, sourceCount, unit: 'rows', source: 'catalog and manifest entries' };
}

/** Appendix C: every standard action, its typed patterns, and a verb index. */
function buildAppendixC(grammarSource, chord, pin) {
  const blocks = parseStandardGrammar(grammarSource);
  const names = blocks.map((b) => b.name);
  invariant(new Set(names).size === names.length, 'a standard action is defined twice');
  const actionIds = chord.STDLIB_MANIFEST.actionIds;
  for (const name of names) {
    invariant(actionIds.has(`if.action.${name}`), `the standard grammar defines an unknown action: ${name}`);
  }
  const ungrammared = [...actionIds]
    .map((id) => id.replace(/^if\.action\./, ''))
    .filter((name) => !names.includes(name))
    .sort(byWord);

  const verbIndex = new Map();
  for (const block of blocks) {
    for (const verb of verbsOf(block)) {
      if (!verbIndex.has(verb)) verbIndex.set(verb, []);
      verbIndex.get(verb).push(block.name);
    }
  }
  const verbRows = [...verbIndex.keys()].sort(byWord)
    .map((verb) => [code(verb), verbIndex.get(verb).sort(byWord).map(code).join(', ')]);

  let md = `# Appendix C. The standard actions and their gerunds {.unnumbered}

Every action the platform ships: ${actionIds.size} actions, ${blocks.length} of them with typed commands. The
heading of each entry is the gerund a clause names (\`on the player taking\`), and the block under it
is that action's entry in the standard grammar, as shipped. Generated from the standard grammar
(${pin}) by \`${SELF}\`.

## Verbs and the actions they reach {.unnumbered .unlisted}

The first word of every typed command, and the action or actions it can reach.

${table(['Verb', 'Action'], verbRows)}`;
  for (const block of [...blocks].sort((a, b) => byWord(a.name, b.name))) {
    md += `\n## ${code(block.name)} {.unnumbered .unlisted}\n\n${fence('text', block.lines)}`;
  }
  md += `\n## Actions with no typed command of their own {.unnumbered .unlisted}\n\n`;
  md += `The standard grammar gives these no command: ${ungrammared.map(code).join(', ')}.\n`;

  const sourceCount = grammarSource.split('\n').filter((l) => l.startsWith('define action ')).length;
  return { md, count: blocks.length, sourceCount, unit: 'actions', source: '`define action` lines in the standard grammar' };
}

/** Appendix D: each statement, condition and predicate alternative on one line. */
function buildAppendixD(ebnf, pin) {
  const rules = parseRules(stripComments(ebnf));
  const asWritten = (name) => {
    invariant(rules.has(name), `the grammar has no rule named ${name}`);
    return `${name} = ${rules.get(name).replace(/\s+/g, ' ').trim()} ;`;
  };
  const statements = alternativesOf(rules, 'statement');
  const conditions = alternativesOf(rules, 'unary');
  const predicates = alternativesOf(rules, 'predicate');
  const supporting = [
    'stmt-when', 'timer-verb', 'place', 'verb-words', 'phrase-key', 'param', 'must-subject', 'infinitive',
    'emit-field', 'emit-value', 'disposition', 'repetition-words', 'recency-word', 'word-compare', 'compare-op',
    'counter-ref', 'value-expr', 'name', 'inline-prose', 'prose-paragraph', 'STRATEGY', 'ORDINAL', 'DIRECTION',
  ].map(asWritten);

  const md = `# Appendix D. Statements and conditions {.unnumbered}

Every statement a clause body may hold and every test a condition may make, one form to a line, in
the notation of Appendix A: ${statements.length} statements, ${conditions.length} conditions and ${predicates.length} predicates.
Generated from \`chord.ebnf\` (${pin}) by \`${SELF}\`.

## Statements {.unnumbered .unlisted}

${fence('ebnf', statements)}
## Conditions {.unnumbered .unlisted}

A condition joins tests with \`and\` and \`or\`; \`not\` binds tightest.

${fence('ebnf', [asWritten('condition'), asWritten('and-expr')])}
Each test is one of these.

${fence('ebnf', conditions)}
## Predicates {.unnumbered .unlisted}

What may follow the value a test starts with.

${fence('ebnf', predicates)}
## The rules these lines name {.unnumbered .unlisted}

${fence('ebnf', supporting)}`;

  const count = statements.length + conditions.length + predicates.length;
  const direct = (name) => splitTopLevel(rules.get(name)).length;
  return {
    md, count, sourceCount: null, unit: 'lines',
    source: `no second count; ${direct('statement')} + ${direct('unary')} + ${direct('predicate')} direct alternatives of statement, unary and predicate, references and long choices expanded`,
  };
}

/** Appendix E: the character vocabulary, one row per closed word list. */
function buildAppendixE(chord, pin) {
  const labels = {
    personality: 'Personality words',
    intensities: 'Intensity words',
    moods: 'Moods',
    moodModifiers: 'Mood modifiers',
    dispositions: 'Dispositions',
    threats: 'Threat words',
    confidences: 'Confidence words, weakest first',
    factSources: 'Fact sources',
    resistanceModes: 'Resistance modes',
    audiences: 'Audiences',
    goalPriorities: 'Goal priorities',
    influenceModes: 'Influence modes',
    influenceRanges: 'Influence ranges',
    forces: 'Forces',
    actCategories: 'Act categories',
    obligationWords: 'Obligation words',
    faceActs: 'Face acts',
    pressureBands: 'Pressure bands, lightest first',
  };
  const manifest = chord.CHARACTER_MANIFEST;
  const listRows = [];
  let words = 0;
  for (const [key, value] of Object.entries(manifest)) {
    if (key === 'cognitiveDimensions' || key === 'profilePresets') continue;
    invariant(labels[key], `the character manifest has a list this script does not label: ${key}`);
    invariant(Array.isArray(value), `not a word list: ${key}`);
    listRows.push([labels[key], value.map(code).join(', ')]);
    words += value.length;
  }
  const dimensions = Object.entries(manifest.cognitiveDimensions);
  const dimensionRows = dimensions.map(([name, values]) => [code(name), values.map(code).join(', ')]);
  const presets = Object.entries(manifest.profilePresets).sort((a, b) => byWord(a[0], b[0]));
  const presetRows = presets.map(([name, values]) => {
    invariant(Object.keys(values).length === dimensions.length, `preset ${name} does not set every dimension`);
    return [code(name), ...dimensions.map(([dimension]) => code(values[dimension]))];
  });

  const md = `# Appendix E. Character vocabulary {.unnumbered}

The closed word lists of the character model: ${words} words in ${listRows.length} lists, ${dimensions.length} cognitive dimensions and
${presets.length} profile presets. Generated from the \`@sharpee/chord\` character vocabulary (${pin}) by
\`${SELF}\`.

## Word lists {.unnumbered .unlisted}

${table(['List', 'Words'], listRows)}
## Cognitive dimensions {.unnumbered .unlisted}

${table(['Dimension', 'Values'], dimensionRows)}
## Profile presets {.unnumbered .unlisted}

${table(['Preset', ...dimensions.map(([name]) => code(name))], presetRows)}`;

  const count = listRows.length + dimensionRows.length + presetRows.length;
  const sourceCount = Object.keys(manifest).length - 2 + dimensions.length + Object.keys(manifest.profilePresets).length;
  return { md, count, sourceCount, unit: 'rows', source: 'CHARACTER_MANIFEST lists, dimensions and presets' };
}

/** Appendix F: every overridable message, grouped by action, alias beside default text. */
function buildAppendixF(catalog, chord, pin) {
  const groups = new Map();
  for (const message of catalog.messages) {
    const match = /^if\.action\.([a-z_]+)\./.exec(message.id);
    invariant(match, `a message id outside if.action.*: ${message.id}`);
    if (!groups.has(match[1])) groups.set(match[1], []);
    groups.get(match[1]).push(message);
  }
  const aliases = catalog.messages.map((m) => m.alias);
  invariant(new Set(aliases).size === aliases.length, 'a message alias is emitted twice');

  let md = `# Appendix F. Message aliases {.unnumbered}

Every standard message a story can replace with \`override message\`: ${catalog.messages.length} aliases in ${groups.size} groups,
one group per action, each alias beside the text the platform prints by default. A \`\\n\` marks a
line break in the text. Generated from the output of \`sharpee messages\` (${pin}, locale ${catalog.locale}) by
\`${SELF}\`.
`;
  for (const group of [...groups.keys()].sort(byWord)) {
    const rows = groups.get(group)
      .sort((a, b) => byWord(a.alias, b.alias))
      .map((m) => [code(m.alias), templateCell(m.template)]);
    md += `\n## ${code(group)} {.unnumbered .unlisted}\n\n${table(['Alias', 'Default text'], rows)}`;
  }
  return {
    md, count: catalog.messages.length, sourceCount: chord.MESSAGE_OVERRIDE_ALIASES.size,
    unit: 'aliases', source: 'MESSAGE_OVERRIDE_ALIASES in @sharpee/chord',
  };
}

/**
 * Appendix G: every removed form, what replaces it, and what the compiler
 * says. Each entry's example is compiled, so the message printed is the one
 * the compiler gives, and an entry whose example no longer raises its code
 * fails the run.
 */
function buildAppendixG(chord, pin) {
  const forms = [...chord.REMOVED_FORMS].sort((a, b) => byWord(a.code, b.code));
  const said = new Map();
  for (const form of forms) {
    const raised = chord.compile(form.example).diagnostics.find((d) => d.code === form.code);
    invariant(raised, `the example for ${form.code} no longer raises it`);
    said.set(form.code, raised.message);
  }
  const rows = forms.map((form) => [form.form, form.replacement, code(form.code)]);

  let md = `# Appendix G. Removed forms and their replacements {.unnumbered}

Forms Chord no longer accepts: ${forms.length} of them. The compiler still knows each one by name, so a story
that uses one gets an error that says what to write instead. The table gives each form, its
replacement and the error's code; the entries under it show a source that raises the error and the
compiler's own words. Generated from the \`@sharpee/chord\` registry of removed forms (${pin}) by
\`${SELF}\`.

${table(['Removed form', 'Write instead', 'Error'], rows)}`;
  for (const form of forms) {
    md += `\n## ${code(form.code)} {.unnumbered .unlisted}\n\n`;
    md += fence('text', form.example.replace(/\n$/, '').split('\n'));
    md += `\n${fence('text', said.get(form.code).split('\n'))}`;
  }
  return { md, count: said.size, sourceCount: chord.REMOVED_FORMS.length, unit: 'forms', source: 'entries in REMOVED_FORMS, each example compiled and raising its code' };
}

// ------------------------------------------------------------------- main

/** Reads `--name value` options from argv. */
function parseOptions(argv) {
  const options = { chord: DEFAULT_CHORD, cli: DEFAULT_CLI, out: DEFAULT_OUT };
  const names = { '--chord-module': 'chord', '--sharpee-cli': 'cli', '--out': 'out' };
  for (let i = 0; i < argv.length; i += 2) {
    invariant(names[argv[i]] && argv[i + 1], `unknown or incomplete option: ${argv[i]}`);
    options[names[argv[i]]] = path.resolve(argv[i + 1]);
  }
  return options;
}

/**
 * Builds Appendices A to G from the sources and writes them into the output
 * directory. Returns the count report; throws before writing anything when an
 * invariant fails or a count differs from its source.
 */
function generate(options) {
  const chord = require(path.join(options.chord, 'index.js'));
  const ebnf = fs.readFileSync(EBNF, 'utf8');
  const grammarSource = fs.readFileSync(STANDARD_GRAMMAR, 'utf8');
  const version = execFileSync('node', [options.cli, '--version'], { encoding: 'utf8' }).trim();
  const catalog = JSON.parse(execFileSync('node', [options.cli, 'messages'], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
  }));

  const built = {
    A: buildAppendixA(ebnf, version),
    B: buildAppendixB(chord, version),
    C: buildAppendixC(grammarSource, chord, version),
    D: buildAppendixD(ebnf, version),
    E: buildAppendixE(chord, version),
    F: buildAppendixF(catalog, chord, version),
    G: buildAppendixG(chord, version),
  };
  const report = [];
  for (const [letter, appendix] of Object.entries(built)) {
    invariant(!/ADR-/.test(appendix.md), `Appendix ${letter} carries an ADR reference`);
    report.push({ letter, ...appendix });
  }
  const mismatched = report.filter((r) => r.sourceCount !== null && r.count !== r.sourceCount);
  invariant(mismatched.length === 0,
    mismatched.map((r) => `Appendix ${r.letter} has ${r.count} ${r.unit}, its source has ${r.sourceCount}`).join('; '));
  for (const r of report) fs.writeFileSync(path.join(options.out, FILES[r.letter]), r.md);
  return { version, report };
}

if (require.main === module) {
  try {
    const { version, report } = generate(parseOptions(process.argv.slice(2)));
    console.log(`Sources at ${version}`);
    for (const r of report) {
      const second = r.sourceCount === null ? '' : `${r.sourceCount} `;
      console.log(`Appendix ${r.letter}: ${r.count} ${r.unit}; source: ${second}(${r.source})`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  stripComments, splitTopLevel, parseRules, alternativesOf, expandTrailingChoice, sectionTitle,
  parseGrammarSections, parseStandardGrammar, verbsOf, escapeCell, templateCell, generate, FILES,
};
