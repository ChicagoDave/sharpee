## Sharpee Grammar Reference

| Pattern                                              | Action              | Notes                      |
| ---------------------------------------------------- | ------------------- | -------------------------- |
| **Movement**                                         |                     |                            |
| `go :direction`                                      | going               | With direction constraint  |
| `north`, `south`, `east`, `west`                     | going               | Cardinal directions        |
| `northeast`, `northwest`, `southeast`, `southwest`   | going               | Diagonal directions        |
| `up`, `down`, `in`, `out`                            | going               | Vertical/portal directions |
| `n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`, `u`, `d` | going               | Abbreviations              |
| **Looking & Examining**                              |                     |                            |
| `look`                                               | looking             | Intransitive               |
| `l`                                                  | looking             | Abbreviation               |
| `look [around]`                                      | looking             | Optional word              |
| `examine :target`                                    | examining           | Visible scope              |
| `x :target`                                          | examining           | Abbreviation               |
| `look at :target`                                    | examining           |                            |
| `look [carefully] at :target`                        | examining_carefully | Optional modifier          |
| **Searching**                                        |                     |                            |
| `search [carefully]`                                 | searching           | Optional modifier          |
| `search :target`                                     | searching           | Visible scope              |
| `look in/inside :target`                             | searching           | Alternation                |
| `look through :target`                               | searching           |                            |
| `rummage in/through :target`                         | searching           |                            |
| **Taking & Dropping**                                |                     |                            |
| `take :item`                                         | taking              | Portable visible items     |
| `get :item`                                          | taking              | Synonym                    |
| `pick up :item`                                      | taking              | Two-word verb              |
| `drop :item`                                         | dropping            | Carried scope              |
| `put down :item`                                     | dropping            | Two-word verb              |
| **Container & Supporter Operations**                 |                     |                            |
| `put :item in/into/inside :container`                | inserting           | Multiple prepositions      |
| `insert :item in/into :container`                    | inserting           |                            |
| `put :item on/onto :supporter`                       | putting             | Supporter scope            |
| `hang :item on :hook`                                | putting             | Higher priority            |
| **Opening & Closing**                                |                     |                            |
| `open :door`                                         | opening             | Openable constraint        |
| `close :door`                                        | closing             | Openable constraint        |
| `open :container with :tool`                         | opening_with        | With instrument            |
| **Switching On/Off**                                 |                     |                            |
| `turn on :device`                                    | switching_on        | Switchable constraint      |
| `switch on :device`                                  | switching_on        |                            |
| `turn off :device`                                   | switching_off       |                            |
| `switch off :device`                                 | switching_off       |                            |
| **Locking & Unlocking**                              |                     |                            |
| `unlock :door with :key`                             | unlocking           | With instrument            |
| **Pushing & Pulling**                                |                     |                            |
| `push :target`                                       | pushing             | Touchable scope            |
| `shove :target`                                      | pushing             | Synonym                    |
| `move :target`                                       | pushing             |                            |
| `pull :target`                                       | pulling             |                            |
| `drag :target`                                       | pulling             | Synonym                    |
| **Giving & Showing**                                 |                     |                            |
| `give :item to :recipient`                           | giving              | Animate constraint         |
| `give :recipient :item`                              | giving              | Inverted order             |
| `offer :item to :recipient`                          | giving              | Synonym                    |
| `show :item to :recipient`                           | showing             |                            |
| `show :recipient :item`                              | showing             | Inverted order             |
| **Throwing**                                         |                     |                            |
| `throw :item at :target`                             | throwing            |                            |
| `throw :item to :recipient`                          | throwing            |                            |
| **Combat & Tools**                                   |                     |                            |
| `attack :target with :weapon`                        | attacking           | With instrument            |
| `cut :object with :tool`                             | cutting             |                            |
| `dig :location with :tool`                           | digging             |                            |
| `take :item from :container with :tool`              | taking_with         | Triple slot                |
| **Communication**                                    |                     |                            |
| `say :message`                                       | saying              |                            |
| `say :message to :recipient`                         | saying_to           |                            |
| `shout :message`                                     | shouting            |                            |
| `whisper :message to :recipient`                     | whispering          |                            |
| `tell :recipient about :topic`                       | telling             |                            |
| `ask :recipient about :topic`                        | asking              |                            |
| `write :message`                                     | writing             |                            |
| `write :message on :surface`                         | writing_on          |                            |
| **Sensory Actions**                                  |                     |                            |
| `touch :target`                                      | touching            | Touchable scope            |
| `feel :target`                                       | touching            |                            |
| `rub :target`                                        | touching            |                            |
| `pat :target`                                        | touching            |                            |
| `stroke :target`                                     | touching            |                            |
| `poke :target`                                       | touching            |                            |
| `prod :target`                                       | touching            |                            |
| **Reading**                                          |                     |                            |
| `read :target`                                       | reading             | Visible scope              |
| `peruse :target`                                     | reading             |                            |
| `study :target`                                      | reading             |                            |
| **Inventory & Waiting**                              |                     |                            |
| `inventory`                                          | inventory           |                            |
| `inv`, `i`                                           | inventory           | Abbreviations              |
| `wait`                                               | waiting             |                            |
| `z`                                                  | waiting             | Abbreviation               |
| **Meta Commands**                                    |                     |                            |
| `save`                                               | saving              |                            |
| `restore`                                            | restoring           |                            |
| `restart`                                            | restarting          |                            |
| `quit`, `q`                                          | quitting            |                            |
| `score`                                              | score               |                            |
| `version`                                            | version             |                            |
| `help`                                               | help                |                            |
| **Debug/Author Commands**                            |                     |                            |
| `trace`                                              | author.trace        |                            |
| `trace on/off`                                       | author.trace        |                            |
| `trace parser on/off`                                | author.trace        |                            |
| `trace validation on/off`                            | author.trace        |                            |
| `trace system on/off`                                | author.trace        |                            |
| `trace all on/off`                                   | author.trace        |                            |

