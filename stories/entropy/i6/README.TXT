------------------------------THE IMPORTANT STUFF------------------------------
WinFrotz 2.32 R5.3   (see Revision.txt for update info from previous versions)
by Rich Lawrence
(Windows code (c) 1999 Rich Lawrence, Frotz (c) 1995-1999 Stefan Jokisch)

WinFrotz is a Win95/NT native version of Frotz, the Z-machine emulator from
Stefan Jokisch. Stefan's code was in turn based on Mark Howell's Zip but long
ago ceased to resemble that code. My work was in creating the code particular
to the Windows version(s). The goal in creating WinFrotz was to make a
Z-Machine emulator that was as close to perfect in it's support of the 
standard possible,and still take advantage of it's 32 bit Windows environment.
It has been tested on Win95, 95 R2 (OEM), Win98, NT 3.51, and NT 4.0.

WinFrotz will play interactive fiction files, including the Infocom 
adventures, that can contain text, sounds, and graphics. Other interactive
fiction files can be obtained for free from ftp.gmd.de in the directory
/if-archive/games. (Note: Do NOT download these with a web browser, they may
not work. Use an FTP client)

I can be reached at the following email: rich@cstone.net. It is likely that 
for some time WinFrotz will be in continual development; as I don't have the
steady time required to get everything done. Feel free to e-mail me with 
questions, comments or bug reports. I maintain a WinFrotz page at 
http://www.cris.com/~Twist/WinFrotz/

WinFrotz is free, as my contribution to the interactive fiction world. Have 
fun. 

If you happen to have an old Infocom boxed game or novel lying around you 
don't want, contact me and I'll take it off your hands, more than enough
compensation for my time. I would really appreciate this; WinFrotz has taken
hundreds of hours of development over time, and while I don't want money, I
would like to know it's appreciate enough for people to cough up an Infocom
tidbit or two.

FEATURES:
    - support for V1 to V8 games
    - complies with V1.0 of the Z-Machine standard
    - emulates CGA, EGA or MCGA for V6 (graphical) games
    - various color and font display modes
    - timed input ('Border Zone')
    - command line editing and history, alias system
    - small save files (Zip 2.0 format is still understood)
    - switches for colour setting
    - switch for setting the Tandy bit
    - low- and high-pitched beep sounds
    - sound effects via Windows wave device ('Lurking Horror' and 'Sherlock')
    - cheat/debugging functions
    - multiple UNDO (via hot key, even for old V1 to V4 games)
    - input line recording and playback (via hot key/menu)
    - underlined, reverse and boldface text displayed as font or special color
    - fast performance despite Windows GDI
    - high resolution font support including anti-aliased on hicolor displays
    - Text scrollback buffer to review recent output
    - copy and paste support (copy is through through scrollback buffer)

SPECIAL KEYS: (Frotz DOS & OS/2 keys supported)
    Alt-A             - alias menu (also Options/Alias)
    Alt-D             - debugging menu (Options/Debugging)
    Alt-N             - new game (restart) (File/Restart)
    Alt-P             - turn on input line playback (File/Open/Recording)
    Alt-R             - input line recording on/off (File/Save/Recording)
    Alt-S             - set the random seed
    Alt-U             - multiple UNDO (even for old V1 to V4 games)
    Alt-X             - exit game (quit)

    Ctrl-A      home              - move to beginning of line
    Alt-B       ctrl-cursor left  - move to previous word
                ctrl-cursor right - move to next word
    Ctrl-B  or  cursor left       - move one character to the left
    Ctrl-D      delete            - delete character below cursor
                ctrl-delete       - delete word below cursor
                insert            - toggle overwrite mode on/off
    Ctrl-E      end               - move to end of line
    Ctrl-F      cursor right      - move one character to the right
    Ctrl-H      backspace         - delete character to the left
                ctrl-backspace    - delete word to the left
    Ctrl-L      scrollback        - view scrollback buffer
    Ctrl-N      cursor down       - get next command
    Ctrl-P      cursor up         - get previous command
    Ctrl-T                        - transpose characters
    Ctrl-U      escape            - delete whole input line

