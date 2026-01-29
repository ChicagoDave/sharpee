# ADR-122: Rich Media and Story Styling

## Status: PROPOSED

## Date: 2026-01-28

## Context

### The Problem

Sharpee currently produces text-only output. The language layer emits prose strings, and clients render them as plain text in a scrolling transcript. There is no mechanism for stories to include images, audio, or custom visual styling.

Other IF systems have addressed this:

- **Vorple** bridges Inform 7 to the browser, giving authors access to HTML/CSS/JS
- **Harmonia** (by the same author) embeds illustrations inline with prose, wrapping text around images like an illustrated book
- **Twine/Harlowe** stories freely mix HTML, images, and CSS

Sharpee's architecture is better positioned than Inform was — stories are already TypeScript running in a browser context. But there's no defined contract for how story code communicates rich media intent to the client.

### Goals

- Stories can include inline illustrations that wrap with prose text
- Stories can influence visual styling (colors, fonts, atmosphere)
- The engine and language layer remain unaware of media and rendering
- Clients degrade gracefully — CLI ignores images, browser shows them
- Players can override story styles (accessibility, preference)
- Story stylesheets cannot break the runner's UI

### Non-Goals

- Replacing CSS with a semantic abstraction layer
- Video or animation support (future consideration)
- Interactive UI widgets beyond text and images (future consideration)

## Decision

### Two Separate Concerns

Rich media has two independent parts:

1. **Inline illustrations** — images appearing in the text flow
2. **Story styling** — CSS themes and visual customization

These are decoupled. A story can have illustrations without custom styling, or custom styling without illustrations.

### Inline Illustrations

#### IllustrationTrait

Entities declare illustration metadata via a trait:

```typescript
room.addTrait(IllustrationTrait, {
  src: 'dam-exterior.jpg',
  alt: 'The massive concrete face of Flood Control Dam #3',
  position: 'right',      // 'right' | 'left' | 'center' | 'above' | 'below'
  width: '45%',
  trigger: 'on-enter',    // 'on-enter' | 'on-examine' | 'manual'
});
```

The trait is pure data. It does not know about CSS, HTML, or any client.

#### Event Flow

Illustrations flow through the event system, separate from text:

```
Entity has IllustrationTrait
        │
        ▼
Action report phase (e.g., looking at a room):
  - emits text event: prose description
  - emits illustration event: { entityId, src, alt, position, width }
        │
        ▼
Client receives both events in the same turn:
  - React/Browser: renders image floated alongside text
  - CLI: prints [Image: alt text] or skips
```

The language layer never sees the illustration. The engine passes the event through. The client composes text and image at render time.

#### Client Rendering

The client renders illustrations using standard CSS float/layout. The illustration event maps to an `<img>` with a CSS class:

```html
<div class="illustrated-passage">
  <img src="assets/dam-exterior.jpg"
       alt="The massive concrete face of Flood Control Dam #3"
       class="illustration float-right"
       style="width: 45%" />
  <p>You are standing on the top of the Flood Control Dam #3...</p>
</div>
```

CSS classes provided by the runner:

| Class | Behavior |
|-------|----------|
| `.illustration` | Base styles (margin, max-width constraints) |
| `.float-right` | `float: right` with text wrap |
| `.float-left` | `float: left` with text wrap |
| `.center` | Centered block, text above and below |
| `.full-width` | 100% width block |

Story stylesheets can override these classes to customize borders, shadows, shapes, etc.

#### Player Preference

The client provides a "Show illustrations" toggle. When off, illustration events are ignored. No upstream changes needed — the events still flow, the client just skips rendering them.

### Story Styling

#### Built-in Themes

The runner ships with built-in themes (classic-light, modern-dark, retro-terminal, paper). Stories can declare a preferred theme:

```typescript
config: {
  preferredTheme: 'modern-dark',
}
```

The runner applies it as a default. Players can override.

#### Custom Stylesheets

Stories that want full control bundle a CSS stylesheet. The build packages it into the `.sharpee` file (see ADR-121):

```
dungeo.sharpee
├── story.js          # Story code
├── assets/           # Images, audio
└── theme.css         # Story stylesheet (optional)
```

The runner loads `theme.css` into a scoped context within the webview. Scoping prevents the stylesheet from affecting runner UI (menus, title bar, dialogs):

- The transcript/game area has a known container (e.g., `#story-content`)
- Story styles are scoped to `#story-content` by the runner at load time
- Runner UI elements exist outside this container

Authors write standard CSS targeting the game content area. They can style `.illustration`, transcript text, the input area, and the status line. They cannot style the runner's file picker, menu bar, or other chrome.

#### Style Override Order

```
Runner defaults → Story preferredTheme → Story theme.css → Player preferences
```

Player preferences always win. Accessibility settings (high contrast, font size, dyslexia-friendly font) override everything.

### Asset Packaging

Story assets (images, stylesheets, fonts) are bundled in the `.sharpee` file. ADR-121 defines the story bundle format — this ADR extends it:

```
story.sharpee (zip archive)
├── story.js              # Story code module
├── meta.json             # Story metadata
├── theme.css             # Optional stylesheet
└── assets/
    ├── dam-exterior.jpg
    ├── control-panel.jpg
    └── fonts/
        └── custom-font.woff2
```

The `.sharpee` format becomes a zip rather than a bare JS file. The runner extracts assets to a temporary directory and serves them to the webview. Asset references in IllustrationTrait (`src: 'dam-exterior.jpg'`) resolve relative to the `assets/` directory.

### What Each Layer Knows

| Layer | Knows About |
|-------|-------------|
| Engine | Nothing — passes events through |
| Language layer | Nothing — produces text only |
| World model | IllustrationTrait exists as data |
| Action report | Entity has an IllustrationTrait, emits illustration event |
| Client | How to render illustrations, apply styles, honor player prefs |

## Consequences

### Positive

- **Clean separation** — no layer does more than it should
- **Graceful degradation** — CLI and minimal clients just skip illustration events
- **Full CSS power** — authors write real CSS, no abstraction tax
- **Player control** — illustrations toggle, style overrides, accessibility
- **Familiar to web authors** — standard CSS, standard image formats

### Negative

- **Asset size** — `.sharpee` files with images are larger (mitigated by image optimization tooling)
- **CSS scoping complexity** — must ensure story styles can't escape the game content area
- **Responsive design burden** — authors need to consider different window sizes for floated images

### Neutral

- Stories without illustrations or custom styles are unaffected — zero cost if unused
- Extends ADR-121's `.sharpee` format from single JS file to zip archive
- Built-in themes continue to work unchanged

## References

- ADR-121: Story Runner Architecture (story bundle format, asset packaging)
- Vorple — IF multimedia bridge for Inform 7
- Harmonia — inline illustrated IF by Linus Åkesson
- CSS `float` property — standard text wrapping behavior
