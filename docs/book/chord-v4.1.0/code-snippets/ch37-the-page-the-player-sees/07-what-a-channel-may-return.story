define channel card
  mode replace
  return record from harbour-card-dealt
    suit suit
    rank rank
    notes list of note
  end record
end channel
