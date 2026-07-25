import { DocPage } from "@/components/doc-page";
import Content from "./content.mdx";

// The Chord-form reference is GENERATED — its content.mdx comes from
// scripts/generate-stdlib-chord.js (ADR-265). This wrapper is the stable route.
export default function Page() {
  return (
    <DocPage title="Chord reference">
      <Content />
    </DocPage>
  );
}
