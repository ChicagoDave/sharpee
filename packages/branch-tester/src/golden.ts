/**
 * `.golden` recording format — reader/writer (ADR-294 D3/D7).
 *
 * A golden recording is the committed regression baseline for one transcript
 * at one seed: a provenance header (`key: value` lines), a `---` separator,
 * then the recorded turns verbatim. This module owns (de)serialization only —
 * recording, diffing, and blessing live in the runner.
 *
 * Sibling naming (D7/D8): a single-seed transcript records to
 * `<name>.golden`; a `seeds:` matrix records one file per seed as
 * `<name>.<seed>.golden` (e.g. `combat.42.golden`, `combat.777.golden`) —
 * each replay diffs only against its own seed's recording.
 *
 * Public interface: `serializeGolden`, `parseGolden`, `parseGoldenFile`,
 * `GoldenFormatError`. Owner context: branch-tester (testing tooling).
 */

import * as fs from 'fs';
import {
  GoldenEvent,
  GoldenProvenance,
  GoldenRecording,
  GoldenTurn
} from './types.js';

/** First line of every v1 recording. A different line is a format error. */
const GOLDEN_MAGIC = '# sharpee golden v1';

/**
 * Provenance keys, in the exact serialization order ADR-294 D7 specifies.
 * All are required; an unknown or duplicate key is a format error — staleness
 * detection (D3) depends on provenance being complete and unambiguous.
 */
const PROVENANCE_KEYS = [
  'transcript',
  'story',
  'seed',
  'derivation',
  'save-format',
  'channels',
  'events',
  'locale',
  'forces'
] as const;

/**
 * Optional provenance keys (ADR-293 Phase C): accepted when present, never
 * required. `point-seeds` (D11) is written only when the recording was made
 * under overrides, so every pre-Phase-C recording stays valid.
 */
const OPTIONAL_PROVENANCE_KEYS = ['point-seeds'] as const;

/** An event line is `• type {json}` — bullet, one space, type token, payload. */
const EVENT_LINE = /^• (\S+) (\{.*\})$/;
/**
 * ADR-294 D15 channel-capture line: `◦ <channel-id> <payload>`, payload
 * optional (an empty captured line serializes without the trailing space).
 * Only consulted when the provenance declares channels (`(none)` when it
 * declares none — the composed prose is not a declared channel, ADR-300 D8).
 */
const CHANNEL_LINE = /^◦ (\S+)(?: (.*))?$/;

/**
 * A malformed `.golden` file. Recordings are machine-written, so any shape
 * error means corruption or a hand edit — a single hard error (with the line
 * it occurred on) rather than the transcript parser's collected-errors style.
 */
export class GoldenFormatError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly lineNumber?: number
  ) {
    super(
      lineNumber !== undefined
        ? `${filePath}:${lineNumber}: ${message}`
        : `${filePath}: ${message}`
    );
    this.name = 'GoldenFormatError';
  }
}

/**
 * Serialize a recording to `.golden` text.
 *
 * Turns are separated by exactly one blank line; `parseGolden` strips exactly
 * one trailing blank line per non-final turn, so output that itself ends in
 * blank lines round-trips losslessly.
 */
