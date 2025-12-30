MAZE-1
W:Troll Room
E:Maze-2
S:Maze-3

MAZE-2
N:Maze-1
W:Maze-4
E:Dead End-1

MAZE-3
S:Maze-1
N:Maze-2
E:Maze-4

MAZE-4
N:Maze-2
W:Maze-3
U:Maze-15

MAZE-5
NE:Dead End-3
SE:Dead End-4

MAZE-6
D:Maze-15
E:Maze-7
U:Maze-11

MAZE-7
W:Maze-6

MAZE-8
S:Dead End-3
W:Maze-9

MAZE-9
S:Dead End-3
W:Maze-8
NE:Cyclops Room

MAZE-10
N:Dead End-5
U:Maze-11
W:Maze-15

MAZE-11
N:Maze-6
E:Maze-12
W:Maze-10
S:Maze-14
D:Maze-13

MAZE-12
NW:Maze-14
D:Maze-13
NE:Grating Room (AKA Small Room)

MAZE-13
E:Maze-11
U:Maze-12
W:Maze-14

MAZE-14
E:Maze-11
S:Maze-13
W:Maze-12
D:Maze-10

MAZE-15
N:Maze-4
SW:Maze-6
E:Dead End-3

Dead End-1
S:Maze-2

Dead End-2
S:Dead End-1

Dead End-3
W:Maze-15
NE:Dead End-2
E:Maze-5
S:Maze-9
U:Maze-8

Dead End-4
N:Maze-5

Grating Room
NE:Maze-12
U:Clearing

Cyclops Room
NE:Maze-9
U:Treasure Room
N:Strange Passage

Round Room (Fixed):
NW:Deep Canyon
NE:North/South Passage
E:Grail Room
SE:Winding Passage
S:Engravings Cave
N:Engravings Cave
SW:Maze-1
W:East/West Passage

North/South Passage
N:Chasm
NE:Loud Room
S:Round Room

Loud Room
W:North/South Passage
U:Damp Cave
E:Ancient Chasm

Ancient Chasm
S:Loud Room
W:Dead End-1 (temple area)
N:Dead End-2 (temple area)
E:Small Cave (temple area)

Dead End-1
E:Ancient Chasm

Dead End-2
SW:Ancient Chasm

Small Cave
NW:Ancient Chasm
S:Rocky Shore

Grail Room
W:Round Room
U:Temple
E:Narrow Crawlway

Temple
W:Grail Room
"treasure":Teeasure Room
E:Altar

Altar
W:Temple
"pray":Clearing

Winding Passage
E:Mirror Room
N:Narrow Crawlway

Tiny Cave
D:Hades

Small Cave
D:Atlantis Room

Hades
(blocked by evil spirits)

Narrow Crawlway
SW:Mirror Room
N:Grail Room

Mirror Room (Grail Room/Tiny Cave->Hades state)
N:Narrow Crawlway
W:Winding Passage
E:Tiny Cave

Mirror Room (Coal Mine state)
N:Steep Crawlway
E:Small Cave
W:Cold Passage

Atlantis Room
SE: Reservoir North
U:Small Cave

# to clarify

Tiny Cave is up from Hades
Small Cave is up from Atlantis Room

Gallery
W:Bank Entrance
S:Studio
N:West Chasm

Bank Entrance
NW:West Teller
NE:East Teller
S:Gallery

West Teller
N:Viewing Room
W:Vault Room

East Teller
N:Viewing Room
E:Vault Room

Viewing Room
S: Bank Entrance

Safety Depository
S:Chairman's Office
"walk through north wall":Vault of Zork

Chairman's Office
N:Safety Depository

Vault of Zork
(this is a walkthrough since it's very confusing. I'll need to do a full play through with wrong choices to get all of the info)

walk through north wall
walk through south wall
walk through north wall
take bills
walk through north wall
drop all except torch
w
w
take all
walk through north wall
s
s - back to Gallery (you escaped!)

**\*** more **\***

West of House
N:North of House
S:South of House
W:Forest-1

