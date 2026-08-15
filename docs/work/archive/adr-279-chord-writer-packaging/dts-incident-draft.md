> # ⛔ WITHDRAWN — 2026-08-13. Not filed, and no longer needed.
>
> This drafted a DTS incident asking how to package a vendored toolchain for
> Developer ID. The question answered itself the same day: a toolchain-bearing
> `ChordWriter-1.0.0.dmg` shipped — signed, notarized, stapled, Gatekeeper
> `source=Notarized Developer ID`. Nothing in this repo's packaging was ever
> defective.
>
> The only real finding left is Apple-side: the notary intermittently accepts a
> submission and never processes it, then deletes it. That is not a code-level
> support question and does not belong in a DTS incident.
>
> Kept for its evidence — the bisection table, the Invalid-in-113s matched pair,
> and the deletion behaviour — not as a plan. Resolution:
> [`../../architecture/adrs/adr-279-chord-writer-packaging.md`](../../architecture/adrs/adr-279-chord-writer-packaging.md)
> and [`fixtures/RESULTS.md`](fixtures/RESULTS.md).

# DTS code-level support incident — draft

**Status**: draft, not filed. Prepared 2026-08-13.
**Entry point**: https://developer.apple.com/contact/request/code-level-support/
**Prerequisite**: two freshly reproduced hung submissions with ids captured (see
Pre-flight). The seven ids from the 2026-08-12 bisection no longer resolve —
`notarytool info` returns "Submission does not exist or does not belong to your
team" for all seven, verified `2026-08-13T04:16:20Z`.

---

## Framing — read this before editing the draft

Apple's own guidance for code-level support says requests must be a **single,
discrete problem** about **"Apple frameworks, APIs, development tools"**, and
explicitly excludes **"details on Apple-internal APIs or system configuration."**

That shapes the ask. "Why does your notary service hang on my bundle?" is a
request for internal system configuration and is the version most likely to come
back as *file a Feedback report, this is a service issue*. The same evidence
asked as **"what property of a vendored Node toolchain causes `notarytool`
submissions never to reach a terminal state, and how should such a toolchain be
packaged for Developer ID distribution?"** is a `notarytool` and Developer ID
distribution question — a development-tools topic, in scope, and answerable
without disclosing anything internal.

Keep the packaging question primary and the hang as its evidence, not the other
way round.

---

## "Do you have a focused test project that demonstrates your issue?" — yes

`fixtures/make-fixtures.sh`. One script, no arguments, no proprietary content,
no Mach-O, no symlinks. It generates four zips of ~3MB each that hold
**byte-identical file content** — 11,001 inert text stubs across 113
directories — and differ only in how the directories are named:

| Fixture | Layout | Isolates |
| --- | --- | --- |
| `A-control` | `node_modules/pkg-N/` | baseline; expect Accepted in ~110s |
| `B-dotdir` | `node_modules/.store/pkg-N/` | the dot-prefixed directory |
| `C-plusname` | `node_modules/@scope+nameN@1.2.3/` | pnpm's `+` version encoding |
| `D-both` | `node_modules/.store/@scope+nameN@1.2.3/` | both; reproduces `shape.zip` |

Built and verified 2026-08-13 (2.6–3.0MB each, 11,228 entries each). The script
prints each fixture's SHA-256 and the `notarytool` commands, and deliberately
does **not** submit anything.

This is a far better attachment than the real 213MB closure: an engineer can run
it in five minutes, it contains nothing of ours, and the expected outcome is
pre-registered before submission. If A, B and C all clear and only D hangs, the
trigger requires both naming properties together — a sharper finding than the
bisection produced.

**Its scope, stated honestly.** This reproduces the *naming* trigger that made
`shape.zip` hang. Whether that is also what blocks the real toolchain is not
established: `flat.zip` (the real closure flattened out of `.pnpm`) hung too,
which suggests a second content-borne trigger — but the bisection record does
not say how flattening was performed, so whether it actually removed the `+`
encoding and the dot-directory is **unrecorded**, and the fixture no longer
exists to check. If the naming experiment comes back clean on B, C and D, that
gap becomes the next thing to close.

---

## Pre-flight (do these first, in order)

1. **Check System Status** — https://developer.apple.com/system-status/, the
   Developer ID Notary Service row. Two minutes, and a posted incident would
   moot the whole exercise.

