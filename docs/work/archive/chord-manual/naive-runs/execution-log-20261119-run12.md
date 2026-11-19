# Execution log — The Chord Manual acceptance run

`sharpee --version`: `Sharpee 5.6.4 · Chord 4.0.3`
Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). PASS
2. Playwright in `~/tools/playwright`: three-line script launched Chromium (159.0.8154.6) and closed it. PASS
3. `~/repos/book-test` holds one PDF (`the-chord-manual-4.1.0.pdf`) and `companion`. PASS
4. `pdftotext -v` and `pdftoppm -v` each print `version 22.12.0`. PASS

Project folder: `~/repos/relighting`. Node v22.23.2, npm 12.0.2.

Substitution (logged once): `sharpee play .` cannot be held interactively here; commands are sent on standard input, one to a line, ending with `/quit`.

## Preface and "How to read this book"
STATUS: PASS (read; nothing to execute)

## Chapter 1 — The shape of a story file
STATUS: PASS
- Story typed by hand into `relighting/relighting.story` (32 lines; `↪` rows joined to the row above). No issues.

## Chapter 2 — The story header
STATUS: PASS
- Nothing built in this chapter (as it says). `about` output (2.3) and the opening (2.4) reproduced word for word in chapter 4's play.

## Chapter 3 — The player and the start
STATUS: PASS
- `examine me` and the opening (3.1, 3.4) reproduced word for word. The opening block and the 3.5 mistakes are described, not instructed ("you need not add one"), so were not typed.

## Chapter 4 — Build, play, read an error
STATUS: PASS
- 4.1 install: npm ended with the install-script warning the book predicts. `sharpee --version` → `Sharpee 5.6.4 · Chord 4.0.3` (expected for this run).
- 4.3 check, 4.4 play (opening and five commands), 4.5 `playble` (two diagnostics, lines 31:3 and 24:3), 4.6 `Loge` (25:13), 4.7 warning (16:8), restore, and the Under the Hood `compose -o` (2 entities, 0 trait(s), 0 action(s)) all matched the book word for word apart from the version number.
- 4.8 shows two error messages but gives no step to run; not executed.

## Chapter 5 — Rooms and exits
STATUS: PASS
- Copied `chapter-05/relighting.story`; gate-clean. Whole map walked; first-visit text, `look`, `The Porter's Lodge` heading, Bell Stair, Lantern Gallery and `east` → `You can't go that way.` all matched word for word.

## Chapter 6 — Things
STATUS: PASS
- Copied `chapter-06`; gate-clean. Listing line, `examine lamp`, `take lamp`, `take chair`, `take hobb`, `inventory`, the spectacles/`search` block and the Gate Court `drop lamp`/`look` block matched. Examined each description's nouns; the unkept promises (flagstones, grass, garth, tables, benches, desks, shelves, pillars, rope, stair, glass, drum) answer `You can't see any such thing.`, as 6.8 says to expect.

## Chapter 7 — Containers and supporters
STATUS: PASS
- Copied `chapter-07`; gate-clean. Desk/grimoire, crate/lens, `put taper in crate`, `put lens in lantern`, `open press`, `enter chair`/`north`/`exit`, and the `put kettle on chair`/`look` block all matched.

## Chapter 8 — Doors, locks and keys
STATUS: PASS
- Copied `chapter-08`; gate-clean. Every reply in 8.3 and 8.7 matched, including the wrong key.

## Chapter 9 — What things can do: the trait words
STATUS: PASS
- Copied `chapter-09`; gate-clean. Inventory/coat, grimoire `examine`/`read`, seed cake (two bites), cup, bell rope, `read coat`, `eat coat` all matched. Examples "from another story" (hat/cap, trolley, tassel, wireless) are not part of The Relighting and were not typed.

## Chapter 10 — Light, dark and the other senses
STATUS: PASS
- Copied `chapter-10`; gate-clean. Dark Undercroft (grue line, `look`, `examine crate`, `up`), `light lamp`, `light taper`, `extinguish`/`light` in the dark, and the drop-lamp/return block all matched.

## Chapter 11 — Regions
STATUS: PASS
- Copied `chapter-11`; gate-clean. Tower from both sides of the arch, the three stacks and back, all matched. Kettle placed `in the Grounds` gave the quoted `relighting.story:142:3 error [analysis.thing-in-region]` word for word; restored, gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange
STATUS: PASS
- Copied `chapter-12`; gate-clean. `up` blocked phrase, `examine hearth`, `squeeze behind hearth` (dark, then lit), `I don't understand that.` in the Undercroft all matched. 12.2: removed the `up is blocked` line (line 102), walked up, `east` printed the parapet phrase and `[The story has ended. RESTART, RESTORE or UNDO]`; line put back, gate-clean.

