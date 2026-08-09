/**
 * from-play.ts — `sharpee transcript-from-play` (ADR-305 D5/D6).
 *
 * The IDE's Create Transcript flow pipes a played session's records (JSON on
 * stdin) through this command and receives serialized `.transcript` text on
 * stdout. The synthesis is `@sharpee/branch-tester`'s — the same engine the
 * runner uses at the tier boundary, which is the entire point: what creation
 * writes is byte-what a first run would have written (ADR-305 D5). The caller
 * owns the file write (save panel, destination, collision); a refusal exits 2
 * with the reason on stderr and NOTHING on stdout (ADR-305 D6).
 *
 * Public interface: runFromPlayCommand(stdinText?).
 * Owner context: @sharpee/devkit (author CLI).
 */
import { createTranscriptFromPlay, FromPlayError, CreateFromPlayOptions } from '@sharpee/branch-tester';

/** Read stdin to end — the play-session JSON payload. */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * `sharpee transcript-from-play` — JSON on stdin, transcript text on stdout.
 *
 * @param stdinText test seam: the payload, bypassing real stdin when provided
 * @returns process exit code — 0 with the file text on stdout, 2 on refusal
 *   (malformed JSON, missing fields, or a `FromPlayError`) with nothing
 *   written to stdout
 */
export async function runFromPlayCommand(stdinText?: string): Promise<number> {
  const raw = stdinText ?? (await readStdin());

  let options: CreateFromPlayOptions;
  try {
    options = JSON.parse(raw) as CreateFromPlayOptions;
  } catch {
    console.error('transcript-from-play: stdin is not valid JSON');
    return 2;
  }
  if (typeof options?.seed !== 'number' || !Array.isArray(options?.turns)) {
    console.error('transcript-from-play: payload must carry { seed, turns[] }');
    return 2;
  }

  try {
    process.stdout.write(createTranscriptFromPlay(options));
    return 0;
  } catch (err) {
    if (err instanceof FromPlayError) {
      console.error(`transcript-from-play: ${err.message}`);
      return 2;
    }
    throw err;
  }
}
