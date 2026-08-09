/**
 * host.ts — the bridge between the Testing tab's page and its AppKit host.
 *
 * Purpose: the tab runs inside the IDE's `WKWebView`, so everything that leaves
 *   the page (open this file at this line, start a run, remember the view mode)
 *   and everything that enters it (one NDJSON line, a status, the transcripts
 *   found on disk) crosses exactly one seam. Naming that seam in one module
 *   keeps `window.webkit` out of the views and gives the browser-only case — a
 *   page opened outside the IDE — a single place to degrade gracefully.
 *
 *   Lines arrive as **raw text** and are validated here with the wire's own
 *   `isRunEvent`. Swift never decodes the stream: that is the point of ADR-301
 *   D1, and a Swift mirror of these shapes is exactly what it retires.
 *
 * Public interface: HostBridge, installHost, isRunEvent re-export via decodeLine.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { isRunEvent, type RunEvent } from '@sharpee/ide-protocol/run-events';

/** What the host tells the page. Installed on `window` for Swift to call. */
export interface HostInbound {
  /** One raw NDJSON line from `sharpee test --json`. */
  line(text: string): void;
  /** A run is starting: clear the model, keep the discovered tree. */
  reset(story: string): void;
  /** A pipeline failure (sharpee missing, launch failure) as a status line. */
  status(text: string): void;
  /** Transcripts found on disk, so the tab is not blank before the first run. */
  discovered(files: string[]): void;
  /** The host's persisted view mode for this project (ADR-301 D4). */
  restoreMode(mode: string): void;
  /**
   * The story's `auto-assertion:` policy, or null for "let me decide"
   * (Phase 6e, #253). A header fact, so the host reports it — refreshed at
   * attach and at every run start (documents are saved before a run, so the
   * run always reads what was reported).
   */
  autoAssertion(policy: string | null): void;
  /** The run process exited; `ok` false leaves the failure visible. */
  finished(ok: boolean): void;
  /** The text of a transcript the page asked for. Answers `requestSource`. */
  source(file: string, text: string): void;
  /** That file could not be read; `message` is why, in the host's words. */
  sourceFailed(file: string, message: string): void;
  /** The edit reached disk. Answers `writeTranscript`. */
  saved(file: string): void;
  /** The edit did not reach disk, and why. The page keeps the author's text. */
  saveFailed(file: string, message: string): void;
  /** A new transcript exists at `file`. Answers `createTranscript`. */
  created(file: string): void;
  /** It could not be created, and why. */
  createFailed(message: string): void;
  /** The transcript at `file` is gone. Answers `trashTranscript`. */
  trashed(file: string): void;
  /** It could not be removed, and why. */
  trashFailed(file: string, message: string): void;
}

/** What the page asks of the host. */
export interface HostOutbound {
  /** Open `file` in the editor at `line` (1-based). */
  openLocation(file: string, line: number): void;
  /**
   * Run the suite. There is exactly one run model — the tree (ADR-302) — so
   * there is exactly one verb here. See the toolbar comment in index.html.
   */
  run(): void;
  cancel(): void;
  /** Remember the view mode for this project — the mode never switches itself. */
  persistMode(mode: string): void;
  /**
   * Ask for a transcript's text on disk. Answered by `source`/`sourceFailed`.
   *
   * The page cannot read files, and asking at open time rather than caching a
   * copy from discovery is deliberate: the author edits transcripts in the
   * editor pane too, and a cached copy would show them a file that no longer
   * exists.
   */
  requestSource(file: string): void;
  /**
   * Write a transcript back to disk, whole. Answered by `saved`/`saveFailed`.
   *
   * The whole file, not a patch: the serializer re-emits from the parsed model,
   * which is what makes the editor unable to write a file the runner would read
   * differently. The source face has already shown the author what that costs.
   */
  writeTranscript(file: string, text: string): void;
  /**
   * Create a transcript named `name` holding `text`.
   *
   * The page composes the content, because only the grammar knows what a
   * transcript is; the host chooses the path, because only it knows where the
   * story keeps its tests. ADR-290 D8: the location is inferred, never asked —
   * there is exactly one right answer and an unbounded set of wrong ones, and
   * the wrong ones fail silently as a test that simply never appears.
   */
  createTranscript(name: string, text: string): void;
  /**
   * Remove a transcript.
   *
   * "Trash", not "delete", and the name says so: the host moves the file to the
   * Finder's Trash. A test suite is work, and the only undo an editor can offer
   * for a whole file is the one the operating system already has.
   */
  trashTranscript(file: string): void;
  /** The page is built and ready to receive lines. */
  ready(): void;
}