## Chapter 13 — States
STATUS: PASS
- Copied `chapter-13`; gate-clean. `read page` block matched. 13.4 experiment: `change the iron grille to lifted` added to the start block, `up` from the Bell Stair showed the Lantern Gallery as quoted; line removed, gate-clean. Under the Hood: `compose -o relighting.json` shows the grille's `states: [standing, lifted]` and `statesReversible: false`.

## Chapter 14 — Reacting to the player: on and after
STATUS: PASS
- Copied `chapter-14`; gate-clean. Kettle, spectacles, Library first entry, spark page, bell rope, grille (push/pull), cake all matched. `set dial to high` is from another story; the lens's `inserting` clause cannot be reached (stair sealed), as the chapter implies.
- Under the Hood: `sharpee test .` in `companion/chapter-14` printed "Derived rule tests (ADR-356): 11 branches" with `kettle · on taking` among them.

## Chapter 15 — What a clause can say and do
STATUS: PASS
- Copied `chapter-15`; gate-clean. `light lamp` refusal, cake refusal (and eaten in the Gate Court), page read twice, candles/`look`, and the closing `light lamp`/`down` block all matched.
- Under the Hood: `sharpee test .` in `companion/chapter-15` listed `hand lamp · on lighting · refused no-such-word` and `seed cake · on eating · refused cake-watched` as quoted.

## Chapter 16 — Conditions
STATUS: PASS
- Copied `chapter-16`; gate-clean. Grimoire before/after, hush page refused in Stack 3 then readable after the spark page — all matched. Under the Hood: IR `conditions` holds `lantern-ready` as an `and` of two tests and `faded-page` with `open: true`.

## Chapter 17 — Choosing between outcomes
STATUS: PASS
- Copied `chapter-17`; gate-clean. Cistern, rope cycling over four pulls, grille counted blocks over four examinations all matched. Under the Hood: `sharpee test .` in `companion/chapter-17` shows the three quoted arm lines and the cistern's three arms as `◌`.

## Chapter 18 — Counting, scoring and ending
STATUS: PASS
- Copied `chapter-18`; gate-clean. Fourth pull (`Your palms have begun to object.`), `score` 5/25 Latecomer, candles rank line, `score` 10/25 Second-Year matched.
- 18.6: copy kept in `~/repos/relighting-endings` with the four start-block lines; losing ending matched; with `change the lens to sound` added the winning ending matched, including the rank line.

## Chapter 19 — Time
STATUS: PASS-WITH-ISSUES
- Copied `chapter-19`; gate-clean. Timer lines (creak / sway / strike), cistern drip and break-up, rank line, mend page, `score` → `You have scored 15 out of 35, earning you the rank of a Second-Year.`, blue flame before and after, `light-turning` at turn 50 and `night-falls` + ending at turn 80 (80 `wait`s from a fresh game) all matched. Under the Hood: IR timer `waking` lists `creak, sway, strike`; sequence `narration` is `broadcast`.
- ISSUE (minor, wording) — 19 intro and 19.4. Book: "Each command the player types is one turn" and "turn fifty is the fiftieth command the player types." What happened: in a game where I had typed `score` once (command 16), the reply to `score` carried no bell line although the bell was tolling (`> score` / `You have scored 15 out of 35, earning you the rank of a Second-Year.` and nothing after), and the warning `The light has turned. The shadows in the Hall have begun to lean east.` came on the 51st command, not the 50th. So `score` did not count as a turn; the book never says some commands take no turn. (The book's own 19.7 `score` block also shows no bell line, which agrees with the story but not with 19.2's "every turn ends with the bell".)

