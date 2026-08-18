# Theatre Story — Player Task Specification (Phase 2)

**Status**: CONFIRMED (David, 2026-08-16 — "confirmed - close Phase 2").
This document is the fixed reference Phase 10 (story authoring) and Phase 11
(acceptance closure) cite for what the demonstration story must exercise.
David provided every story element; the goal paragraph, places set, and beat
table were assembled from his answers and confirmed as complete enough to
author against.
**Discipline**: this document and the construct-to-beat table are work-directory
artifacts. The story's own files (Chord source, transcripts) will carry plain
story language and no ADR references (David's ruling, 2026-08-16).

---

## 1. The company — ANSWERED (David, 2026-08-16)

**William Shakespeare and the Lord Chamberlain's Men.**

**Cast** — ANSWERED (David, 2026-08-16): "the minimum is probably good
enough" — **William Shakespeare, Richard Burbage, Will Kemp** (plus whatever
background presence the scenes need — hired men, a boy player — as texture,
not principals).

Personality sketches — CONFIRMED (David, 2026-08-16), drawn from the
historical record (these drive the initiative dispositions):
- **Kemp** — the crowd's darling: improviser, jig-maker, plays to the yard;
  brash, interjects at any excuse, chafes at speaking only what is set down.
- **Burbage** — the great tragedian: ambitious, serious about the craft,
  guards the company's dignity; assertive when the work is threatened, cool
  to clowning that steps on the play.
- **Shakespeare** — playwright and sharer: watchful, word-precise, volunteers
  little; speaks first only when the script — or the company — is at stake.
- ~~Year and venue~~ — ANSWERED (David, 2026-08-16): **1599, the Globe** (the
  company's just-built playhouse).

## 2. The play within the story — ANSWERED (David, 2026-08-16)

**Julius Caesar.** (Historically one of the first plays staged at the new
Globe — the 1599 fit is exact.)

**The crisis** — ANSWERED (David, 2026-08-16): **Will Kemp leaving the
company.** The rehearsal arc toward opening night carries the company's
famous clown on his way out.

Reference resonance (historical, for David to use or ignore): *Julius
Caesar* has no clown role — long read by scholars as evidence of exactly
this rift (with Hamlet's later "let those that play your clowns speak no
more than is set down for them" as the echo). Rehearsing the first play
with no part for Kemp, while Kemp is leaving, is the historical grain
running the same direction as the story's crisis.

## 3. The player — DIRECTION SET (David, 2026-08-16), win condition OPEN

David's framing: a **rival hovering in disguise**. Historical answer to "was
there a rival": yes, and next door — **Philip Henslowe and Edward Alleyn's
Admiral's Men at the Rose**, the Globe's immediate Bankside neighbor in 1599
(the Globe's arrival is what drove them to build the Fortune the next year).
Henslowe poached players; Alleyn was Burbage's great rival on the stage; and
rival companies really did steal plays (memorial reconstruction — the "bad
quartos"). The revived boy companies (Paul's, the "little eyases") are a
second historical rival if wanted.

The fit, confirmed by construction of David's answers: **the player is
Henslowe's agent, disguised among the hired men for the last three days of
rehearsal.**

**The task — ANSWERED (David, 2026-08-16): both objectives.**
- **Poach Kemp**: turn the departing clown to the Admiral's Men before
  opening night.
- **Steal the play**: carry enough of *Julius Caesar* out of the Globe for
  Henslowe to stage it first.

**The player's goal, one paragraph** (drafted from David's answers, part of
the exit confirmation):

> You are Henslowe's man, slipped into the Lord Chamberlain's Men as a hired
> player for the last three days before *Julius Caesar* opens the new Globe.
> Kemp is leaving — everyone backstage knows it, though no one says it
> plainly — and Henslowe wants two things carried across Bankside before
> curtain-rise: the clown himself, sworn to the Admiral's Men, and enough of
> the play-book for the Rose to stage *Caesar* first. Win both without the
> company piercing your disguise.

Winning is recognized when **both objectives stand at opening night**: Kemp
committed to the Admiral's Men, and the play-book (or enough of it) out of
the Globe — with the disguise intact as the standing constraint that makes
every conversation a risk.

## 4. Places and clock

**Clock — ANSWERED (David, 2026-08-16): the last 3 days of rehearsal**,
ending at opening night. Day boundaries are the story's clock structure
(absence words age across them; the performance is the deadline both
objectives race).

**Places — proposed minimal set** (follows the task; part of the exit
confirmation):
- **The stage** — rehearsal scenes; the company at work.
- **The tiring-house** — backstage; where the play-book and parts live, and
  where conversations happen out of Burbage's hearing.
- **The yard and galleries** — where a hired man can watch, overhear, and be
  cornered.
- **A Bankside tavern** — off-Globe ground; where Kemp can be courted away
  from the company's eyes.

## 5. Construct-to-beat table

Requirement→construct traceability (lives here and in the Phase 11 audit,
never in story files — the story states each of these as plain story
requirements):

| Story beat | Exercises |
|---|---|
| Meeting each principal for the first time as the disguised newcomer; re-approaching them across three days | Scene lifecycle and boundaries — first-meeting, return, absence words (AC1, AC4) |
| A principal probes the player's identity with a pointed question that demands an answer before talk can move on | Exchange overlay — responses win over the topic table while open, fall through cleanly after (AC2) |
| The three principals each carry a declared delivery style; the same answers sound different as the crisis deepens | Manner fallback with beat rotation; hand-authored rows win (AC3) |
| "Twice in one day" vs. "since yesterday" greetings; pressing Kemp too soon after a rehearsal blow-up vs. after a night's cooling | Time words — recency and absence through the one clock seam (AC4) |
| Kemp interjects during rehearsal at any excuse; Shakespeare speaks only when the script is at stake; a humiliation beat silences even Kemp | Initiative by disposition, bent by circumstances; authored rows force moments (AC5) |
| Burbage's run-through holds the stage against chatter — until something a conversation cannot ignore breaks it | Interruption — assertive vs. blocking, world act exemption (AC6) |
| The player cornered in the tiring-house about who they really are — silence is always an answer; a principal who cannot storm out mid-scene doesn't | World-bounded exit; rendered, manner-colored silence (AC7) |
| Burbage and Shakespeare confer about Kemp — overheard from the tiring-house, or happening offstage with only consequences visible | NPC↔NPC scenes, observable-only rendering, effects land regardless (AC8) |
| The player's cover story spreads through the company; a claim that contradicts what someone knows comes back at the worst moment | Witnessed player claims, propagation, contradiction as authored material (AC9) |
| Kemp will only talk defection after his grievance was discussed; Shakespeare notices the player steering talk toward the play-book | Threading — `was discussed`, subject-change noticing (AC10) |
| Any open exchange in the story | Wire affordances consumed by the testing surface (AC11) |
| Save mid-scene during any of the above, restore, continue | Mid-scene save/restore (AC12) |
| The whole three-day arc, played to a win, via the built bundle | End-to-end demonstration (AC13) |
