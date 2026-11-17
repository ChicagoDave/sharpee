#!/usr/bin/env node
/**
 * check-bare-story-install.cjs — prove that the `sharpee` command, installed
 * from the staged npm artifacts with nothing else beside it, builds and
 * publishes a Chord project that is one folder with no package.json.
 *
 * Purpose: this is the path *The Chord Manual* teaches (chapter 4 installs
 * `@sharpee/devkit` and nothing else; chapters 37 and 40 run `sharpee build`
 * and `sharpee publish`). The in-repo build cannot show it works, because the
 * workspace resolves every `@sharpee/*` package from anywhere. `repokit
 * test:npm` cannot either: its consumer is a TypeScript story whose own
 * package.json lists the runtime packages.
 *
 * Usage: node scripts/check-bare-story-install.cjs [<project dir>]
 *          [--staging <dir>]  the `tsf build --npm` output
 *                             (default ~/.tsf-publish/sharpee)
 *          [--keep]           keep the two temporary folders and print them
 *        <project dir> defaults to tutorials/relighting/chord-v4.1.0/chapter-40.
 *        Run `pnpm exec tsf build --npm` first, and `./repokit build` before
 *        that (the script uses tools/repokit/dist/consumer-gen.js).
 *        Exit code: 0 when both commands succeed and their outputs exist,
 *        1 when a command or an output check fails, 2 on a usage error.
 *
 * What it does:
 *   1. Installs the staged devkit and its whole `@sharpee/*` closure, as
 *      tarballs, into a temporary "tool" folder outside the repository.
 *   2. Copies the project (without `dist/` and `node_modules/`) into a second
 *      temporary folder that shares no ancestor node_modules with the first.
 *   3. Runs the installed CLI's `build` and `publish` there, with NODE_PATH
 *      unset, and checks the page, the engine stylesheet and the zip.
 *
 * What it does not show: npm's layout for `npm install -g` nests a package's
 * dependencies under that package, where this install hoists them beside it.
 * devkit finds its dependencies by Node's own lookup path, which covers both,
 * but only the hoisted layout is exercised here.
 *
 * Owner context: book tooling and release checks (docs/work/chord-manual).
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const DEFAULT_PROJECT = path.join(REPO, 'tutorials', 'relighting', 'chord-v4.1.0', 'chapter-40');
const DEFAULT_STAGING = path.join(os.homedir(), '.tsf-publish', 'sharpee');
const CONSUMER_GEN = path.join(REPO, 'tools', 'repokit', 'dist', 'consumer-gen.js');

/** Print a usage error and exit 2. */
function usage(message) {
  console.error(`check-bare-story-install: ${message}`);
  process.exit(2);
}

/** Parse argv into { projectDir, stagingDir, keep }. */
function parseArgs(argv) {
  let projectDir = DEFAULT_PROJECT;
  let stagingDir = DEFAULT_STAGING;
  let keep = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--keep') keep = true;
    else if (arg === '--staging') {
      i += 1;
      if (argv[i] === undefined) usage('--staging needs a directory');
      stagingDir = path.resolve(argv[i]);
    } else if (arg.startsWith('--')) usage(`unknown option ${arg}`);
    else projectDir = path.resolve(arg);
  }
  return { projectDir, stagingDir, keep };
}

/** The one `.story` file in `dir`; a usage error when there is not exactly one. */
function storyFileIn(dir) {
  const stories = fs.readdirSync(dir).filter((name) => name.endsWith('.story'));
  if (stories.length !== 1) usage(`${dir} holds ${stories.length} .story files; a project has exactly one`);
  return stories[0];
}

/**
 * Install the staged devkit closure into `toolDir` and return the path of the
 * installed CLI.
 */
