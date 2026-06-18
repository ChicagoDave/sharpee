/**
 * register.ts — `sharpee register <location>` and `sharpee list` (ADR-180 Decision 4,
 * amended: the location-registry verb is `register`).
 *
 * Owner context: @sharpee/devkit. Convenience over the `~/.sharpee/devkit` registry so
 * a story (anywhere) can be referenced by name. Pure orchestration over registry.ts.
 *
 * Public interface: runRegister(args), runList().
 */
import { registerStory, listStories, registryPath } from '../registry';

/** `sharpee register <location> [--name <n>]` — upsert a name→path mapping. */
export function runRegister(args: string[]): void {
  let location: string | undefined;
  let name: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name') name = args[++i];
    else if (!args[i].startsWith('-') && !location) location = args[i];
    else throw new Error(`unexpected argument: ${args[i]}`);
  }
  if (!location) throw new Error('register requires a <location>');
  const entry = registerStory(location, name);
  console.log(`registered '${entry.name}' → ${entry.path}`);
  console.log(`(${registryPath()})`);
}

/** `sharpee list` — show registered stories, flagging stale entries. */
export function runList(): void {
  const entries = listStories();
  if (entries.length === 0) {
    console.log('No registered stories. Use `sharpee register <location>`.');
    return;
  }
  const width = Math.max(...entries.map((e) => e.name.length));
  for (const e of entries) {
    console.log(`  ${e.name.padEnd(width)}  ${e.path}${e.stale ? '   [STALE: path missing]' : ''}`);
  }
}
