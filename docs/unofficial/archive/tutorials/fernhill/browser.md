# 7 · The browser: sound, images, and channels

*(Grammar reference: "Extension surface" (media sugar, declared assets,
`define channel`, `client has`, dynamic channels). Previous:
[endings & text](./endings.md) · Back to the [overview](./index.md))*

Everything so far runs identically in the terminal and the browser. This
chapter is the layer that only the browser can hear and see — and the
discipline that keeps text players whole.

## The degradation rule

Every media beat in Fernhill follows one shape: **gate the cue on
`client has <capability>`, and let the prose you already wrote be the
text-mode experience.** A text client reads every gate as false, so
nothing breaks, nothing leaks, and nobody gets a lesser story — they get
the story.

## Declared assets

Media files are declared data, typo-checked at compile like everything
else. The files themselves live in your project's `assets/` directory
(`assets/audio/…`, `assets/images/…`) and ship with the browser build:

```chord
define sound night-wind from "audio/night-wind.wav"
define sound boiler-thump from "audio/boiler-thump.wav"
define music dawn-theme from "audio/dawn-theme.wav"
define image folly-photograph from "images/folly-photograph.png"
```

## Sound, music, image cues

Cues are one-line statements wherever a rule already narrates:

```chord
  state running, terminal
    on enter
      …
      phrase pipes-warm
      play sound boiler-thump when client has sound
    end on
```

```chord
create the framed photograph
  after examining it
    show image folly-photograph when client has images
  end after
```

```chord
  after entering it while the player has the deed
    play music dawn-theme when client has music
    win fernhill-saved
  end after
```

The thump rides the boiler's ignition line; the photograph appears when
examined (its prose *is* the text degradation); the dawn theme plays under
the winning ending.

## Ambient beds

An ambient is a looping bed of sound. The Grounds' crossing reactions
(chapter 1) start and stop the night wind:

```chord
  after entering it
    phrase cold-returns
    play ambient night-wind when client has sound
  end after

  after leaving it
    stop ambient when client has sound
  end after
```

A bare `play ambient` plays into the default bed, `main`; a bare
`stop ambient` stops only that bed. Stories that want layers name them —
`play ambient surf in shore`, `stop ambient in shore` — after declaring
each named bed with a one-liner beside the assets:

```chord
define ambient shore
```

Named beds and custom image layers (`define layer floorplan`, then
`show image map in floorplan`) must be declared before use — a typo is a
load error with a suggestion, never a silently empty second bed.

## Dynamic channels: throw anything at the client

A **dynamic channel** is a story-declared data feed to the client — not
media-specific; any JSON your story projects. Fernhill's case clock feeds
one. The chime daemon emits a payloaded event, and a channel declaration
projects it:

```chord
  on every turn while it is ticking and one chance in 8
    phrase clock-chime
    emit estate-clock with hour "evening" when evening
    emit estate-clock with hour "past midnight" when midnight
  end on
```

```chord
define channel clock
  mode replace
  gated by sidebar
  return "The clock: (hour)" from estate-clock
end channel
```

`emit <event> with <field> <value>` carries data; the channel `return`s
finished text — its `(hour)` slot projects the field from the turn's last
matching event (ADR-253). Text clients never see any of it (the `sidebar`
gate reads false); the chime prose is their whole experience — exactly the
degradation rule again.

**In the browser, every dynamic channel is visible by default.** A channel
you don't place renders as a labelled panel (a small box titled with the
channel id) — so a pure-Chord story gets working client output with zero
TypeScript. To place it *yourself*, give your story a custom
`browser/index.html` (ADR-253 D3) with an element named for the channel;
the returned text lands there:

```html
<!-- in browser/index.html, in the status bar -->
<span id="clock"></span>
```

The channel's returned "The clock: &lt;hour&gt;" renders into `#clock` by the
channel-id ↔ element-name convention (if no such element exists it falls to
the generic panel). Fernhill ships exactly this — **no `browser-entry.ts`, no
story TypeScript at all.**

## Building and shipping

```bash
sharpee build fernhill.story
```

Browser is the default client (ADR-252) — no flag, no `package.json`. This
produces `dist/web/<id>/` — a self-contained page carrying your `.story`
source (compiled in the browser at boot), the engine, your assets, your
custom `browser/index.html`, and the client. Serve it from any static host:

```bash
npx serve dist/web/fernhill
```

The build also writes `dist/<story>.ir.json`, the compiled story IR, for
IDE and tooling use.

## Testing both worlds

Fernhill's transcript suite runs the whole game text-only — including a
`media-degrade` transcript asserting every media beat's prose shows and
no asset name or event key ever leaks into text. The browser side is
proven by driving the built page in a real browser and observing the
cues: the photograph mounting, the wind bed and the thump actually
fetching, the clock panel updating. Test the degradation in transcripts;
trust the browser only after you've seen it.

---

That's the estate, top to bottom: a world model, a tool chain, three
people, a machine, a night that runs out, and a deed in a steel box —
all of it facts. Back to the [overview](./index.md).
