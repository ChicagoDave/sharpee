import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Routes stay .tsx (no pageExtensions change): .mdx files are CONTENT,
  // imported by route files and wrapped in <DocPage> — never routes themselves.
};

const withMDX = createMDX({
  options: {
    // String form — Turbopack requires serializable plugin names.
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
