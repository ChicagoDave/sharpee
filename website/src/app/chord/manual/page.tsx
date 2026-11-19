/**
 * page.tsx — The Chord Manual's page: what the book is, where to read it
 * online, and its two downloads.
 *
 * Public interface: the route /chord/manual. The files it links to are placed
 * by `website/scripts/publish-chord-manual.mjs` (the PDF and EPUB under
 * /downloads/, the web edition under /chord-manual/<version>/book/) and by
 * `sync-chord-manual-companion.mjs` (the companion folders).
 *
 * Owner context: website content; the Chord manual plan, Phase 9.
 */
import { DocPage } from "@/components/doc-page";
import Content from "./content.mdx";

export default function Page() {
  return (
    <DocPage title="The Chord Manual">
      <Content />
    </DocPage>
  );
}
