/**
 * Looking action module
 * @module
 */

export { lookingAction } from './looking';
export * from './looking-events';
export { resolveSnippetDescription, SnippetWorldQueries } from './snippet-resolver';
export {
  registerSnippetGate,
  clearSnippetGates,
  SnippetGate,
} from './snippet-gate-registry';