function installTool(toolDir, stagingDir) {
  const { generateConsumer } = require(CONSUMER_GEN);
  const seedPkg = path.join(toolDir, 'seed.json');
  // No runtime seed: the tool folder depends on devkit alone, as a reader's
  // machine does. generateConsumer vendors devkit's own closure for it.
  fs.writeFileSync(seedPkg, JSON.stringify({ name: 'bare-story-tool', dependencies: {} }));
  const vendorDir = path.join(toolDir, 'vendor');
  fs.mkdirSync(vendorDir);
  const result = generateConsumer({
    mode: 'local',
    storyPkgPath: seedPkg,
    stagingDir,
    vendorDir,
    outPkgPath: path.join(toolDir, 'package.json'),
  });
  if (!result.haveHarness) throw new Error(`no @sharpee/devkit in ${stagingDir}; run \`pnpm exec tsf build --npm\``);
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: toolDir, stdio: 'inherit' });
  const cli = path.join(toolDir, 'node_modules', '@sharpee', 'devkit', 'cli.js');
  if (!fs.existsSync(cli)) throw new Error(`installed devkit has no cli.js at ${cli}`);
  return cli;
}

/** Copy the project without its build output or any installed packages. */
function copyProject(from, to) {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (source) => {
      const name = path.basename(source);
      return name !== 'dist' && name !== 'node_modules';
    },
  });
}

/** Run the installed CLI in `cwd` with NODE_PATH unset; true when it exits 0. */
function runCli(cli, args, cwd) {
  const env = { ...process.env };
  delete env.NODE_PATH;
  console.log(`\n$ sharpee ${args.join(' ')}`);
  try {
    execFileSync(process.execPath, [cli, ...args], { cwd, env, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

/** Record a failure when `file` is missing or empty. */
function requireFile(file, failures) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) failures.push(`missing or empty: ${file}`);
}

function main() {
  const { projectDir, stagingDir, keep } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(projectDir)) usage(`no such project directory: ${projectDir}`);
  if (!fs.existsSync(stagingDir)) usage(`no staging directory ${stagingDir}; run \`pnpm exec tsf build --npm\``);
  if (!fs.existsSync(CONSUMER_GEN)) usage(`${CONSUMER_GEN} is missing; run \`./repokit build\``);

  const story = storyFileIn(projectDir);
  const toolDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharpee-tool-'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharpee-bare-'));
  const failures = [];
  try {
    const cli = installTool(toolDir, stagingDir);
    copyProject(projectDir, workDir);
    if (fs.existsSync(path.join(workDir, 'node_modules')) || fs.existsSync(path.join(workDir, 'package.json'))) {
      usage(`${projectDir} is not a bare project: it has a package.json or node_modules`);
    }

    runCli(cli, ['--version'], workDir);

    if (!runCli(cli, ['build', story], workDir)) failures.push('`sharpee build` exited non-zero');
    const webRoot = path.join(workDir, 'dist', 'web');
    const built = fs.existsSync(webRoot) ? fs.readdirSync(webRoot) : [];
    if (built.length !== 1) failures.push(`expected one folder under dist/web, found ${built.length}`);
    else {
      const outDir = path.join(webRoot, built[0]);
      for (const name of ['game.js', 'index.html', 'engine.css', 'base.css', 'decorations.css']) {
        requireFile(path.join(outDir, name), failures);
      }
    }

    if (!runCli(cli, ['publish', story], workDir)) failures.push('`sharpee publish` exited non-zero');
    const zips = fs.existsSync(path.join(workDir, 'dist'))
      ? fs.readdirSync(path.join(workDir, 'dist')).filter((name) => name.endsWith('.zip'))
      : [];
    if (zips.length !== 1) failures.push(`expected one zip under dist, found ${zips.length}`);
    else requireFile(path.join(workDir, 'dist', zips[0]), failures);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    if (keep) console.log(`\nkept: tool ${toolDir}\nkept: project ${workDir}`);
    else {
      fs.rmSync(toolDir, { recursive: true, force: true });
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }

  if (failures.length > 0) {
    console.error(`\ncheck-bare-story-install: FAILED (${failures.length})`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log('\ncheck-bare-story-install: a bare .story project builds and publishes from the installed command');
}

main();
