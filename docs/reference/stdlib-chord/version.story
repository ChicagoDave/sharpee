## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.version`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/version/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: version" by "Sharpee (generated)"
  id: stdlib-chord-version
  version: 1.0.0
  reference-only: true

## Action  : if.action.version
## Group   : meta
## Verbs   : version
## Emits   : if.event.version_displayed
## Summary : VERSION - Display version information about the game and engine. Example: VERSION

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   version-version-full              version_full                            {verbatim:storyTitle} v{verbatim:storyVersion} Sharpee Engine v{verbatim:engineVersion} Built: {buildDate}
##   version-version-no-date           version_no_date                         {verbatim:storyTitle} v{verbatim:storyVersion} Sharpee Engine v{verbatim:engineVersion}
##   version-version-compact           version_compact                         {verbatim:storyTitle} v{verbatim:storyVersion} (Sharpee v{verbatim:engineVersion})

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.version_displayed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
