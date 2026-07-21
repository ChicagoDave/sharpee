import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
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
