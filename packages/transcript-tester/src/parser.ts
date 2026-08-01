/**
 * Transcript Parser
 *
 * Parses .transcript files into a structured format for testing.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Transcript,
  TranscriptHeader,
  TranscriptCommand,
  TranscriptItem,
  Directive,
  GoalDefinition,
  Assertion,
  ParseError
} from './types.js';

/**
 * A literal text block opens with `text` and closes with `end text`, each on
 * its own line at column 0 (ADR-287 D1).
 *
 * Column 0 is load-bearing, not decoration: an INDENTED `end text` inside the
 * payload is content and does not close the block, which is what lets a story
 * quote the syntax at all. Only a payload line at column 0 reading exactly
 * `end text` collides — and that shape is reserved (David's ruling,
 * 2026-07-28). There is no escape, because the collision cannot be silent:
 * the block closes early, the rest of the payload falls through to the classic
 * expected-output path below, and `finalizeCommand`'s both-forms check turns it
 * into a validation error with a line number.
 */
const BLOCK_OPEN = 'text';
const BLOCK_CLOSE = 'end text';

/** Is this line a block delimiter? Column 0, trailing whitespace forgiven. */
function isBlockLine(line: string, keyword: string): boolean {
  return line.trimEnd() === keyword;
}

/** Can this assertion carry a block? `[OK]`, or `[OK: contains]` with no inline payload. */
function acceptsBlock(assertion: Assertion): boolean {
  return assertion.type === 'ok' || (assertion.type === 'ok-contains' && assertion.value === undefined);
}

/**
 * Read a literal text block whose `text` opener is at `lines[openIndex]`.
 *
 * Returns the verbatim content lines and the index of the closing `end text`,
 * or `null` when no close appears before EOF. Content is never interpreted and
 * never re-indented — that is the entire point of the form, and the reason
 * indentation was rejected as the delimiter (it cannot preserve a payload whose
 * every line is indented).
 */
function readTextBlock(
  lines: string[],
  openIndex: number
): { content: string[]; closeIndex: number } | null {
  const content: string[] = [];

  for (let i = openIndex + 1; i < lines.length; i++) {
    if (isBlockLine(lines[i], BLOCK_CLOSE)) {
      return { content, closeIndex: i };
    }
    content.push(lines[i]);
  }

  return null;
}

/**
 * Parse a transcript file from disk
 */
export function parseTranscriptFile(filePath: string): Transcript {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseTranscript(content, filePath);
}

/**
 * Parse transcript content string
 */
