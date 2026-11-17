# IFWiki `Chord` page — draft

New page, to be created at https://www.ifwiki.org/Chord and linked from the
Sharpee page (see `sharpee-page.md` §3 and the `== Chord ==` section in
`sharpee-page-final.md`).

Everything below was checked against the repository at commit `7ce444b9`.
Sources are named in the notes after the draft so each claim can be re-verified.

---

## Draft wikitext

```mediawiki
{{Software infobox
|Type=Authoring system
|Style=Parser
|Developer=David Cornelson
|Home page=http://sharpee.net/
|Format=Other
|System=Windows, macOS, Linux
|Version=3.0.0
|Status=Stable
}}
'''Chord''' is the story authoring language for [[Sharpee]], created by
[[David Cornelson]]. A Chord story is a single plain-text <code>.story</code>
file that describes rooms, objects, characters, and behavior in a declarative,
near-English syntax. It is compiled by the Sharpee toolchain — there is no
package manifest, no build configuration, and no separate programming language
to learn alongside it.

Chord is deliberately not a general-purpose programming language. It has no
user-defined functions, no arithmetic expression language, and no imperative
control flow. Everything it can express is a statement about the world of the
story or about what happens in response to play.

== Example ==

The opening of ''Cloak of Darkness'' in Chord:

<pre>
story
  title: Cloak of Darkness
  authors:
    Roger Firth (Sharpee implementation)
  id: cloak-of-darkness
  story-version: 1.0.0
  description: A basic IF demonstration - hang up your cloak!

define condition in-darkness: the player's location is dark

create the Foyer of the Opera House
  a room
  aka foyer, hall, entrance
  west to the Cloakroom
  south to the Foyer Bar
  north is blocked: cant-leave

  You are standing in a spacious hall, splendidly decorated in red and
  gold, with glittering chandeliers overhead. The entrance from the
  street is to the north, and there are doorways south and west.

create the Foyer Bar
  a room, dark while the player has the velvet cloak
  aka bar

  The bar, much rougher than you'd have guessed after the opulence of
  the foyer to the north, is completely empty.

  after entering it while in-darkness
    phrase stumble
    first time
      change the message to trampled
    third time
      change the message to obliterated
  end after

create the player
  starts in the Foyer of the Opera House
</pre>

== Language design ==

* '''Line-oriented and indentation-structured''' — Blocks open with a header line and close at a dedent or an explicit <code>end</code> terminator. Indentation is spaces only; a tab is an error.
* '''Declarative''' — <code>create the Foyer Bar / a room</code> states what exists. Exits, synonyms, and darkness conditions are properties of the declaration rather than calls made against an object.
* '''Prose is first-class''' — A room's description is simply the paragraph written inside its block. Blank lines are paragraph breaks, not syntax.
* '''Named conditions''' — <code>define condition in-darkness: the player's location is dark</code> gives a world state a name, which event clauses then read as ordinary English.
* '''Event clauses''' — <code>after entering it while in-darkness</code> attaches behavior to a moment in play, with ordinal forms such as <code>first time</code> and <code>third time</code> for occasion-dependent responses.
* '''Opt-in systems''' — A <code>use</code> line enables a subsystem, such as scoring with a rank ladder, and the language then exposes only that system's vocabulary.

== Implementation ==

Chord is implemented in TypeScript as <code>@sharpee/chord</code>: a lexer, a
parser, a semantic analysis pass, and a diagnostics layer that reports problems
in terms of the story rather than the runtime. Compilation produces a Story
Intermediate Representation that the Sharpee engine executes.

The grammar is formally specified. A machine-oriented EBNF is maintained in the
compiler package as the parser implements it, alongside an annotated reference
covering layout rules and analyzer behavior. Grammar changes are a controlled
process rather than an incidental consequence of implementation work.

== Tooling ==

'''Chord Writer''' is the native macOS authoring application for Chord. It
provides syntax highlighting from an in-process port of the compiler's own
lexer, a Problems pane fed live by the compiler as the author types, and a
one-step Build and Play that produces a self-contained browser bundle. Authors
never invoke a package manager or a build tool directly.

Chord stories can also be compiled from the command line by the Sharpee
toolchain.

== See also ==

* [[Sharpee]] — the platform Chord targets
* [[David Cornelson]]

{{software navbox}}
```

---

## Verification notes

| Claim | Source |
|---|---|
| Language version 3.0.0 | `packages/chord/src/version.ts:181` — `CHORD_LANGUAGE_VERSION = '3.0.0'`; sharpee.net's nav carries the same figure for its Chord section |

