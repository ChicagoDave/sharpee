/**
 * Looking action module
 * @module
 */

export { lookingAction } from './looking.js';
export * from './looking-events.js';
export { resolveSnippetDescription, SnippetWorldQueries } from './snippet-resolver.js';
export {
  registerSnippetGate,
  lookupSnippetGate,
  clearSnippetGates,
  SnippetGate,
} from './snippet-gate-registry.js';
