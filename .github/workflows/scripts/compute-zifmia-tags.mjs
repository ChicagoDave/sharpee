#!/usr/bin/env node
/**
 * compute-zifmia-tags.mjs — emit the Docker tag list for one Zifmia push.
 *
 * Reads existing tags from GHCR via the GitHub API, applies the
 * conditional-advancement rule (ADR-179 Invariant 5), and prints one
 * full `image:tag` reference per line on stdout. The workflow feeds
 * that list into docker/build-push-action's `tags:` input.
 *
 * Inputs:
 *   --image    e.g. ghcr.io/chicagodave/zifmia (default) or a sandbox name
 *   --version  raw semver (X.Y.Z[-pre]) — without the zifmia-v prefix
 *   --mode     release | manual         — manual skips floating advancement
 *
 * Env:
 *   GH_TOKEN   used as Bearer for api.github.com (GITHUB_TOKEN suffices
 *              inside GitHub Actions because packages:write implies read)
 *
 * Public interface: stdout list of `image:tag` lines.
 * Owner context: tools/zifmia release pipeline.
 */

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) out[k.slice(2)] = argv[++i];
  }
  return out;
}

function parseSemver(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9.-]+))?$/.exec(s);
  if (!m) return null;
  return { raw: s, major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || null };
}

function cmp(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  // SemVer 2.0: pre-release versions are lower than the corresponding release.
  if (a.pre && !b.pre) return -1;
  if (!a.pre && b.pre) return 1;
  if (a.pre && b.pre) return a.pre.localeCompare(b.pre);
  return 0;
}

function parseImageRef(image) {
  const m = /^ghcr\.io\/([^/]+)\/(.+)$/.exec(image);
  if (!m) throw new Error(`Image '${image}' is not under ghcr.io.`);
  return { owner: m[1], pkg: m[2] };
}

async function fetchExistingTags(owner, pkg) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sharpee-zifmia-publish',
  };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;

  // Try user-owned namespace first, then org. Personal accounts respond
  // to /users/...; orgs to /orgs/... The other path 404s cleanly.
  for (const scope of ['users', 'orgs']) {
    let url = `https://api.github.com/${scope}/${encodeURIComponent(owner)}/packages/container/${encodeURIComponent(pkg)}/versions?per_page=100`;
    const tags = new Set();
    let firstResp = true;
    while (url) {
      const res = await fetch(url, { headers });
      if (res.status === 404 && firstResp) { tags.clear(); break; }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`GHCR API ${url} returned ${res.status}: ${body.slice(0, 200)}`);
      }
      const versions = await res.json();
      for (const v of versions) {
        const ts = v?.metadata?.container?.tags || [];
        for (const t of ts) tags.add(t);
      }
      const link = res.headers.get('link') || '';
      const next = /<([^>]+)>;\s*rel="next"/.exec(link);
      url = next ? next[1] : null;
      firstResp = false;
    }
    if (tags.size > 0 || !firstResp) return [...tags];
  }
  return [];
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.image || !args.version) {
    console.error('Usage: compute-zifmia-tags.mjs --image <ref> --version <semver> [--mode release|manual]');
    process.exit(1);
  }
  const mode = args.mode || 'release';
  const v = parseSemver(args.version);
  if (!v) {
    console.error(`Invalid semver: ${args.version}`);
    process.exit(1);
  }

  const tags = [`${args.image}:${v.raw}`];

  // Pre-release tags and manual-dispatch runs never advance floating
  // pointers. ADR-179 §Out of Scope reserves pre-release semantics for
  // a future amendment; manual mode is for sandbox testing.
  if (v.pre || mode !== 'release') {
    console.log(tags.join('\n'));
    return;
  }

  const { owner, pkg } = parseImageRef(args.image);
  const existing = (await fetchExistingTags(owner, pkg))
    .map(parseSemver)
    .filter(s => s && !s.pre);

  const highestIn = (list) =>
    list.length ? list.reduce((a, b) => (cmp(a, b) >= 0 ? a : b)) : null;

  const xy = highestIn(existing.filter(s => s.major === v.major && s.minor === v.minor));
  if (!xy || cmp(v, xy) >= 0) tags.push(`${args.image}:${v.major}.${v.minor}`);

  const x = highestIn(existing.filter(s => s.major === v.major));
  if (!x || cmp(v, x) >= 0) tags.push(`${args.image}:${v.major}`);

  const top = highestIn(existing);
  if (!top || cmp(v, top) >= 0) tags.push(`${args.image}:latest`);

  console.log(tags.join('\n'));
}

main().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
