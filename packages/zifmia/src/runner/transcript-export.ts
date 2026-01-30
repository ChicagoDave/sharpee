/**
 * Transcript export utilities
 *
 * Two export formats:
 * 1. Full markdown transcript — readable session log with commands, output, annotations
 * 2. Walkthrough — commands only, compatible with transcript tester (.transcript format)
 */

import type { TranscriptEntry } from '../types/game-state.js';

/**
 * Export full session transcript as markdown.
 * Includes commands (with > prompt), game output, and annotations as bracketed notes.
 */
export function exportTranscriptMarkdown(entries: TranscriptEntry[], storyTitle?: string): string {
  const lines: string[] = [];

  if (storyTitle) {
    lines.push(`# ${storyTitle} — Session Transcript`);
  } else {
    lines.push('# Session Transcript');
  }
  lines.push(`Exported: ${new Date().toISOString()}`);
  lines.push('');

  for (const entry of entries) {
    if (entry.annotation) {
      const prefix = entry.annotation.type === 'comment' ? '#' : `$${entry.annotation.type}`;
      lines.push(`*[${prefix} ${entry.annotation.text}]*`);
      lines.push('');
      continue;
    }

    if (entry.command) {
      lines.push(`> ${entry.command}`);
      lines.push('');
    }

    if (entry.text) {
      lines.push(entry.text);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Export commands-only walkthrough in .transcript format.
 * Annotations become # comments. Game output is omitted.
 */
export function exportWalkthrough(entries: TranscriptEntry[]): string {
  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.annotation) {
      lines.push(`# ${entry.annotation.type}: ${entry.annotation.text}`);
      continue;
    }

    if (entry.command) {
      lines.push(entry.command);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Trigger a browser file download with the given content.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
