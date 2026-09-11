# 5.0.1 — Chord Writer ships its own toolchain

**Status**: PUBLISHED
**Published**: 2026-08-14
**Chord language**: 3.0.0
**Traces to**: ADR-279 · ADR-284

## What shipped

A patch release whose real content is on the desktop side: Chord Writer became installable
without a Node toolchain. The DMG now carries a per-architecture vendor toolchain, so the
download page could drop the `npm install` step an author previously had to perform before the
app would do anything.

## Details

- Per-architecture build and packaging, with two download tiles on the site rather than one
  universal binary.
- The app runs on any Apple silicon Mac, not only the machine it was built on.
- Self-hosted analytics on sharpee.net, provisioned by the deploy with a salt that persists
  itself rather than rotating on every deploy.
- The app icon arrived: parchment at large sizes, a single note at small ones, masked into the
  macOS tile shape.
