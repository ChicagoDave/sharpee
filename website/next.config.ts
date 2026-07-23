import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The lockstep platform version, read from the monorepo's `@sharpee/sharpee`
 * package.json at build time and inlined below — never hardcoded, so a version
 * bump never needs a website edit. Empty when built outside the monorepo (a
 * standalone deploy); the badge then simply omits the version.
 */
function platformVersion(): string {
  try {
    return JSON.parse(
      readFileSync(join(process.cwd(), "..", "packages", "sharpee", "package.json"), "utf8"),
    ).version;
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  // Inlined into the bundle (server + client) at build; consumed by the home badge.
  env: { SHARPEE_VERSION: platformVersion() },

  // Routes stay .tsx (no pageExtensions change): .mdx files are CONTENT,
  // imported by route files and wrapped in <DocPage> — never routes themselves.

  // The `Language` group (people / doors-and-regions / topics) was retired
  // (nav-restructure 2026-07-21): it duplicated the numbered Author guide,
  // which covers each topic in its dedicated entry. Redirect the old URLs to
  // their guide homes so external links stay live.
  async redirects() {
    return [
      { source: "/chord/language/people", destination: "/chord/guide/world/people", permanent: true },
      { source: "/chord/language/doors-and-regions", destination: "/chord/guide/world/doors", permanent: true },
      { source: "/chord/language/topics", destination: "/chord/guide/behavior/topic-tables", permanent: true },
    ];
  },
};

const withMDX = createMDX({
  options: {
    // String form — Turbopack requires serializable plugin names.
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