export function parseTranscript(content: string, filePath: string = '<inline>'): Transcript {
  const lines = content.split('\n');
  const transcript: Transcript = {
    filePath,
    header: {},
    commands: [],
    items: [],
    goals: [],
    comments: []
  };

  let inHeader = true;
  let currentCommand: TranscriptCommand | null = null;
  const parseErrors: ParseError[] = [];

  // Indexed rather than for-of: a block consumes the lines that follow its
  // opening delimiter, so the loop has to be able to skip ahead (ADR-287 D1).
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;
    const trimmed = line.trim();

    // Empty lines
    if (trimmed === '') {
      if (currentCommand && currentCommand.expectedOutput.length > 0) {
        // Empty line in output - preserve it
        currentCommand.expectedOutput.push('');
      }
      continue;
    }

    // Header separator
    if (trimmed === '---') {
      inHeader = false;
      continue;
    }

    // Comments - add to both comments array (legacy) and items array (for annotation context)
    if (trimmed.startsWith('#') && !trimmed.startsWith('#[')) {
      const commentText = trimmed.slice(1).trim();
      transcript.comments.push(commentText);
      // Also add as item for annotation processing
      transcript.items!.push({
        type: 'comment',
        comment: { lineNumber, text: commentText },
      });
      continue;
    }

    // $ directives ($save, $restore) - these are standalone directives
    if (trimmed.startsWith('$')) {
      // Save any pending command first
      if (currentCommand) {
        finalizeCommand(currentCommand, parseErrors);
        transcript.commands.push(currentCommand);
        transcript.items!.push({ type: 'command', command: currentCommand });
        currentCommand = null;
      }

      const directive = parseDollarDirective(trimmed, lineNumber);
      if (directive) {
        transcript.items!.push({ type: 'directive', directive });
      }
      continue;
    }

    // Header lines (key: value)
    if (inHeader && trimmed.includes(':') && !trimmed.startsWith('>')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
      const value = trimmed.slice(colonIndex + 1).trim();
      transcript.header[key] = value;
      continue;
    }

    // Command input
    if (trimmed.startsWith('>')) {
      // Save previous command
      if (currentCommand) {
        finalizeCommand(currentCommand, parseErrors);
        transcript.commands.push(currentCommand);
        transcript.items!.push({ type: 'command', command: currentCommand });
      }

      currentCommand = {
        lineNumber,
        input: trimmed.slice(1).trim(),
        expectedOutput: [],
        assertions: []
      };
      continue;
    }

    // [SEED: N] — ADR-293 D14: pins the session's master seed. File-level
    // metadata rather than an item; at most one per transcript. The CLI
    // enforces the chain rule (only the first chain member's seed counts).
    const seedMatch = /^\[SEED:\s*(.+?)\s*\]$/i.exec(trimmed);
    if (seedMatch) {
      if (currentCommand) {
        finalizeCommand(currentCommand, parseErrors);
        transcript.commands.push(currentCommand);
        transcript.items!.push({ type: 'command', command: currentCommand });
        currentCommand = null;
      }
      if (transcript.seed !== undefined) {
        parseErrors.push({
          lineNumber,
          message: `Duplicate [SEED:] — the seed is already pinned to ${transcript.seed} (a transcript declares at most one)`
        });
      } else if (!/^\d+$/.test(seedMatch[1])) {
        parseErrors.push({
          lineNumber,
          message: `Invalid [SEED:] value "${seedMatch[1]}" — must be a non-negative integer`
        });
      } else {
        transcript.seed = Number(seedMatch[1]);
        transcript.seedLineNumber = lineNumber;
      }
      continue;
    }

    // Directive or assertion tags (both use [ ])
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      // ADR-287 D1: a block attaches only on the IMMEDIATELY following line —
      // an intervening blank line detaches it, leaving a `text` line to parse
      // as ordinary prose exactly as it did before blocks existed (D2).
      const blockIndex = index + 1;
      const nextIsBlock =
        blockIndex < lines.length && isBlockLine(lines[blockIndex], BLOCK_OPEN);

      // Try to parse as directive first
      const directive = parseDirective(trimmed, lineNumber);
      if (directive) {
        // Save any pending command first
        if (currentCommand) {
          finalizeCommand(currentCommand, parseErrors);
          transcript.commands.push(currentCommand);
          transcript.items!.push({ type: 'command', command: currentCommand });
          currentCommand = null;
        }
        transcript.items!.push({ type: 'directive', directive });

        if (nextIsBlock) {
          index = skipInvalidBlock(
            lines, blockIndex, parseErrors,
            `A text block cannot follow the directive "${trimmed}" — blocks attach only to [OK] or [OK: contains]`
          );
        }
        continue;
      }

      // Not a directive - try as assertion (must be attached to a command)
      if (currentCommand) {
        const assertion = parseAssertion(trimmed);
        if (assertion) {
          currentCommand.assertions.push(assertion);

          if (nextIsBlock && !acceptsBlock(assertion)) {
            index = skipInvalidBlock(
              lines, blockIndex, parseErrors,
              `A text block cannot follow "${trimmed}" — blocks attach only to [OK] or payload-less [OK: contains]`
            );
          } else if (nextIsBlock) {
            const block = readTextBlock(lines, blockIndex);
            if (!block) {
              parseErrors.push({
                lineNumber: blockIndex + 1,
                message: `Unclosed text block — expected a line reading "${BLOCK_CLOSE}" before end of file`
              });
              index = lines.length;  // the author meant everything after to be literal
            } else if (block.content.length === 0) {
              parseErrors.push({
                lineNumber: blockIndex + 1,
                message: 'Empty text block — a block must contain at least one line'
              });
              index = block.closeIndex;
            } else {
              assertion.block = block.content;
              assertion.lineNumber = lineNumber;
              index = block.closeIndex;
            }
          } else if (assertion.type === 'ok-contains' && assertion.value === undefined) {
            parseErrors.push({
              lineNumber,
              message: '[OK: contains] with no inline payload requires a text block on the next line'
            });
          }
        }
      }
      continue;
    }

    // Expected output lines
    if (currentCommand) {
      currentCommand.expectedOutput.push(line);  // Preserve original indentation
    }
  }

  // Don't forget the last command
  if (currentCommand) {
    finalizeCommand(currentCommand, parseErrors);
    transcript.commands.push(currentCommand);
    transcript.items!.push({ type: 'command', command: currentCommand });
  }

  // Parse goal segments from items
  transcript.goals = parseGoals(transcript.items!);

  // Attached only when non-empty: a clean transcript's AST must stay
  // byte-identical to its pre-block parse (ADR-287 D2, pinned by
  // tests/parse-baseline.test.ts).
  if (parseErrors.length > 0) {
    transcript.parseErrors = parseErrors;
  }

  return transcript;
}

