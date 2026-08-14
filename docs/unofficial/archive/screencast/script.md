# DevArch Screencast — Sharpee IDE Mid-Session Demo

**Format:** Beat sheet, not verbatim script. Voiceover lines are exact; everything else is direction.
**Length target:** 8–10 min final cut. Record longer, edit down.
**Editors:** Daughters. Dead air is fine; reactions are content.

---

## Pre-record setup

- Terminal/IDE scrolled to show the full "stop-and-surface" output from DevArch (the Dungeo validation finding with the three options). This is the cold-open visual.
- Have the relevant ADR file (ADR-183) accessible in a second pane or ready to open mid-demo.
- Don't pre-decide DevArch's exact response to your reframe. Let it happen live. If it goes sideways, retake.
- Suggest one dry run before the real take, *not* to rehearse but to confirm the model is in a useful register that day. Reasoning models can be sharper or duller depending on the run — better to know before you commit.

---

## EPISODE ONE INTRO (~75 sec, on-camera)

**Visual:** You on camera. Clean background, decent lighting, eyes to camera. No B-roll, no logo flythrough — just you talking to the viewer. The intro's job is to establish that there's a real person behind this work.

**Delivery notes:** Slow down. The instinct on a first-take intro is to rush. Resist it. The lines below have natural pauses built in; honor them. If you flub a line, restart from the top of the paragraph — easier to edit than to splice mid-sentence.

