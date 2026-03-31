Constant LO_FREQ = 6;
Constant HI_FREQ = 8;
Constant ORBIT_BEGIN = 1;
Constant ORBIT_END = 10;
Constant SLOW_TIME = 4;
Constant FAST_TIME = 5;
Constant RECHARGING = 3;
Constant REPAIRING = 1;
!Constant READY = 2;
Constant SKIN_OFF = 4;
Constant SKIN_ON = 5;
Constant PRESSURIZED = 0;
Constant DEPRESSURIZED = 1;
Constant IS_OPEN = 0;
Constant IS_CLOSED = 1;

Global Health=0;
Global Partial=17;
Global PartialDec=3;
Global Complete=52;
Global CompleteDec=8;
Global Resources=0; ! 0 if you need them, 1 if you don't...
Global HumanSmile=1;
Global SystemsSpeed=3; ! Can be set from 0 to 10 - 0 is no waiting, 10 is very slow...
Global SystemSpeedOverride=false;
Global Hatch=false;
Global last_detached=0;
Global last_attached=0;

Array auto_help_array  ->   0 0;

Array memory_array	   ->   0 0 0 0 0 0 0 0 0 0;

Array short_name_array ->	0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
							0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
							0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
							0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0;

Attribute inflight;
Attribute seen;
Attribute attachable;
!Attribute attached_a;
!Attribute attached_b;
!Attribute unconscious;

!Property status;
!Property statusdesc;
!Property counter;
!Property outer_door;
!Property inner_door;
!Property attached_to_a;
!Property attached_to_b;
!Property compasslook;
