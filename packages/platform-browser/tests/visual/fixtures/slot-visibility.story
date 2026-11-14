## Slot-visibility fixture — what a story shows is visible on the stock page.
##
## Three things a player can do, each putting content somewhere the default
## browser page keeps hidden until it is used:
##
##  - `read the ledger` feeds an appending channel that has no element of
##    its own, so its values land in the sidebar panel;
##  - `take the chart` shows an image in the media slot, and `drop the
##    chart` hides it again;
##  - `take the bell` plays a sound, which the platform also reports on its
##    own audibility channel — a channel this story never declares.
##
## `slot-visibility.spec.ts` builds this file with the real browser build
## and no page of its own, then looks at it in Chromium. Not story content.

story
  title: Slot Visibility
  authors:
    Sharpee Tests
  id: slot-visibility
  story-version: 1.0.0

define sound chime from "audio/chime.wav"
define image chart-picture from "img/chart.png"

define channel findings
  mode append
  return "(finding)" from finding-noted
end channel

create the Chart Room
  a room
  aka room

  A narrow room under the eaves, with a table that takes up most of it.

create Alex
  a person
  playable
  starts in the Chart Room

  You.

before the game starts
  change the player to Alex
end before

create the ledger
  aka book
  a thing, readable
  in the Chart Room

  A ledger of soundings, ruled in red.

  on the player reading
    phrase ledger-text
      Soundings, in a clerk's careful hand.
    emit finding-noted with finding "soundings taken"
  end on

create the chart
  aka map
  a thing
  in the Chart Room

  A sea chart, rolled and tied.

  after the player taking
    show image chart-picture
  end after

  after the player dropping
    hide image
  end after

create the bell
  aka handbell
  a thing
  in the Chart Room

  A brass handbell with a worn grip.

  after the player taking
    play sound chime
  end after
