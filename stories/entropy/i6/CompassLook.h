!
! CompassLook.h
!
Replace CompassDirection;

Class  CompassDirection
  with article "the", number 0,
  	   before [;	Examine,Look:	if (location provides compasslook) return location.compasslook(self); ],
  has  scenery;
