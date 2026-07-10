/**
 * @sharpee/story-loader — the Story IR interpreter (ADR-210).
 *
 * Purpose: construct a generic `Story` implementation from compiled Story IR —
 * world building, phrase registration, event-rule binding, the AST-walking
 * expression evaluator, occurrence materialization, and seeded RNG.
 *
 * Public interface: the root barrel. Phase A populates it with the loader;
 * until then it is intentionally empty.
 *
 * Owner context: Chord runtime consumer. Language-neutral by design — it
 * consumes IR and never sees Chord syntax. Depends on the platform
 * (world-model, stdlib, engine, lang-{locale}, plugins, core); nothing
 * platform depends on it (ADR-210 Direction rule).
 */

export {};
