<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<HTML><HEAD>
<META content="text/html; charset=windows-1252" http-equiv=Content-Type></HEAD>
<BODY><PRE>Version 1/101121 of Quick Load (for Glulx only) by Tara McGrew begins here.

Before play begins is a rulebook.

The save snapshot before play begins rule translates into I6 as "QL_SaveSnapshot_R".
The save snapshot before play begins rule is listed first in the for starting the virtual machine rules.

To save a snapshot for quick load: (- QL_SaveSnapshot(); -).
To decide whether running from a/-- snapshot: (- (0--&gt;6 == QL_Main) -).

The quick load initialise memory rule translates into I6 as "QL_InitialiseMem_R".
The quick load initialise memory rule is listed instead of the initialise memory rule in the startup rules.

Include (-
[ QL_InitialiseMem_R;
	if (0--&gt;6 == QL_Main) { VM_PreInitialise(); rfalse; }
	else return (+ initialise memory rule +)();
];

[ QL_Main; @tailcall Main 0; ];

Array ql_buffer -&gt; 4;

[ QL_SaveSnapshot_R;
	if (0--&gt;6 == QL_Main) rfalse;
	ProcessRulebook((+ before play begins rulebook +));
	QL_SaveSnapshot();
];

[ QL_SaveSnapshot res fref i memsize buf checksum;
	fref = glk_fileref_create_by_prompt(fileusage_Data + fileusage_BinaryMode, filemode_ReadWrite, 0);
	if (fref == 0) jump SFailed;
	gg_savestr = glk_stream_open_file(fref, filemode_ReadWrite, GG_SAVESTR_ROCK);
	glk_fileref_destroy(fref);
	if (gg_savestr == 0) jump SFailed;
	
	! write memory to file
	@getmemsize memsize;
	glk_put_char_stream(gg_savestr, 0-&gt;0);
	glk_put_buffer_stream(gg_savestr, 1, memsize - 1);
	
	! change memory size and starting routine
	buf = ql_buffer;
	buf--&gt;0 = memsize;
	glk_stream_set_position(gg_savestr, 3*WORDSIZE, seekmode_Start);	! EXTSTART
	glk_put_buffer_stream(gg_savestr, buf, 4);
	glk_stream_set_position(gg_savestr, 4*WORDSIZE, seekmode_Start);	! ENDMEM
	glk_put_buffer_stream(gg_savestr, buf, 4);
	
	buf--&gt;0 = QL_Main;
	glk_stream_set_position(gg_savestr, 6*WORDSIZE, seekmode_Start);	! Start Func
	glk_put_buffer_stream(gg_savestr, buf, 4);
	
	! recalculate checksum
	glk_stream_set_position(gg_savestr, 0, seekmode_Start);
	checksum = 0;
	while (i &lt; memsize) {
		QL_ReadWord(gg_savestr, buf);
		if (i ~= 8*WORDSIZE) checksum = checksum + buf--&gt;0;
		i = i + WORDSIZE;
	}
	buf--&gt;0 = checksum;
	glk_stream_set_position(gg_savestr, 8*WORDSIZE, seekmode_Start);	! Checksum
	glk_put_buffer_stream(gg_savestr, buf, 4);
	
	glk_stream_close(gg_savestr, 0); ! stream_close
	gg_savestr = 0;
	rfalse;
	.SFailed;
	GL__M(##Save, 1);	
	rfalse;
];

[ QL_ReadWord str buf  len r;
	buf--&gt;0 = 0;
	len = WORDSIZE;
	do {
		r = glk_get_buffer_stream(str, buf, len);
		if ((~~r) || (r == len)) return;
		buf = buf + r;
		len = len - r;
	} until (~~len);
]; -).

Quick Load ends here.

---- DOCUMENTATION ----

This extension allows us to create snapshots during gameplay. A snapshot is a modified story file that incorporates whatever changes to memory have been made since the game started. This makes it similar to a saved game, but it can be loaded directly without needing a copy of the original story file.

By default, this extension saves a snapshot at the beginning of the game, before the "when play begins" rulebook has run (and before most other initialization has taken place, such as opening Glk windows). The new "before play begins" rulebook will run before the snapshot is taken, so it may be used to perform lengthy initialization that will be baked into the snapshot. The "save snapshot before play begins" rule is responsible for running the rulebook and saving the initial snapshot.

We may also take additional snapshots, using the phrase:

	save a snapshot for quick load;

However, we usually only want this to happen on our computer (when we're preparing a snapshot for distribution), not on the player's computer when the player has loaded our snapshot. To check whether the game is already running from a snapshot, use the condition:

	if running from a snapshot, ...

Section: How Saving Works

The extension uses Glk's file mechanism to write the contents of memory to a file and update a few header fields. The file that is produced is a Glulx program only (.ulx file), without any Blorb resources. See the section "Republishing existing works of IF", in the "Releasing" chapter of the Inform 7 manual, for information on how to repackage it as a Blorb if needed.

The interpreter built into the Inform 7 application may not be able to save snapshots. If a save prompt does not appear when the game starts, try compiling the game using the Release feature and running it in a different interpreter.

Section: How Resuming Works

When resuming from a snapshot, nearly all rulebooks will run from the beginning, just the same as when loading the original story file. Only the data in memory will be different: object locations and properties, relations, tables, and global variables. (Contrast this to saved games: restoring from a saved game causes the game to resume exactly where it left off, skipping such rulebooks as "when play begins".)

The only rules which are not run when loading from a snapshot are the "initialise memory rule" (since memory will already be laid out how we want it in the snapshot) and the entire "before play begins" rulebook.

Therefore, if we need the game to start differently when loading from a snapshot -- for example, if we've added a new snapshot at the beginning of Part II of the game -- we'll need to test for that explicitly, using "if running from a snapshot" or another condition based on game state.</PRE></BODY></HTML>