## Chapter 20 — Phrases
STATUS: PASS
- Copied `chapter-20`; gate-clean. `no-such-word` cycling (three variants then round again), `examine gate` with the three-line motto (indents 4/1/0), Hobb's three sayings in order over three entries, Bell Stair description with the grille sentence, `examine bell` count line (`By your count that makes 1` then `2` — a value of the run), and Hobb deafened on returning with the bell tolling all matched.

## Chapter 21 — A thing's own words
STATUS: PASS
- Copied `chapter-21`; gate-clean. Hobb's `present` sentence in the Lodge, lamp detail before/after lighting, candles' two details with the rank line, and `examine lens` in the Undercroft all matched (end-of-turn timer/bell lines vary by turn, as stated).

## Chapter 22 — Changing the standard messages
STATUS: PASS
- `sharpee messages` printed `Message catalog: 885 overridable messages (en-US)` and then the whole list as one line; the quoted entries for `taking-taken`, `going-too-dark`, `lighting-lit` and `taking-taken-from` are there word for word.
- Copied `chapter-22`; gate-clean. Dark `down` override, `look` in the dark, three `wait` variants (cycling), `take lamp` → `You take it.`, grille and kettle refusals before and after the page all matched.

## Chapter 23 — New verbs
STATUS: PASS
- Copied `chapter-23`; gate-clean. `spark` with no target, working refusals before their pages (cycling variants of `no-such-word`), `hush bell` in the Library → `You can't see any bell here.`, `gnusto` (three patterns), the four `remember`/`recall` replies, and `spark lamp`/`spark grimoire` misses after the page all matched. `shout` → `I don't understand that.` (that action is an example and not in the story, as 23.11 says).

## Chapter 24 — New kinds of thing
STATUS: PASS
- Copied `chapter-24`; gate-clean. Played to the win: `spark lamp` (twice), `light lamp` refusal, `spark candles` with rank line, `unbind grille` refused while tolling, `hush bell`, `unbind grille` with `You have risen to the rank of a Journeyman.`, `mend spectacles` (trait phrase), `mend lens` (lens phrase), `examine lens`, `spark lantern` empty, then the winning block with `Lamplighter` — all word for word. Replayed leaving the lens cracked: losing ending. Under the Hood: `wick`'s sparking clause has `"routing": "capability"`.

## Chapter 25 — Bending the standard grammar
STATUS: PASS
- Before copying, in chapter 24's story `sit on chair` → `I don't understand that.` as quoted. Copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. `sit on chair`/`exit`, `light lamp` before and after the page, `light lamp with taper`, `quiet bell`, `fix spectacles` (carrying the Journeyman line, as 25.7 predicts), `repair lens`, and the win all matched. Under the Hood: one `grammarRemovals` entry (lighting) and four `grammarExtensions` (sparking, mending, hushing, entering).

## Chapter 26 — People who act
STATUS: PASS
- Copied `chapter-26`; gate-clean. `talk to hobb` → `Hobb doesn't respond.`; Hobb closes the press after `take key` and after `open press`; Tamsin in the Refectory (`examine tamsin`, sorts, `leaves to the west`), measures in the Cloister; wisp arrives on `light lamp` and `The wisp follows you.`; `Tamsin Vey enters from the east.` while waiting in the Cloister; two more waits then `north` gave the Bell Stair block (thumb line, `pushes the iron grille`, pry-bar line) word for word. Under the Hood: Tamsin's `traits` hold `passive` with `announces-movement` in `config`; goals are under `character.goals`.