----------------------------THE SEMI-IMPORTANT STUFF---------------------------
Z-machine emulation functional differences in WinFrotz from DOS Frotz:

* WinFrotz can resize to a variety of configurations on the fly (but see the 
"limitations" section for some constraints)

* WinFrotz allows for a large combination of font/color display styles that DOS
Frotz cannot, including different fonts for the status/display windows.

* See the section "Graphical differences" for an overview of V6 games and how
they behave.

LIMITATIONS:

* To copy text, you must do so from the scrollback buffer. Pasting directly
into the input line works. For a discussion on why a text map (a required
piece of a cut/copy system in Windows) does not work well with the Z-Machine,
see the propeller head section at the end of this document.

* The status window must be fixed width (WinFrotz will enforce this via the
font selector). This is unavoidable due to the way the Z-machine works.

* Some games will break in display geometry if you have a different status 
font chosen than the display font. To make these games work, select the SAME
font for Display and Status. These errors are rare.

* In addition, some version 4+ games behave quirky about the status window, 
especially when it is resized on the fly. For instance, A Mind Forever Voyaging
and others won't print past the 80th character no matter what size the screen 
is. Many V5 games sample the screen width AT THE TIME THEY ARE STARTED and 
accept that as the permanent width for the entire session. To help enforce
this, WinFrotz will not let you resize a window to an area that is _smaller_
than the existing status line width in V5 games. This is not an issue in V3 or
before games, the status bar will grow or shrink to fit whatever width you 
select. (The Z-Machine was never written for dynamic resizing. Getting it to
work at all was something of a miracle, trust me).

* It is part of the design of the current Inform libraries to not print to the
last character position of the status area, hence Inform games will usually
have a dangling space at the end. This was done to support some older
interpreters and will likely be removed in later libraries.

GRAPHICAL DIFFERENCES (version 6 games):

The first and most obvious difference for WinFrotz from regular Frotz is that
WinFrotz runs in larger resolutions than Frotz. Frotz's resolutions were
320x200 for MCGA, 640x200 for CGA and EGA. WinFrotz scales these to a minimum
of 640x400 and a maximum of 1280x800 in integral multiples. WinFrotz handles
internally the odd aspect ratios of CGA and EGA.

These larger resolutions were required to make the display bearable on a
typical Windows desktop (I run 1280x1024 myself, and running at 320x200 didn't
sound so great). Another benefit of the increased area is the ability to show
real fonts instead of the blocky low-res ones provided by the original display
modes.

In general the Z-Machine programs appear to handle the increased display area
fairly well (of course, part of that is that WinFrotz does a convincing job of
lying about the dimensions of the pictures so they will fit properly). It
became obvious early on though that non-integral screen sizes weren't going to
work in most games (Journey can cope somewhat, not the others) so WinFrotz
limits you to reasonable choices as listed above. Even so there are a number
of assumptions in the original Z-Machine programs that can cause problems
(see Specific Game Oddities). The window size is "Locked" for the entire
duration of a V6 game.

In MCGA mode with an 8-bit Windows display and running a V6 game, I was unable
to get the proper default background color (dark grey) to work and had to
settle for black. No matter how I put this color in the palette and forced it
as the background for text with SetBkMode(), text printed over it was always
opaque-style with a black background. Other background colors work (like blue).
I don't know what's causing this, and I've largely given up trying to figure it
out. It works under 16bit or higher display modes; use those.

Another difference from Frotz is the way colors are handled. Obviously I can't
go around switching to 'MCGA' or 'CGA' mode, so I have to emulate them by
creating Windows palettes (when applicable). In CGA mode, WinFrotz just draws a
two-color display in your chosen user foreground/background colors. CGA
graphics actually aren't that bad. In EGA mode I create a palette with roughly
the EGA default colors (these were hard to find!) since Infocom never used the
"copious" 64 colors EGA was capable of. EGA graphics look really poor. Believe
it or not, EGA Arthur is supposed to look exactly that bad.

