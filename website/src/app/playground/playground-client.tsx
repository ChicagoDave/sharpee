'use client';

/**
 * playground-client.tsx — the "Play It Now" playground (ADR-191 Phase 1, Chord).
 *
 * A CodeMirror 6 editor (Chord highlighting) + Play/Reset + an errors area + an
 * example picker, wired to the version-pinned playground bundle running in a
 * sandboxed <iframe>. The story text crosses to the iframe over postMessage
 * (contract in packages/devkit/templates/browser/playground-entry.ts.template):
 * parent posts { play, source }; the iframe posts { ready | diagnostics | playing }.
 *
 * Lazy-load on intent (ADR-191 Q-2): the iframe bundle (compiler + engine) mounts
 * only when the reader focuses the editor or presses Play — the shell is instant.
 *
 * Owner: website (not the platform workspace).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { chordLanguage, chordHighlightStyle } from './chord-mode';
import { EXAMPLES, STARTER_EXAMPLE } from './examples';

interface Diagnostic {
  line: number;
  column: number;
  code: string;
  message: string;
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13.5px', backgroundColor: 'var(--sh-surface)', color: 'var(--sh-ink)' },
  '.cm-scroller': { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: 'var(--sh-surface)', color: 'var(--sh-muted)', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'var(--sh-wash)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--sh-wash)' },
  '&.cm-focused': { outline: 'none' },
});

export function PlaygroundClient() {
  const editorParent = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingSource = useRef<string | null>(null);

  const [version, setVersion] = useState<string | null>(null);
  const [manifestMissing, setManifestMissing] = useState(false);
  const [loaded, setLoaded] = useState(false); // iframe mounted (lazy)
  const [ready, setReady] = useState(false); // iframe posted 'ready'
  const [frameKey, setFrameKey] = useState(0); // bump to reload the iframe (clean world)
  const [errors, setErrors] = useState<Diagnostic[] | null>(null);
  const [selectedId, setSelectedId] = useState(STARTER_EXAMPLE.id);

  // Resolve the pinned bundle version from the manifest the build writes.
  useEffect(() => {
    let live = true;
    fetch('/playground/current.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no manifest'))))
      .then((d: { version: string }) => live && setVersion(d.version))
      .catch(() => live && setManifestMissing(true));
    return () => {
      live = false;
    };
  }, []);

  // Initialise CodeMirror once (client-only; touches the DOM).
  useEffect(() => {
    if (viewRef.current || !editorParent.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: STARTER_EXAMPLE.source,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          bracketMatching(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          chordLanguage,
          chordHighlightStyle,
          editorTheme,
          EditorView.domEventHandlers({ focus: () => void setLoaded(true) }),
        ],
      }),
      parent: editorParent.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Receive the iframe's postMessages (ready / diagnostics / playing).
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const iframe = iframeRef.current;
      if (!iframe || e.source !== iframe.contentWindow) return;
      const data = e.data as { type?: string; errors?: Diagnostic[] } | null;
      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'ready') {
        setReady(true);
        if (pendingSource.current != null) {
          iframe.contentWindow?.postMessage({ type: 'play', source: pendingSource.current }, '*');
          pendingSource.current = null;
        }
      } else if (data.type === 'diagnostics') {
        setErrors(data.errors ?? []);
      } else if (data.type === 'playing') {
        setErrors(null);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const replaceDoc = useCallback((text: string) => {
    const view = viewRef.current;
    if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  }, []);

  const play = useCallback(() => {
    const source = viewRef.current?.state.doc.toString() ?? '';
    setErrors(null);
    if (!loaded) {
      pendingSource.current = source; // iframe mounts → 'ready' → posts pending
      setLoaded(true);
      return;
    }
    if (ready) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'play', source }, '*');
    } else {
      pendingSource.current = source;
    }
  }, [loaded, ready]);

  const reset = useCallback(() => {
    replaceDoc(STARTER_EXAMPLE.source);
    setSelectedId(STARTER_EXAMPLE.id);
    setErrors(null);
    if (loaded) {
      setReady(false);
      setFrameKey((k) => k + 1); // remount the iframe → a guaranteed fresh world
    }
  }, [loaded, replaceDoc]);

  const loadExample = useCallback(
    (id: string) => {
      const ex = EXAMPLES.find((e) => e.id === id) ?? STARTER_EXAMPLE;
      setSelectedId(id);
      replaceDoc(ex.source);
    },
    [replaceDoc],
  );

  const iframeSrc = version ? `/playground/v${version}/index.html` : undefined;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-220px)] lg:min-h-[560px] lg:flex-row">
      {/* Editor column */}
      <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-wash px-3 py-2">
          <label className="text-[13px] text-muted" htmlFor="pg-example">
            Example
          </label>
          <select
            id="pg-example"
            value={selectedId}
            onChange={(e) => loadExample(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[13px] text-ink"
          >
            {EXAMPLES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={play}
              className="rounded-md bg-navy-700 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-navy-800"
            >
              ▶ Play
            </button>
            <button
              onClick={reset}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-wash"
            >
              Reset
            </button>
          </div>
        </div>
        <div ref={editorParent} className="min-h-0 flex-1 overflow-auto" />
        {errors !== null && (
          <div className="max-h-[30%] overflow-auto border-t border-border bg-surface px-3 py-2 text-[12.5px]">
            {errors.length === 0 ? (
              <span className="text-muted">No diagnostics.</span>
            ) : (
              <ul className="space-y-1">
                {errors.map((d, i) => (
                  <li key={i} className="font-mono text-rose-700">
                    {d.line}:{d.column} [{d.code}] {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Player column */}
      <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-wash px-3 py-2 text-[13px]">
          <span className="font-semibold text-ink">Player</span>
          <span className="text-muted">
            {version ? `Sharpee v${version}` : manifestMissing ? 'bundle not built' : 'loading…'}
          </span>
        </div>
        <div className="relative min-h-0 flex-1 bg-surface">
          {loaded && iframeSrc ? (
            <iframe
              key={frameKey}
              ref={iframeRef}
              src={iframeSrc}
              title="Sharpee Playground"
              // allow-same-origin is needed for the runtime's localStorage (saves,
              // theme); Phase 4 tightens isolation (AC-7) — e.g. a distinct origin.
              sandbox="allow-scripts allow-same-origin"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted">
              {manifestMissing
                ? 'The playground bundle is not built. Run ./repokit build --playground.'
                : 'Press ▶ Play to compile and run your story here.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
