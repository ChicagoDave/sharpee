# Em-dash review — Chapter 06: Containers & Supporters

### 1. Portable-vs-fixed table, Backpack row (line 58) — table
OLD:
| Backpack | Yes | No `SceneryTrait` — the player can take it |

NEW:
| Backpack | Yes | No `SceneryTrait`, so the player can take it |

### 2. Portable-vs-fixed table, Feed dispenser row (line 59) — table
OLD:
| Feed dispenser | No | Has `SceneryTrait` — fixed to its post |

NEW:
| Feed dispenser | No | Has `SceneryTrait`, so it is fixed to its post |

### 3. "The mistake everyone makes once" capacity callout (line 120) — prose
OLD:
> **The mistake everyone makes once:** leaving `capacity` off. A container or
> supporter with no `capacity` has *no limit* — it will swallow the entire zoo.
> If you want a bound, set `maxItems` explicitly.

NEW:
> **The mistake everyone makes once:** leaving `capacity` off. A container or
> supporter with no `capacity` has *no limit*; it will swallow the entire zoo.
> If you want a bound, set `maxItems` explicitly.

### 4. "Try it" transcript annotation (line 145) — transcript
OLD:
```
> inventory              Backpack counts as one item — its contents ride along
```

NEW:
```
> inventory              Backpack counts as one item; its contents ride along
```

### 5. "Try it" transcript annotation (line 151) — transcript
OLD:
```
> take dispenser         Can't — it's scenery
```

NEW:
```
> take dispenser         Can't: it's scenery
```
