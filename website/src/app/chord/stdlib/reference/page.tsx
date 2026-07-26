import { DocPage } from "@/components/doc-page";
import Content from "./content.mdx";

// content.mdx is hand-maintained; each entry's grammar block renders via
// <GrammarBlock> from grammar-blocks.ts, GENERATED from the shipped Chord
// standard grammar by `repokit grammar` (ADR-272). This wrapper is the stable route.
export default function Page() {
  return (
    <DocPage title="Chord reference">
      <Content />
    </DocPage>
  );
}
