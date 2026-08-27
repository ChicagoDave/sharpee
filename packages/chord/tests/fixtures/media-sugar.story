story
  title: Orchestra
  authors:
    Test
  id: media-sugar
  story-version: 0.0.1

  on every turn
    play sound chime
    play music overture looping
    show image map in background
    play ambient rain
    transition fade
  end on

create the Hall
  a room

  A marble concert hall.

create Alex
  a person
  playable
  starts in the Hall

  You.

define sound chime from "audio/chime.ogg"
define sound rain from "audio/rain.ogg"
define music overture from "audio/overture.ogg"
define image map from "img/map.png"

before the game starts
  change the player to Alex
end before