> **The two version numbers are not the same and the page must use the language
> one.** `@sharpee/chord`, the compiler *package*, is at **5.0.0**; the *language*
> it compiles is at **3.0.0** (ADR-257 pins these separately, and the site's
> `nav.ts` comment states outright that they move independently). An earlier
> draft of this page put 5.0.0 in the infobox — wrong for a page about the
> language. The Sharpee page's `Version=5.0.0` is correct, because that one is
> about the platform.
| Compiler stages: lexer, parser, semantic analysis, Story IR, diagnostics | `packages/chord/package.json` `description` field (cites ADR-210) |
| `.story` is a single plain file, no manifest, no npm step | `tools/ide/README.md` — "no `package.json`, no `node_modules`, no npm step, ever" |
| Example code | `stories/cloak-of-darkness/cloak.story`, lines 1–45, quoted verbatim then abridged: the Cloakroom declaration is dropped and the Foyer Bar's description truncated by one sentence, to keep the sample short |
| Line-oriented; spaces only, tab is a lex error; blocks close at dedent or `end` | `packages/chord/chord.ebnf`, layout summary in the header comment |
| Blank line is a paragraph break inside prose blocks | same |
| `define condition`, `after` clauses, `first time`/`third time`, `aka`, `use scoring` with rank ladder | `packages/chord/chord.ebnf` production list; `use scoring` cites ADR-261 |
| Formal EBNF plus annotated reference; grammar changes are controlled | `packages/chord/chord.ebnf` header — annotated version at `docs/reference/chord-grammar.md`, changes require approval via `docs/architecture/chord-grammar-changes.md` |
| Chord Writer: macOS, in-process lexer port, Problems pane from `sharpee compose --json`, Build and Play | `tools/ide/README.md`; `tools/ide/project.yml` declares `platform: macOS` |
| Chord Writer 1.0.0 | `docs/context/session-20260813-1306-*.md` (installed artifact `Chord Writer.app`) — **not** independently re-verified today |

### Things I deliberately did not claim

* **No release date or history.** I could not establish when Chord was first
  released publicly, so the infobox omits `Date=`. Add it if you know it.
* **No download link.** Chord ships inside Chord Writer and the npm packages
  rather than separately; the Sharpee page's download link already points at
  Chord Writer.
* **No claim about which IF systems Chord resembles.** Comparisons to Inform 7's
  natural-language style would be the obvious thing for a wiki reader to want,
  but that framing is yours to make, not mine to assert.
* **No line count, story count, or adoption figures.** Nothing in the repo
  supports a claim about how widely Chord is used.

### Needs your decision

1. **Infobox `Type=`.** I used `Authoring system`, matching the Sharpee page.
   `Programming language` may fit better for a language page, depending on
   IFWiki's conventions for the field.
2. **Whether Chord warrants its own infobox at all**, or should be a plain
   article that defers to Sharpee's.
3. **There is no linkable language reference right now.** The annotated grammar
   document that `chord.ebnf` calls normative has two problems at once: it
   documents **Chord 1.4.0** while the compiler package is at 5.0.0, and it no
   longer lives at `docs/reference/chord-grammar.md` — the whole `docs/reference/`
   tree moved into `docs/unofficial/` in the 2026-08 docs consolidation, which
   is the quarantine tree. The wiki page therefore links to nothing for the
   language reference, which is the one link a reader coming to a language page
   most wants. Worth resolving before the page goes up. See the note below —
   this is not only a Chord-page problem.

---

## Out of scope, but surfaced by this work: `docs/reference/` is quarantined

Writing the Chord page turned up something worth a separate decision. The
`docs/reference/` tree no longer exists — the docs consolidation moved its 8
files to `docs/unofficial/reference/`. But **144 citation lines across 60 live
files still point at `docs/reference/...`**, including:

* `packages/chord/chord.ebnf:7,21,23` — the grammar file names
  `docs/reference/chord-grammar.md` as where the annotated grammar lives and
  calls its layout table **normative**
* ADRs 230, 231, 236, 244, 245, 257, 260, 264, 298 and others, citing
  `chord.ebnf`, `chord-language.md`, `stdlib-reference.md`,
  `stdlib-phrasebook.md`, `stdlib-cookbook.md`, `intention-system.md`

Two things are true at once and they conflict: `CLAUDE.md` says
`docs/unofficial/` is junk mail that must not be cited or treated as current,
and `chord.ebnf` says one of those files is normative. Either those references
belong back in live docs, or the ADRs and the EBNF need to stop depending on
them.

This is the same class as the `spikes/` citation repair done earlier today, but
an order of magnitude larger (144 lines vs. 19) and it carries a real design
question rather than a mechanical path swap — so it is flagged here rather than
fixed. It does not block the wiki pages.
