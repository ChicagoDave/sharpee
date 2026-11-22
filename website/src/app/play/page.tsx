/**
 * /play — playable stories, embedded as self-contained static browser
 * clients (synced from `sharpee build --browser` output into
 * public/web/<story>/). The Relighting is the exception: its build is
 * committed under public/chord-manual/<version>/play/ by
 * website/scripts/publish-relighting.mjs. Static-asset embedding only — the ADR-191
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
      <h2 className="pt-4 text-[18px] font-semibold">The Relighting</h2>
      <p>
        <strong>The Relighting</strong> is the story{" "}
        <a href="/chord/manual" className="text-link underline underline-offset-2">The Chord Manual</a>{" "}
        builds a chapter at a time. Thirty years after the magic went out of
        the world, a lamp burns blue in the porter&apos;s lodge at Lanternhall,
        and you have one day to relight the Lantern. This is the story as it
        stands at the end of the book.
      </p>
      <iframe
        src="/chord-manual/4.1.0/play/index.html"
        title="The Relighting"
        className="h-[640px] w-full rounded-lg border border-border bg-surface"
      />
      <p className="text-[14px] text-muted">
        Prefer a full window?{" "}
        <a href="/chord-manual/4.1.0/play/index.html" target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">
          Open The Relighting in its own tab
        </a>
        . Its source is the{" "}
        <a href="/chord-manual/4.1.0/relighting" className="text-link underline underline-offset-2">chapter-40 companion folder</a>
        , built with{" "}
        <code className="rounded bg-code px-1.5 py-0.5 font-mono text-[0.9em]">sharpee publish</code>
        {" "}as chapter 40 describes.
      </p>
    </DocPage>
  );
}