Forest-1
N:Forest-1
E:Forest-Low-Branches
S:Forest-2
W:Forest-1

Forest-2
N:South of House
W:Forest-1
S:Forest-3
E:Clearing

Forest-3
W:Forest-2
N:Forest-3
S:Forest-3
E:Canyon View

Canyon View
W:Forest-3
S:Rocky LEdge

Rocky Ledge
U:Canyon View
D:Canyon Bottom

Canyon Bottom
U:Rocky Ledge
N:End of Rainbow

End of Rainbow
SE:Canyon Bottom
W:Rainbow Room

Rainbow Room
E:End of Rainbow
W:Aragain Falls

Aragain Falls
E:Rainbow Room (wave stick)

North of House
N:Forest-Low-Branches
W:West of House
E:Behind House

South of House
W:West of House
E:Behind House
S:Forest-2

Behind House
W:Kitchen
E:Clearing
N:North of House

Clearing
SW:Behind House
D:Grating Room
W:Forest-Low-Branches

Kitchen
OUT:Behind House
E:Behind House
W:Living Room
U:Attic

Living Room
E:Kitchen
D:Cellar
W:Strange Passage

Treasure Room
U:Cyclops Room
E:Square Room

Square Room
W:Treasure Room
S:Side Room
D:Puzzle Room

Side Room
N:Square Room
E:Puzzle Room

Puzzle Room
W:Side Room
U:Square Room

Cellar
E:Troll Room
S:West Chasm
U:Living Room

West Chasm
W:Cellar
N:North/South Crawlway
S:Gallery

Studio
NW:Gallery
N:North/South Crawlway
U:Kitchen (limit one carried item)

North/South Crawlway
E:Troll Room
N:West Chasm
S:Studio

Troll Room
S:Maze-1
E:North/South Crawlway
N:East/West Passage
W:Cellar

East/West Passage
W:Troll Room
N:Deep Ravine
D:Deep Ravine
E:Round Room

Deep Ravine
S:East/West Passage
W:Rocky Crawl
E:Chasm

Chasm
S:Deep Ravine
E:North/South Passage

Rocky Crawl
W:Deep Ravine
E:Dome Room
NW:Egyptian Room

Dome Room
E:Rocky Crawl
D:Torch Room

Torch Room
D:North/South Passage
W:Tiny Room

Tiny Room
E:Torch Room
N:Dreary Room

Dreary Room
S:Tiny Room

Egyptian Room
E:Rocky Crawl
S:Volcano View
U:Glacier Room

Volcano View
E:Egyptian Room

Glacier Room
N:Stream View
W:Ruby Room

Ruby Room
S:Glacier Room
W:Lava Room

Lava Room
W:Ruby Room
S:Volcano Bottom

Volcano Bottom
N:Lava Room
(wait):Volcano Shaft (in balloon, receptacle open)

Near Small Ledge
(with):Volcano Bottom (in balloon, receptacle closed)
(wait):Near Viewing Ledge (in balloon, receptacle open)
W:Narrow Ledge

Near Viewing Ledge
(wait):Near Small Ledge (in balloon, receptacle closed)
(wait):Near Wide Ledge (in balloon, receptacle open)

Near Wide Ledge
(wait):Near Viewing Ledge (in balloon, receptacle closed)
W:Wide Ledge

Narrow Ledge
S:Library
E:Near Small Ledge (in balloon)

Library
N:Narrow Ledge

Wide Ledge
E:Near Wide Ledge (in balloon)
S:Dusty Room

Dusty Room
N:Wide Ledge

\***\* 2025-12-30 \*\***

# Reservoir and FLood Control Damn #3

Stream View
N:Glacier Room
E:Reservoir South

Reservoir South
W:Stream View
N:Reservoir
U:Deep Canyon

Reservoir
S:Reservoir South
N:Reservoir North

Reservoir North
S:Reservoir
N:Atlantis Room

Atlantis Room
SE:Reservoir North
U:Small Cave

Small Cave (this might redundant)
D:Atlantis Room
N:Mirror Room

Deep Canyon
NW:Reservoir South
S:Round Room
E:Flood Control Dam #3