/**
 * Consume a text block that cannot legally attach where it appears, recording why.
 *
 * The block is swallowed rather than left in place so its literal content —
 * which may contain `>` commands or `[...]` tags — cannot be re-read as
 * transcript syntax and cascade into a second, misleading error.
 *
 * @returns the index the parse loop should resume from (EOF if never closed)
 */
function skipInvalidBlock(
  lines: string[],
  openIndex: number,
  parseErrors: ParseError[],
  message: string
): number {
  const block = readTextBlock(lines, openIndex);
  parseErrors.push({ lineNumber: openIndex + 1, message });
  return block ? block.closeIndex : lines.length;
}

/**
 * Parse a directive tag like [GOAL: name], [IF: condition], [NAVIGATE TO: "Room"]
 */
function parseDirective(tag: string, lineNumber: number): Directive | null {
  const inner = tag.slice(1, -1).trim();  // Remove [ ]

  // [GOAL: name]
  const goalMatch = inner.match(/^GOAL:\s*(.+)$/i);
  if (goalMatch) {
    return { type: 'goal', lineNumber, goalName: goalMatch[1].trim() };
  }

  // [END GOAL]
  if (inner.toUpperCase() === 'END GOAL') {
    return { type: 'end_goal', lineNumber };
  }

  // [REQUIRES: condition]
  const requiresMatch = inner.match(/^REQUIRES:\s*(.+)$/i);
  if (requiresMatch) {
    return { type: 'requires', lineNumber, condition: requiresMatch[1].trim() };
  }

  // [ENSURES: condition]
  const ensuresMatch = inner.match(/^ENSURES:\s*(.+)$/i);
  if (ensuresMatch) {
    return { type: 'ensures', lineNumber, condition: ensuresMatch[1].trim() };
  }

  // [IF: condition]
  const ifMatch = inner.match(/^IF:\s*(.+)$/i);
  if (ifMatch) {
    return { type: 'if', lineNumber, condition: ifMatch[1].trim() };
  }

  // [END IF]
  if (inner.toUpperCase() === 'END IF') {
    return { type: 'end_if', lineNumber };
  }

  // [WHILE: condition]
  const whileMatch = inner.match(/^WHILE:\s*(.+)$/i);
  if (whileMatch) {
    return { type: 'while', lineNumber, condition: whileMatch[1].trim() };
  }

  // [END WHILE]
  if (inner.toUpperCase() === 'END WHILE') {
    return { type: 'end_while', lineNumber };
  }

  // [RETRY: max=N]
  const retryMatch = inner.match(/^RETRY:\s*max\s*=\s*(\d+)$/i);
  if (retryMatch) {
    return { type: 'retry', lineNumber, maxRetries: parseInt(retryMatch[1], 10) };
  }

  // [END RETRY]
  if (inner.toUpperCase() === 'END RETRY') {
    return { type: 'end_retry', lineNumber };
  }

  // [DO]
  if (inner.toUpperCase() === 'DO') {
    return { type: 'do', lineNumber };
  }

  // [UNTIL "text"] or [UNTIL "text1" OR "text2" OR ...]
  if (inner.toUpperCase().startsWith('UNTIL ')) {
    const texts: string[] = [];
    const textRegex = /"([^"]+)"/g;
    let m;
    while ((m = textRegex.exec(inner)) !== null) {
      texts.push(m[1]);
    }
    if (texts.length > 0) {
      return { type: 'until', lineNumber, untilTexts: texts };
    }
  }

  // [NAVIGATE TO: "Room Name"]
  const navigateMatch = inner.match(/^NAVIGATE\s+TO:\s*"([^"]+)"$/i);
  if (navigateMatch) {
    return { type: 'navigate', lineNumber, target: navigateMatch[1] };
  }

  // Not a directive
  return null;
}