## Chapter 27 — Asking and telling
STATUS: PASS
- Copied `chapter-27`; gate-clean. Hobb's rows (dimming, tamsin, lantern, gnusto via `tell`, kettle), bell refusal before it rings, `weather` override, `ask hobb for the kettle`, greeting first time / `goodbye` / on return (from a fresh game), `talk to tamsin` → `Tamsin Vey doesn't respond.`, grimoire `consult` and `look up`, then with the bell tolling `ask hobb about the bell` → `Hobb gives the hush page to Ansel.`, and `read hush page` — all matched (manner beats rotate, as stated).

## Chapter 28 — Conversations with a shape
STATUS: PASS
- Copied `chapter-28`; gate-clean. Thread beats, parting and resuming rows, the silent-turn beat, `say maybe`, `yes` with the conclusion, `no` with the conclusion, concluded thread → stock answer, the `price` row before / after / once bound, `agreed`, brass asked once / again / many, the silence initiative line after two waits, and Hobb's `last night` gated on `dimming` all matched word for word.

## Chapter 29 — Inner lives
STATUS: PASS
- Copied `chapter-29`; gate-clean. Hobb refuses `last night` to a stranger, takes the spectacles, `talk to hobb` → `Still here`, then tells; Tamsin's two `magic` answers either side of the bargain; Hobb rattled under the bell with the one-hand-off-one-ear beat — all matched.

## Chapter 30 — Principles
STATUS: PASS
- Copied `chapter-30`; gate-clean. `last night` withheld as the stock answer, the `spectacles` row, and the telling after the spectacles are given all matched. Under the Hood: `character.principles`, `character.temperaments` and the `confided` mark on `knows` are in the IR.

## Chapter 31 — More than one protagonist
STATUS: PASS
- Copied `chapter-31`; gate-clean. Four turns after the page (the fourth being `light lamp with taper`) hands the role to Hobb with the quoted passage; `look` (Lodge without its porter), `inventory` (`Your pockets are empty.` — one of the three stated variants), `north` blocked, `take kettle` → `You take it.`, `examine newspapers` hands back to Ansel, `look` in the Library with the wisp; Hobb then gives the hush page when asked about the bell. All matched.

## Chapter 32 — Machines
STATUS: PASS
- Copied `chapter-32`; gate-clean. On the roof: `turn crank` (leaves part), `push crank` (pawl), `turn crank` with the seat empty (bare report), lens seated, `spark lantern` → shutters refusal, `turn crank` (pawl + shutters fold back), shutter details in both states, then the win. All matched.

## Chapter 33 — Vehicles
STATUS: PASS
- Copied `chapter-33`; gate-clean. `enter hoist`/`look` (`In the book hoist you see Ansel.`), stair with the lens: grille phrase before, `lens-too-wide` phrase after; lens in the hoist before the grille is lifted → hoist found in the Library; after → in the Lantern Gallery; `put lens in lantern` block with `The book hoist pulls away.` All matched. The tram, balloon, cart and barge are examples from other stories and were not typed.

## Chapter 34 — Open water and open ground
STATUS: PASS
- Copied `chapter-34`; gate-clean. Water gate shut before the Lantern; Lantern lit (no win), `score` 45 of 50; Water Stair, `enter skiff`, `steer east`, `wait`, `make sail`, the two `look` views with bands, the beacon-near line, `The skiff arrives at the Beacon Isle.`, `spark beacon` with `Lamplighter` and the ending. All matched word for word.

## Chapter 35 — The opt-in systems
STATUS: PASS
- No companion folder (as stated). Typed `~/repos/cellar/cellar.story` and `~/repos/yard/yard.story` by hand; both gate-clean.
- Cellar: `attack rat` → `You swing at the rat but miss!` (a rolled variant the chapter names), `take poker` → `Taken.`, `attack rat with poker` → `You have slain the rat!`.
- Yard: `You could eat.` on the 2nd wait, `You are hungry now, and thinking about the loaf.` on the 4th, `You have starved to death.` and the ending on the 9th — as quoted.

## Chapter 36 — Sound, music and pictures
STATUS: PASS
- Copied `relighting.story` and `assets/` from `chapter-36`; gate-clean. `light lamp` ends with `The wick takes with a small dry sound, like a page turned.`; on the fourth turn after the page the Hobb hand-over prints with the wisp's `Somewhere in the Hall a small blue light goes flat and dim…` line; after the newspapers, the third wait as Ansel in the Library printed `Somewhere in the Hall, iron complains about iron.` All matched. (The gramophone and curtains are from another story.)

## Chapter 37 — The page the player sees
STATUS: PASS
- Copied `relighting.story`, `relighting.config.json` and `browser/` from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the quoted lines in the same shape (no mint line, as 37.9 predicts; sizes and timing differ as run values: `game.js 2.4mb`, `Done in 65ms`, `2435.5 KB`).
- `npx serve dist/web/relighting` was run as `npx --yes serve …` so that npx's install question would not wait for a keypress (no terminal to answer it); it printed `Accepting connections at http://localhost:3000`.
- Playwright: page opens on the title and prologue in `paper`; Settings → Theme lists Classic, Paper, Modern Dark. Played to the Library and read the spark page: panel `workings` / `spark: wakes a flame` appears. Chose Modern Dark, reloaded: theme still `modern-dark`, `localStorage` has `relighting-theme=modern-dark` beside `relighting-save-autosave`, page shows `[Session restored]`, status line `LIBRARY`, panel still holds its one line.
- Recordings and picture (whole winning walk in the page): `audio/catch.mp3` (206), `audio/toll.mp3` (206), `img/lantern-lit.png` (200, 960x600, shown in `#sharpee-media`), `audio/lapping.mp3` (206) all loaded; picture hidden after the beacon; panel held four lines in reading order; no console or page errors.

