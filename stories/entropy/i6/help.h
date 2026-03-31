! Help file
!
! First help by location
! Then help by score (things accomplished)
! 
! If the player isn't in the 'right' location, then remind them that they need to go there.
!
!
[ EntropyHelpSub;
	if (Hatch == false && geyser has visited) {
		if (location == geyser)
			print "Main Systems says, ~The ground looks soft and if the memory systems are
						sqwuaking for a good reason, then we're standing above a human construction.~^";
		else
			print "Main Systems says, ~Memory Systems is reporting that something might be found
						near the geyser you visited earlier.~^";
		return;
	}
	if (Hatch == true) {
		if (chamber hasnt visited) {
			if (location == geyser)
				print "Main Systems says, ~Maybe we should investigate what's below the hatch.~^";
			else
				print "Main Systems says, ~Maybe we should investigate what's below the hatch near the geyser.~^";
			return;
		} else {
			if (rations in chamber) {
				if (location == chamber)
					print "Main Systems says, ~I believe the rations would be very helpful.~^";
				else
					print "Main Systems says, ~I believe the rations in the dark chamber would be very helpful.~^";
				return;
			}
		}
	}
	if (spaceport hasnt visited && Hatch == true) {
		print "Main Systems says, ~Memory Systems report access to the space port off to the west. We
					might find more information there.~^";
		return;
	}
	print "Main Systems says, ~Maybe you should look around some more.~^";
];