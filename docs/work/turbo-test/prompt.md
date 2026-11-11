# Turbo test caching: session prompt

Goal: stop re-running unchanged packages' tests. Today `pnpm exec turbo run test:ci` (the Test command in docs/context/project-profile.md, which DevArch's commit gate runs) tests all 40 workspace packages one after another every time. It takes 5+ minutes, and a phase commit can trigger it 2 or 3 times. turbo.json has `"cache": false` on `test:ci` and `"concurrency": "1"` at the top level. I want turbo's cache on for `test:ci`, so a package whose code and dependencies haven't changed is a cache hit. A package must re-test when its own files change or when anything it depends on changes.

The risk to rule out before turning the cache on is a false pass. A cache hit is only safe if turbo's input hash sees everything a test reads. Find out first:

1. Why the cache was turned off. Check git log/blame on turbo.json and any ADR or doc that mentions it. If the reason still holds, stop and tell me before changing anything.
2. For each package with a test:ci script, does any test read files outside its own package directory? Look for stories/, fixtures or transcripts at the repo root, other packages' src, generated files, and env vars. Each one must become a declared input: per-package `inputs` in a package-level turbo.json, or task `inputs` using "$TURBO_DEFAULT$" plus `$TURBO_ROOT$/...` globs, or `globalDependencies`, or `env`/`globalEnv`. List what you found per package.
3. Confirm that `dependsOn: ["build"]`, with build depending on ^build, makes a dependency change re-test its dependents. Use `pnpm exec turbo run test:ci --dry=json` to inspect the task hashes rather than running tests.

Then:

4. Set `test:ci` to cacheable with the declared inputs. Keep `outputs: ["coverage/**"]` if tests write coverage. Leave `test` (watch mode) and the other tasks alone. Don't touch `concurrency` in this change. If you think it's no longer needed, tell me why separately.
5. Make sure `.turbo/` and `coverage/` are gitignored. DevArch's commit gate fingerprints every unignored file, so a cache or coverage directory that isn't ignored would make every run look like a code change.
6. Prove it with as few real runs as possible: one full run to warm the cache, then a second run that must be all cache hits ("FULL TURBO") and fast. Then use `--dry=json` (no test execution) to show that touching a leaf package's source invalidates only that package; that touching a core package invalidates it and its dependents; and that touching an out-of-package file a test reads (from step 2) invalidates the package that reads it. Revert the touches afterwards.

Report what you found in step 1, the per-package input list from step 2, the cold and warm run times, and the dry-run evidence. Don't run the full suite more than the two runs in step 6.