Flood Control Dam #3
S:Deep Canyon
D:Damn Base
N:Dam Lobby

Dam Lobby
S:Flood Control Dam #3
N:Maintenance Room
E:Maintenance Room

Maintenance Room
S:Dam Lobby
W:Dam Lobby

Dam Base
N:Flood Control Dam #3

Cold Passage
E:Mirror Room (Coal Mine state)
W:Slide Room
N:Steep Crawlway

Steep Crawlway
S:Mirror Room (Coal Mine state)
SW:Cold Passage

Slide Room
D:Slide-1
E:Cold Passage
N:Mine Entrance

Slide-1
U:Slide Room
D:Slide-2

Slide-2
U:Slide-1
D:Slide-3

Slide-3
U:Slide-2
D:Cellar
E:Slide Ledge

Slide Ledge
U:Slide-2
S:Sooty Room

Sooty Room
N:Slide Ledge

Mine Entrance
S:Slide Room
NW:Squeaky Room
NE:Shaft Room

Squeaky Room
S:Mine Entrance
W:Small Room

Shaft Room
W:Mine Entrance
N:Wooden Tunnel

Wooden Tunnel
S:Shaft Room
W:Smelly Room
NE:Mine Maze-1

Smelly Room
E:Wooden Tunnel
D:Gas Room

Gas Room
U:Smelly Room

Mine Maze-1
E:Wooden Tunnel
N:Mine Maze-4
SW:Mine Maze-2

Mine Maze-2
S:Mine Maze-1
W:Mine Maze-5
U:Mine Maze-3

Mine Maze-3
W:Mine Maze-2
NE:Mine Maze-5
E:Mine Maze-5

Mine Maze-4
S:Mine Maze-1
NE:Mine Maze-7
U:Mine Maze-5

Mine Maze-5
W:Mine Maze-2
NE:Mine Maze-3
S:Mine Maze-3
D:Mine Maze-7
N:Mine Maze-6
E:Mine Maze-4

Mine Maze-6
W:Mine Maze-5
S:Mine Maze-7
D:Ladder Top
E:Mine Maze-1

Mine Maze-7
U:Mine Maze-5
SE:Mine Maze-4
NW:Mine Maze-6

Ladder Top
U:Mine Maze-6
D:Ladder Bottom

Ladder Bottom
U:Ladder Top
S:Timber Room
NE:Coal Mine Dead End

Coal Mine Dead End
S:Ladder Bottom

Timber Room
N:Ladder Bottom
SW:Bottom of Shaft

Bottom of Shaft
E:Machine Room
NE:Timber Room

Machine Room
NW:Bottom of Shaft

**_ Well Room _**

Engravings Cave
N:Round Room
SE:Riddle Room

Riddle Room
D:Engravings Cave
E:Pearl Room

Pearl Room
W:Riddle Room
E:Well Bottom

Well Bottom
(in bucket, pour water from bottle):Top of Well

Top of Well
(in bucket, fill bottle):Well Bottom
E:Tea Room

Tea Room
W:Top of Well
NW:Low Room
E:Pool Room

Low Room
SE:Tea Room
E:Machine Room

Machine Room
W:Low Rom
S:Dingy Closet

Dingy Closet
N:Machine Room

Pool Room
W:Tea Room

**_ Frigid River _**

Rocky Shore
NW:Small Cave
(board boat):Frigid River-1

Frigid River-1
D:Frigid River-2

Frigid River-2
D:Frigid River-3

Frigid River-3
D:Frigid River-4
W:Rocky Shore
E:White Cliffs Beach-1

Frigid River-4
D:Frigid River-5
W:Sandy Beach
E:White Cliffs Beach-2

White Cliffs Beach-1
W:Frigid River-3
S:White Cliffs Beach-2

White Cliffs Beach-2
W:Frigid River-4
N:White Cliffs Beach-1

Frigid River-5
D:Over falls and you die

Sandy Beach
E:Frigid River-4
S:Shore

Shore
N:Sandy Beach
S:Aragain Falls
