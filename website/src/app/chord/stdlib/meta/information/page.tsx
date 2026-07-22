import { DocPage } from "@/components/doc-page";
import Content from "./content.mdx";

export default function Page() {
  return (
    <DocPage title="Information: about, help, inventory, scoring, version">
      <Content />
    </DocPage>
  );
}
