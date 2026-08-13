> # 🪦 ORPHANED — 2026-08-13
>
> Thread 1 was posted: https://developer.apple.com/forums/thread/841846. It is
> public, drew no replies, and **cannot be followed up** — the Forums account
> can post but not reply, and the submission it cites
> (`359b004e-ccd2-4ab0-a02e-0516b5598b75`) was deleted by Apple roughly 11
> hours after creation. Its matched pair `f0c04838-dda4-4172-8d79-cc1cfaaef601`
> — byte-identical archive, Accepted in 72s — still resolves and is the
> evidence that survives.
>
> Thread 2 (the encrypted-archive question) was never posted and is now moot:
> the technique does not apply, and the packaging question it existed to ask
> was answered by shipping.
>
> Kept as the record of what was reported and when. Do not post from it without
> re-checking that every submission id still resolves.

# Apple Developer Forums post — draft

**Status**: draft, not posted. Prepared 2026-08-13.
**Where**: Code Signing topic → Notarization subtopic
(`developer.apple.com/forums/topics/code-signing-topic/code-signing-topic-notarization`),
tag `notarization`. Post via `developer.apple.com/forums/post/question`.

**POSTED 2026-08-13 — awaiting moderation approval**:
https://developer.apple.com/forums/thread/841846

**Standing risk while it waits.** The cited submission
`359b004e-ccd2-4ab0-a02e-0516b5598b75` was created 2026-08-13T05:40Z. The
2026-08-12 cohort was deleted from submission history 21 to 26 hours after
creation, which puts this one's expected deletion window at roughly
**2026-08-14T02:00Z to 08:00Z**. If moderation outruns that, the post goes live
citing an id that no longer resolves.

Mitigation, to run the moment the thread appears: re-query the id. If it is
gone, immediately reply to the thread with a freshly generated pair —
`fixtures/make-signed-fixtures.sh` regenerates `N-control` and `N-devkit` in a
few minutes — and note in the reply that the original was deleted rather than
answered, since that deletion is itself part of the report.

**LIVE as of 2026-08-13** — Forums access restored after a temporary account
disable. This is the primary channel again: free, reaches the people who own the
area, and stuck-submission threads have historically been escalated internally
from the UUID alone, with a turnaround in hours rather than business days.
`dts-incident-draft.md` becomes the escalation path if the thread goes quiet.

**Two threads, not one.** Forum norms favour one topic per thread, and these have
different urgency and different audiences:

- **Thread 1 — the stuck submission** (this document). Time-critical, because
  the UUID perishes in ~24 hours. Post within the hour of confirming a hang.
- **Thread 2 — is the encrypted-archive technique legitimate here?** No time
  pressure, and it is much better asked *after* the E/F/G fixture results are in.
  Its content is question 1 of `dts-incident-draft.md`, addressed to the author
  of thread 710738. See the end of this file.

Mixing them risks the packaging question being lost under the operational one.

---

## The timing constraint that governs everything

**The UUID has to be alive when someone reads it.** Seven stuck submissions from
2026-08-12 were In Progress at `07:13:12Z` and had been deleted by
`2026-08-13T04:16:20Z` — 21 to 26 hours later, `notarytool info` returns
"Submission does not exist or does not belong to your team" for every one of
them, while their timestamp-neighbours still resolve.

So the sequence is not "post, then reproduce." It is:

1. Submit the real toolchain-bearing bundle. Record id and `createdDate`.
2. Confirm it is still In Progress at 10 minutes.
3. **Post within the hour.** A UUID posted 20 hours in may be gone before it is
   read, and a reader who looks up a dead UUID concludes you mistyped it.
4. Submit a fresh one daily and edit the thread with the new live id, until
   someone answers. Keeping a live UUID available is the whole job.
5. Log the date each id stops resolving. That series is evidence in its own
   right.

---

## Draft post

**Title**: notarytool submissions never reach a terminal state, then disappear
from submission history

---

Team ID: `RSNGKW5LNH`

I have a matched pair submitted seconds apart that I cannot explain, and I think
it shows a service-side problem rather than one in my bundle.

| Submission | Contents | Result |
| --- | --- | --- |
| `359b004e-ccd2-4ab0-a02e-0516b5598b75` | a signed Node binary + **2,000 identical one-line text files** | **In Progress for 36+ minutes** |
| `e4abe4b5-8829-47fb-aa1c-6a79d6824094` | the same signed Node binary + a **full 7,900-file npm dependency tree** | **Accepted in 87 seconds** |

Both created 2026-08-13 at 05:40Z, submitted in the same loop, same signing, same
`ditto -c -k --keepParent`, same `notarytool` invocation. The *trivial* one hung;
the *complex* one cleared.

The first fixture is as innocuous as a submission gets. In full, it is:

```
payload/node                                  Node 22.23.1 arm64, Developer ID
                                              signed by the Node project,
                                              timestamped, hardened runtime
payload/node_modules/pkg-0/dist/mod-0.js      2,000 files across 40 directories,
payload/node_modules/pkg-0/dist/mod-1.js      every one of them byte-identical,
...                                           each containing exactly one line:
payload/node_modules/pkg-39/dist/mod-49.js        // inert fixture stub.
```

