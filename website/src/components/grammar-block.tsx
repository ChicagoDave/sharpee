/**
 * grammar-block.tsx — renders one standard action's `define action` block,
 * verbatim from the generated grammar-blocks data module (ADR-272 D4). The
 * module is derived from packages/parser-en-us/grammar/standard-en-us.story
 * by `repokit grammar` and freshness-gated by `repokit verify`.
 *
 * Public interface: <GrammarBlock action="if.action.…" /> — an unknown id
 * throws at render (build) time, never a silent empty block.
 * Owner context: website stdlib reference.
 */
import { CodeBlock } from "@/components/prose";
import { grammarBlocks } from "@/app/chord/stdlib/reference/grammar-blocks";

export function GrammarBlock({ action }: { action: string }) {
  const block = grammarBlocks[action];
  if (block === undefined) {
    throw new Error(
      `<GrammarBlock action="${action}">: no derived block — fix the id or run \`repokit grammar\``,
    );
  }
  return (
    <CodeBlock>
      <code className="language-chord">{block}</code>
    </CodeBlock>
  );
}
