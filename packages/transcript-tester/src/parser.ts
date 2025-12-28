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

    // Comments
    if (trimmed.startsWith('#') && !trimmed.startsWith('#[')) {
      transcript.comments.push(trimmed.slice(1).trim());
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
      }

      currentCommand = {
        lineNumber,
        input: trimmed.slice(1).trim(),
        expectedOutput: [],
        assertions: []
      };
      continue;
    }

    // Assertion tags
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
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
  }

  return transcript;
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