### Pattern Syntax Legend

| Syntax            | Meaning                                      |
| ----------------- | -------------------------------------------- |
| `:slot`           | Entity slot (noun phrase)                    |
| `:slot...`        | Greedy text slot (captures rest of input)    |
| `[optional]`      | Optional word                                |
| `word1/word2`     | Alternation (either word)                    |
| `visible()`       | Must be visible to player                    |
| `carried()`       | Must be in player inventory                  |
| `touchable()`     | Must be reachable                            |
| `matching({...})` | Must have specific traits                    |

### Multi-Object Commands (ADR-080)

These actions support multi-object commands:

| Pattern                          | Action    | Notes                          |
| -------------------------------- | --------- | ------------------------------ |
| `take all`                       | taking    | Takes all portable items       |
| `take all but :item`             | taking    | Excludes specified item        |
| `take :item and :item`           | taking    | Multiple items                 |
| `drop all`                       | dropping  | Drops all carried items        |
| `drop all but :item`             | dropping  | Excludes specified item        |
| `put all in :container`          | putting   | Puts all carried in container  |
| `put all on :supporter`          | putting   | Puts all carried on surface    |
| `remove all from :container`     | removing  | Removes all from container     |

### Instrument Slots (ADR-080)

Instruments mark a slot as a tool/weapon for the action. The resolved entity is available separately from direct/indirect objects.

```typescript
// Define pattern with instrument
grammar.define('attack :target with :weapon')
  .instrument('weapon')  // marks :weapon as the instrument
  .mapsTo('if.action.attacking')
  .build();

// In action code, access via:
const weapon = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
```

Actions with instrument support:
- **attacking** - weapon for combat
- **locking/unlocking** - key for locks

### Text Slots (ADR-080)

For commands that take raw text instead of entity references:

| Method           | Syntax      | Behavior                              |
| ---------------- | ----------- | ------------------------------------- |
| `.text(slot)`    | `:slot`     | Captures single token as text         |
| (greedy)         | `:slot...`  | Captures all remaining tokens as text |

```typescript
// Single text tokens
grammar.define('incant :word1 :word2')
  .text('word1')
  .text('word2')
  .mapsTo('if.action.incanting')
  .build();

// Greedy text capture
grammar.define('say :message...')
  .mapsTo('if.action.saying')
  .build();

// Access in action:
const message = context.command.parsed.textSlots?.get('message');
```

### Command Chaining

Commands can be chained with periods:
- `take sword. go north.` → executes both commands in sequence
