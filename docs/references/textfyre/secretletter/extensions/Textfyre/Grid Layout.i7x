Grid Layout by Textfyre begins here.

Table of grid layout options
table 		cell spacings	headings	row numbering
a table-name	a list of numbers	a truth state	a truth state
with 0 blank rows

Table of GL_temp
x1 (indexed text)	x2 (indexed text)	x3 (indexed text)	x4 (indexed text)	x5 (indexed text)
""			""			""			""			""

[This function needn't be so evil and monolithic but sorting it out can wait, for now.]

To say (t - a table-name) laid out as a grid:
	let x be indexed text; [temporary text holding the text of individual grid rows as they are constructed]
	let the spacings be a list of numbers;
	let the headings option be true;
	let the row numbering option be true;
	let ws be 0; [initial required whitespace count]
	if there is a table of t in the table of grid layout options:
		choose row with a table of t in the table of grid layout options;
		if there is a cell spacings entry,
			change the spacings to the cell spacings entry;
		if there is a headings entry,
			change the headings option to the headings entry;
		if there is a row numbering entry,
			change the row numbering option to the row numbering entry;
	let the column count be the number of entries of the spacings;
	[1. Produce and display the table heading]
	say fixed letter spacing;
	if the headings option is true:
		let x be "";
		if the row numbering option is true:
			change x to ".   ";
		repeat with n running from 1 to the column count:
			change x to "[x][n]";
			if n is not the column count:
				change ws to entry n of the spacings - 1;
				while ws is greater than 0:
					change x to "[x] ";
					decrease ws by 1;
		say "[x]", line break, run paragraph on;
	change ws to 0;
	change x to "";
	[2. Produce and display each line of the grid]
	[some kind of bug regarding nested repeats requires us to be a little more circumspect in our wording here than I would like:]
	repeat with the row counter running from 1 to the number of rows in t:
		if the row numbering option is true:
			say "[row counter]:  ";
		repeat with n running from 1 to the column count:
			do nothing;
			if n is:
			-- 1: change x to "[p1 in row row counter of t]";
			-- 2: change x to "[p2 in row row counter of t]";
			-- 3: change x to "[p3 in row row counter of t]";
			-- 4: change x to "[p4 in row row counter of t]";
			-- 5: change x to "[p5 in row row counter of t]";
			if n is not the column count:
				[add padding - but not needed after the rightmost column]
				change ws to entry n of the spacings - (0 - ws + the number of characters in x);
				while ws is greater than 0:
					change x to "[x] ";
					decrease ws by 1;
			say "[x]";
		say line break, run paragraph on;
	say variable letter spacing, run paragraph on;

To say (t - a table-name) laid out as a long grid:
	let x be indexed text; [temporary text holding the text of individual grid rows as they are constructed]
	let the spacings be a list of numbers;
	if there is a table of t in the table of grid layout options:
		choose row with a table of t in the table of grid layout options;
		if there is a cell spacings entry,
			change the spacings to the cell spacings entry;
	let the column count be the number of entries of the spacings;
	say fixed letter spacing;
	repeat with the row counter running from 1 to the number of rows in t:
		let the row flag be false;
		choose row 1 in the Table of GL_temp;
		[init]
		repeat with n running from 1 to the column count:
			if n is:
			-- 1: change x1 entry to "[p1 in row row counter of t]";
			-- 2: change x2 entry to "[p2 in row row counter of t]";
			-- 3: change x3 entry to "[p3 in row row counter of t]";
			-- 4: change x4 entry to "[p4 in row row counter of t]";
			-- 5: change x5 entry to "[p5 in row row counter of t]";
		[]
		while the row flag is false:
			change the row flag to true; [assume we will finish this time]
			repeat with n running from 1 to the column count:
				if n is:
				-- 1: change x to "[x1 entry]";
				-- 2: change x to "[x2 entry]";
				-- 3: change x to "[x3 entry]";
				-- 4: change x to "[x4 entry]";
				-- 5: change x to "[x5 entry]";
				let the available space be entry n of the spacings;
				let the words to print be how many words of x fit in the available space;
				let the required space be how many characters are needed for the first words to print words of x;
				let the required padding be the available space - the required space + 2;
				say the first words to print words of x;
				if the required padding is at least 1:
					say pad the required padding;
				change x to x without the first words to print words;
				if x is not "":
					change the row flag to false; [we know we're not finished yet]
				if n is:
				-- 1: change x1 entry to x;
				-- 2: change x2 entry to x;
				-- 3: change x3 entry to x;
				-- 4: change x4 entry to x;
				-- 5: change x5 entry to x;
			say line break;
	say paragraph break;
				
To say the first (n - a number) words of (T - indexed text):
	if n is at least 1:
		repeat with i running from 1 to n:
			let x be unpunctuated word number i in T;
			say "[x]";
			if i is less than n:
				say " ";

To decide what indexed text is pad (n - a number):
	decide on " " repeated n times;

To decide what indexed text is (T - indexed text) repeated (n - a number) times:
	let result be indexed text;
	repeat with i running from 1 to n:
		change the result to "[result][T]";
	decide on the result;

To decide what indexed text is (T - indexed text) padded out to (n - a number) characters:
	let m be the number of characters in T;
	if m is at least n:
		decide on T;
	let pad be indexed text;
	let the pad be " " repeated n - m times;
	decide on "[T][pad]";

To decide what indexed text is (T - indexed text) without the first (n - a number) words:
	if the number of unpunctuated words in T is at most n:
		decide on "";
	let result be indexed text;
	repeat with i running from n + 1 to the number of unpunctuated words in T:
		change the result to "[result][unpunctuated word number i in T][if i is not the number of unpunctuated words in T] [end if]";
	decide on the result;

To decide what number is how many characters are needed for the first (n - a number) words of (t - indexed text):
	if n is at most 0:
		decide on 0;
	let count be 0;
	if the number of unpunctuated words in t is less than n:
		change n to the number of unpunctuated words in t;
	repeat with i running from 1 to n:
		let x be unpunctuated word number i in t;
		increase count by the number of characters in x;
		if i is less than n:
			increase count by 1;
	decide on count;

To decide what number is how many words of (t - indexed text) fit in (n - a number):
	decide on how many words of t fit in n characters;

To decide what number is how many words of (t - indexed text) fit in (n - a number) characters/character:
	if n is at most 0:
		decide on 0;
	if the number of unpunctuated words in t is at most 0:
		decide on 0;
	let i be 0;
	let wn be 1;
	while i is less than n and wn is at most the number of unpunctuated words in t:
		let x be unpunctuated word number wn in t;
		let wl be the number of characters in x;
		increase i by wl;
		if i is at most n:
			increase wn by 1;
		if i is less than n:
			increase i by 1;
	decrease wn by 1;
	decide on wn;

Grid Layout ends here.