export function serializeGolden(recording: GoldenRecording): string {
  const p = recording.provenance;
  const lines: string[] = [
    GOLDEN_MAGIC,
    `transcript: ${p.transcript}`,
    `story: ${p.story}`,
    `seed: ${p.seed}`,
    `derivation: ${p.derivation}`,
    `save-format: ${p.saveFormat}`,
    `channels: ${p.channels.length > 0 ? p.channels.join(', ') : '(none)'}`,
    `events: ${p.events}`,
    `locale: ${p.locale}`,
    `forces: ${p.forces.length === 0 ? '(none)' : p.forces.join(', ')}`,
    // Optional key (ADR-293 D11): written only when non-empty so pre-Phase-C
    // recordings and override-free recordings stay byte-identical.
    ...(p.pointSeeds && p.pointSeeds.length > 0
      ? [`point-seeds: ${p.pointSeeds.join(', ')}`]
      : []),
    '---'
  ];

  recording.turns.forEach((turn, index) => {
    lines.push(`> ${turn.command}`);
    lines.push(...turn.output);
    for (const event of turn.events ?? []) {
      lines.push(`• ${event.type} ${event.json}`);
    }
    // ADR-294 D15: declared channel captures, grouped per channel in
    // provenance declaration order — last in the turn, after events. An
    // empty captured line serializes without the trailing space so files
    // stay free of trailing whitespace. There is no `main` to exclude
    // (ADR-300 D8); a declared prose channel records like any other.
    for (const id of p.channels) {
      for (const line of turn.channels?.[id] ?? []) {
        lines.push(line === '' ? `◦ ${id}` : `◦ ${id} ${line}`);
      }
    }
    if (index < recording.turns.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n') + '\n';
}

/**
 * Parse `.golden` content.
 *
 * @param content the file's text
 * @param filePath used in error messages only
 * @returns the parsed recording
 * @throws GoldenFormatError on any structural problem — a recording either
 *   parses completely or is rejected; there is no partial result
 */
export function parseGolden(content: string, filePath: string = '<inline>'): GoldenRecording {
  const lines = content.split('\n');
  // A trailing newline produces one empty final entry; drop exactly that.
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  if (lines.length === 0 || lines[0].trimEnd() !== GOLDEN_MAGIC) {
    throw new GoldenFormatError(
      `Not a golden recording — first line must be "${GOLDEN_MAGIC}"`,
      filePath,
      1
    );
  }

  const { provenance, bodyStart } = parseProvenance(lines, filePath);
  // ADR-294 D15: `◦` lines are channel captures ONLY when the provenance
  // declares channels — the exact `events:` gating precedent, so a recording
  // that declares none parses byte-identically to before.
  const channelIds = provenance.channels;
  const turns = parseTurns(lines, bodyStart, provenance.events, channelIds, filePath);

  if (turns.length === 0) {
    throw new GoldenFormatError('Recording has no turns', filePath, bodyStart + 1);
  }

  return { provenance, turns };
}

/** Read and parse a `.golden` file from disk. */
export function parseGoldenFile(filePath: string): GoldenRecording {
  return parseGolden(fs.readFileSync(filePath, 'utf-8'), filePath);
}

/** Parse the provenance header; returns the index of the first body line. */
function parseProvenance(
  lines: string[],
  filePath: string
): { provenance: GoldenProvenance; bodyStart: number } {
  const raw = new Map<string, string>();
  let separatorIndex = -1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimEnd() === '---') {
      separatorIndex = i;
      break;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      throw new GoldenFormatError(
        `Expected a "key: value" provenance line or "---", got "${line}"`,
        filePath,
        i + 1
      );
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (
      !(PROVENANCE_KEYS as readonly string[]).includes(key) &&
      !(OPTIONAL_PROVENANCE_KEYS as readonly string[]).includes(key)
    ) {
      throw new GoldenFormatError(`Unknown provenance key "${key}"`, filePath, i + 1);
    }
    if (raw.has(key)) {
      throw new GoldenFormatError(`Duplicate provenance key "${key}"`, filePath, i + 1);
    }
    raw.set(key, value);
  }

  if (separatorIndex === -1) {
    throw new GoldenFormatError(
      'Missing "---" separator after the provenance header',
      filePath
    );
  }

  for (const key of PROVENANCE_KEYS) {
    if (!raw.has(key)) {
      throw new GoldenFormatError(
        `Missing provenance key "${key}"`,
        filePath,
        separatorIndex + 1
      );
    }
  }

  const requireInteger = (key: string): number => {
    const value = raw.get(key)!;
    if (!/^\d+$/.test(value)) {
      throw new GoldenFormatError(
        `Invalid ${key} "${value}" — must be a non-negative integer`,
        filePath
      );
    }
    return Number(value);
  };

  const eventsValue = raw.get('events')!;
  if (eventsValue !== 'true' && eventsValue !== 'false') {
    throw new GoldenFormatError(
      `Invalid events "${eventsValue}" — must be true or false`,
      filePath
    );
  }

  const splitList = (value: string): string[] =>
    value.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '');

  const channelsValue = raw.get('channels')!;
  const forcesValue = raw.get('forces')!;
  const pointSeedsValue = raw.get('point-seeds');

  const provenance: GoldenProvenance = {
    transcript: raw.get('transcript')!,
    story: raw.get('story')!,
    seed: requireInteger('seed'),
    derivation: requireInteger('derivation'),
    saveFormat: raw.get('save-format')!,
    channels: channelsValue === '(none)' ? [] : splitList(channelsValue),
    events: eventsValue === 'true',
    locale: raw.get('locale')!,
    forces: forcesValue === '(none)' ? [] : splitList(forcesValue),
    // Absent line (pre-Phase-C recording) and empty both parse as no overrides.
    ...(pointSeedsValue !== undefined && pointSeedsValue !== '(none)'
      ? { pointSeeds: splitList(pointSeedsValue) }
      : {})
  };

  return { provenance, bodyStart: separatorIndex + 1 };
}

/**
 * Parse the recorded turns.
 *
 * A turn starts at each `> ` line. Within a turn, output lines come first and
 * event lines (`• type {json}`, only when the provenance says `events: true`)
 * come last; once the event section starts, a non-event line is an error.
 * A prose line that happens to match the event-line shape exactly would be
 * misread as an event — accepted for v1, since the shape requires a parseable
 * JSON object payload.
 */
function parseTurns(
  lines: string[],
  bodyStart: number,
  events: boolean,
  channelIds: string[],
  filePath: string
): GoldenTurn[] {
  const turns: GoldenTurn[] = [];
  let current: { turn: GoldenTurn; startLine: number } | null = null;
  /** Raw lines of the current turn, classified when the turn closes. */
  let turnLines: Array<{ text: string; lineNumber: number }> = [];

  const closeTurn = (isFinal: boolean) => {
    if (!current) return;
    // Strip exactly one trailing blank line on non-final turns — the
    // separator serializeGolden added. Symmetric with the writer, so output
    // genuinely ending in blank lines survives the round trip.
    if (!isFinal && turnLines.length > 0 && turnLines[turnLines.length - 1].text === '') {
      turnLines.pop();
    }
    classifyTurnLines(current.turn, turnLines, events, channelIds, filePath);
    turns.push(current.turn);
    current = null;
    turnLines = [];
  };

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('> ')) {
      closeTurn(false);
      current = {
        turn: { command: line.slice(2), output: [] },
        startLine: i + 1
      };
      continue;
    }
    if (!current) {
      if (line.trim() === '') continue;  // leading blank(s) after ---
      throw new GoldenFormatError(
        `Expected a "> command" line to start a turn, got "${line}"`,
        filePath,
        i + 1
      );
    }
    turnLines.push({ text: line, lineNumber: i + 1 });
  }
  closeTurn(true);

  return turns;
}

