/**
 * roadmap/page.tsx — the public roadmap.
 *
 * Content is DERIVED from `docs/roadmap/roadmap-*.md` by
 * `scripts/sync-roadmap.mjs`, which runs on `prebuild`/`predev` and writes
 * `src/lib/roadmap-data.json`. Do not hand-edit the JSON and do not restate item
 * content here — a roadmap that disagrees with the repository is worse than none.
 *
 * Public interface: the default-exported route component for `/roadmap`.
 *
 * Owner context: website.
 */
import { DocPage } from "@/components/doc-page";
import roadmap from "@/lib/roadmap-data.json";

/** Versions shown in the intro. Each moves on its own cadence (ADR-257). */
const VERSIONS = [
  { label: "Sharpee", value: "5.0.1" },
  { label: "Chord language", value: "3.0.0" },
  { label: "Chord Writer", value: "1.0.0" },
];

/** Muted pill used for an item's status and its build state. */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border px-2 py-0.5 text-[12px] text-muted">
      {children}
    </span>
  );
}

/** One labelled target field. `n/a` and `TBD` are real answers, not omissions. */
function Target({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-[14px]">{value}</dd>
    </div>
  );
}

export default function Page() {
  return (
    <DocPage title="Roadmap">
      <p>
        What is planned, what is being designed, and what has shipped. An item&apos;s
        presence here means a direction worth pursuing — it is not a delivery
        commitment, and its status says how far it has actually got.
      </p>

      <p className="text-[14px] text-muted">
        Current versions:{" "}
        {VERSIONS.map((v, i) => (
          <span key={v.label}>
            {i > 0 && " · "}
            {v.label} {v.value}
          </span>
        ))}
        . The three move independently.
      </p>

      <div className="space-y-6 pt-2">
        {roadmap.items.map((item) => (
          <section key={item.id} className="border-t border-border pt-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted">{item.id}</span>
              <h2 className="text-[18px] font-semibold">{item.title}</h2>
              <Tag>{item.status}</Tag>
            </div>

            <p className="mb-3">{item.summary}</p>

            <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <Target label="Created" value={item.created} />
              <Target label="Target date" value={item.targetDate} />
              <Target label="Target Sharpee" value={item.targetSharpee} />
              <Target label="Target Chord" value={item.targetChord} />
            </dl>

            <p className="text-[13px] text-muted">
              <span className="font-medium">Built:</span> {item.built}
            </p>
            <p className="text-[13px] text-muted">
              <span className="font-medium">Traces to:</span> {item.tracesTo}
            </p>
          </section>
        ))}
      </div>
    </DocPage>
  );
}
