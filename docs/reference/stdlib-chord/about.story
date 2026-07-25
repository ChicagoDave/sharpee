## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.about`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/about/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: about" by "Sharpee (generated)"
  id: stdlib-chord-about
  version: 1.0.0
  reference-only: true

## Action  : if.action.about
## Group   : meta
## Verbs   : about, info, credits
## Emits   : if.event.about_displayed
## Summary : ABOUT/INFO - Display information about the game, including credits and version. Example: ABOUT

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   about-success                     success                                 {verbatim:title} Version {verbatim:version} By {verbatim:author} {verbatim:description}
##   about-about-header                about_header                            About {verbatim:title}
##   about-game-info                   game_info                               {verbatim:title} Version {verbatim:version} By {verbatim:author} Released: {releaseDate}
##   about-game-info-simple            game_info_simple                        {verbatim:title} by {verbatim:author}
##   about-description                 description                             Description: {verbatim:description}
##   about-copyright                   copyright                               Copyright {copyright}
##   about-license                     license                                 License: {license}
##   about-website                     website                                 Website: {website}
##   about-contact                     contact                                 Contact: {contact}
##   about-credits-header              credits_header                          Credits:
##   about-credits-list                credits_list                            {credits}
##   about-special-thanks              special_thanks                          Special Thanks: {specialThanks}
##   about-dedication                  dedication                              Dedication: {dedication}
##   about-acknowledgments             acknowledgments                         Acknowledgments: {acknowledgments}
##   about-engine-info                 engine_info                             Powered by {engine} version {verbatim:engineVersion}
##   about-technical-info              technical_info                          Technical Information: Engine: {engine} v{verbatim:engineVersion} Platform: Interactive Fiction
##   about-play-stats                  play_stats                              Current Session: Time played: {playTime} Moves made: {sessionMoves}
##   about-session-info                session_info                            You've been playing for {playTime} and made {sessionMoves} moves.
##   about-about-footer                about_footer                            Thank you for playing!
##   about-enjoy-game                  enjoy_game                              We hope you enjoy playing {verbatim:title}!
##   about-about-compact               about_compact                           {verbatim:title} v{version} by {verbatim:author}

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.about_displayed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
