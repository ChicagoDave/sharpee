# Sharpee Website Redesign

**Status: COMPLETE** — Brainstorm concluded 2026-04-11. Ready for implementation.

A complete visual and structural overhaul of the Sharpee project website.

## Brainstorm Progress

- [x] **Problem & Vision** — What's wrong with the current site? What should it feel like instead?
- [x] **Core Concepts** — Key pages, content areas, audiences
- [x] **User Activities** — What do visitors actually need to do?
- [x] **Structural Patterns** — Site map, navigation, information hierarchy
- [x] **Competitive Landscape** — TADS-style layout (right sidebar, content left)
- [x] **Tech Stack** — Plain HTML + CSS, GitHub Pages
- [x] **Architecture** — Static files, no build step, CNAME for sharpee.net
- [x] **Role Assessments** — N/A (site is simple enough)
- [x] **Thought Exercises** — N/A (site is simple enough)
- [x] **Revenue & Business Model** — N/A
- [x] **MVP Scope** — All six pages; it's small enough to ship in one pass
- [x] **Open Questions** — Captured below

## Problem & Vision

**What's wrong now:**
- Overlapping concerns — the site tries to be too many things
- Too many clicks to get anywhere
- Too technical — reads like a dev tool, not a creative tool
- Design patterns content is moving to IFWiki, so a big chunk is leaving anyway

**What it should be instead:**
- Author-facing, not developer-facing
- Friendly, inviting, "hey this is easy" tone
- Stripped down — no bloat, no comparisons to other tools
- Let Sharpee stand on its own

## Core Concepts

**Audience:** Writers who want to create interactive fiction

**What the site IS:**
- What is Sharpee
- How to get started writing a story
- Where to find the community / get help
- News / updates
- Tutorials (Cloak of Darkness, Family Zoo)

**What the site is NOT:**
- Not a developer docs site (API docs live in the repo)
- Not a game hosting platform (stories live on IF Archive or elsewhere)
- Not a comparison/marketing site (no "vs Inform/Twine" positioning)
- Not a design patterns reference (moving to IFWiki)

**Feel:** Almost a manifesto + onboarding. Could be close to a single-page site with minimal drill-downs.

## Site Structure

**Layout:** TADS-style — content area on the left, persistent right sidebar with navigation links. One click to anything, everything visible at a glance. No dropdowns, no hamburger menus, no nested navigation.

**Pages:**
1. **Home** — What is Sharpee, why it's easy, friendly and inviting
2. **Getting Started** — Install, first steps (CLI now; VS Code extension or Lantern later)
3. **Cloak of Darkness** — Tutorial
4. **Family Zoo** — Tutorial
5. **Community** — Where to find help, IFWiki, IF Archive
6. **News** — Updates, releases (keeps current format)

**Right sidebar links:**
- Home
- Getting Started
- Cloak of Darkness
- Family Zoo
- Community
- News

## User Activities

Visitors come to the site to:
- Understand what Sharpee is (30 seconds or less)
- Decide if they want to try it
- Get set up and writing as fast as possible
- Find tutorials when they get stuck
- Check what's new

Everything else lives elsewhere (repo, IFWiki, IF Archive).

## Tech Stack & Architecture

- **Plain HTML + CSS** — no framework, no build step, no node_modules
- **GitHub Pages** — free hosting, SSL, deploys on push
- **sharpee.net** — CNAME redirect to GitHub Pages
- Six static HTML files with a shared layout (copy sidebar across pages, or use a minimal templating approach if maintenance becomes annoying)
- Drop the entire Astro/React/MDX build pipeline

## Visual Design

**Palette:** DevArch-style dark base with champagne gold accent.

- Dark mode (default):
  - Background: `#0d1117`
  - Raised/sidebar: `#161b22`
  - Border: `#30363d`
  - Text: `#e6edf3`
  - Muted text: `#8b949e`
  - Accent (champagne gold): `#f2d280`
  - Heading tint: `#f0e6d3`

- Light mode (toggle):
  - TBD — mirror the structure with inverted tones

- **Light/dark toggle** somewhere on the page (sidebar or top corner)

**Typography:** System sans-serif stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`)

**Aesthetic:** Clean, spacious, modern. No ASCII art, no dev-culture imagery. Friendly and inviting for writers.

**Inline SVG illustrations** for key concepts:
- **Traits as Lego** — colored blocks snapping together to form objects (chest = container + openable + lockable, lantern = light source + switchable)
- **Turn cycle** — command goes in, world changes, prose comes out (simple flow diagram)
- **Separation of logic and text** — two lanes: what the world does vs. what the story says

SVGs are inline in the HTML — no image files, scale to any size, automatically match the color scheme in both light and dark modes.

## Overview Copy

**Direction:** Lego metaphor for composition. David to write final copy.

**Key concepts to convey:**
- Everything is built from small, snap-together pieces (traits) — like Lego
- A treasure chest = container + openable + lockable. A lantern = light source + switchable.
- Command handling and prose output are separate — world changes first, then text is generated
- You focus on the world and the words. Sharpee handles the plumbing.

## Footer

- Copyright 2025 David Cornelson. MIT License.
- Links: GitHub repo, API Reference (repo folder), Author Guides (repo folder)

## Open Questions

- **VS Code extension** — Worth investing in as the primary authoring entry point? Would make "this is easy" more credible for authors who already use VS Code.
- **Lantern** — Very alpha. Not ready to promise on the site yet. When it matures, it may replace the getting-started flow entirely.
- **Light mode colors** — Need to define the light mode palette to pair with the dark default.
- **News format** — Keep the current JSON-driven news data, or simplify to hand-edited HTML?
