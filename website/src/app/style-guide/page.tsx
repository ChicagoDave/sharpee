/**
 * /style-guide — living reference for the content primitives, and the
 * REAL-PATH proof of the MDX pipeline (route .tsx wraps imported .mdx in
 * DocPage). Deliberately absent from nav.ts.
 */

import { DocPage } from "@/components/doc-page";
import Content from "./content.mdx";

export default function Page() {
  return (
    <DocPage title="Style guide">
      <Content />
    </DocPage>
  );
}
