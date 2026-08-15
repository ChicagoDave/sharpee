# Notary fixture results — 2026-08-13

# RESOLVED — 2026-08-13T16:01Z

**A toolchain-bearing bundle notarizes. It was two unrelated problems stacked.**

**1. The real defect: one ad-hoc-signed binary.** `R-toolchain`, resubmitted at
15:56:46Z, returned **Invalid in 115 seconds** naming the file and the reason:

```
path: toolchain/devkit/node_modules/.pnpm/@esbuild+darwin-arm64@0.27.2/
      node_modules/@esbuild/darwin-arm64/bin/esbuild
  "The binary is not signed with a valid Developer ID certificate."
  "The signature does not include a secure timestamp."
  "The executable does not have the hardened runtime enabled."
```

npm ships esbuild's darwin-arm64 binary ad-hoc signed (`Signature=adhoc`,
`linker-signed`). `vendor-toolchain.sh` copies it in untouched, and nothing
re-signs it. An ordinary, documented notarization failure.

**2. The fix, verified end to end.** Re-signing that one binary:

```
codesign --force --sign 87BFF5B2E72AEDFB37BB8A5C3C2B058D52A5F350 \
         --options runtime --timestamp <path-to-esbuild>
```

then rebuilding and resubmitting the identical toolchain
(`6486cc83-b831-45df-910d-6a092b0b829a`, submitted 15:59:38Z) →
**Accepted in ~92 seconds.** `node` needs nothing; it already ships Developer ID
signed, timestamped, hardened. esbuild is the only Mach-O in the closure.

**3. Why this took four sessions: the notary intermittently stalls, and the
stall masked the error.** Definitive evidence — the *same archive*, same
SHA-256, submitted twice:

| Submission | Archive SHA-256 | Submitted | Outcome |
| --- | --- | --- | --- |
| `359b004e-…` | `43a3bddb…76d` | 05:40:32Z | **In Progress at 10h+** |
| `f0c04838-…` | `43a3bddb…76d` | 15:55:14Z | **Accepted in 72s** |

Identical bytes, opposite outcomes, same account, same command, same day. No
property of the artifact can explain that. `R-toolchain` behaved the same way:
hung at 05:59Z, Invalid-in-115s at 15:56Z — byte-identical archive.

**Consequences.**

- **ADR-279 D4's INTERIM can be lifted.** Toolchain-bearing bundles are not
  unnotarizable. `package.sh --no-toolchain` is not required, and the download
  page no longer needs to tell authors to `npm install -g @sharpee/devkit`.
- **`vendor-toolchain.sh` needs a re-signing step** — every Mach-O in the
  vendored closure, Developer ID + `--options runtime --timestamp`, after the
  seal check. Not yet implemented; proposed only.
- **Everything below this line about content, naming, size and encryption is a
  phantom.** The 2026-08-12 bisection's "content-borne, layout-independent"
  conclusion, its eight exonerated properties, and every hypothesis in this
  document's earlier sections were all fitting models to what was actually
  submission-time luck. Retained below as a record of the investigation, not as
  findings.
- **The intermittency is still a real Apple bug worth reporting** — forum thread
  841846 — but reframed: the evidence is *identical bytes, opposite outcomes*,
  not anything about bundle contents.

---

## Original investigation record (superseded by the above)

Fifteen submissions across five rounds, 04:58Z to 06:00Z, all under team
`RSNGKW5LNH` via `xcrun notarytool submit --keychain-profile dc-notary`, all
archived with `ditto -c -k --keepParent`.

**Headline: eight submissions hung, spanning every content shape tried. The one
fixture that completed a real scan was Accepted in 87 seconds. The evidence now
points away from bundle content and toward the service.**

Reference: WWDC21 session 10261 — Apple is *"committed to completing this process
within 15 minutes for 98 percent of Notary submissions, and most complete in
under five."*

---

## Full matrix