/**
 * Parse a $ directive like $save <name>, $restore <name>, or ext-testing commands
 */
function parseDollarDirective(line: string, lineNumber: number): Directive | null {
  const trimmed = line.trim();

  // $save <name>
  const saveMatch = trimmed.match(/^\$save\s+(.+)$/i);
  if (saveMatch) {
    return { type: 'save', lineNumber, saveName: saveMatch[1].trim() };
  }

  // $restore <name>
  const restoreMatch = trimmed.match(/^\$restore\s+(.+)$/i);
  if (restoreMatch) {
    return { type: 'restore', lineNumber, saveName: restoreMatch[1].trim() };
  }

  // Any other $ directive is a test command (ext-testing)
  // Valid test commands: $teleport, $take, $move, $kill, $immortal, $mortal, $state, $describe, etc.
  const testCommandMatch = trimmed.match(/^\$(\w+)(.*)$/);
  if (testCommandMatch) {
    return { type: 'test-command', lineNumber, testCommand: trimmed };
  }

  return null;
}

/**
 * Parse goal segments from items array
 */
function parseGoals(items: TranscriptItem[]): GoalDefinition[] {
  const goals: GoalDefinition[] = [];
  let currentGoal: Partial<GoalDefinition> | null = null;
  let goalStartIndex = -1;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type !== 'directive') continue;

    const directive = item.directive!;

    switch (directive.type) {
      case 'goal':
        if (currentGoal) {
          console.warn(`Line ${directive.lineNumber}: Nested goals not allowed. Closing previous goal.`);
          goals.push({
            ...currentGoal,
            endIndex: i - 1
          } as GoalDefinition);
        }
        currentGoal = {
          name: directive.goalName!,
          lineNumber: directive.lineNumber,
          requires: [],
          ensures: [],
          startIndex: i + 1
        };
        goalStartIndex = i;
        break;

      case 'requires':
        if (currentGoal && directive.condition) {
          currentGoal.requires!.push(directive.condition);
        }
        break;

      case 'ensures':
        if (currentGoal && directive.condition) {
          currentGoal.ensures!.push(directive.condition);
        }
        break;

      case 'end_goal':
        if (currentGoal) {
          goals.push({
            ...currentGoal,
            endIndex: i
          } as GoalDefinition);
          currentGoal = null;
        }
        break;
    }
  }

  // Handle unclosed goal
  if (currentGoal) {
    console.warn(`Unclosed goal: ${currentGoal.name}`);
    goals.push({
      ...currentGoal,
      endIndex: items.length - 1
    } as GoalDefinition);
  }

  return goals;
}

