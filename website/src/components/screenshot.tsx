/**
 * screenshot.tsx — app screenshots for content pages. One registry entry per
 * image holds the static import (next/image reads intrinsic size from it, so
 * no page ever states dimensions) and the alt text, which belongs with the
 * image rather than with whichever page happens to show it.
 *
 * The captured windows carry their own rounding and drop shadow on a
 * transparent margin, so the figure adds no border, radius, or shadow of its
 * own — it only cancels the article's horizontal padding, letting a shot span
 * the full content column.
 *
 * Public interface: <Screenshot name caption?> — available in every .mdx via
 * the global element map (src/mdx-components.tsx). Owner: website.
 */

import Image, { type StaticImageData } from "next/image";

import documentation from "@/images/chord-writer/documentation.png";
import play from "@/images/chord-writer/play.png";
import playThemes from "@/images/chord-writer/play-themes.png";
import publish from "@/images/chord-writer/publish.png";
import testing from "@/images/chord-writer/testing.png";

type Shot = { src: StaticImageData; alt: string };

/** Every screenshot the content pages can reference, by name. */
const SHOTS = {
  "chord-writer/play": {
    src: play,
    alt: "The Chord Writer window: project pane on the left, the story source in the editor, and the Play tab on the right running the story in a retro terminal theme.",
  },
  "chord-writer/play-themes": {
    src: playThemes,
    alt: "The Play tab's theme picker open, listing Story Default, Classic, Modern Dark, Paper, Retro Terminal, and System 6, with the story running under the Paper theme.",
  },
  "chord-writer/testing": {
    src: testing,
    alt: "The Testing tab: recorded turn cards with their claims in the middle, and the run column on the right showing each claim's verdict and a passing tally.",
  },
  "chord-writer/documentation": {
    src: documentation,
    alt: "The Documentation tab: a contents rail of Chord Writer and Chord pages beside a rendered documentation page.",
  },
  "chord-writer/publish": {
    src: publish,
    alt: "The Publish tab: the toolchain's publish output, ending with the built artifact's size, IFID, and zip path, above a Reveal in Finder button.",
  },
} as const satisfies Record<string, Shot>;

export type ScreenshotName = keyof typeof SHOTS;

/**
 * A screenshot with an optional caption.
 *
 * @param name — registry key; the alt text and intrinsic size come with it.
 * @param caption — the editorial line under the image. Omit when the
 *   surrounding prose already says what the reader is looking at.
 */
export function Screenshot({ name, caption }: { name: ScreenshotName; caption?: string }) {
  const shot = SHOTS[name];
  return (
    <figure className="-mx-6 my-6 sm:-mx-10">
      {/* An app window scaled to a text column loses its smallest labels, so
          the image opens at full size in a new tab. */}
      <a
        href={shot.src.src}
        target="_blank"
        rel="noreferrer"
        className="block cursor-zoom-in"
        title="Open at full size"
      >
        {/* h-auto/w-full: the intrinsic width from the static import would
            otherwise render at full size and overflow the column. */}
        <Image
          src={shot.src}
          alt={shot.alt}
          sizes="(max-width: 860px) 100vw, 860px"
          className="h-auto w-full"
        />
      </a>
      {caption && (
        <figcaption className="px-6 pt-1 text-[13px] text-muted sm:px-10">{caption}</figcaption>
      )}
    </figure>
  );
}