| Fixture | Contents | Signed exec | Submitted | Outcome |
| --- | --- | --- | --- | --- |
| `E-tree` | devkit closure, Mach-O stripped | no | 04:58:22Z | **HUNG** 78m+ |
| `F-plain` | same, in a plain inner zip | no | 04:59:08Z | **HUNG** 78m+ |
| `G-encrypted` | same, in an encrypted inner zip | no | 04:59:37Z | **HUNG** 77m+ |
| `A-control` | 11,001 trivial stubs | no | 05:17:00Z | Invalid ~79s ‡ |
| `H-enc-stub` | same stubs, encrypted inner zip | no | 05:21:13Z | Invalid ~24s ‡ |
| `I-big-stub` | 60MB high-entropy blobs | no | 05:21:14Z | Invalid ~24s ‡ |
| `B-dotdir` | stubs under `.store/` | no | 05:22:46Z | Invalid ~60s ‡ |
| `C-plusname` | stubs under `@s+n@1.2.3/` | no | 05:22:48Z | Invalid ~60s ‡ |
| `D-both` | both naming properties | no | 05:22:49Z | Invalid ~60s ‡ |
| `N-devkit` | **signed node + devkit closure** | yes | 05:40:26Z | **Accepted ~87s** |
| `N-control` | signed node + 2,000 trivial stubs | yes | 05:40:2xZ | **HUNG** 36m+ |
| `N-dotdir` | signed node + stubs under `.store/` | yes | 05:40:2xZ | **HUNG** 36m+ |
| `N-plusname` | signed node + stubs under `@s+n@…/` | yes | 05:40:2xZ | **HUNG** 36m+ |
| `N-both` | signed node + both | yes | 05:40:2xZ | **HUNG** 36m+ |
| `R-toolchain` | **unmodified `vendor-toolchain.sh` output** | yes | 05:59:10Z | **HUNG** 18m+ |

‡ Invalid with *"has no signed executables or bundles. No tickets can be
generated."* — an **early validation rejection**, not a completed scan. These
fixtures never reached the stage that stalls and are **not valid controls**.

Statuses verified `2026-08-13T06:16:53Z`.

### Deletion event captured — 2026-08-13

Seven of the eight hung submissions were **deleted** between `16:22:37Z` (last
confirmed `In Progress`) and `17:42:41Z` (first `does not exist`). `R-toolchain`
was **not** deleted and was still `In Progress` at `17:43:07Z`.

| Fixture | Created | Age at deletion (bounded) |
| --- | --- | --- |
| `E-tree` | 04:58:22Z | 11h24m – 12h44m |
| `F-plain` | 04:59:08Z | 11h23m – 12h43m |
| `G-encrypted` | 04:59:37Z | 11h23m – 12h43m |
| `N-control` | 05:40:32Z | 10h42m – 12h02m |
| `N-dotdir`/`N-plusname`/`N-both` | 05:40:2xZ | 10h42m – 12h02m |
| `R-toolchain` | 05:59:10Z | **not deleted** at 11h44m |

Two corrections to the 2026-08-12 record:

1. **Deletion happens far earlier than the 21–26 hour bound** that document
   reports — 10h42m at the earliest here. That bound was an artifact of when
   the re-query happened, not a measurement.
2. **Deletion is not age-ordered.** `N-control` (05:40:32Z) was deleted while
   `R-toolchain` (05:59:10Z), created 19 minutes *later*, survived. Whatever
   removes them is not a simple retention sweep.

The 2026-08-13T15:55Z pair (`N-devkit-2` `b4c606d0-…`, `N-control-2`
`f0c04838-…`) were both **Accepted** and remain resolvable.

### Submission ids