## Chapter 38 — Test trees
STATUS: PASS
- No recorder on the command line (stated); tree written as files by hand. `relighting.tests/manifest.json` and `mainline.json` with three skip cards; `sharpee test . --json --capture-output > records.txt` wrote one record to a line, and the `take lamp` record has `"actualOutput":"You take it.","turn":1` in the quoted shape.
- With the assertions of 38.5: `✓ opening-lodge` / `3 cards passing, 4 assertions passing` (exit 0). With `"contains": ["Taken."]`: the quoted failure block word for word (exit 1). With `onward01.json` and `thecake1.json`: `2 line(s)`, `✓ lodge · eat cake`, `6 cards passing, 9 assertions passing`, `5 commands (5 authored + 0 replayed), 1 restored at a fork`.
- Broke `cake-watched` (`You decide against it.`): `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."`; restored: passing again.
- Replaced the folder with `chapter-38/relighting.tests`: seven lines as listed, `182 cards passing, 275 assertions passing`, `181 commands (181 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` (81 listed), `Endings reached: 2 / 3`, `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13` — all as quoted.

## Chapter 39 — Claims
STATUS: PASS
- `sharpee claim winning1` printed the quoted "no line" list of seven lines. `sharpee claim thelodge --at 82` printed the ten quoted facts, twenty-three more, and `Lock one with: sharpee claim thelodge "<fact>" --at 82`.
- Locking `the iron grille is lifted` at 82 under the chapter's name printed the quoted report (needs rooms/things/verbs, three `Written:` lines, `Pinned … on card b7wicd1b.`); manifest, card `locks` key and `relighting.claims.chord` are as printed.
- Reports: `claims: 1 of 1 held`, then with the hand-written winning claim and its lock on `bjhmo3xt` `claims: 2 of 2 held` (turn 82 and turn 138), then with the cake claim `3 of 3 held` with `1 walk … 17 states, 20 commands, stopped: all-claims-settled` and the witness `take seed cake / north / eat seed cake`. With `needs rooms: the Lodge` alone: `UNPROVEN … max-depth-reached after 161 states` (`161 states, 239 commands`). Restored. `--verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`.
- Broke the story (removed `change it to lifted` from the `ward` trait): `✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"`, 35 cards failing, exit 1, run took 4m01s; claims `1 of 3 held, 2 unproven`, both locks `NOT held there` (`the iron grille is standing` / `the story has not ended`). Walk state counts (9728 / 14254) are clock-stopped values of the run. Line put back; `3 of 3 held` again.
- The stated faults (locking after the first `put`; `put` in `needs verbs`) were not tried, as instructed.

