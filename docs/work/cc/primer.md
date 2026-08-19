# Character & Conversation — a short primer

Chord 3.3.0 · ADR-310 (descriptive), ADR-318 (normative), ADR-320 (conversation)

## The one idea

A person can carry a **character model** — who they are — and a **conversation
system** — how that shows up when someone talks to them. They are one mechanism
read at two moments: the model holds state, and every conversation construct
**selects** from it.

**Nothing generates dialogue.** The author writes every line. The model only
decides which authored line fits the moment. If you did not write it, it cannot
be said.

Three properties worth knowing before anything else:

- **Optional and additive.** A person with none of this is still a person. A
  story that declares nothing compiles as before. A shopkeeper may want only a
  topic table; a suspect under pressure may want temperament, conscience, and a
  thread that will not let a subject drop.
- **Closed vocabulary.** Personality words, moods, temperaments, forces come
  from a frozen list. A word outside it is a **compile error**, not a silent
  no-op — typos die at build time. Extend deliberately with `define personality`,
  `define mood`, `define temperament`.
- **Built on topic tables.** All of this sits on `define topics`, the plain
  ASK/TELL table. That still works on its own.

## Character model — the state

```chord
create Jonas Reed
  a person, proper, very impulsive, slightly honest
  temperament duty over fear
  never betrays a confidence
  mood anxious
  feels devoted to Marta Kell
  knows the-ledger-burning, witnessed, certain
```

| Piece | What it holds |
|---|---|
| **Personality & temperament** | Stable traits, and which pressure wins when two collide (`duty over fear`) |
| **Principles** | Lines they will not cross (`never betrays a confidence`) |
| **Mood** | The volatile layer — what they are feeling *now* |
| **Feelings & knowledge** | Who they care about; what they know, how they learned it, how sure they are |
| **Goals** | What they are trying to do, with priority and gating (`active when it is breaking`) |
| **Influence & face-acts** | Pressure they exert on others — intimidation, charm — and how it lands (witnessed / resisted) |
| **Conscience** | What they are `burdened by`, and what that costs them to keep |

## Conversation — the selection

| Construct | What it decides |
|---|---|
| **Manner** | How a reply is *delivered*, by mood — a `beat` of business, or a `voice` |
| **Greetings** | First time, on return, again so soon, after days, asked again, on leaving |
| **Topic recency** | Whether a subject is `fresh`, `recent`, or `stale` — and what that changes |
| **Exchanges** | A question *they* asked, awaiting your answer; may be `blocking` |
| **Initiative** | When they speak unprompted — open floor, subject change, harm |
| **Threads** | A subject they will carry across turns, beat by beat, until it concludes |
| **Continuation prompts** | The player pulling the next beat: *tell me more*, *continue*, *go on*, *and?* |

A taste of each of the three that do the most work:

```chord
define exchange the-offer for Will Kemp, blocking
  answer "yes", "aye", "sworn":
    phrase kemp-sworn
    change Will Kemp to sworn
  on leaving:
    phrase kemp-calls-after
    leave
  on silence:
    phrase kemp-offer-silence
end exchange

define initiative for Will Kemp
  on an open floor, when it is cheerful:
    phrase kemp-interjects
  on an open floor, when it is stung:
    hold their tongue
  when the subject changes:
    deflect to "the offer"
end initiative

define conversation the-defection for Will Kemp, blocking
  about "the rose", "the offer", "henslowe"
  opens when the grievance was discussed and the-blow-up is stale
  beat:
    phrase kemp-names-his-price
    then asks the-offer
  on refusing:
    phrase kemp-holds-the-thread
  on resuming:
    phrase kemp-takes-it-up
```

## How the two halves meet

Mood, knowledge, recency and state are read as **gates** on selection:

```chord
define topics for Will Kemp
  about "the rose", "the offer":
    refuse when the-blow-up is fresh: kemp-too-raw
    phrase kemp-warms when the grievance was discussed
    phrase kemp-brushes-off
```

Same question, three different authored answers, chosen by what he feels and
what has already happened. That is the whole pattern — state on one side,
authored lines on the other, a gate between them.

## Two things that surprise people

**Continuation prompts need no authoring.** Any story with a thread gets *tell
me more* / *continue* / *go on* / *and?* free, and they resolve their target
implicitly — the co-located person whose thread has a beat ready. If none is
ready the prompt is inert; it never invents a reply. Because the player sets the
pace, **write each beat to stand alone** as something the character would say
next, not as a fragment that only parses in sequence.

**A concluded thread stays concluded.** It never re-claims its topics, so
pressing *go on* at a settled matter does not restart it.

## Where to go next

Full author docs: **sharpee.net → Chord → Guide → Characters & Conversation**
(15 pages, one per construct above). Every example there was driven to a
gate-clean `sharpee compose --check` at Chord 3.3.0.

Adjacent: *World → People* for `proper` / `aka` / `pronouns`; *Behavior → Topic
tables* for `define topics`.

Worked example: `branch-stories/ides-of-march/ides-of-march.story` uses the
whole stack — Kemp carries manner, initiative, an exchange, and the defection
thread.
