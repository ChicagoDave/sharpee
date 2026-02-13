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
  Assertion
} from './types';

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
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
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
        finalizeCommand(currentCommand);
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
        finalizeCommand(currentCommand);
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

    // Directive or assertion tags (both use [ ])
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      // Try to parse as directive first
      const directive = parseDirective(trimmed, lineNumber);
      if (directive) {
        // Save any pending command first
        if (currentCommand) {
          finalizeCommand(currentCommand);
          transcript.commands.push(currentCommand);
          transcript.items!.push({ type: 'command', command: currentCommand });
          currentCommand = null;
        }
        transcript.items!.push({ type: 'directive', directive });
        continue;
      }

      // Not a directive - try as assertion (must be attached to a command)
      if (currentCommand) {
        const assertion = parseAssertion(trimmed);
        if (assertion) {
          currentCommand.assertions.push(assertion);
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
    finalizeCommand(currentCommand);
    transcript.commands.push(currentCommand);
    transcript.items!.push({ type: 'command', command: currentCommand });
  }

  // Parse goal segments from items
  transcript.goals = parseGoals(transcript.items!);

  return transcript;
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
 */
function finalizeCommand(command: TranscriptCommand): void {
  // Trim trailing empty lines from expected output
  while (command.expectedOutput.length > 0 &&
         command.expectedOutput[command.expectedOutput.length - 1].trim() === '') {
    command.expectedOutput.pop();
  }

  // If no explicit assertion and we have expected output, default to [OK]
  if (command.assertions.length === 0 && command.expectedOutput.length > 0) {
    command.assertions.push({ type: 'ok' });
  }

  // If no assertion at all, default to [SKIP]
  if (command.assertions.length === 0) {
    command.assertions.push({ type: 'skip' });
  }
}

/**
 * Validate a transcript for common issues
 */
export function validateTranscript(transcript: Transcript): string[] {
  const errors: string[] = [];

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
  }

  return errors;
}
