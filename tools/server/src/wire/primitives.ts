/**
 * Primitive types shared across the wire boundary.
 *
 * Public interface: {@link Tier}, {@link TextBlock}, {@link DomainEvent}.
 * Bounded context: wire protocol (ADR-153 Interface Contracts). This is the
 * only module in `src/wire/` whose types are imported by both the server
 * build and the browser-client build. No Node-only types may appear here —
 * the Docker client build copies `src/wire/` verbatim, and the client's
 * tsconfig deliberately excludes `@types/node`.
 */

export type Tier = 'primary_host' | 'co_host' | 'command_entrant' | 'participant';

/** Forward-declared shape; the @sharpee/core version is used by the wire layer. */
export interface TextBlock {
  kind: string;
  [key: string]: unknown;
}

/** Forward-declared shape; the @sharpee/core version is used by the wire layer. */
export interface DomainEvent {
  type: string;
  [key: string]: unknown;
}