**Script (this one *is* verbatim, since it's the only on-camera beat in the demo):**

> "Most of what you see about AI and software development is about writing code. This channel isn't about that.
>
> This channel is about the part of the work that happens *before* code. The part where you're trying to figure out what you're even building. What the right boundaries are. Where the seams should fall. Which decisions are load-bearing and which ones can be revisited. That's architecture. And it's the part of software I've spent forty years caring about more than any other.
>
> I'm David Cornelson. I built DevArch — a tool that helps me have architecture conversations with an AI that actually pushes back, surfaces contradictions, and tracks decisions over time. I use it every day on my own projects including architecture R&D in my current full-time role. And this channel is where I show you that work.
>
> What you'll see here are real architecture sessions on real projects. My interactive fiction platform Sharpee. A poker training app. A budgeting tool. A writing app for novelists. Whatever I'm building at the time. Mistakes included. Course corrections included. ADRs that get written, amended, sometimes thrown out. None of it is staged.
>
> Full disclosure: I built DevArch, and I use it on everything you'll see. If that bothers you, I get it. If it sounds like the most useful kind of demo you can watch — someone who built a tool, using it on work they actually care about — stick around.
>
> Today's episode picks up mid-flight on Sharpee. We just hit a snag."

**Editor note:** Cut from the final line directly into Beat 1's terminal visual. The "we just hit a snag" line is the transition; no need for a stinger or title card between.

---

## BEAT 1 — Cold open (~30 sec)

**Visual:** Terminal showing DevArch's analysis output. Scroll position: the "Finding" header is at the top, the three options are visible below.

**Voiceover (recorded separately, laid over the visual):**

> "Sharpee's a TypeScript engine for interactive fiction — text adventures. I've been working on the new channel-io renderer with inline macros — explicit `[br]` and `[p]` markup that lets story authors control line breaks at the text layer. I just asked DevArch to validate a recent architecture decision against Dungeo, the reference port we use to make sure the renderer can handle real-world text. And DevArch came back with something I wasn't expecting."

**Editor note:** Let the cold open hold long enough for a viewer to glance at the output text — even if they can't read it all, the *shape* (Finding / Options / recommendation) does the work.

---

## BEAT 2 — Walk the finding (~90 sec)

**You on camera or voiceover, your call:**

Talk through what DevArch found, in your own words. Don't read the screen — explain it. The key things to land:

- ADR-183 §0 had accepted "global whitespace collapse" as the renderer rule
- That decision was made before the Dungeo validation ran
- DevArch did the validation, found 27,000+ runs of multi-space text in Dungeo that the collapse rule would destroy
- And — this is the line that matters — *DevArch stopped before implementing the collapse*. It flagged the contradiction and asked for the call rather than plowing through.

**Voiceover line that has to be said exactly:**

> "That's the part I want you to notice. DevArch tracked a validation it knew was deferred, came back to it after the rest of the work was done, found it contradicted an accepted ADR — and stopped. It didn't try to route around the contradiction. It surfaced it."

**Editor note:** This is the first of three or four lines that need to land cleanly. Worth recording two or three takes of just this voiceover and picking the best one.

---

## BEAT 3 — The three options (~60 sec)

**Visual:** Highlight or pan to the three options in DevArch's output.

**You explain, briefly:**

- Option 1 — drop the global collapse, keep passthrough, amend the ADR. DevArch's recommendation.
- Option 2 — opt-in collapse per story or block. More machinery.
- Option 3 — migrate Dungeo first, then collapse globally. Big effort.

**Then deliver the line that sets up the next beat:**

> "DevArch gave me a recommendation, and the recommendation is probably fine. But before I take it, there's something underneath this that bothers me. The options assume Dungeo's needs are a constraint to design around. And I'm not sure that's the right frame."

**Editor note:** This is the pivot. Cut on this beat into Beat 4.

---

## BEAT 4 — The reframe (~2 min, the centerpiece)

**Visual:** Terminal, you typing.

**You type (the exact prompt):**

```
There are two competing things here:
1) Dungeo is reference, not untouchable
2) We're building the canonical path

Let's talk through this.
```

**Editor note:** Hold on the prompt for a beat before the response comes in. Then let DevArch's response render in full without cutting. Reaction shot of you reading is appropriate here — three to five seconds is fine. If you want to think out loud while reading, that's content too.

**What DevArch should do (don't script verbatim — let it happen):**

The behavior to watch for, and what makes this a good or bad take:

- *Good take:* DevArch acknowledges its options collapsed the tension, unpacks what each lens implies (Dungeo as signal vs. requirement), surfaces the underlying question (which direction does the contract relationship run between renderer and reference story), and asks where you want to enter — top-down from principle or bottom-up from evidence.
- *Bad take #1 (sycophantic):* DevArch capitulates and goes "you're right, let's go with option 1." That's the model failing. Retake.
- *Bad take #2 (defensive):* DevArch re-litigates its recommendation without engaging with the reframe. Also retake.
- *Bad take #3 (over-eager synthesis):* DevArch immediately proposes a new framing and rewrites the ADR without the conversation happening. Less bad, but flatter on camera. Worth a retake if budget allows.

**Voiceover line for after DevArch responds (the most important line in the demo):**

> "Watch what just happened. I didn't ask DevArch to solve the problem. I asked to talk it through. A worse tool would still try to give me an answer. A better one engages with the actual tension and helps me find the question I should be asking. That's the part of architecture that's hardest to automate. It's the part I want a real partner for."

**Editor note:** Lay this voiceover over the visible response text. Don't cut to your face during this line — let the viewer's eye be on the artifact.

---

## BEAT 5 — Have the actual conversation (~3-4 min)

**Visual:** Continuing terminal session.

This is the part the script can't predict and shouldn't try to. Have the real conversation. Decide whether the renderer's contract is top-down or bottom-up. Land on a principle. Probably (but not necessarily) end up at something like "explicit-additive markup is the canonical semantic at the renderer boundary; whitespace is content, not formatting; Dungeo's compatibility is a consequence, not the driver."

**Editor's job in this beat:** Compress. Probably 6-8 minutes of real conversation compresses to 3-4 minutes of cut footage. Cut on the question-and-response rhythm, let pauses breathe where DevArch is generating substantively, trim where you're thinking and the screen is static.

**One voiceover line worth dropping in mid-conversation, when the underlying principle starts to emerge:**

> "This is the moment that distinguishes reference work from canonical work. Dungeo is teaching us what real IF text looks like. It's not telling us what the renderer has to do."

**Editor note:** Time this voiceover to a beat where the principle is visible in the conversation text on screen, so audio and visual reinforce each other.

---

## BEAT 6 — The ADR amendment (~90 sec)

**Visual:** Switch to the ADR-183 file. You ask DevArch to amend §0.

**You type something like:**

```
Amend ADR-183 §0 to reflect what we just talked through. The principle is the renderer contract, not Dungeo accommodation.
```

**Visual:** DevArch shows the diff. Old §0 (global collapse) → new §0 (additive explicit breaks; whitespace as content; principled framing).

**Hold on the diff.** This is the payoff artifact. Let it sit on screen.

**Voiceover line:**

> "That's the artifact. The ADR didn't just change — it got *better*. The new version doesn't say 'we backed off because Dungeo broke.' It says what the renderer's contract actually is, and why. That's a decision the next architect on this codebase can defend."

**Editor note:** This is the third must-land line. Worth two or three takes.

---

## BEAT 7 — Close (~30 sec)

**Visual:** Return to the wider session view. Maybe show the brainstorm checklist or the decisions log briefly.

**Final voiceover:**

> "That whole exchange — find the contradiction, surface it, reframe it, land a principled amendment — is forty minutes of architecture work. Three artifacts updated. One ADR meaningfully stronger than it was an hour ago. And the thing I want you to take away is that DevArch wasn't writing code during any of it. It was helping me think. That's what an architect's tool looks like."

**Editor note:** Hold on the final frame for a beat before cut. Resist the urge to tag a CTA on the end of the demo itself — the YouTube description or LinkedIn post is where that goes.

---

## Lines that have to be said exactly (record voiceover separately)

These are the four lines the demo lives or dies on. Record them as standalone voiceover, two or three takes each, pick the best:

1. Beat 2: *"That's the part I want you to notice. DevArch tracked a validation it knew was deferred, came back to it after the rest of the work was done, found it contradicted an accepted ADR — and stopped. It didn't try to route around the contradiction. It surfaced it."*
2. Beat 4: *"Watch what just happened. I didn't ask DevArch to solve the problem. I asked to talk it through. A worse tool would still try to give me an answer. A better one engages with the actual tension and helps me find the question I should be asking. That's the part of architecture that's hardest to automate. It's the part I want a real partner for."*
3. Beat 6: *"That's the artifact. The ADR didn't just change — it got better. The new version doesn't say 'we backed off because Dungeo broke.' It says what the renderer's contract actually is, and why. That's a decision the next architect on this codebase can defend."*
4. Beat 7 close: *"That whole exchange — find the contradiction, surface it, reframe it, land a principled amendment — is forty minutes of architecture work. Three artifacts updated. One ADR meaningfully stronger than it was an hour ago. And the thing I want you to take away is that DevArch wasn't writing code during any of it. It was helping me think. That's what an architect's tool looks like."*

---

## BYOK note

Same as the tax version — drop it into the cold open or the close. Suggested placement: at the very end of Beat 7, one line:

> "And to be clear: DevArch uses your own Anthropic API key. Your work goes through your account, your retention terms, your audit trail. Nothing routes through a DevArch server."

---

## Editing notes for your daughters

- The four numbered voiceover lines are the demo's spine. Everything else can flex.
- Reaction shots of you reading DevArch's output are good. Three to five seconds is fine. Longer is fine if your expression is doing work.
- Don't cut to face during the must-land voiceovers — keep the visual on the artifact.
- The Dungeo "27,399 runs of 2+ spaces" line deserves a brief zoom or highlight. It's the detail that proves the tool actually went and looked.
- The ADR diff in Beat 6 should hold long enough for a viewer to read both versions side by side. Don't rush it.
- Music — if any — should be sparse. This is a thinking demo, not a hype demo. Low and ambient under the voiceover, drop out during the typing/response beats.