/**
 * Parse an assertion tag like [OK], [OK: contains "foo"], [FAIL: reason]
 */
function parseAssertion(tag: string): Assertion | null {
  const inner = tag.slice(1, -1).trim();  // Remove [ ]

  // [OK] - exact match
  if (inner === 'OK') {
    return { type: 'ok' };
  }

  // [SKIP]
  if (inner === 'SKIP') {
    return { type: 'skip' };
  }

  // [OK: any] — presence-only (ADR-277 D5): passes when the command produced
  // any output; asserts nothing about the text. The recorder's default.
  if (/^OK:\s*any$/i.test(inner)) {
    return { type: 'ok-any' };
  }

  // [OK: contains] — payload-less; the fragment is the text block on the next
  // line (ADR-287 D1). Without a block this is a validation error, raised by the
  // parse loop, which is the only place that can see whether one follows.
  if (/^OK:\s*contains$/i.test(inner)) {
    return { type: 'ok-contains' };
  }

  // [OK: contains "text"]
  const containsMatch = inner.match(/^OK:\s*contains\s+"([^"]+)"$/i);
  if (containsMatch) {
    return { type: 'ok-contains', value: containsMatch[1] };
  }

  // [OK: not contains "text"]
  const notContainsMatch = inner.match(/^OK:\s*not\s+contains\s+"([^"]+)"$/i);
  if (notContainsMatch) {
    return { type: 'ok-not-contains', value: notContainsMatch[1] };
  }

  // [OK: contains_any "text1" "text2" "text3"]
  const containsAnyMatch = inner.match(/^OK:\s*contains_any\s+(.+)$/i);
  if (containsAnyMatch) {
    const values: string[] = [];
    const valueRegex = /"([^"]+)"/g;
    let m;
    while ((m = valueRegex.exec(containsAnyMatch[1])) !== null) {
      values.push(m[1]);
    }
    if (values.length > 0) {
      return { type: 'ok-contains-any', values };
    }
  }

  // [OK: matches /regex/flags]
  const matchesMatch = inner.match(/^OK:\s*matches\s+\/(.+)\/([gimsuy]*)$/i);
  if (matchesMatch) {
    try {
      return {
        type: 'ok-matches',
        pattern: new RegExp(matchesMatch[1], matchesMatch[2])
      };
    } catch (e) {
      console.error(`Invalid regex in assertion: ${tag}`);
      return null;
    }
  }

  // [FAIL: reason]
  const failMatch = inner.match(/^FAIL(?::\s*(.+))?$/i);
  if (failMatch) {
    return { type: 'fail', reason: failMatch[1] || 'Expected failure' };
  }

  // [TODO: note]
  const todoMatch = inner.match(/^TODO(?::\s*(.+))?$/i);
  if (todoMatch) {
    return { type: 'todo', reason: todoMatch[1] || 'Not implemented' };
  }

  // [EVENTS: N] - exact event count
  const eventsMatch = inner.match(/^EVENTS:\s*(\d+)$/i);
  if (eventsMatch) {
    return { type: 'event-count', eventCount: parseInt(eventsMatch[1], 10) };
  }

  // [EVENT: true|false, N?, type="..." key="value"]
  // Format: [EVENT: true, 1, type="if.event.pushed" target="y09"]
  //         [EVENT: false, type="if.event.destroyed"]
  const eventAssertMatch = inner.match(/^EVENT:\s*(true|false)\s*,\s*(.+)$/i);
  if (eventAssertMatch) {
    const assertTrue = eventAssertMatch[1].toLowerCase() === 'true';
    const rest = eventAssertMatch[2];

    // Check if there's a position number before the type
    const positionMatch = rest.match(/^(\d+)\s*,\s*(.+)$/);
    let eventPosition: number | undefined;
    let propsStr: string;

    if (positionMatch) {
      eventPosition = parseInt(positionMatch[1], 10);
      propsStr = positionMatch[2];
    } else {
      propsStr = rest;
    }

    // Parse key="value" pairs
    const eventData: Record<string, any> = {};
    let eventType: string | undefined;
    const propRegex = /(\w+)="([^"]+)"/g;
    let match;
    while ((match = propRegex.exec(propsStr)) !== null) {
      const [, key, value] = match;
      if (key === 'type') {
        eventType = value;
      } else {
        eventData[key] = value;
      }
    }

    if (eventType) {
      return {
        type: 'event-assert',
        assertTrue,
        eventPosition,
        eventType,
        eventData: Object.keys(eventData).length > 0 ? eventData : undefined
      };
    }
  }

  // [STATE: true|false, expression]
  // Format: [STATE: true, egg.location = thief]
  //         [STATE: false, player.canSee(egg)]
  const stateAssertMatch = inner.match(/^STATE:\s*(true|false)\s*,\s*(.+)$/i);
  if (stateAssertMatch) {
    const assertTrue = stateAssertMatch[1].toLowerCase() === 'true';
    const expression = stateAssertMatch[2].trim();
    return {
      type: 'state-assert',
      assertTrue,
      stateExpression: expression
    };
  }

  console.warn(`Unknown assertion format: ${tag}`);
  return null;
}

