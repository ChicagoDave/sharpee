# Part I and front matter: change list

Prose pass, session 2985ee, 2026-11-20. Baseline for fences: `7b1651c16`.
Files read in full: the four front-matter files and chapters 1 to 4.

## Front matter

`00-preface.md`, `00-title-page.md`, `00b-copyright.md`, `01-how-to-read.md`: read, no change.

## Chapter 1, The shape of a story file

Edits: sentence 2, paragraph 1.

1. Sentence (the "How text is emitted" section's opening, added earlier this session and not in the baseline's wording).
   - OLD: Chord has no statement that prints a string. Every sentence the player reads is written in one of four places. It helps to know all four now, because the examples in this book use them some chapters before the chapter that treats each one in full.
   - NEW: Everything the player reads comes from one of four places. Later chapters teach each of them. This section names all four, so that you know them when you see them.
   - Why: the first sentence was false (`phrase` prints text) and the last was the sentence David called horrible.
2. Sentence, same section.
   - OLD: Chapter 12 writes this phrase and the line that uses it, which blocks a stair.
   - NEW: Chapter 12 writes this phrase, for a stair that the player cannot climb.
   - Why: "which" could attach to the phrase or the line.
3. Paragraph, "What you have so far".
   - OLD: Type the story at the top of this chapter into a file called `relighting.story`, with spaces for indentation, and keep it. Make a new folder called `relighting` for it, with nothing else inside. The folder can be anywhere you keep your own work.
   - NEW: Make a new folder called `relighting`, anywhere you keep your own work, with nothing else inside. Type the story at the top of this chapter into a file in that folder called `relighting.story`, with spaces for indentation, and keep it.
   - Why: the steps were in the reverse of the order the reader does them.

## Chapter 2, The story header

Edits: sentence 1.

1. - OLD: It is here to be read. Nothing in this chapter is built.
   - NEW: The output is printed here for you to read. You will not build anything in this chapter.
   - Why: "It" had no clear referent.

## Chapter 3, The player and the start

Edits: sentence 2.

1. - OLD: Nobody typed anything, so nothing that counts turns has counted one, and the first command the player types is turn 1.
   - NEW: Nobody typed anything, so no turn has been counted, and the first command the player types is turn 1.
2. - OLD: There are four mistakes to make here, and the compiler catches three of them.
   - NEW: There are four mistakes you can make here, and the compiler catches three of them.

## Chapter 4, Build, play, read an error

Edits: sentence 4, grammar 1.

1. - OLD: This chapter is steps from beginning to end, so it has no such heading.
   - NEW: This whole chapter is a sequence of steps, so it has no such heading.
2. - OLD: It takes a moment, and it is far easier to find a mistake among the five lines you have just typed than among fifty.
   - NEW: It takes only a moment, and ...
   - Why: "takes a moment" can be read as a cost.
3. Count (grammar).
   - OLD: Two of those answers are worth a second look, because you wrote neither of them.
   - NEW: Three of those answers are worth a second look, because you wrote none of them.
   - Why: the two paragraphs that follow discuss three answers ("You can't see any such thing", "There are no obvious exits", "Time passes...").
4. - OLD: If you keep a second `.story` file in the folder, a copy you made before an experiment, for instance, `play` refuses to choose between them:
   - NEW: If you keep a second `.story` file in the folder, such as a copy you made before an experiment, `play` refuses to choose between them:
5. - OLD: Keep your experiments in another folder, or give the copy a different ending.
   - NEW: Keep your experiments in another folder, or give the copy a name that does not end in `.story`.
   - Why: "ending" reads as a story's ending. Inline code: one `.story` span added.

## Noticed, not changed

- Chapter 4 says "This book gives both" (Chord Writer and the command), while the chapter's own HTML comment records that the Chord Writer half is pending (issues 653 and 729). Content, already tracked; nothing filed.
- Chapter 2's "From another system: bibliographic data" has the clause "as an abbreviation", which is hard to follow. It is a checked statement about Inform 10, so it was left as written.

## Patterns for the Phase 9 sweep

- Steps given in the reverse of the order the reader performs them.
- A count in a lead sentence ("two of those", "three things") that does not match what follows.
- "It" or "which" opening a sentence or clause with more than one possible referent.
