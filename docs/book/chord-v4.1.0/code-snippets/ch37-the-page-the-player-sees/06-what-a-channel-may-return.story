define channel tide
  mode replace
  return level from harbour-tide-turned
end channel

define channel bell
  mode event
  gated by sound
  return phrase bell-caption from harbour-bell-rung
end channel