/** The page's half of the seam, handed to `installHost`. */
export interface PageHandlers {
  onEvent(event: RunEvent): void;
  onUndecodable(text: string): void;
  onReset(story: string): void;
  onStatus(text: string): void;
  onDiscovered(files: string[]): void;
  onRestoreMode(mode: string): void;
  onAutoAssertion(policy: string | null): void;
  onFinished(ok: boolean): void;
  onSource(file: string, text: string): void;
  onSourceFailed(file: string, message: string): void;
  onSaved(file: string): void;
  onSaveFailed(file: string, message: string): void;
  onCreated(file: string): void;
  onCreateFailed(message: string): void;
  onTrashed(file: string): void;
  onTrashFailed(file: string, message: string): void;
}

interface WebKitBridge {
  messageHandlers?: Record<string, { postMessage(body: unknown): void }>;
}

/** The message-handler name the host registers on the content controller. */
const HANDLER = 'testingTab';

/**
 * Parses one NDJSON line into a run event.
 *
 * Returns null for anything the wire does not vouch for — a blank line, a line
 * from a future schema version, a line that is not JSON at all. Nothing is
 * guessed at: an unrecognised line is surfaced, never silently dropped into the
 * model.
 */
export function decodeLine(text: string): RunEvent | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  return isRunEvent(parsed) ? parsed : null;
}

/**
 * Wires the page to its host: installs `window.__sharpeeTesting` for Swift to
 * call, and returns the outbound half the page calls.
 *
 * Outside the IDE (`window.webkit` absent) the outbound calls become no-ops and
 * the page still runs — which is what makes the bundle openable in a browser for
 * design work without a second code path.
 */
export function installHost(handlers: PageHandlers): HostOutbound {
  const inbound: HostInbound = {
    line(text) {
      // A host chunk may carry several lines; splitting here keeps the Swift
      // side free to batch without the page caring.
      for (const raw of text.split('\n')) {
        if (!raw.trim()) continue;
        const event = decodeLine(raw);
        if (event) handlers.onEvent(event);
        else handlers.onUndecodable(raw);
      }
    },
    reset: (story) => handlers.onReset(story),
    status: (text) => handlers.onStatus(text),
    discovered: (files) => handlers.onDiscovered(files),
    restoreMode: (mode) => handlers.onRestoreMode(mode),
    autoAssertion: (policy) => handlers.onAutoAssertion(policy),
    finished: (ok) => handlers.onFinished(ok),
    source: (file, text) => handlers.onSource(file, text),
    sourceFailed: (file, message) => handlers.onSourceFailed(file, message),
    saved: (file) => handlers.onSaved(file),
    saveFailed: (file, message) => handlers.onSaveFailed(file, message),
    created: (file) => handlers.onCreated(file),
    createFailed: (message) => handlers.onCreateFailed(message),
    trashed: (file) => handlers.onTrashed(file),
    trashFailed: (file, message) => handlers.onTrashFailed(file, message),
  };
  (window as unknown as Record<string, unknown>).__sharpeeTesting = inbound;

  const webkit = (window as unknown as { webkit?: WebKitBridge }).webkit;
  const port = webkit?.messageHandlers?.[HANDLER];
  const send = (body: Record<string, unknown>): void => {
    try {
      port?.postMessage(body);
    } catch {
      // A closed web view is not the page's problem to report.
    }
  };

  return {
    openLocation: (file, line) => send({ action: 'openLocation', file, line }),
    run: () => send({ action: 'run' }),
    cancel: () => send({ action: 'cancel' }),
    persistMode: (mode) => send({ action: 'persistMode', mode }),
    requestSource: (file) => send({ action: 'requestSource', file }),
    writeTranscript: (file, text) => send({ action: 'writeTranscript', file, text }),
    createTranscript: (name, text) => send({ action: 'createTranscript', name, text }),
    trashTranscript: (file) => send({ action: 'trashTranscript', file }),
    ready: () => send({ action: 'ready' }),
  };
}
