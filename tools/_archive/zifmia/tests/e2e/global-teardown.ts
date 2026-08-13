/**
 * Playwright global teardown — currently a no-op.
 *
 * Per-spec servers handle their own cleanup in the spawnZifmiaServer
 * helper. This hook exists as a stable seam for future cross-spec
 * artifacts (e.g., a shared coverage merge step).
 */

export default async function globalTeardown(): Promise<void> {
  // intentionally empty
}
