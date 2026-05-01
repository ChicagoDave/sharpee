/**
 * @sharpee/story-channel-service-test
 *
 * Test fixture for `@sharpee/channel-service` Phase 2 (ADR-163).
 * Not a playable Sharpee story — supplies deterministic
 * `ITextBlock[]` and `ISemanticEvent[]` sequences for AC-3, AC-6,
 * AC-8, AC-12 round-trip tests.
 *
 * Scenarios are pure data: no engine, no world, no transport. The
 * channel-service test suite imports a scenario, drives
 * `produceCmgtManifest` + `produceTurnPacket`, and asserts on the
 * resulting payloads.
 *
 * @see docs/work/channel-io-unification/plan-20260501-adr-163-platform.md
 */

export * from './scenarios';