/**
 * Clean up a command before adding to transcript
 *
 * @param command the command being closed out
 * @param parseErrors collector for structural problems only visible once the
 *   command is complete — expected-output lines can arrive after the assertion
 *   that carries the block, so the both-forms check cannot run at attach time
 */
function finalizeCommand(command: TranscriptCommand, parseErrors: ParseError[]): void {
  // Trim trailing empty lines from expected output
  while (command.expectedOutput.length > 0 &&
         command.expectedOutput[command.expectedOutput.length - 1].trim() === '') {
    command.expectedOutput.pop();
  }

  // If no explicit assertion and we have expected output, default to [OK].
  // A block assertion is an assertion, so it never acquires this default —
  // audited against ADR-287 D1's "a block or a classic block, never both".
  if (command.assertions.length === 0 && command.expectedOutput.length > 0) {
    command.assertions.push({ type: 'ok' });
  }

  // ADR-287 D1: a command may carry a text block OR a classic expected-output
  // block. This check is also what makes the reserved `end text` line safe to
  // rule with no escape: a payload containing one closes its block early and
  // the remainder lands in expectedOutput, so the collision surfaces HERE with
  // a line number instead of producing a plausible-looking assertion.
  const blocked = command.assertions.find(a => a.block !== undefined);
  if (blocked && command.expectedOutput.length > 0) {
    parseErrors.push({
      lineNumber: blocked.lineNumber ?? command.lineNumber,
      message: `Command "${command.input}" carries both a text block and a classic expected-output block — use one or the other`
    });
  }
}

/**
 * Validate a transcript for common issues
 */
export function validateTranscript(transcript: Transcript): string[] {
  const errors: string[] = [];

  // Structural parse failures first (ADR-287 AC4) — they are recorded during
  // parsing because a finished AST cannot represent them. Both consumers of
  // this function surface them: the bundle's reporter prints them, and
  // `sharpee test` turns them into a transcript-level `error` record
  // (packages/devkit/src/commands/test.ts, ADR-277 D1) — never a silent drop.
  for (const parseError of transcript.parseErrors ?? []) {
    errors.push(`Line ${parseError.lineNumber}: ${parseError.message}`);
  }

  if (transcript.commands.length === 0) {
    errors.push('Transcript has no commands');
  }

  if (!transcript.header.story && !transcript.header.title) {
    errors.push('Transcript should have a title or story in header');
  }

  for (const cmd of transcript.commands) {
    if (!cmd.input) {
      errors.push(`Line ${cmd.lineNumber}: Empty command`);
    }
    if (cmd.assertions.length === 0) {
      errors.push(`Line ${cmd.lineNumber}: Command "${cmd.input}" has no assertion — every command requires [OK: ...], [SKIP], or similar`);
    }
  }

  return errors;
}
