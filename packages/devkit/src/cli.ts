#!/usr/bin/env node
/**
 * cli.ts — the `sharpee` command (ADR-180; ADR-187; package @sharpee/devkit).
 *
 * Owner context: the **author** CLI — scaffold/build/inspect an author's own
 * story project (cwd or a registered name), project-relative. The in-repo
 * platform build (packages, CLI bundle, verify, test:npm) is a separate tool,
 * `repokit` (tools/repokit); a workspace story passed to `build` is redirected
 * there. devkit no longer contains platform-build logic.
 *
 * Public interface: process argv -> subcommand dispatch -> process exit code.
 */
import { runCompose } from './commands/compose.js';
import { runIntrospect } from './commands/introspect.js';
import { resolveStory, findMonorepoRoot } from './repo.js';
// Author-project commands (devkit is the author tool; the in-repo platform build
// is repokit — ADR-187). repo.ts is retained only for the workspace-story redirect.
import { runBuildCommand } from './standalone/build.js';
import { runBuildBrowserCommand } from './standalone/build-browser.js';
import { runInitCommand } from './standalone/init.js';
import { runInitBrowserCommand } from './standalone/init-browser.js';
import { runIfidCommand } from './standalone/ifid.js';
import { runRegister, runList } from './commands/register.js';
import { runTestCommand } from './commands/test.js';
import { runPlayCommand } from './commands/play.js';
import { lookupStory } from './registry.js';

const USAGE = `sharpee — Interactive Fiction authoring CLI (ADR-180, ADR-187)

Usage:
  sharpee build [name|path] [--browser]  Build an author story project (cwd or registered name)
  sharpee build-browser [options]        Build the browser client for the current project
  sharpee init <name>                    Scaffold a new story project
  sharpee init-browser                   Add a browser client to the current project
  sharpee compose <file.story> [opts]    Compile a Chord story to Story IR (ADR-210)
  sharpee introspect [dir]               Emit the IDE project manifest (ADR-184/185) as JSON
  sharpee ifid                           IFID utilities (generate, validate)
  sharpee register <location> [--name]   Register a name→path mapping in ~/.sharpee/devkit
  sharpee list                           List registered stories
  sharpee test [name|path] [transcripts…] [--chain] [--stop-on-failure] [--verbose]
                                         Run the project's transcript tests
  sharpee play [name|path]               Play the project interactively (REPL)

build (author project): compiles src/ + emits the .sharpee bundle; --browser also
  builds the self-contained browser client (dist/web/, with the project's assets/).

build-browser options:
  --no-minify | --no-sourcemap

compose options:
  --check              Run only the load-time gates (CI mode; no IR emitted)
  -o, --out <file>     Write the IR JSON to a file instead of stdout

Note: platform/in-repo builds — the packages, the CLI bundle, verify, test:npm — are
repokit's job. In the monorepo use ./repokit; devkit is the author tool. A workspace
story passed to \`sharpee build\` is redirected to repokit.`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(USAGE);
    return command && command !== 'help' ? 1 : 0;
  }

  switch (command) {
    case 'build': {
      // Author-only build (ADR-187): build a project by cwd or registered name.
      const positional = rest.find((a) => !a.startsWith('-'));
      const flags = rest.filter((a) => a !== positional);
      let dir: string | undefined;
      // Inside the sharpee monorepo, redirect WORKSPACE stories to repokit; a
      // decoupled in-repo project (e.g. the FZ tutorial) builds here, project-relative.
      const monoRoot = findMonorepoRoot();
      if (monoRoot && positional) {
        const resolved = resolveStory(monoRoot, positional);
        if (resolved?.inRepo && resolved.workspace) {
          console.error(
            `'${positional}' is a workspace story — build it with repokit: ` +
              `\`./repokit build ${positional}\`. devkit is the author tool.`,
          );
          return 2;
        }
        if (resolved?.inRepo && !resolved.workspace) {
          dir = resolved.dir; // decoupled in-repo project → build project-relative
        }
      }
      if (!dir && positional) {
        dir = lookupStory(positional) ?? undefined; // throws if registered-but-stale
        if (!dir) {
          throw new Error(
            `'${positional}' is not a registered story — run \`sharpee register <location>\`, or run \`sharpee build\` from the project directory`,
          );
        }
      }
      if (flags.includes('--browser')) await runBuildBrowserCommand(flags.filter((a) => a !== '--browser'), dir);
      else await runBuildCommand(flags, dir);
      return 0;
    }
    case 'compose':
      return runCompose(rest);
    case 'build-browser':
      await runBuildBrowserCommand(rest);
      return 0;
    case 'init':
      await runInitCommand(rest);
      return 0;
    case 'introspect': {
      // Optional positional [dir]; defaults to cwd. Manifest → stdout, status → stderr.
      const dir = rest.find((a) => !a.startsWith('-'));
      await runIntrospect({ dir });
      return 0;
    }
    case 'init-browser':
      await runInitBrowserCommand(rest);
      return 0;
    case 'ifid':
      runIfidCommand(rest);
      return 0;
    case 'register':
      runRegister(rest);
      return 0;
    case 'list':
      runList();
      return 0;
    case 'test':
      return runTestCommand(rest);
    case 'play':
      return runPlayCommand(rest);
    default:
      console.error(`unknown command: ${command}\n`);
      console.log(USAGE);
      return 2;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('sharpee: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(2);
  });
