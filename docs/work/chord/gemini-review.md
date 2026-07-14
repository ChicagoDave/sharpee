## Architectural Review: Chord DSL to Sharpee IR

**A Claude Code Engineering Harness for Software Architecture and Development**

---

### Executive Summary

The Chord compiler and Sharpee runtime form a highly robust, multi-phase execution pipeline for interactive fiction. The system is characterized by strict architectural boundaries, separating the raw domain-specific language (DSL) from the underlying engine through a versioned, serializable Intermediate Representation (IR). This design ensures the language frontend remains platform-free while the runtime acts as a pure consumer.

### System Architecture

The architecture relies on high cohesion and low coupling, avoiding complex metaphors in favor of keeping the system "lego blocks simple." The components snap together across strict boundaries: the parsed AST feeds the Semantic Analyzer, the Analyzer outputs pure JSON data, and the Loader materializes that data into the `WorldModel`.

This modularity allows the language frontend and the engine runtime to evolve independently, connected only by the IR schema and the event-selector contract.

---

### Frontend: Lexer, Parser, and Semantic Analyzer

The frontend establishes the initial domain vocabulary and translates it into verified instructions.

* **Purity of the IR:** The `StoryIR` type acts as a strict boundary contract. It is guaranteed to be pure JSON data, which allows the compiler to serialize its output directly to the engine without object reference leaks.


* **Resilient Parsing:** The recursive-descent parser includes deliberate error recovery mechanisms. By seeking the next top-level keyword or block terminator after a syntax failure, the parser avoids cascading error noise.


* **Human-Centric Diagnostics:** The implementation of a Levenshtein distance algorithm to suggest nearest-valid corrections for typos drastically improves the developer experience when crafting `.story` files.


* **Lexer Constraints:** The string lexing logic currently uses a direct index search to find closing quotes. This prevents the use of escaped quotes within strings, which may limit authored dialogue capabilities.



---

### Backend: IR Loader and Execution Runtime

The `@sharpee/story-loader` package acts as an anti-corruption layer, ingesting the static IR and interpreting it into dynamic engine constructs.

* **Compile-Time Boundary Contracts:** The system enforces synchronization via TypeScript mapped types, ensuring that changes to upstream domain payloads trigger a build failure. This locks the event-selector map to reality without requiring runtime reflection.


* **Execution Determinism:** Interactive fiction loops are vulnerable to mid-turn state mutations. The `ChordRuntime` handles this by snapshotting branching decisions prior to executing mutations, ensuring the reporting phase observes the exact routing the execution phase saw.


* **Stateful Randomness:** The chance stream is persisted directly into the world state via `CHORD_RNG_KEY`. This makes saves perfectly deterministic and protects the RNG from desynchronization during undo/redo operations.


* **Security Profiles:** The loader implements a deployment profile switch. The `pure-ir` profile actively refuses hatch-bearing stories prior to execution, creating a secure sandbox for untrusted community files.



---

### Domain-Driven Alignment

The codebase successfully aligns with Domain-Driven Design (DDD) principles by keeping the ubiquitous language of the DSL strictly contained.

* **Entity Mapping:** Domain concepts (like Actions, Rules, and Traits) are strictly mapped into the `WorldModel` without the engine needing to understand Chord syntax.


* **Keyed Persistence:** Progression state, including occurrence counters and custom flags, is materialized as ordinary world state using internal namespaces. This allows the engine's standard save/restore/undo mechanics to manage compiler-generated state invisibly.



---

### Strategic Recommendations

> **Review Trait Mutation Patterns**
> Direct object mutation occurs when writing trait fields, potentially bypassing centralized state management. Utilizing standard `setStateValue` paradigms for all mutations ensures the engine's undo-delta generation remains perfectly synchronized.
> 
> 

> **Eliminate Interceptor Masking**
> The runtime aggregates entity clauses by action and resolves the target via array traversal. If an author accidentally supplies duplicate clauses for the same action on the same entity, the system will silently mask the duplicates. Emitting a diagnostic gate for this during compilation will prevent unexpected runtime behavior.
> 
> 

> **Tighten Payload Typings**
> The runtime evaluator utilizes heavy type erasure when processing semantic events. Upgrading these casts to strict type guards will defend the runtime against unexpected structural shifts in the payload that bypass the mapped-type compile checks.
> 
>