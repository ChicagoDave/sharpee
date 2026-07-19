/**
 * Home — the landing page. Describes BOTH products (David's ruling,
 * 2026-07-19, ADR-232 Q-1 partial): Chord, an IF Modeling Language, and
 * Sharpee, the TypeScript platform — with Chord as the front door per
 * ADR-232's Chord-first decision.
 */

import Link from "next/link";

function Card({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-surface p-5 no-underline transition-colors hover:border-navy-400"
    >
      <div className="mb-1.5 font-semibold">{title}</div>
      <div className="text-[14px] text-muted">{children}</div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-10 sm:px-10">
      <h1 className="mb-2 text-[34px] font-bold">Parser IF, composed.</h1>
      <p className="mb-6 text-[17px] text-muted">
        Write interactive fiction in <strong className="text-ink">Chord</strong>, an IF
        modeling language: declare rooms, things, people, and behavior as plain,
        compile-checked facts. Underneath runs{" "}
        <strong className="text-ink">Sharpee</strong>, a TypeScript platform you can also
        author against directly — one engine, two surfaces.
      </p>
      <div className="mb-10 flex items-center gap-4">
        <Link
          href="/chord/getting-started/install"
          className="rounded-lg bg-button px-5 py-2.5 font-semibold text-button-text no-underline"
        >
          Get started
        </Link>
        <Link href="/play" className="text-link underline underline-offset-2">
          or play a story first
        </Link>
        <span className="rounded-full bg-wash px-3 py-1 text-[12px]">v3.2.0</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card href="/chord/getting-started/install" title="Chord — the language">
          An IF Modeling Language. One .story file, no build config; the
          compiler checks every name, state, and topic before the game runs.
          Install the CLI and scaffold a playable story in one command.
        </Card>
        <Card href="/sharpee/platform" title="Sharpee — the platform">
          The TypeScript engine underneath: traits, four-phase actions,
          event-sourced turns, and a text system that never mangles an
          article. Author against it directly, or look under Chord's hood.
        </Card>
        <Card href="/learn/fernhill" title="Learn — the Fernhill tutorial">
          Build "The Folly at Fernhill" in eight chapters: rooms and doors,
          people and patrols, timelines, a state machine, three endings, and
          a browser build with sound and images.
        </Card>
        <Card href="/play" title="Play — in the browser">
          Fernhill, playable now. A self-contained static page that compiles
          the story source in your browser — the same build every author
          gets from one command.
        </Card>
      </div>
    </div>
  );
}
