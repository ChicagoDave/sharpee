/**
 * status-bar-example.tsx — the Chord Writer status-bar line, rendered from the
 * repository's real versions rather than retyped into prose.
 *
 * Public interface: <StatusBarExample title?>.
 * Owner context: website components.
 *
 * WHY THIS IS A COMPONENT. The line appears on two pages (the Chord Writer
 * landing page and its download page) and names three versions that move
 * independently. Written by hand it was wrong on both pages within a day: it
 * read "Chord Writer 1.2.0 · Sharpee 5.1.0" while 1.3.1 and 5.1.1 were what
 * shipped, and only Chord's 3.3.0 happened to still be right because the
 * language had not moved. Two pages x three numbers is six chances to drift on
 * every release; this is one place reading `versions.json`, which
 * `scripts/sync-versions.mjs` regenerates from the repository at prebuild.
 *
 * It renders through CodeBlock — the same primitive `pre:` maps fenced code to
 * in mdx-components.tsx — so it is typographically identical to the fence it
 * replaced.
 */
import { CodeBlock } from "@/components/prose";
import versions from "@/lib/versions.json";

/**
 * Render the status bar exactly as Chord Writer prints it: the app's own
 * version first, then the toolchain it resolved.
 *
 * @param title optional caption shown above the block, as CodeBlock defines it.
 */
export function StatusBarExample({ title }: { title?: string }) {
  return (
    <CodeBlock {...(title ? { title } : {})}>
      {`Chord Writer ${versions.chordWriter} · Sharpee ${versions.sharpee} / Chord ${versions.chord}`}
    </CodeBlock>
  );
}
