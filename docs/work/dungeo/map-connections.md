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

Cave (zero or even number of mirror rubs)
D:Hades

Cave (odd number of mirror rubs)
D:Atlantis Room

Hades
(blocked by evil spirits)

Narrow Crawlway
SW:Mirror Room
N:Grail Room

Mirror Room
N:Narrow Crawlway
W:Winding Passage
E:Cave

Atlantis Room
SE: Reservoir North
U:Cave

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
E:Rainbow Room

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
U:Volcano Shaft (in balloon)

Volcano Shaft-1
D:Volcano Bottom (in balloon)
U:Volcano Shaft-2
W:Volcano Ledge-1

Volcano Shaft-2
D:Volcano Shaft-1 (in balloon)
U:Volcano Shaft-3

Volcano Shaft-3
D:Volcano Shaft-2 (in balloon)
W:Volcano Ledge-2

Volcano Ledge-1
S:Library
E:Volcano Shaft-1 (in balloon)

Library
N:Volcano Ledge-1

Volcano Ledge-2
E:Volcano Shaft-3 (in balloon)
S:Dusty Room

Dusty Room
N:Volcano Ledge-2
