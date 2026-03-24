/**
 * @sharpee/bridge - Node.js Entry Point
 *
 * This is the main entry point for the bridge subprocess.
 * Spawned by a native host app; communicates via stdin/stdout.
 *
 * Usage:
 *   node node_bridge.js
 *
 * Then send newline-delimited JSON to stdin:
 *   { "method": "start", "bundle": "/path/to/game.sharpee" }
 *   { "method": "command", "text": "go north" }
 *   { "method": "quit" }
 */

import { NativeEngineBridge } from './bridge';

function main(): void {
  const bridge = new NativeEngineBridge(process.stdin, process.stdout);

  // Redirect console output to stderr so it doesn't pollute the protocol
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = (...args: unknown[]) => process.stderr.write(args.join(' ') + '\n');
  console.warn = (...args: unknown[]) => process.stderr.write('[warn] ' + args.join(' ') + '\n');
  console.error = (...args: unknown[]) => process.stderr.write('[error] ' + args.join(' ') + '\n');

  // Handle signals for clean shutdown
  process.on('SIGTERM', () => {
    bridge.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    bridge.shutdown();
    process.exit(0);
  });

  // Handle uncaught errors — send as error message, don't crash
  process.on('uncaughtException', (err: Error) => {
    process.stderr.write(`[uncaught] ${err.message}\n${err.stack}\n`);
    try {
      process.stdout.write(JSON.stringify({ type: 'error', message: err.message }) + '\n');
    } catch {
      // stdout may be closed
    }
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    process.stderr.write(`[unhandled] ${message}\n`);
    try {
      process.stdout.write(JSON.stringify({ type: 'error', message }) + '\n');
    } catch {
      // stdout may be closed
    }
  });

  bridge.listen();
}

main();
