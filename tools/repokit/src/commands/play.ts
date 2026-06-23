/**
 * play.ts — `repokit play`: interactive play (REPL) for a story.
 *
 * Relocated as a stub in the devkit/repokit split (ADR-187); real implementation
 * (over the published `@sharpee/bootstrap`) is a separate effort, out of scope
 * for the split.
 *
 * Public interface: PlayCommand.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { Command } from './command';

export class PlayCommand implements Command {
  readonly name = 'play';
  readonly summary = 'Interactive play (REPL) for a story';
  run(): number {
    console.error('repokit play: not yet implemented');
    return 2;
  }
}
