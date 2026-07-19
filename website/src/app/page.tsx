import Link from "next/link";
import { Placeholder } from "@/components/doc-page";

export default function Home() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-10 sm:px-10">
      <h1 className="mb-2 text-[34px] font-bold">Parser IF, composed.</h1>
      <p className="mb-6 text-muted">
        Sharpee is a parser-based interactive fiction platform; Chord is its story
        language. Write worlds in Chord, run them anywhere.
      </p>
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/chord/getting-started/install"
          className="rounded-lg bg-button px-5 py-2.5 font-semibold text-button-text no-underline"
        >
          Get started
        </Link>
        <span className="rounded-full bg-wash px-3 py-1 text-[12px]">v3.2.0</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/chord/getting-started/install" className="no-underline">
          <Placeholder label="card: Chord getting-started" h={150} />
        </Link>
        <Link href="/sharpee/platform" className="no-underline">
          <Placeholder label="card: Sharpee platform" h={150} />
        </Link>
        <Link href="/learn/fernhill" className="no-underline">
          <Placeholder label="card: Fernhill tutorial" h={150} />
        </Link>
        <Link href="/play" className="no-underline">
          <Placeholder label="card: Play in the browser" h={150} />
        </Link>
      </div>
    </div>
  );
}
