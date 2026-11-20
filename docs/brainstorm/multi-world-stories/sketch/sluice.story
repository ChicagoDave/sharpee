## SKETCH, not Chord. "The Sluice", the multi-world spike story: the
## controller. This is the only file that names more than one world. It does
## not compile; lines marked NEW are invented syntax, and overview.md beside
## this folder records the rulings they come from.
##
## The river is rising at the sluice works. Tobin needs the wheel setting
## from Mara, the old keeper, who cannot recall it. Asking her takes the
## player into her memory of the flood year, as Mara the girl, while the
## river keeps rising in the world left behind.

story
  title: The Sluice
  id: sluice
  begins in the Works                                  ## NEW

define world the Works from "works.story"              ## NEW

define world the Flood Year from "flood-year.story"    ## NEW

## A fact that crosses worlds is defined here once. The Works writes it and
## so owns it; the Flood Year only asks about it. Neither world declares
## that: ownership is derived.
define fact the river                                  ## NEW at this level
  states: rising, on the stairs, at the sill

## An actor who exists in more than one world. Her memory, her role in each
## world and her redactions are hers, so they sit here.
keep Mara                                              ## NEW
  knows the-wheel-setting, witnessed, certain
  an NPC in the Works                                  ## NEW
    the-wheel-setting is redacted                      ## NEW
  the player in the Flood Year                         ## NEW

## A world asks for something by emitting an event, which prints nothing.
## The controller answers with travel. There is no "return": going back is
## the same statement pointed the other way. Play goes with an actor who is
## the player at either end of the trip.
when the Works emits wheel-asked                       ## NEW
  phrase into-the-flood-year
  Mara transports to the Yard in the Flood Year        ## NEW
end when

when the Flood Year emits mark-seen                    ## NEW
  unredact the-wheel-setting for Mara                  ## NEW
  phrase back-to-the-works
  Mara transports to the Wheel House in the Works      ## NEW
end when

## `before the game starts` would go here as setup for every world. This
## story has none.

define phrases en-US
  into-the-flood-year:
    She looks at the wheel a long time, and then she is not looking at it.
  back-to-the-works:
    "Three turns past the notch," Mara says, as if she had never forgotten.
