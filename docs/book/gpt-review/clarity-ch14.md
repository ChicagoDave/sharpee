# Clarity review — Chapter 14: Custom Actions

No clarity issues found.

Each section states a concrete mechanism: the four phases name their exact order and branch condition, the `sharedData` aside says *why* (don't recompute, don't smuggle onto context), and `withPriority(150)` is justified ("so your story patterns win over any stdlib defaults"). The closing "this is the minimum to make a custom verb fire" is a real scope statement, not filler. The "mistake everyone makes once" callout enumerates the concrete failure modes per missing registration. Left intact under the under-flag rule.