MCGA mode is a little more tricky, as it allows rotating the palette to any 
combination of 16 colors. In 8-bit displays I can actually do this (rotate the 
palette) with equivalent Windows calls. In 16 or 24-bit Windows modes there are
no equivalent functions; as there is no palette. However this never surfaced as 
real problem; the only place this is noticed is in Arthur, where the background
graphics pattern will change color moving from location to location under 8-bit
modes but not under 16-24-32 modes. It's debateable which was the more desired
effect in any case. On the plus side under 24-32 modes I can use the true RGB
values in the Infocom palette; not the lumin crippled variants of MCGA. If
you're really hung up about the background in Arthur not being exactly right
you can force it to redraw with the command "REFRESH". Unfortunately this is 
destructive to text that is in the scroll box so I can't force it every input.

Side note: if anybody ever gets crazy and writes a new V6 adventure game, 
WinFrotz can support up to about 200 colors on 8-bit displays and 255
on 16-24-32 (using the old MCGA graphics format).

Graphics are slightly slower than they could be, as I use constructed on the
fly DIBs and StretchBlts to place them (with two Blts required of course for
transparencies; hurray for Windows). It was never really a problem on even my
slowest test machine.

-----------------------------SPECIFIC GAME ODDITIES---------------------------
(Send me new notes for this section via e-mail and I will include them)

A Mind Forever Voyaging
  Does not print past the 80th character in the status area. This is a hard
coded assumption in the original Z-Machine program.

Beyond Zork
Beyond Zork now works in WinFrotz, using the supplied BEYZORK.FON font. The
only catch to this is that the status font you use when playing this game must
be EXACTLY the same size as one of the available Zork font sizes (which are 8,
10, 12 and 15). I suggest you use a bitmapped fixed font like Courier (not 
Courier New). It will still be playable otherwise but it will look odd. This
step is unavoidable due to an underlying assumption in the Z-machine code.

Bureaucracy
  The registration form (at the very beginning of the game) will not work well
if you select a status font that is dissimilar in size when bold versus
standard print. An example of a font that DOES work well is Courier and its
variants. This is not a WinFrotz error; back then fonts were always the same
size :-). Starting with version 5.0 WinFrotz will attempt to compensate for 
this problem itself; you shouldn't notice it anymore.

Border Zone
  Does not handle status areas > 80 chars wide correctly. It works, but there
will be holes in the coloring. This is a bug in the original Z-Machine code.

Zork Zero
  In EGA/MCGA and under 8-bit displays, Zork Zero can fudge the background 
color it displays certain text with. This is because it attempts to read the 
pixel color from the screen, and Windows itself will make errors when doing 
this from a palettized color. I'm looking at ways around it; for now run it in
16/24-bit color and it works fine.

Zork Zero EGA
  Sometimes the icons used for introductory letters or to show which area you 
are in will be overprinted/cropped off. This is due to a hard coded assumption
about the ratio of the graphic to the font. Try using a different font size;
usually making it slightly bigger fixes this problem.

---------THE NOT TERRIBLY IMPORTANT BUT YOU'LL READ IT ANYWAY STUFF-----------
Credits:

Everybody owes Stefan a huge debt for writing the original Frotz, making it so
complete and stable, and releasing the code publicly. If that code base had not
existing I never would have taken on WinFrotz, because I would have known I 
couldn't get it done in the limited time I have to spend on it.

Christopher J. Madsen did the OS/2 port of Frotz, was willing to fill in for 
Stefan who isn't available for some time due to his service year, and runs the
Frotz page at http://www.geocities.com/SiliconValley/Heights/3222/frotz.html
He also makes a nifty keen mapping utility very useful for adventure games
called GUEmap; there are links to it from his page above.

Graham Nelson wrote Inform, gives it away, and made Z-machine emulation a 
surmountable task by codifying the Z-machine standard document.

Many thanks to the beta testers of WinFrotz who sent in quite a flurry of bug
reports helping me to get it polished up. It is a tribute to the participatory
nature of IF fans that I had so much help. 

---------------------------THE PROPELLER HEAD SECTION--------------------------
Some programming stuff:

