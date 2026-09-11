/**
 * releases/page.tsx — the published release notes.
 *
 * Content is DERIVED from `docs/releases/release-*.md` by
 * `scripts/sync-releases.mjs`, which runs on `prebuild`/`predev` and writes
 * `src/lib/releases-data.json`. Do not hand-edit the JSON and do not restate a
 * release's content here — notes that disagree with what shipped are worse
 * than none.
 *
 * Public interface: the default-exported route component for `/releases`.
 *
 * Owner context: website.
 */
import { DocPage } from "@/components/doc-page";
import releases from "@/lib/releases-data.json";
import versions from "@/lib/versions.json";

/** Muted pill — a release's status, and the Chord language version it shipped with. */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border px-2 py-0.5 text-[12px] text-muted">
      {children}
    </span>
  );
}

export default function Page() {
  return (
    <DocPage title="Release notes">
      <p>
        Every published Sharpee release, newest first. A release is listed here
        once it is on npm — a version that was bumped and never published does
        not appear, because these notes describe what you can actually install.
      </p>

      <p className="text-[14px] text-muted">
        Current: Sharpee {versions.sharpee} · Chord language {versions.chord} ·
        Chord Writer {versions.chordWriter}. The three move independently
        (ADR-257): a platform patch does not touch the language, and the
        language version moves only when the author-visible surface changes.
      </p>

      <div className="space-y-6 pt-2">
        {releases.releases.map((release) => (
          <section key={release.version} className="border-t border-border pt-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold">{release.version}</h2>
              <span className="text-[15px] text-muted">— {release.title}</span>
              <Tag>{release.published}</Tag>
              <Tag>Chord {release.chord}</Tag>
            </div>

            <p className="mb-3">{release.summary}</p>

            {release.notes.length > 0 && (
              <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[14px]">
                {release.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            )}

            <p className="text-[13px] text-muted">
              <span className="font-medium">Traces to:</span> {release.tracesTo}
            </p>
          </section>
        ))}
      </div>
    </DocPage>
  );
}