## Chapter 40 — Publishing
STATUS: PASS
- `sharpee ifid generate` printed one identifier (`4E851076-C8EB-4CB6-B7C6-E307FD35CC33`, a value of the run). `relighting.config.json` and the header's `ifid:` line both hold `C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`, as printed.
- Set `story-version: 1.0.0`, added `publish-source: yes`; gate-clean; tree: `182 cards passing`, `claims: 3 of 3 held (seed 42)`. Terminal banner prints the four lines with `Story v1.0.0` last, as 40.2 says.
- `sharpee publish relighting.story` printed the quoted report in the same wording (run values differ: `game.js 2.4mb`, `Done in 48ms`, `2435.5 KB`, `dist/relighting.zip (0.8 MB)`); IFID line as printed; no `game.js.map` in `dist/web/relighting`.
- `unzip dist/relighting.zip -d ../relighting-published`: exactly the fourteen files listed in 40.5.
- Served with `npx --yes serve .` from inside the folder; Playwright played from the lodge to the beacon: page opens with `The Relighting / Story v1.0.0 / description / By The Sharpee Project`; `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` and `img/lantern-lit.png` (960x600) all loaded; ended at `BEACON ISLE`, `Score: 50`, `You have risen to the rank of a Lamplighter.`; no console or page errors.

## Appendices A–G
Not executed (reference material). Heads skimmed only, not read line by line: each "Generated from" line reads `Sharpee 5.6.4 · Chord 4.0.3` (accepted, item 8). Appendix F's stated count, 885 aliases, agrees with chapter 22 and with `sharpee messages`.

## Ambiguities resolved (reading worked in every case)
- Ch. 1.7: "The folder can be anywhere you keep your own work" — used `~/repos/relighting`.
- Ch. 14/15/17 Under the Hood: `sharpee test .` was run inside the companion folders as the boxes say; it left no files behind there.
- Ch. 26.5: "Wait two turns more and then go north" — counted from the turn Tamsin enters the Cloister (wait, wait, north); that reading reproduced the Bell Stair block exactly. Waiting one turn longer shows the next line of her goal instead, as the chapter says it will.
- Ch. 27.3: the "first time" greeting is reproduced only when `talk to hobb` is the first thing said to him; after any answered question the next `talk to hobb` uses the "on return" row. Consistent with the text, but a reader who follows 27.5's order (ask everything first) never sees `"It's you," says Hobb.`
- Ch. 37.9 / 40.7: `npx serve` asks to install `serve` on first use; with no keyboard attached it was run as `npx --yes serve`.
- Ch. 39.1: the "no line" listing is printed without the command that produced it; `sharpee claim winning1` reproduced it.
- Ch. 40.3: `publish-source: yes` placed after `storage-prefix:` ("its place among them does not matter").

## Summary
- Chapters at PASS: 39 (1–18, 20–40)
- Chapters at PASS-WITH-ISSUES: 1 (19)
- Chapters at BLOCKED: 0
- DEVIATION entries: 0
- Reported issues not on the accepted list: 1 — chapter 19, `score` takes no turn although the book says each command is one turn and that turn fifty is the fiftieth command typed.
- By the brief's definition the run is not "clean" (one chapter is PASS-WITH-ISSUES); nothing blocked and nothing had to be changed to keep the story gate-clean.
