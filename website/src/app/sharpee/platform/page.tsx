import { DocPage, Placeholder } from "@/components/doc-page";

export default function Page() {
  return (
    <DocPage title="Platform overview">
      <Placeholder label="prose block" />
      <Placeholder label="code sample" />
      <Placeholder label="next/prev pager" h={90} />
    </DocPage>
  );
}
