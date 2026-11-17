define music waltz from "audio/waltz.mp3"
define sound rain from "audio/rain.mp3"
define sound hiss from "audio/hiss.mp3"
define image portrait from "img/portrait.png"
define image fog from "img/fog.png"

define ambient weather
define layer window

create the gramophone
  a thing, scenery, switchable
  in the Parlour

  A gramophone with a horn like a brass lily.

  after the player switching_on
    play music waltz looping
    play ambient hiss
    phrase needle-down when not client has music
  end after

  after the player switching_off
    stop music
    stop ambient
  end after
