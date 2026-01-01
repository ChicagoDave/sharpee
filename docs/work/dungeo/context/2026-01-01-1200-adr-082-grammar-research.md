# Work Summary: ADR-082 Comprehensive Grammar Research

**Date:** 2026-01-01 12:00-13:14 CST
**Branch:** vocabulary-slots
**Focus:** Researching IF command patterns across multiple games and eras
**Status:** COMPLETED

## Research Scope

Per user direction, expanded ADR-082 beyond just Zork's Inside Mirror puzzle to cover ALL potential story grammar needs. Conducted comprehensive research across 25+ IF games spanning 40 years.

## Games Researched So Far

### Infocom Era (1980s)
1. **Zork I-III** - Basic IF verbs, turn/dial mechanics, object manipulation
2. **Enchanter/Spellbreaker** - Spell casting (`GNUSTO spell`, `LEARN spell`, `spell target`), writing on objects (`WRITE "text" ON cube`)
3. **Hitchhiker's Guide** - Complex preposition chains (`PUT x IN/ON/INTO y`), unusual verbs (PANIC, DON'T PANIC)
4. **Trinity** - Numerical dial settings (`SET slider TO 100`), spatial (`LOOK THROUGH x AT y`)
5. **Planetfall/Stationfall** - Time-based commands (`WAIT 30`), robot selection (`TYPE 3`)
6. **Suspended** - Multi-robot control (`ROBOT, command`), compound commands (`Both Sensa and Auda, move Fred`)
7. **A Mind Forever Voyaging** - Mode commands (`GO TO SIM MODE`), recording (`RECORD`, `RECORD OFF`)
8. **Leather Goddesses of Phobos** - Mode setting (`LEWD`, age input), mount/dismount
9. **Deadline/Witness** - NPC interrogation (`ASK x ABOUT y`, `SHOW x TO y`), timed waits (`WAIT FOR x`, `WAIT UNTIL 10:40`)
10. **Nord and Bert** - Wordplay as commands, literal idioms, spoonerism transformation
11. **Bureaucracy** - Form filling, address input

### Inform/TADS Era (1993-2005)
1. **Curses** (Graham Nelson) - Rod magic (`POINT rod AT target`), measured movement (`PACE 5 NORTH`), dice mechanics
2. **Anchorhead** (Michael Gentry) - Horror investigation, squeezing through spaces
3. **Savoir-Faire** (Emily Short) - Magical linking (`LINK x TO y`, `REVERSE LINK`, `UNLINK`, `REMEMBER x`)
4. **Photopia** (Adam Cadre) - Minimal puzzles, keyword navigation

### Modern Era (2006-present)
1. **Blue Lacuna** (Aaron Reed) - Keyword system, conversation verbs, physical actions during conversation
2. **Hadean Lands** (Andrew Plotkin) - Ritual commands (`PERFORM ritual`), meta-knowledge (`RECALL`, `FACTS`, `FORMULAS`), auto-execution
3. **Counterfeit Monkey** (Emily Short) - Letter manipulation (`WAVE p-remover AT spill`), device operation

## Command Pattern Categories Identified

### 1. Basic Actions with Objects
- `VERB object` - take, drop, examine, open, close
- `VERB object PREP object` - put X in Y, give X to Y, show X to Y

### 2. Directional/Spatial
- Cardinal/ordinal directions
- `GO TO location` - fast travel
- `PACE N DIRECTION` - measured movement
- `LOOK THROUGH x AT y` - scoped observation

### 3. Device/Dial Manipulation
- `SET dial TO value` - numerical settings
- `TURN dial TO setting` - named settings
- `PUSH color BUTTON` - vocabulary-constrained target
- `TYPE code` - text input

### 4. NPC Interaction
- `ASK person ABOUT topic`
- `TELL person ABOUT topic`
- `SHOW object TO person`
- `GIVE object TO person`
- `ROBOT, command` - delegated commands

### 5. Magic/Ritual Systems
- `CAST spell ON target` / `spell target` - spell casting
- `GNUSTO spell` - transcription
- `LEARN spell` - memorization
- `PERFORM ritual` - macro execution
- `LINK x TO y` / `UNLINK x` - sympathetic magic
- `WRITE "text" ON object` - inscription

### 6. Wordplay/Text Manipulation
- Literal idioms as commands
- Spoonerism transformation
- Letter removal (`WAVE letter-remover AT object`)

### 7. Meta/Knowledge Commands
- `RECALL category` - list known information
- `REMEMBER object` - establish association
- `CONSULT guide ON topic`

### 8. Time/Wait Commands
- `WAIT N` / `WAIT N MINUTES`
- `WAIT FOR person`
- `WAIT UNTIL time`

### 9. Multi-Entity/Delegation
- `ROBOT, command` - single robot
- `Both A and B, command` - multiple robots
- `TELL person TO action`

## Slot Type Categories Needed

Based on research, these slot types are essential:

1. **ENTITY** - existing (resolves to game entity)
2. **TEXT** - raw text capture (single word)
3. **TEXT_GREEDY** - raw text capture (until delimiter)
4. **NUMBER** - numerical value (integers, possibly decimals)
5. **ORDINAL** - ordinal words (first, second, third...)
6. **ADJECTIVE** - vocabulary-constrained adjective
7. **NOUN** - vocabulary-constrained noun
8. **DIRECTION** - cardinal/ordinal/special directions
9. **TOPIC** - conversation topic (fuzzy text match)
10. **TIME** - time expressions (10:40, 30 minutes)
11. **QUOTED_TEXT** - text in quotes for WRITE/SAY commands

## Deliverables

1. **Grammar Pattern Catalog** - `/docs/work/dungeo/context/2026-01-01-1314-grammar-pattern-catalog.md`
   - 16 pattern categories
   - 14 slot types identified
   - Complete with examples from real games

2. **Updated ADR-082** - `/docs/architecture/adrs/adr-082-vocabulary-constrained-slots.md`
   - Renamed to "Extended Grammar Slot Types"
   - Comprehensive slot type system covering:
     - Vocabulary-constrained: ADJECTIVE, NOUN, DIRECTION
     - Typed values: NUMBER, ORDINAL, TIME
     - Text variants: QUOTED_TEXT, TOPIC
   - Implementation phases defined
   - Usage examples from multiple games

## Sources Consulted

- [MIT Zork Transcript](https://web.mit.edu/marleigh/www/portfolio/Files/zork/transcript.html)
- [Walkthrough King](https://www.walkthroughking.com)
- [Key & Compass (plover.net)](https://plover.net/~davidw/sol/)
- [IF Archive Solutions](https://ifarchive.org/indexes/if-archive/infocom/hints/solutions/)
- [David Wheeler's Anchorhead Transcript](https://dwheeler.com/anchorhead/)
- [Counterfeit Monkey GitHub](https://github.com/i7/counterfeit-monkey)
- [Hadean Lands Walkthrough](https://www.plover.net/~davidw/sol/h/hadea14.html)
