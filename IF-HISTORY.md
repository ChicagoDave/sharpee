# A Brief History of Interactive Fiction

## The Beginning: ADVENT (1975-1977)

Interactive fiction began with Will Crowther, a programmer at Bolt, Beranek and Newman (BBN) and an avid caver. In 1975-76, Crowther wrote a program called ADVENT (short for Adventure, constrained by the six-character filename limit on PDP-10 systems) that combined a rough simulation of Kentucky's Mammoth Cave with fantasy elements inspired by Dungeons & Dragons. Players typed simple two-word commands like GET LAMP and GO NORTH to explore the cave, collect treasures, and solve puzzles.

In 1977, Don Woods, a graduate student at Stanford, discovered Crowther's program on the ARPAnet, obtained permission to expand it, and transformed it into the version most people know as Colossal Cave Adventure. Woods added a scoring system, more puzzles, and a richer fantasy layer. The game spread rapidly across the ARPAnet and became one of the first widely shared pieces of entertainment software.

## DUNGEO: Zork on the DEC Minicomputer (1977-1979)

At MIT, a group of students and staff at the Dynamic Modeling Group -- Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling -- played Adventure and decided they could do better. Working on the lab's PDP-10, they began writing a game in MDL (a Lisp dialect developed at MIT) that they initially called Zork (campus slang for an unfinished program). The official name was Dungeon, though it was later renamed back to Zork after a trademark complaint from the publishers of the tabletop game Dungeons & Dragons.

The result was a parser far more sophisticated than Adventure's two-word input. Zork understood complex sentences, multiple objects, and prepositions. The game world was larger, the puzzles more intricate, and the writing sharper. It featured a persistent thief who could steal your treasures, a troll guarding a bridge, an underground river you could navigate by boat, and a coal mine with an active volcano.

The Fortran port of this game, known as DUNGEO (again, a six-character filename constraint), is the specific version that the Sharpee project's "dungeo" story faithfully reimplements.

## The Hardware: Green-Bar Paper and DEC Minicomputers

These games were not played on personal computers -- those barely existed yet. Players interacted through terminals connected to DEC (Digital Equipment Corporation) minicomputers, primarily the PDP-10 and later the VAX-11/780. Despite their size (filling cabinets and requiring dedicated machine rooms), DEC systems were technically minicomputers, not mainframes. Mainframes were the even larger IBM System/360-class machines used by banks and governments. DEC machines were the "smaller" alternative that universities and research labs could actually afford.

The terminal experience was often a DECwriter or similar printing terminal -- essentially a keyboard attached to a dot-matrix printer that used continuous-feed green-bar paper (green and white striped fanfold paper). There was no screen. Every room description, every parser response, every puzzle clue was printed on paper. You could literally scroll back through your game session by looking at the pile of paper accumulating behind the terminal.

Some players were lucky enough to use early video terminals like the VT52 or VT100, which displayed text on a CRT screen. But many of the earliest Adventure and Zork sessions were played on paper, the text rolling out line by line, the player typing commands on a keyboard that clattered with each keystroke. When you were done, you had a physical record of your entire adventure sitting in a stack of green-bar printout.

The connection itself was often a dial-up line -- an acoustic coupler modem cradling a telephone handset, running at 110 or 300 baud. At 300 baud, text arrived at roughly 30 characters per second, slow enough that you could watch each letter appear. Room descriptions unrolled at reading speed. There was a particular tension in waiting for the system's response after typing a command, watching the printhead or cursor sit idle for a moment before the next line of text began.

## From Minicomputer to Microcomputer

When personal computers arrived in the late 1970s, the Zork authors founded Infocom in 1979 to bring interactive fiction to the mass market. They split the massive mainframe Zork into three smaller games (Zork I, II, and III) that could fit in the limited memory of microcomputers, and developed the Z-machine -- a portable virtual machine that let them write a game once and run it on dozens of different platforms, from the Apple II to the TRS-80 to the IBM PC.

Infocom went on to produce over 30 titles across multiple genres -- mystery (Deadline), science fiction (Starcross, Planetfall), horror (The Lurking Horror), and comedy (Hitchhiker's Guide to the Galaxy, co-written with Douglas Adams). The company's games were known for their writing quality, creative packaging (the "feelies" -- physical props included in the box), and parser sophistication that remained unmatched for years.

## The Legacy

Interactive fiction never disappeared. After Infocom's decline in the late 1980s, a vibrant community of hobbyist authors kept the form alive, creating tools like Inform, TADS, and Twine. Annual competitions (IFComp, since 1995) continue to produce remarkable work. Academic interest has grown, with IF recognized as a legitimate form of literary and computational art.

The Sharpee project carries this tradition forward -- reimplementing the original DUNGEO not as nostalgia, but as a proving ground for a modern interactive fiction engine built in TypeScript. The puzzles, the map, the thief, the troll, the maze -- they are all here, running in a browser instead of on a PDP-10, rendered on a screen instead of printed on green-bar paper.

The commands are the same. The magic is the same.
