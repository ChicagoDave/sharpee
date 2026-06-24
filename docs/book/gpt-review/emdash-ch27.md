# Em-dash review — Chapter 27: Media and Audio

Source: `docs/book/parts/part-7/27-media-and-audio.md`

### 1. "A story drives these channels" paragraph (line 25) — prose
OLD:
A story drives these channels by firing **`media.*` events** — `media.image.show`,
`media.sound.play`, `media.music.play`, `media.ambient.play` (and their `.hide` /
`.stop` partners). The standard channels listen for those events on the turn's event
stream and project them; the browser renderers do the rest. That's the through-line of
this chapter: *you emit a `media.*` event, and the channel surface turns it into
something the player sees or hears.* Because these are ordinary channels, an image's

NEW:
A story drives these channels by firing **`media.*` events**: `media.image.show`,
`media.sound.play`, `media.music.play`, `media.ambient.play` (and their `.hide` /
`.stop` partners). The standard channels listen for those events on the turn's event
stream and project them; the browser renderers do the rest. That's the through-line of
this chapter: *you emit a `media.*` event, and the channel surface turns it into
something the player sees or hears.* Because these are ordinary channels, an image's

### 2. "On if.event.actor_moved the handler" paragraph (line 150) — prose
OLD:
On `if.event.actor_moved` the handler looks up the destination's atmosphere, emits
the `media.*` events, and stops the loop for rooms that have none — building up the
`effects` array it returns:

NEW:
On `if.event.actor_moved` the handler looks up the destination's atmosphere, emits
the `media.*` events, and stops the loop for rooms that have none, building up the
`effects` array it returns:
