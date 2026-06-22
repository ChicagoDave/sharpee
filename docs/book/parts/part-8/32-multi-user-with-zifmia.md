# Multi-User with Zifmia

The browser build serves one player. The last chapter of the book takes the same
story — unchanged — and serves it to a room full of people at once. That's **Zifmia**,
Sharpee's multi-user product. Understanding it is mostly understanding what "multi-user"
does and doesn't mean, and then seeing how the channel architecture you already know
makes it almost anticlimactic to build.

## Multi-user, not multi-player

The distinction is deliberate and worth stating plainly. Zifmia's model is **watching
IF together**: several people join a *room*, and the room runs **one** playthrough with
**one** player character that the participants share. They see the same prose, take
turns driving, and chat alongside the game. It is a shared *session*, not a shared
*world* with separate avatars.

That second thing — multiple independent characters in one simulated world — is
**multi-player IF (MPIF)**, a genuinely different and much harder design. Sharpee
reserves the term "multi-player" for that possible future and does not claim it here.
Everywhere in Zifmia, the word is **multi-user**: many people, one story, one PC.

## Why channels make it nearly free

Here's the payoff of Volume VII. A Sharpee story already speaks entirely in
**channels** — the engine emits a per-turn packet of named signals and knows nothing
about who's watching. Zifmia exploits that directly:

- One engine runs the room's story in-process, emitting the same channel packets it
  would for a single browser.
- Each participant runs the **same** consumer-side `Renderer` from Volume VII. The
  *only* difference from the single-player client is the transport: packets arrive
  over a WebSocket instead of an in-process call.
- Zifmia adds a few **server-sourced channels** alongside the story's own — `chat`,
  `presence` (who's in the room), and `command_echo` (what was just typed, and by
  whom). They ride the identical mechanism; the client renders them with channel
  renderers like any other.

Your story code does not change at all to run under Zifmia. It already produced
channels; Zifmia just gives those channels more than one audience.

## Rooms, joining, and turns

A **room** is the unit players interact with. Someone creates a room for a story
(behind a CAPTCHA, to keep bots out) and gets a **join code**; others enter that code
to join. Because the room shares one PC, Zifmia coordinates who acts with a per-room
**turn lease** — one participant drives at a time — so two people don't fire
overlapping commands into the same world.

Joining mid-game works because the server is **stateless** in a specific sense: a
room's entire state lives in its save blob, and a late arrival is brought up to speed
by replaying the room's transcript. Saves are **named and owned by the room** — they
persist as long as the room does; there's no per-participant save and no per-save
deletion to manage. The room is the lifecycle.

## Building and deploying

Zifmia ships as a single, self-contained **Docker image** — that's its install story.
The server is built from the monorepo with devkit:

```bash
sharpee build --zifmia      # → tools/zifmia/dist/  (same CLI as Chapter 31;
                            #  inside the repo it's ./sharpee build --zifmia)
```

and deployed with Docker Compose:

```bash
docker compose up -d        # pulls and runs the published image
```

(To build the image from source instead, use the build compose file:
`docker compose -f docker-compose.build.yml up -d --build`.)

The container runs the Sharpee engine in-process, serves HTTP and the WebSocket on one
port, and persists rooms and saves to a database volume. Operators drop their built
`.sharpee` stories into a mounted `stories/` directory — the same bundles from the last
chapter — and front the container with their own reverse proxy (nginx, Caddy) for TLS.
The full operator runbook — CAPTCHA setup, backups, upgrades — lives in the `docs/zifmia/`
guides; the point for an author is that *your story is just a `.sharpee` file the server
loads*, exactly as it was for the single-player build.

## The whole arc, in one sentence

Step back and the shape of the book is visible in this one feature. A player types a
verb; the parser turns it into a command; an action validates, mutates the world
through behaviors, and reports; the engine renders prose through the formatter chain
and emits a turn packet of channels; and a renderer — in a terminal, a browser, or now
a room of people over WebSockets — paints it. Every layer you learned is in that path,
and none of it had to change to go from one player to many.

## Key takeaway

Zifmia is Sharpee's **multi-user** product: many people share one room running one
story with one player character — *watching IF together*, deliberately **not**
multi-player/MPIF. It's nearly free because a story already speaks in **channels**; one
in-process engine emits packets, each participant runs the Volume VII `Renderer` over a
WebSocket, and Zifmia adds server-sourced `chat` / `presence` / `command_echo` channels
through the same mechanism — your story code is unchanged. Rooms have join codes and a
per-room **turn lease**; the server is stateless (room state is the save blob, late
joiners replay the transcript), and named saves are **owned by the room**. It deploys
as a single Docker image fed your `.sharpee` bundles. From a typed verb to a shared
room, every layer of Sharpee you've met carries the same signal across the same
universal surface — which is where the book has been heading all along.
