/**
 * /play — playable stories, embedded as self-contained static browser
 * clients (synced from `sharpee build --browser` output into
 * public/web/<story>/). Static-asset embedding only — the ADR-191
 * in-browser-compiler playground is a separate, later deliverable.
 */

import { DocPage } from "@/components/doc-page";

export default function Page() {
  return (
    <DocPage title="Play">
      <p>
        <strong>The Folly at Fernhill</strong> — one winter night to find the
        deed that keeps Fernhill in the family. The tutorial story, playable
        right here: the browser compiles the story source at boot and runs it
        with sound, images, and live panels.
      </p>
      <iframe
        src="/web/fernhill/index.html"
        title="The Folly at Fernhill"
        className="h-[640px] w-full rounded-lg border border-border bg-surface"
      />
      <p className="text-[14px] text-muted">
        Prefer a full window?{" "}
        <a href="/web/fernhill/index.html" target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">
          Open Fernhill in its own tab
        </a>
        . The page is a self-contained static build — the same thing{" "}
        <code className="rounded bg-code px-1.5 py-0.5 font-mono text-[0.9em]">sharpee build --browser</code>{" "}
        produces for your own story. The{" "}
        <a href="/learn/fernhill" className="text-link underline underline-offset-2">Fernhill tutorial</a>{" "}
        walks through how every part of it is made.
      </p>
    </DocPage>
  );
}
