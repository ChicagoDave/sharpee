/**
 * Annotation Store Implementation
 *
 * In-memory storage for playtester annotations with session management.
 */

import type { AnnotationType, Annotation, AnnotationContext, AnnotationSession, AnnotationStore } from '../types.js';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an in-memory annotation store
 */
export function createAnnotationStore(): AnnotationStore {
  let currentSession: AnnotationSession | undefined;
  let allAnnotations: Annotation[] = [];

  return {
    // Session management
    startSession(name: string): string {
      // End any existing session first
      if (currentSession) {
        currentSession.endTime = Date.now();
      }

      const id = generateId();
      currentSession = {
        id,
        name,
        startTime: Date.now(),
        annotations: [],
      };

      return id;
    },

    endSession(): AnnotationSession | undefined {
      if (!currentSession) {
        return undefined;
      }

      currentSession.endTime = Date.now();
      const ended = currentSession;
      currentSession = undefined;
      return ended;
    },

    getCurrentSession(): AnnotationSession | undefined {
      return currentSession;
    },

    // Annotation capture
    addAnnotation(type: AnnotationType, text: string, context: AnnotationContext): Annotation {
      const annotation: Annotation = {
        id: generateId(),
        timestamp: Date.now(),
        type,
        text,
        context,
        sessionId: currentSession?.id,
      };

      allAnnotations.push(annotation);

      if (currentSession) {
        currentSession.annotations.push(annotation);
      }

      return annotation;
    },

    getAnnotations(): Annotation[] {
      if (currentSession) {
        return [...currentSession.annotations];
      }
      return [...allAnnotations];
    },

    getAnnotationsByType(type: AnnotationType): Annotation[] {
      const source = currentSession ? currentSession.annotations : allAnnotations;
      return source.filter((a) => a.type === type);
    },

    // Export
    exportMarkdown(): string {
      return formatMarkdownReport(currentSession, allAnnotations);
    },

    exportJson(): string {
      const data = currentSession
        ? { session: currentSession }
        : { annotations: allAnnotations };
      return JSON.stringify(data, null, 2);
    },

    // Cleanup
    clear(): void {
      currentSession = undefined;
      allAnnotations = [];
    },
  };
}

/**
 * Format annotations as a markdown report (per ADR-109)
 */
function formatMarkdownReport(
  session: AnnotationSession | undefined,
  allAnnotations: Annotation[]
): string {
  const annotations = session ? session.annotations : allAnnotations;
  const lines: string[] = [];

  // Header
  if (session) {
    lines.push(`# Play Test Session: ${session.name}`);
    lines.push(`Date: ${new Date(session.startTime).toLocaleString()}`);
    if (session.endTime) {
      const durationMs = session.endTime - session.startTime;
      const durationMins = Math.round(durationMs / 60000);
      lines.push(`Duration: ${durationMins} minutes`);
    }
  } else {
    lines.push('# Playtest Annotations');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
  }
  lines.push('');

  // Group by type
  const bugs = annotations.filter((a) => a.type === 'bug');
  const notes = annotations.filter((a) => a.type === 'note');
  const confusing = annotations.filter((a) => a.type === 'confusing');
  const expected = annotations.filter((a) => a.type === 'expected');
  const bookmarks = annotations.filter((a) => a.type === 'bookmark');
  const comments = annotations.filter((a) => a.type === 'comment');

  // Bugs section
  if (bugs.length > 0) {
    lines.push(`## Bugs (${bugs.length})`);
    bugs.forEach((bug, i) => {
      lines.push(`${i + 1}. [Turn ${bug.context.turn}, ${bug.context.roomName}] "${bug.text}"`);
      lines.push(`   - Command: ${bug.context.lastCommand}`);
      lines.push(`   - Response: ${truncate(bug.context.lastResponse, 100)}`);
      lines.push('');
    });
  }

  // Notes section
  if (notes.length > 0) {
    lines.push(`## Notes (${notes.length})`);
    notes.forEach((note, i) => {
      lines.push(`${i + 1}. [Turn ${note.context.turn}, ${note.context.roomName}] "${note.text}"`);
    });
    lines.push('');
  }

  // Confusion points
  if (confusing.length > 0) {
    lines.push(`## Confusion Points (${confusing.length})`);
    confusing.forEach((c, i) => {
      lines.push(`${i + 1}. [Turn ${c.context.turn}, ${c.context.roomName}]`);
      lines.push(`   - After: ${c.context.lastCommand}`);
      lines.push(`   - Response: ${truncate(c.context.lastResponse, 100)}`);
      lines.push('');
    });
  }

  // Expected behavior
  if (expected.length > 0) {
    lines.push(`## Expected Behavior (${expected.length})`);
    expected.forEach((e, i) => {
      lines.push(`${i + 1}. [Turn ${e.context.turn}, ${e.context.roomName}]`);
      lines.push(`   - Expected: ${e.text}`);
      lines.push(`   - Actual: ${truncate(e.context.lastResponse, 100)}`);
      lines.push('');
    });
  }

  // Bookmarks
  if (bookmarks.length > 0) {
    lines.push(`## Bookmarks (${bookmarks.length})`);
    bookmarks.forEach((b, i) => {
      lines.push(`${i + 1}. "${b.text}" at Turn ${b.context.turn}, ${b.context.roomName}`);
    });
    lines.push('');
  }

  // Comments (silent feedback)
  if (comments.length > 0) {
    lines.push(`## Comments (${comments.length})`);
    comments.forEach((c, i) => {
      lines.push(`${i + 1}. [Turn ${c.context.turn}, ${c.context.roomName}] "${c.text}"`);
    });
    lines.push('');
  }

  // Summary stats
  lines.push('## Summary');
  lines.push(`- Total annotations: ${annotations.length}`);
  lines.push(`- Bugs: ${bugs.length}`);
  lines.push(`- Notes: ${notes.length}`);
  lines.push(`- Confusion points: ${confusing.length}`);
  lines.push(`- Bookmarks: ${bookmarks.length}`);

  return lines.join('\n');
}

/**
 * Truncate a string to max length
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}