2. **Run the four naming fixtures** (`fixtures/make-fixtures.sh`). This is now
   the highest-value pre-flight step, because part 2 of the ask is about
   directory naming and the answer changes what you are asking. Ten minutes.

   - If `B` or `C` hangs alone, you have named the property, and part 2 becomes
     "I have isolated this to X, is that expected?" — a far better question.
   - If all four clear, drop the naming half of part 2 entirely; §5's lead is
     dead and asking about it wastes the exchange.

3. **Reproduction is optional, not required.** DTS is not going to look up a
   submission — that is the Forums route, and it is what makes the Forums
   account being disabled the real loss here. File on the packaging question
   whenever it is ready; the evidence stands on the bisection record, not on any
   individual id still resolving.

4. **Test the encrypted-archive variant** — the one candidate *remedy* in the
   set, from thread 710738. `zipped2.zip` sealed the tree in a plain inner zip
   and hung, but a plain zip is notary-transparent, so the service unpacked it.
   An encrypted zip is opaque. Build the same fixture with
   `zip -e` (or `ditto` plus an encrypted container) and submit it.

   **Test it, do not ship it on the strength of a clear.** Thread 710738 says
   the technique is not for code meant to run on macOS, and whether interpreted
   script read by a bundled interpreter falls inside that exclusion is exactly
   question 1. A fixture that clears is evidence for the question, not an answer
   to it. Shipping a technique that routes around notarization without an Apple
   answer is how a Developer ID certificate becomes a problem later.

5. **Attach the reproducer** if step 2 produced a hang. A 3MB script-generated
   fixture that an engineer can run is worth more than the 213MB closure, and
   more than any number of submission ids.

---

## Draft incident text

**Subject**: notarytool submissions containing a vendored Node toolchain never
reach a terminal state, and are later deleted from submission history

**Topic area**: Developer Tools / Code Signing, Notarization, and Distribution

---

I distribute a macOS app (Developer ID, outside the App Store) that bundles a
Node runtime and a JavaScript CLI in `Contents/Resources`. Bundles containing
that toolchain are accepted for upload by `notarytool` and then never processed:
no Accepted, no Invalid, no Rejected, and no log. The same app with the toolchain
removed is Accepted in 31 seconds.

For scale: WWDC21 session 10261 ("Faster and simpler notarization for Mac apps")
states *"We're committed to completing this process within 15 minutes for 98
percent of Notary submissions, and most complete in under five."* My cleared
submissions match that comfortably — 19 to 113 seconds. The affected ones ran
past five hours and were then deleted.

My question is about packaging, not about your service internals: **what property
of a vendored interpreter-plus-dependency-tree causes a submission never to reach
a terminal state, and what is the supported way to package such a toolchain for
Developer ID distribution?**

**Environment**
- Team ID: RSNGKW5LNH
- macOS: [FILL IN — sw_vers]
- Xcode: [FILL IN — xcodebuild -version]
- Submission path: `ditto -c -k --keepParent`, then
  `xcrun notarytool submit --keychain-profile <profile> --wait`
- Signing: `codesign --options runtime --timestamp`, Developer ID Application
- Target: arm64 only, deployment target macOS 11.0

**Note on submission ids.** I am not asking anyone to look up a specific
submission — I understand that is not what this channel is for. The ids below are
cited as evidence of the behaviour, and most of them no longer resolve; they are
deleted 21 to 26 hours after creation (see below). The question is about
packaging, and it stands whether or not any individual submission is still
retrievable.

**What I have already ruled out.** I ran a controlled bisection of 21
submissions on 2026-08-12 with a decision rule fixed before the first submission
(still In Progress at 10 minutes counts as hung). In practice the rule never had
to arbitrate: the outcomes were sharply bimodal. Every cleared submission
finished between 19 and 113 seconds; the fastest hang was still unresolved at 36
minutes. Nothing landed between 113 seconds and 36 minutes.

Each fixture below differs from its neighbour by one property. Eight cleared,
which exonerates the property each was built to test:

| Fixture | Time | Rules out |
| --- | --- | --- |
| Real app, toolchain removed | 31s | The submission channel |
| 108MB Node runtime alone, 0 symlinks | 44s | Total byte volume |
| 9.9MB esbuild binary alone | 19s | The Mach-O binaries themselves |
| 11,001 stub files across 113 dirs | 110s | File count |
| Same stubs under a dir named `node_modules` | 108s | That directory name |
| Same stubs under `node_modules/@scope/` | ~110s | `@`-prefixed directory names |
| Same stubs nested to depth 8 | ~110s | Nesting depth |
| Same stubs across 1,103 dirs | 107s | Directory count |

