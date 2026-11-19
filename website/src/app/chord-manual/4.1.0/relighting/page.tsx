/**
 * chord-manual/4.1.0/relighting/page.tsx — the listing of The Chord Manual's
 * companion folders, at the address the book prints.
 *
 * The book tells its reader that the folders are at
 * https://sharpee.net/chord-manual/4.1.0/relighting/ and that each "can be
 * read in a browser, file by file". The files themselves are static, under
 * `public/chord-manual/4.1.0/relighting/`, but a directory under `public/` has
 * no page of its own, so without this route the printed address is a 404.
 *
 * Content is DERIVED from `index.json` in that directory, which
 * `scripts/sync-chord-manual-companion.mjs` writes with the folders. Do not
 * list a folder or a file here by hand.
 *
 * Invariant: this route's path and the directory under `public/` are the same
 * path, version included. A new edition gets a new directory and a new copy of
 * this route beside it; the 4.1.0 address stays as printed.
 *
 * Public interface: the default-exported route component for
 * `/chord-manual/4.1.0/relighting`.
 *
 * Owner context: website; the Chord manual plan, Phase 9.
 */
import { DocPage } from "@/components/doc-page";
import index from "../../../../../public/chord-manual/4.1.0/relighting/index.json";

/** Where the static files are served from; the same path as this route. */
const BASE = "/chord-manual/4.1.0/relighting";

/** A folder's size as the reader will see it in a download, in whole KB. */
function kilobytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function Page() {
  return (
    <DocPage title="The Relighting: the companion folders">
      <p>
        These folders go with <a href="/chord/manual">The Chord Manual</a>, edition {index.version}.
        Each holds <em>The Relighting</em> as it stands at the end of one chapter, or at the end of
        one Part. A chapter&rsquo;s &ldquo;Build and try it&rdquo; begins by copying from the folder
        named for it.
      </p>
      <p>
        Download a folder whole with its <code>.zip</code> link, or open any file in it from the
        list beneath its name.
      </p>
      {index.folders.map((entry) => (
        <section key={entry.folder} id={entry.folder} className="pt-2">
          <h2 className="text-[18px] font-bold">
            {entry.folder}{" "}
            <a className="text-[14px] font-normal" href={`${BASE}/${entry.zip}`}>
              {entry.zip} ({kilobytes(entry.zipBytes)})
            </a>
          </h2>
          <ul className="list-disc pl-6 text-[14px]">
            {entry.files.map((file) => (
              <li key={file}>
                <a href={`${BASE}/${entry.folder}/${file}`}>{file}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </DocPage>
  );
}
