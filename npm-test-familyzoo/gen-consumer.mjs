#!/usr/bin/env node
/**
 * gen-consumer.mjs — pack the LOCAL @sharpee build for familyzoo and emit a
 * consumer package.json that installs entirely from local tarballs.
 *
 * Owner context: npm-test-familyzoo harness (local-build npm regression).
 * Public interface: CLI — node gen-consumer.mjs <stagingDir> <familyzooPkgJson> <vendorDir> <outPkgJson>
 *   stagingDir       ~/.tsf-publish/sharpee (output of `tsf build --npm`)
 *   familyzooPkgJson tutorials/familyzoo/package.json (source of direct deps)
 *   vendorDir        where tarballs are written (temp/vendor)
 *   outPkgJson       where the generated consumer package.json is written
 *
 * Walks familyzoo's @sharpee deps transitively over the staged packages,
 * `npm pack`s each into vendorDir, and writes file: refs. Third-party deps
 * (fflate, etc.) are left to resolve from the registry, as a real consumer's
 * install would.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [, , stagingDir, fzPkgPath, vendorDir, outPkgPath] = process.argv;
if (!stagingDir || !fzPkgPath || !vendorDir || !outPkgPath) {
  console.error('usage: gen-consumer.mjs <stagingDir> <familyzooPkgJson> <vendorDir> <outPkgJson>');
  process.exit(2);
}

// Map @sharpee package name -> its staging subdirectory (don't assume dir == short name).
const nameToDir = {};
for (const d of readdirSync(stagingDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const pj = join(stagingDir, d.name, 'package.json');
  if (!existsSync(pj)) continue;
  const p = JSON.parse(readFileSync(pj, 'utf8'));
  if (p.name?.startsWith('@sharpee/')) nameToDir[p.name] = d.name;
}

const sharpeeDepsOf = (name) => {
  const dir = nameToDir[name];
  if (!dir) return [];
  const p = JSON.parse(readFileSync(join(stagingDir, dir, 'package.json'), 'utf8'));
  return Object.keys(p.dependencies || {}).filter((n) => n.startsWith('@sharpee/') && nameToDir[n]);
};

// Seed from familyzoo's declared @sharpee deps; fail loudly if any are absent locally.
const fz = JSON.parse(readFileSync(fzPkgPath, 'utf8'));
const seed = Object.keys(fz.dependencies || {}).filter((n) => n.startsWith('@sharpee/'));
const missing = seed.filter((n) => !nameToDir[n]);
if (missing.length) {
  console.error('ERROR: familyzoo deps absent from local staging: ' + missing.join(', '));
  console.error('Run `tsf build --npm` from the repo root first.');
  process.exit(1);
}

// Transitive closure over staged @sharpee deps.
const closure = new Set();
const stack = [...seed];
while (stack.length) {
  const n = stack.pop();
  if (closure.has(n)) continue;
  closure.add(n);
  for (const d of sharpeeDepsOf(n)) if (!closure.has(d)) stack.push(d);
}

// transcript-tester supplies the `transcript-test` bin (dev-only).
const TT = '@sharpee/transcript-tester';
const haveTT = Boolean(nameToDir[TT]);

const pack = (name) => {
  const dir = join(stagingDir, nameToDir[name]);
  const out = execSync(`npm pack "${dir}" --pack-destination "${vendorDir}" --ignore-scripts --json`, {
    encoding: 'utf8',
  });
  return JSON.parse(out)[0].filename;
};

const dependencies = {};
for (const n of [...closure].sort()) dependencies[n] = `file:vendor/${pack(n)}`;
const devDependencies = { typescript: '^5.0.0' };
if (haveTT) devDependencies[TT] = `file:vendor/${pack(TT)}`;

writeFileSync(
  outPkgPath,
  JSON.stringify(
    {
      name: 'sharpee-npm-local-familyzoo',
      version: '1.0.0',
      private: true,
      description: 'Local-build npm regression test: familyzoo compiled+run against ~/.tsf-publish output',
      main: 'dist/index.js',
      dependencies,
      devDependencies,
    },
    null,
    2,
  ) + '\n',
);

console.log(`Packed ${closure.size} @sharpee packages${haveTT ? ' + transcript-tester' : ''}.`);
console.log('Closure: ' + [...closure].map((n) => n.replace('@sharpee/', '')).sort().join(', '));