SHA-256 of the submitted archive:
`43a3bddb4228a4c7c0f8b7a27e7ef22825913e19adc132e782b331be4b29176d`

The Accepted pair is the same `payload/node` with a real npm dependency tree in
place of the stubs:
`5426431f47734e44826f5649c13e1b4b61b7d70772d3b0308c4e967e66e26f17`

Both are generated by a short shell script I can post or attach on request.

Eight of fifteen submissions tonight are still In Progress, the oldest at 78
minutes, spanning every shape I tried: with and without the dependency tree, with
and without a signed binary, plain and encrypted inner archives, 11MB to 60MB,
high-entropy and trivially compressible. WWDC21 session 10261 states a commitment
to 15 minutes for 98% of submissions.

WWDC21 session 10261 says Apple is "committed to completing this process within
15 minutes for 98 percent of Notary submissions, and most complete in under
five." My cleared submissions match that — 19 to 113 seconds. The affected ones
ran past five hours and were then deleted.

I ran a 21-submission bisection with a decision rule fixed in advance (still In
Progress at 10 minutes = hung; in practice the results were bimodal, with nothing
at all between 113 seconds and 36 minutes). Each fixture differed from its neighbour by one
property. Cleared, and so exonerated: the submission channel (31s), byte volume
(108MB Node runtime alone, 44s), the Mach-O binaries themselves (9.9MB esbuild
alone, 19s), file count (11,001 stubs, 110s), the name `node_modules` (108s),
`@`-scoped directories, nesting depth, and directory count. Still hung after:
pruning unused files, dereferencing all 222 symlinks, flattening the tree, and
sealing it inside an inner zip.

Two things make me think this is not a signing mistake on my side.

First, a matched pair. A fixture containing an unsigned binary nested inside an
inner zip came back **Invalid in 113 seconds**, with the log naming the offending
path three times. Its pair — same layout, submitted two minutes later, differing
only in that the nested binary was signed — has never returned anything. When the
notary has something to say it says it quickly and precisely, and it descends
into nested archives.

Second, the stuck submissions are **deleted**. Seven were confirmed In Progress
at `2026-08-12T07:13:12Z`. Re-queried 21–26 hours later, all seven return
"Submission does not exist or does not belong to your team" and none appears in
`notarytool history`, while submissions from the same minutes under the same
credentials still resolve — `a978eb1f-d781-4fdc-9295-88540a37a504` (05:49:24Z)
still returns Accepted; `f991e71b-742e-4a7d-a47c-48809a60b321` (05:10:08Z) is
gone.

Two questions:

1. Can anyone see what is happening to `359b004e-ccd2-4ab0-a02e-0516b5598b75`?
   Given what is in it, I do not think there is anything in the archive to find,
   and its same-batch pair completing in 87 seconds suggests the service was
   healthy at that moment. Happy to provide the generating script, digests, or
   the full fifteen-submission ledger.
2. Should a submission that cannot be processed disappear rather than reaching a
   terminal state? As it stands there is no way to tell "queued" from "will never
   complete," and the ids needed to report it expire before a support cycle
   finishes.

The submission above is **not my app** — it is a fixture generated by a script,
containing only my own JavaScript files and no Mach-O at all. I can describe its
contents exactly, and regenerate it on request. I also have matched fixtures that
differ only in directory naming, and a variant sealed inside an encrypted inner
archive, if any of those would help narrow it.

---

## Notes for the reply cycle

- Expect to be asked for the submission UUID first. It is already in the post —
  say so rather than re-pasting.
- If asked to re-submit, do it immediately and edit the post with the new id.
- Offer `fixtures/make-fixtures.sh` only if asked. Leading with a reproducer for
  a *different* trigger (naming) than the one blocking shipping (content) risks
  redirecting the thread.
- If the thread is quiet after a week, escalate to DTS using
  `dts-incident-draft.md`, and cite the thread URL in it.

---

## Thread 2 — the packaging question (post after E/F/G results)

**Title**: Does the encrypted-archive technique apply to a bundled interpreter's
script files?

Addressed to the author of "Notarisation Fundamentals" (thread 710738). Do not
post this until the E/F/G fixtures have been submitted — the answer is far more
useful when it can be asked against a result rather than a hypothesis.

---

Thread 710738 describes sealing non-executable code in an encrypted zip so the
notary treats it as opaque, with IDE templates as the example, and warns the
technique is not for "code meant to run on macOS."

My Developer ID app bundles a Node interpreter plus roughly 7,900 `.js` files in
`Contents/Resources`. The split seems clean against that guidance: the
interpreter is a Mach-O that must be signed and ticketed, and the `.js` files are
never executed by macOS — `node` reads them as data. But they are unambiguously
"code meant to run," which is the case the thread excludes.

Which side of that line do they fall on?

Concretely: [SUMMARISE E/F/G RESULTS HERE — e.g. "the same content hangs as a
plain tree and inside a plain inner zip, and clears inside an encrypted one"].
I would rather understand whether that is a legitimate packaging shape than ship
something that merely clears.

If it is not legitimate, is there a recommended shape for the script half — a
single pre-bundled file rather than a dependency tree, or a nested disk image
with the double notarization the thread describes for non-transparent installer
formats?