Remedies I attempted, all of which still hung: pruning the 81% of the dependency
tree that is never read; dereferencing all 222 symlinks (0 symlinks remaining,
213MB); flattening the tree out of its `.pnpm` layout; and sealing the entire
tree inside a single inner zip. Every fixture containing real dependency-tree
content hung, in every layout tried. Dereferencing in particular rules out
symlinks as the cause.

**One submission did return a verdict, and it is why I do not think this is a
signing error on my side.** A fixture containing an unsigned binary nested inside
an inner zip came back **Invalid in 113 seconds**, with the log naming the exact
offending path three times. Its matched pair — same layout, submitted two minutes
later, differing only in that the nested binary was signed — has never returned
anything. So when the notary has something to say it says it quickly and
precisely, and it also descends into nested archives. My hangs produce no output
of any kind.

**The submissions are subsequently deleted.** Seven hung submissions from
2026-08-12 were confirmed In Progress at `2026-08-12T07:13:12Z` via
`notarytool history`. Re-queried at `2026-08-13T04:16:20Z` — 21 to 26 hours
later — all seven return "Submission does not exist or does not belong to your
team" from `notarytool info`, and none appears in `notarytool history`. Submissions
from the same minutes under the same credentials still resolve correctly: as one
control, `a978eb1f-d781-4fdc-9295-88540a37a504` (submitted 05:49:24Z) still
returns Accepted, while `f991e71b-742e-4a7d-a47c-48809a60b321` (submitted
05:10:08Z, ten seconds after another submission that is still listed) is gone.

This is the part I would most like corrected regardless of the packaging answer:
a submission that cannot be processed should reach a terminal state rather than
being removed, because as it stands there is no way to distinguish "still
queued" from "will never complete," and the ids needed to report the problem
expire before a support cycle finishes.

**What I am asking for** — one question, in three parts, all about packaging:

Is there a supported way to package a vendored language toolchain (an
interpreter binary plus a large dependency tree of script files) inside
`Contents/Resources` for Developer ID distribution?

I have read the "Notarisation Fundamentals" forum thread (710738) and my
questions are framed against it.

1. That thread describes **notary-transparent archives** — the service unpacks
   zips and inspects the executable code inside — and separately describes
   sealing non-executable code in an **encrypted zip** so the service treats it
   as opaque, with IDE templates as the example. My toolchain splits cleanly
   along that line: one Node interpreter (a Mach-O, which must be signed and
   ticketed) plus roughly 11,000 `.js` files that macOS never executes directly.
   Is the encrypted-archive technique appropriate for the script half? The
   thread says it is not for "code meant to run on macOS," and I cannot tell
   which side of that line interpreted script read by a bundled interpreter
   falls on.

2. If the encrypted-archive approach is not appropriate, is there a recommended
   shape for the script half — a single pre-bundled file rather than a
   dependency tree, a nested disk image with the double-notarization the thread
   describes for non-transparent installers, or a helper bundle?

3. Are there directory-naming or layout constraints I should be observing?
   Some of my dependency directories are dot-prefixed and some contain `+`
   characters, and I have not been able to rule those out as relevant.

4. Is a vendored toolchain of this kind supported at all under Developer ID, or
   is downloading it on first run the expected pattern?

Relevant to question 1: I did test sealing the tree inside a plain inner zip,
and it hung like every other variant — but per the thread that archive would have
been notary-transparent, so the service would have unpacked it. I have not tested
an encrypted archive, because I would rather ask whether it is legitimate for my
case than ship something that merely clears.

I am willing to restructure this however it needs to be. What I do not have is
any signal about what shape would work, because the failure mode produces no
output to learn from.

I have the full submission ledger, fixture manifests, and per-fixture SHA-256
digests available and can attach or send whatever is useful.

---

## After filing

- Attach or link the bisection document
  (`docs/work/adr-279-chord-writer-packaging/notarization-bisection.md`).
- File a parallel Feedback Assistant report on the deletion behaviour alone,
  under Developer Tools. It is a separate, cleaner defect than the packaging
  question and does not consume an incident.
- Expect the packaging question and the deletion question to be handled by
  different people, possibly with one of them redirected. That is fine —
  the packaging answer is the one that unblocks shipping.
