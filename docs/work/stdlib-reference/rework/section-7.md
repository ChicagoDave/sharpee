## 7. Devices

Things that turn on and off — and the lights among them, which are how a
story pushes back the dark rooms of §3.1.

### 7.1 switching_on and switching_off

**switch on** (`if.action.switching_on`) — verbs `turn on X`, `switch on
X`, `flip on X`, the bare transitives `activate X`, `start X`, `power on
X` (ADR-230 D4), and the reversed `turn X on` — only `turn` gets the
reversed form; `switch X on` does not parse. All forms check the
`switchable` trait in validation (bare `turn X` with no on/off is the
separate per-entity turning verb, §2.7). Turning on a device that is
also a `light-source` lights it — and if that banishes darkness in the
player's room, the action follows with an automatic LOOK, so the newly
visible room describes itself before the switch-on message lands.

**switch off** (`if.action.switching_off`) — verbs `turn off X`, `switch
off X`, `flip off X`, `deactivate X`, `stop X`, `power off X`, and the
reversed `turn X off`. Turning the sole light off says `light_off` ("…
plunging the area into darkness") and leaves the player in §3.1's
dark-room world.

The author writes:

<!-- fixture: devices/switching-on-off.story -->
```story
create the Darkroom
  a room
  dark

  Developing trays line the counter, and finished prints hang from a
  wire overhead.

create the safelight
  aka lamp
  switchable, light-source
  in the Darkroom

  A red-globed safelight with a spring clamp.

  phrase detail while it is lit:
    Its red glow pools over the developing trays.

create the enlarger
  switchable
  scenery
  in the Darkroom

  A photographic enlarger on a steel column.

  on switching_on it
    refuse enlarger-unplugged
  end on

  phrase enlarger-unplugged:
    The enlarger's plug dangles loose behind the counter.

create the ventilation fan
  aka fan
  switchable, starts on
  scenery
  in the Darkroom

  A boxy ventilation fan set into the wall.

create the player
  starts in the Darkroom
  carries the safelight
```

The player sees:

<!-- transcript: devices/switching-on-off.story -->
```transcript
> look
It's pitch dark, and you can't see a thing.

> turn the safelight on
Darkroom
Developing trays line the counter, and finished prints hang from a wire overhead.

The safelight switches on, banishing the darkness.

> examine the safelight
A red-globed safelight with a spring clamp. Its red glow pools over the developing trays.

> switch on the enlarger
The enlarger's plug dangles loose behind the counter.

> stop the fan
The ventilation fan powers down with a soft whir.

> turn off the safelight
You switch off the safelight, plunging the area into darkness.
```

Four seams in one scene: illumination triggers the automatic LOOK (room
text first, then `illuminates_darkness`), the lit safelight's examine
picks up its `detail while it is lit` sentence, the enlarger's `on
switching_on it` guard refuses with its own phrase, and the `starts on`
fan goes down to the bare `stop` synonym.

| | switch on (`if.action.switching_on.*`) | switch off (`if.action.switching_off.*`) |
|---|---|---|
| Refusals | `not_switchable` · `already_on` · `no_power` (declared power requirement) | `not_switchable` · `already_off` |
| Success | `switched_on` · `light_on` · `illuminates_darkness` (dark room, after the automatic LOOK) · `with_sound` (trait's on sound) · `device_humming` | `switched_off` · `light_off` (sole light out) · `light_off_still_lit` (other lit lights share the room) · `silence_falls` (a running hum stops) · `device_stops` |
| Events | `if.event.switched_on` / `switch_on_blocked` | `if.event.switched_off` / `switch_off_blocked` |

The success key is chosen by what the device is — light, sound, flavor,
or plain — and event payloads carry light, sound, power, and timer facts
for story reactions. Interceptors: `on switching_on it` / `on
switching_off it` on the device — the enlarger above.

In Chord, `on`/`off` and `lit` work as state predicates (`while the
flashlight is on`, `while the lantern is lit`) — and declaring your own
on/off state pair on a switchable gets a fix-it telling you to compose
the trait instead. One subtlety: `is lit` reads the stored flag
strictly, so a light that has never been switched counts as not-lit in
Chord conditions even where the platform's own default would call it lit
— switch it once and the two agree.

### 7.2 Device traits

**switchable** (`switchable` — adjective). The on/off state — Chord
composes it off by default; `starts on` seeds it running (ADR-231;
chord-language.md §2.11), the §7.1 fan — plus a power model
(`requiresPower`, `hasPower`, `powerConsumption` — the `no_power`
refusal), on/off/running sounds (fed into the sound message keys and
event payloads), swap-in `onDescription`/`offDescription` text, and
`detailWhenOn` — the appended examine sentence, exactly what Chord's
`phrase detail while it is on:` lowers to (the zoo's radio and
flashlight both use it). Dormant today: the auto-off timer
(`autoOffTime` is honored at switch-on but nothing ticks the countdown)
and the per-trait message overrides (`onMessage`/`alreadyOnMessage`/…) —
flagged.

**light-source** (`light-source` — adjective). Makes a switchable shed
light: `isLit` (managed by the switching actions), `brightness`,
`litDescription`/`unlitDescription`, and `detailWhenLit` — Chord's
`phrase detail while it is lit:`, the safelight's examine line in §7.1.
The fuel model (`fuelRemaining` — empty refuses to light; `maxFuel`,
consumption rate) is dormant on the consumption side: nothing burns fuel
per turn today, so a lantern only runs out if story logic decrements it.
The zoo flashlight — `light-source, switchable` — is the shipped
example.

**button** (trait — TypeScript-only, and mostly decorative). Descriptive
fields (color, size, shape, label, `latching`); its one live effect is
in *pushing* (§2.6): a pushable button that is also switchable toggles,
and the BUTTON trait upgrades the message to `button_clicks`. Worth
knowing: pushing's toggle flips the switch state but — unlike the
switching actions — does not light or extinguish an attached light
source, so wire light-buttons through `after pushing it` story logic
(flagged as an inconsistency).
