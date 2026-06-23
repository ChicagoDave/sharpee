/**
 * test.ts — `repokit test`: run transcript test(s) for a story.
 *
 * Relocated as a stub in the devkit/repokit split (ADR-187); real implementation
 * (over the published `@sharpee/bootstrap` + `transcript-tester`) is a separate
 * effort, out of scope for the split.
 *
 * Public interface: TestCommand.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { Command } from './command';

export class TestCommand implements Command {
  readonly name = 'test';
  readonly summary = 'Run transcript test(s) for a story';
  run(): number {
    console.error('repokit test: not yet implemented');
    return 2;
  }
}
