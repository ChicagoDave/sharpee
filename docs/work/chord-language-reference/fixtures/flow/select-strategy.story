story "Select Strategies" by "Sharpee Docs"
  id: chord-ref-select-strategy
  version: 0.0.1

create the Gravel Court
  a room

  A circle of raked gravel around a sundial.

create the wind chime
  aka chime
  scenery
  in the Gravel Court

  Five aluminium tubes on faded cord.

  on ringing it
    select cycling
      phrase chime-bright
        The chime rings a bright, clean note.
    or
      phrase chime-lower
        It answers itself a third lower.
    or
      phrase chime-clatter
        The tubes clatter together, all music gone.
    end select
  end on

create the long grass
  aka grass
  scenery
  in the Gravel Court

  The unmown fringe where the gravel gives out.

  on searching it
    select randomly
      phrase grass-beetle
        Something small and lacquered trundles away from your hand.
    or
      phrase grass-nothing
        Seed heads nod. Nothing else moves.
    or
      phrase grass-frog
        A frog regards you with profound disapproval, then leaves.
    end select
  end on

create the lawn edge
  aka edge, lawn
  scenery
  in the Gravel Court

  A strip of turf between gravel and border.

  on crossing it
    select stopping
      phrase edge-prints
        Your boots leave faint prints in the dew.
    or
      phrase edge-track
        A track is starting to show where you keep crossing.
    or
      phrase edge-line
        There is a bare line worn right across the turf now.
    end select
  end on

create the garden gnome
  aka gnome
  scenery
  in the Gravel Court

  A concrete gnome of uncertain vintage.

  on examining it
    select sticky
      phrase gnome-cheerful
        On close inspection, his expression is disarmingly cheerful.
    or
      phrase gnome-sinister
        On close inspection, his expression is frankly sinister.
    end select
  end on

create the potting drawer
  aka drawer
  scenery, openable
  in the Gravel Court

  A stiff drawer under the potting bench.

  on opening it
    select first-time
      phrase drawer-discovery
        The drawer shrieks open on a jumble of twine, labels, and one
        surprised spider.
    or
      phrase drawer-routine
        The drawer shrieks open. The spider has moved out.
    end select
  end on

create the player
  starts in the Gravel Court
