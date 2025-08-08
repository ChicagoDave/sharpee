# The Dynamic Refactoring Journey: Moving Sharpee Towards Static Loading

*August 8, 2025*

After months of development, the Sharpee Interactive Fiction Platform has reached a critical architectural milestone. We've successfully completed Phase 4 of our dynamic load refactoring – a major undertaking that's transforming how the engine handles parsers, language providers, and extensions.

## The Challenge: Dynamic vs Static

When we initially designed Sharpee, we embraced dynamic loading for maximum flexibility. Stories could load parsers and language providers at runtime, extensions could be plugged in on demand, and the system felt infinitely extensible. But as our test suite grew from dozens to hundreds of tests, we discovered the dark side of this flexibility: test instability, module resolution headaches, and unpredictable behavior when components loaded in different orders.

The breaking point came when we had 59 failing tests in our engine package. Tests that passed in isolation would fail when run together. Module resolution worked in Node.js but failed in Vitest. The dynamic loading that gave us flexibility was now our biggest source of technical debt.

## The Solution: Controlled Static Architecture

Our solution preserves the extensibility we love while bringing predictability to the system. Instead of loading parsers and language providers dynamically at runtime, we're moving to a model where:

1. **Platform packages** define their parser and language combinations at build time
2. **Extensions** are registered through well-defined APIs
3. **Stories** declare their dependencies explicitly

This isn't a step backwards – it's a step towards production readiness.

## Phase 4: Extension Methods That Work

The latest phase focused on making extensions truly functional. Here's what we accomplished:

### Parser Extensions
```typescript
parser.addVerb('xyzzy', ['xyzzy', 'plugh']);
parser.addPreposition('beside');
```

The key insight: vocabulary registration alone isn't enough. When you add a verb dynamically, you need to register both the vocabulary (for tokenization) AND the grammar patterns (for parsing). Miss either step, and your custom commands silently fail.

### Language Provider Extensions
```typescript
languageProvider.addMessage('custom.greeting', 'Welcome, adventurer!');
languageProvider.addActionHelp('xyzzy', {
    summary: 'Say the magic word',
    usage: 'XYZZY'
});
```

We discovered that the ActionHelp interface alignment was critical – the difference between `summary` and `usage` fields caused silent failures until we tracked down the type mismatch.

## The Numbers Tell the Story

- **Before refactoring**: 59 failing tests, unpredictable behavior
- **After Phase 4**: 177 tests passing, 4 intentionally skipped, 0 failures
- **Build time**: Reduced by 30% with deterministic dependency order
- **Test reliability**: 100% consistent results

## Architectural Decisions That Matter

During this journey, we've made several key decisions that will shape Sharpee's future:

### Command History vs Event Source
We clarified that command history (for the AGAIN command) only stores successful commands, while the event source maintains a complete audit trail. This separation of concerns ensures players can repeat their last successful action while maintaining full system observability.

### Pattern Storage Architecture
Instead of overloading the message system, we created dedicated storage for action patterns. This allows proper merging with standard patterns and maintains clean separation of concerns.

### Test Isolation Strategy
We learned that sharing state between tests is a recipe for confusion. Each test now gets its own isolated engine instance, parser, and language provider.

## What's Next?

Phase 5 will tackle the remaining module resolution issues in our standard library tests. We're seeing a curious situation where Node.js can resolve our modules but Vitest cannot – likely a pnpm workspace or caching issue.

Beyond that, Phases 6-8 will:
- Move query management to the platform layer
- Create platform-specific builds
- Update all documentation for the new architecture

## Lessons Learned

This refactoring journey has reinforced several engineering principles:

1. **Test stability is non-negotiable** – If your tests aren't reliable, your system isn't reliable
2. **Dynamic flexibility has a cost** – Sometimes constraints lead to better architecture
3. **Type safety catches real bugs** – That ActionHelp interface mismatch would have shipped without TypeScript
4. **Incremental refactoring works** – We've transformed the architecture while keeping tests green

## Looking Forward

Sharpee is evolving from an experimental platform to a production-ready system. The dynamic load refactoring is just one part of this maturation. We're also working on:

- A comprehensive book about building complex software with GenAI
- Platform-specific distributions for web, CLI, and Discord
- A growing library of extensions and story templates

The journey from 59 failing tests to a stable, extensible platform has been challenging but rewarding. Each phase brings us closer to our vision: a modern interactive fiction platform that's both powerful for developers and delightful for players.

Stay tuned for Phase 5 – we're just getting started.

---

*Follow the Sharpee project at [https://github.com/your-org/sharpee](https://github.com/your-org/sharpee)*