```
E-tree       b8b3743d-b7ff-44ca-9900-a3568bdfea82
F-plain      e09e1a81-4168-4ae5-aae7-badc5c0502c2
G-encrypted  d0ebc73b-be82-46c1-b6b1-39ec0401aef6
A-control    949d6a5a-6001-4037-84b6-26bd1a7f441f
H-enc-stub   0e93921e-2d09-4e89-be96-4139e757dcce
I-big-stub   a3c98b16-8db0-4a4c-9490-3c21b32fcffc
B-dotdir     74738d6b-840d-4043-a951-9988fbb92700
C-plusname   5a1bf186-e586-4060-b786-4f208e92fd53
D-both       08d20dcd-4c6d-4126-b2fd-441b9b20633a
N-devkit     e4abe4b5-8829-47fb-aa1c-6a79d6824094   <- the only Accepted
N-control    359b004e-ccd2-4ab0-a02e-0516b5598b75   <- the exhibit
N-dotdir     8cfcf5df-47cc-4177-95a7-e55857cddff0
N-plusname   f9682f50-0f5f-4b03-adf8-31a3ac792326
N-both       c753022a-ad84-484d-a5b6-1e17936565c9
R-toolchain  0298d196-f9de-4fba-a9d3-0944becca71d
```

Ids are perishable — the 2026-08-12 cohort was deleted from submission history
21 to 26 hours after creation. Record the date each stops resolving.

---

## What this establishes

**1. The trigger is almost certainly not our bundle content.**
`N-control` is a signed Node binary plus 2,000 byte-identical one-line text
files. There is nothing to find in it. It hung for 36+ minutes while
`N-devkit` — the *same signed node plus the entire real devkit closure* —
was Accepted in 87 seconds, submitted seconds earlier in the same batch. If the
trivial fixture hangs and the complex one clears, content is not the variable.

**2. The 2026-08-12 "content-borne, layout-independent" conclusion does not
survive.** That reading assumed the cleared cohort was clearing *because* of its
content. Tonight the same class of synthetic content hangs. Its eight
"exonerated" properties rest on fixtures whose generation scripts were never
preserved and which cannot be reproduced.

**3. Removing the Mach-O does not help** — `E-tree` carries no binary and hung.
`esbuild is the trigger` is falsified.

**4. The encrypted-archive technique from forum thread 710738 is not applicable
here anyway.** ZipCrypto encrypts contents but publishes the central directory:
`unzip -l` lists `devkit/node_modules/.pnpm/...` from `G-encrypted`'s inner
archive with no password. Any reasoning that treated `G` as opaque is void.

**5. The service was reachable throughout**, answering early-gate rejections in
24–79 seconds and completing one full scan in 87 seconds. Not a total outage —
but nearly everything reaching the deep scan tonight stalled.

---

## What is NOT established

No claim about naming, size, entropy, encryption, or file count survives. Every
fixture built to test those was either early-gate rejected (‡ rows) or hung
alongside its own control. Three successive interpretations during this session —
"content-borne", "name-borne", "encryption/size exonerated" — were each
falsified by the next round and should not be carried forward.

The unexplained asymmetry is `N-devkit` versus `N-control`: same signed node,
same batch, seconds apart, opposite outcomes, with the *more* complex payload
being the one that cleared. No model here accounts for it.

---

## The exhibit for Apple

`N-control` (`359b004e-ccd2-4ab0-a02e-0516b5598b75`) is the strongest artifact
this investigation has produced:

- Trivially describable: one signed Node binary, 2,000 identical one-line files.
- Obviously benign — nothing a scanner could reasonably object to.
- Regenerable from a committed script (`make-signed-fixtures.sh`).
- Contains nothing proprietary.
- Hung for 36+ minutes against a stated 15-minute commitment.
- Has a same-batch matched pair, `N-devkit`, Accepted in 87 seconds, proving the
  service was healthy in that exact window.

That pairing is the report. It needs no explanation of our product, no 213MB
upload, and no theory about what the notary dislikes.

---

## Reproduction

```
tools/ide/vendor-toolchain.sh <stage>          # stage a toolchain
fixtures/make-signed-fixtures.sh <stage>/toolchain
fixtures/make-fixtures.sh                      # naming variants (no signed exec)
fixtures/make-archive-fixtures.sh <stage>/toolchain
fixtures/make-discriminator-fixtures.sh
```

Generated `out*/` directories are gitignored. Scripts are tracked.