/** Split a closed turn's raw lines into output and (when enabled) events. */
function classifyTurnLines(
  turn: GoldenTurn,
  turnLines: Array<{ text: string; lineNumber: number }>,
  events: boolean,
  channelIds: string[],
  filePath: string
): void {
  const parsedEvents: GoldenEvent[] = [];
  const parsedChannels: Record<string, string[]> = {};
  let inEvents = false;
  let inChannels = false;

  for (const { text, lineNumber } of turnLines) {
    // ADR-294 D15: channel lines close the turn — nothing follows them.
    const channelMatch = channelIds.length > 0 ? CHANNEL_LINE.exec(text) : null;
    if (channelMatch) {
      const id = channelMatch[1];
      if (!channelIds.includes(id)) {
        throw new GoldenFormatError(
          `Channel line for undeclared channel '${id}' — provenance declares: ${channelIds.join(', ')}`,
          filePath,
          lineNumber
        );
      }
      inChannels = true;
      (parsedChannels[id] ??= []).push(channelMatch[2] ?? '');
      continue;
    }
    if (inChannels) {
      throw new GoldenFormatError(
        `Line after channel lines within a turn — channel captures must come last: "${text}"`,
        filePath,
        lineNumber
      );
    }
    const eventMatch = events ? EVENT_LINE.exec(text) : null;
    if (eventMatch && isJsonObject(eventMatch[2])) {
      inEvents = true;
      parsedEvents.push({ type: eventMatch[1], json: eventMatch[2] });
      continue;
    }
    if (inEvents) {
      throw new GoldenFormatError(
        `Output line after event lines within a turn — events must come last: "${text}"`,
        filePath,
        lineNumber
      );
    }
    turn.output.push(text);
  }

  if (parsedEvents.length > 0) {
    turn.events = parsedEvents;
  }
  if (Object.keys(parsedChannels).length > 0) {
    turn.channels = parsedChannels;
  }
}

/** Does this string parse as a JSON object? (Event payloads must.) */
function isJsonObject(candidate: string): boolean {
  try {
    const parsed = JSON.parse(candidate);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}