WinFrotz works by detaching the Z-machine (basically everthing Stefan wrote,
plus os-dependent I/O code for Windows) as a seperate thread. The primary UI and
display task maintains the window, refreshes, gets keystrokes, and all that 
regular Windows jazz. The Z-machine literally runs in it's own world, going to
sleep any time there isn't pending I/O (on a multi-processor machine WinFrotz
will distribute :-) ). It's an exceedingly simple model with the only IPC 
requirements being some state recognition and a keyboard buffer, both of which
I just used globals for (the lazy approach, but there was no need for semaphores
really).

I realized early on that proper, complete support for the Z-machine spec and 
an ability for a scrollback, cut/paste type display were damn near mutually
exclusive. The Z-machine allows for arbitrary changing of fonts (within a 
word), color display, and graphics positioned anywhere on the window. Sure, 
you're thinking CRichEditView. I actually have it semi-working for an offshoot
I intend to make (see the WinFrotz beta page). But try printing a fixed font
status bar at the top of a CRichEditView window. You can do that, but not as 
part of the RichEditView itself. The part that killed me was dynamic resizing 
of the status area, which is supposed to happen with transparency over the 
primary display (window 0 to the Z-machine). For example, in Curses the 
following occurs the first time the player types "inventory":

--------------------------------
| status area window           | This is roughly the display geometry when the
-------------------------------- player is allowed to input the inventory 
| display area blah blah       | command.
| blah blah blah               |
| etc                          |
|                              | 
|                              | 
|                              |
--------------------------------

-------------------------------- 
| status area window           | The status area window becomes larger after
|                              | the command is entered, displays text that 
| display area blah blah       | overlaps part of the primary window (win 0)
| blah blah blah               |
| etc                          |
-------------------------------- 
|                              | 
|                              | 
|                              |
--------------------------------

--------------------------------
| status area window           | The status window is then RETURNED to it's  
-------------------------------- previous dimensions. The window size for the
| display area blah blah       | status window is now actually smaller in the
| blah blah blah               | y-axis then the bottom of the text it 
| etc                          | displayed in the step immediately above. The 
|                              | user is then allowed to input again.
|                              | 
|                              |
--------------------------------

Basically this is depending on a persistence effect to drawn text that would 
be impossible with CRichEditView. The Z-machine windows aren't "windows" the 
way Windows itself would think of them. In a refresh condition on the above 
display, you would probably sensibly write a routine that would refresh to the
constrants of the status window at the time of refresh and ditto for the 
primary window. However the primary window now has content that was _never 
printed to the primary window_, it was printed to the status window (when the
status window happened to be sized to overlap the primary window). A text-
based refresh routine wouldn't be able to deal with this case.

So, I draw everything I'm doing on a bitmap (a common Windows technique from
way back) and at refresh time just draw the bitmap. To have significant
scrollback on a bitmap would chew up lots of memory - for simplicity I'm using
GDI calls on non-palettized DDBs. Now, since I can't use EditView (text only,
no color) or CRichEditView (text only unless I start messing with OLE stuff
<shudder>) that means I get no edit controls from the display - I'd have to do
'em all myself.

I still might, actually. I'd need to keep a map of the bottom pixel of each
line of text on the bitmap and the text in the lines themselves of course (ever
notice in a RichEditView when you change font sizes the entire line is resized
and smaller fonts are bottom-justified on that new size? Now you know why).
Then when the user holds down LBUTTON you grab his Y position, scroll down the
list of lines until you find the one he's on (remember each line might be a
different size), and then go through the same process more or less for X 
dimension. Then you get to start inverse coloring everything to show the
selection etc...it's not something I'm salivating to do. But I might do it, and
give about a screen or two of scrollback.

A much easier approach is sacrifice compatibility in the above instances and 
just depend on text only in the main window - no persistence from overlapped
status windows etc. Then you CRichEditView, do a bunch of funky tricks to keep
the user from editing the story text (I've already done it, works) and there 
you go. I'll probably release that as my scrollback and cut/paste version.

HELP with HELP:
I don't like my .HLP file much, so I doubt anybody else will. It takes a truly
amazing amount of time to write a help file, and that's the one commodity I
don't have. If anybody would like to volunteer to rewrite the help file
properly, email me at the specified addresses above. You must have knowledge
of how to write an RTF help file and working knowlege of WinFrotz and
interactive fiction.