/**
 * download-card.tsx — the Chord Writer downloads, as icon tiles rather than
 * inline text links.
 *
 * Chord Writer ships as SEPARATE PER-ARCH INSTALLERS (ADR-279 D4): each app
 * carries a bundled Node runtime and devkit closure for exactly one
 * architecture, so there is no universal build and the reader has to choose.
 * A row of tiles makes that a choice between two things; two sentences with
 * links in them makes it a reading comprehension exercise.
 *
 * The registry pattern mirrors src/components/screenshot.tsx: one entry per
 * download holds the file, the label, and the requirement line, so a page
 * says which downloads to show and never restates their details.
 *
 * Public interface: <DownloadRow> — available in every .mdx via the global
 * element map (src/mdx-components.tsx). Owner: website.
 */

import Image from "next/image";

// The app's own icon, rendered from Contents/Resources/AppIcon.icns at 512px.
// Deliberately the shipped icon rather than separate download art: the tile is
// showing the reader the thing they are about to install (David, 2026-08-13).
import appIcon from "@/images/chord-writer/app-icon.png";

type Download = {
  /** Served from public/downloads/ — the file plover actually holds. */
  file: string;
  /** What the reader is choosing between. Short: it sits under the icon. */
  label: string;
  /** Which machine this one is for. The deciding line. */
  requirement: string;
  /** Approximate download size, so a 59MB pull is not a surprise. */
  size: string;
};

/**
 * Apple silicon first: it is the majority of Macs sold since 2020 and the
 * build we exercise natively. Intel is offered, not led with.
 */
const DOWNLOADS: Download[] = [
  {
    file: "ChordWriter-1.2.0-arm64.dmg",
    label: "Apple silicon",
    requirement: "M1 or later · macOS 11+",
    size: "60 MB",
  },
  {
    file: "ChordWriter-1.2.0-x86_64.dmg",
    label: "Intel",
    requirement: "Intel Mac · macOS 11+",
    size: "62 MB",
  },
];

export function DownloadRow() {
  return (
    <div className="not-prose my-6 grid gap-4 sm:grid-cols-2">
      {DOWNLOADS.map((d) => (
        <a
          key={d.file}
          href={`/downloads/${d.file}`}
          // The whole tile is the target, not just the words in it — a
          // 44pt-plus hit area, which a text link inside a sentence is not.
          className="group flex items-center gap-4 rounded-xl border border-navy-200 bg-white px-4 py-4 no-underline transition hover:border-navy-400 hover:shadow-sm dark:border-navy-700 dark:bg-navy-800 dark:hover:border-navy-500"
        >
          <Image
            src={appIcon}
            alt=""
            aria-hidden="true"
            width={56}
            height={56}
            className="shrink-0 rounded-lg"
          />
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold leading-tight">{d.label}</span>
            <span className="text-[13px] leading-snug opacity-70">{d.requirement}</span>
            <span className="text-[13px] leading-snug opacity-55">
              .dmg · {d.size}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
