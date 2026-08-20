// WorldSourceEditTests.swift
// A card's offer becomes text in the author's story, so the text is pinned here
// against the REAL Fernhill source — the shape of a `create` block, its indentation,
// and where an `aka` line sits are facts about that file, not about a fixture.

import XCTest
@testable import SharpeeIDE

@MainActor
final class WorldSourceEditTests: XCTestCase {

    /// The stopcock's block, as Fernhill actually writes it (lines 272-276).
    private let source = """
    create the doormat
      aka mat
      scenery, a supporter
      in the Fountain Court

    create the stopcock
      aka cock, water valve
      scenery
      in the Boiler Shed

    create the plunger
      scenery
      in the Boiler Shed
    """

    private func apply(_ edit: WorldSourceEdit, to text: String) -> String {
        (text as NSString).replacingCharacters(in: edit.range, with: edit.text)
    }

    /// Adding a word the prose already uses extends the aka line in place.
    func testAddingAWordExtendsTheExistingAkaLine() throws {
        let edit = try XCTUnwrap(WorldSourceEdit.addingWord("quarter-turn", toThingNamed: "stopcock", in: source))
        let after = apply(edit, to: source)

        XCTAssertTrue(after.contains("  aka cock, water valve, quarter-turn"), after)
        XCTAssertTrue(after.contains("  aka mat\n"), "the doormat above is untouched")
        XCTAssertEqual(edit.line, 7, "the author lands on the line that changed")
        XCTAssertEqual(after.components(separatedBy: "\n").count,
                       source.components(separatedBy: "\n").count,
                       "extending a line adds no lines")
    }

    /// A thing with no aka line gets one UNDER THE KIND LINE, in house style.
    ///
    /// Every block in every corpus story reads shape-then-aliases — `create the Iron
    /// Gates / a room / aka gates, gate`. Writing `aka` above `a room` parses and
    /// looks like a mistake, which is worse than either.
    func testAddingAWordOpensAnAkaLineUnderTheKindLine() throws {
        let edit = try XCTUnwrap(WorldSourceEdit.addingWord("primer", toThingNamed: "plunger", in: source))
        let after = apply(edit, to: source)

        XCTAssertTrue(after.contains("create the plunger\n  scenery\n  aka primer\n  in the Boiler Shed"), after)
        XCTAssertEqual(edit.line, 13, "the author lands on the line that was written")
    }

    /// The case that showed the bug: a room, whose first clause is its kind.
    func testAddingAWordToARoomFollowsItsKindLine() throws {
        let tavern = """
        create the Tavern
          a room
          north to the Yard
          east to Your Lodging
        """
        let edit = try XCTUnwrap(WorldSourceEdit.addingWord("bankside", toThingNamed: "Tavern", in: tavern))

        XCTAssertEqual((tavern as NSString).replacingCharacters(in: edit.range, with: edit.text),
                       """
                       create the Tavern
                         a room
                         aka bankside
                         north to the Yard
                         east to Your Lodging
                       """)
    }

    /// A word it already answers to is not an edit — it is a no-op worth refusing.
    func testAddingAWordItAlreadyAnswersToIsRefused() {
        XCTAssertNil(WorldSourceEdit.addingWord("cock", toThingNamed: "stopcock", in: source))
        XCTAssertNil(WorldSourceEdit.addingWord("WATER", toThingNamed: "stopcock", in: source),
                     "case is not a difference in what a thing answers to")
    }

    /// A NEW THING GOES NEXT TO ITS ROOM, not at the end of the file (David's ruling).
    ///
    /// Declaring it writes the block and STOPS: the description is prose, and prose is
    /// the author's — a tool that writes it is a tool to read suspiciously afterwards.
    func testDefiningSceneryLandsAfterItsRoomAndWritesNoProse() {
        let story = """
        create the Tavern
          a room
          north to the Yard

        create the Yard
          a room
        """
        let edit = WorldSourceEdit.definingScenery(
            "bankside sign",
            placedBy: WorldRoomPlacement(room: "Tavern", host: "Tavern"),
            in: story)

        XCTAssertEqual((story as NSString).replacingCharacters(in: edit.range, with: edit.text),
                       """
                       create the Tavern
                         a room
                         north to the Yard

                       create the bankside sign
                         scenery
                         in the Tavern

                       create the Yard
                         a room
                       """)
        XCTAssertEqual(edit.line, 5, "the author lands where the description goes")
        XCTAssertFalse(edit.text.lowercased().contains("a bankside"), "no invented prose: \(edit.text)")
    }

    /// THE HOST NEED NOT BE A ROOM (David's case: `pen`, in Shakespeare's topic list).
    ///
    /// Two different questions, answered from the same host: the pen goes IN the room
    /// the poet is in, and it goes NEXT TO the poet in the file — because his topic
    /// list is what named it. Answering only the first is how it kept landing at the
    /// end of the file.
    func testDefiningSceneryFromATopicLandsBesideTheSpeaker() {
        let story = """
        create William Shakespeare
          a person, proper, cunning
          aka shakespeare, the poet
          in the Tiring-House

          topic quill
            He talks about his pen the way other men talk about money.
          end topic

        define phrase ides-nothing
          Opening night, and you carry nothing.
        end phrase
        """
        let edit = WorldSourceEdit.definingScenery(
            "pen",
            placedBy: WorldRoomPlacement(room: "Tiring-House", host: "William Shakespeare"),
            in: story)
        let after = (story as NSString).replacingCharacters(in: edit.range, with: edit.text)

        XCTAssertEqual(after, """
        create William Shakespeare
          a person, proper, cunning
          aka shakespeare, the poet
          in the Tiring-House

          topic quill
            He talks about his pen the way other men talk about money.
          end topic

        create the pen
          scenery
          in the Tiring-House

        define phrase ides-nothing
          Opening night, and you carry nothing.
        end phrase
        """)
        XCTAssertFalse(after.hasSuffix("in the Tiring-House\n"), "not at the end of the file")
    }

    /// A host with nowhere to be still anchors the file position.
    ///
    /// A door belongs to two rooms and is in neither, so it names no room to put a
    /// thing in — but it is still what named the phrase, so the declaration sits
    /// beside it rather than at the end, and goes in unplaced.
    func testAHostWithNoRoomStillAnchorsTheBlock() {
        let story = """
        create the tiring-house door
          a door, openable

        create the Yard
          a room
        """
        let edit = WorldSourceEdit.definingScenery(
            "iron latch",
            placedBy: WorldRoomPlacement(room: nil, host: "tiring-house door"),
            in: story)
        let after = (story as NSString).replacingCharacters(in: edit.range, with: edit.text)

        XCTAssertEqual(after, """
        create the tiring-house door
          a door, openable

        create the iron latch
          scenery

        create the Yard
          a room
        """)
        XCTAssertFalse(edit.text.contains("in the"), "no room to name, so none is invented")
    }

    /// A phrase from prose that belongs to no room is declared at the end, unplaced.
    func testDefiningSceneryWithoutARoomOmitsThePlacement() {
        let edit = WorldSourceEdit.definingScenery("false modesty", placedBy: nil, in: source)
        let after = apply(edit, to: source)

        XCTAssertFalse(edit.text.contains("in the"), edit.text)
        XCTAssertTrue(after.hasSuffix("create the false modesty\n  scenery\n"), after)
        XCTAssertTrue(after.hasPrefix(source), "an append never disturbs what is already there")
    }

    /// THE EDIT IS COMPUTED AGAINST THE TEXT IT WILL CHANGE.
    ///
    /// The failing case, exactly: accept one offer, leave the buffer unsaved, accept a
    /// second. Measured against the FILE, the second edit is short by everything the
    /// first added and lands that many characters early — inside the last `define
    /// phrase` block, which is what an author saw.
    func testASecondOfferLandsCorrectlyInAnUnsavedBuffer() throws {
        let onDisk = """
        create the Tavern
          a room

        define phrase closing-time
          The taps run dry and Bankside goes home.
        end phrase
        """
        // The author accepted one offer already; the buffer is longer than the file.
        let first = try XCTUnwrap(WorldSourceEdit.addingWord("bankside", toThingNamed: "Tavern", in: onDisk))
        let buffer = (onDisk as NSString).replacingCharacters(in: first.range, with: first.text)

        let second = WorldSourceEdit.definingScenery(
            "long bar",
            placedBy: WorldRoomPlacement(room: "Tavern", host: "Tavern"),
            in: buffer)
        let after = (buffer as NSString).replacingCharacters(in: second.range, with: second.text)

        XCTAssertEqual(after, """
        create the Tavern
          a room
          aka bankside

        create the long bar
          scenery
          in the Tavern

        define phrase closing-time
          The taps run dry and Bankside goes home.
        end phrase
        """)
        XCTAssertTrue(after.contains("end phrase"), "the phrase block survives intact")
        XCTAssertFalse(after.contains("The taps run dry and Bankside goes home.\ncreate"),
                       "nothing is spliced into the middle of a phrase")
    }

    /// A block ends where indentation stops, whatever follows it.
    func testABlockEndsAtTheNextTopLevelLine() {
        let lines = """
        create the Yard
          a room
          north to the Stage

        ## ---- things ----
        create the boards
        """.components(separatedBy: "\n")

        XCTAssertEqual(WorldSourceEdit.indexOfCreateLine(named: "Yard", in: lines), 0)
        XCTAssertEqual(WorldSourceEdit.indexOfCreateLine(named: "boards", in: lines), 5)
        XCTAssertEqual(WorldSourceEdit.indexOfBlockEnd(from: 0, in: lines), 3,
                       "the room ends at its last indented line, not at the divider")
        XCTAssertNil(WorldSourceEdit.indexOfCreateLine(named: "tavern", in: lines))
    }

    /// Opening a description writes the SHAPE and nothing else.
    ///
    /// Every described thing in the corpus reads `create … / clauses / blank / indented
    /// prose`, so that is what the button makes — and then stops, because what goes on
    /// the line is the author's.
    func testOpeningADescriptionWritesTheBlankLineAndIndentOnly() throws {
        let story = """
        create the bankside sign
          scenery
          in the Tavern

        create the Yard
          a room
        """
        let edit = try XCTUnwrap(WorldSourceEdit.openingDescription(forThingNamed: "bankside sign",
                                                                    in: story))
        let after = (story as NSString).replacingCharacters(in: edit.range, with: edit.text)

        XCTAssertEqual(after, """
        create the bankside sign
          scenery
          in the Tavern

          

        create the Yard
          a room
        """)
        XCTAssertEqual(edit.line, 5, "the cursor lands on the opened line")
        XCTAssertEqual(edit.text, "\n\n  ", "a blank line and an indent — no words")
    }

    /// The fourth class's card asks one question and offers one answer.
    func testUndescribedCardOffersOnlyTheDescription() {
        let span = WorldSourceSpan(line: 1, column: 1, endLine: 3, endColumn: 16)
        let row = WorldFindingRow(title: "bankside sign says nothing",
                                  detail: "declared, and never described",
                                  line: 1, phrase: "bankside sign", passage: span,
                                  targetName: "bankside sign", needsDescription: true)

        XCTAssertEqual(WorldCandidateCard.offers(for: row), [.writeDescription, .ignore])
        XCTAssertFalse(row.canDefineScenery, "it exists — that offer is spent")
    }

    /// The offers a card shows, and their order: fixes first, dismissal last.
    func testCardOffersFixesBeforeDismissal() {
        let span = WorldSourceSpan(line: 1, column: 1, endLine: 4, endColumn: 1)
        let row = WorldFindingRow(title: "“stout oak door” in tiring-house door",
                                  phrase: "stout oak door", passage: span, declaration: span,
                                  targetName: "tiring-house door",
                                  unknownWords: ["stout", "oak"])

        XCTAssertEqual(WorldCandidateCard.offers(for: row),
                       [.addWord("stout"), .addWord("oak"), .showPhrase, .showTarget, .ignore])
        XCTAssertEqual(WorldCandidateCard.title(of: .addWord("stout"), row: row), "+ stout")

        let ignored = row.markingIgnored(true)
        XCTAssertEqual(WorldCandidateCard.offers(for: ignored), [.showPhrase, .showTarget, .unignore],
                       "a dismissed card offers no fixes — it offers to come back")
    }

    /// THE LAST ADJECTIVE FINISHES THE CARD (David's ruling).
    ///
    /// The analysis still reports the finding — it describes the story as it was built
    /// — so the card answers for itself in between: each accepted word leaves it, and
    /// when the last one does the card is FIXED. Not ignored: ignoring is what an
    /// author does to a finding they disagree with, and this one they agreed with.
    func testAcceptingTheLastWordCompletesTheCardRatherThanIgnoringIt() {
        let span = WorldSourceSpan(line: 1, column: 1, endLine: 4, endColumn: 1)
        let card = WorldFindingRow(title: "“stout oak door” in tiring-house door",
                                   phrase: "stout oak door", passage: span, declaration: span,
                                   targetName: "tiring-house door",
                                   unknownWords: ["stout", "oak"])

        let oneLeft = card.withUnknownWords(["oak"], done: false)
        XCTAssertFalse(oneLeft.isDone, "one word of two is not a fix")
        XCTAssertEqual(WorldCandidateCard.offers(for: oneLeft).first, .addWord("oak"),
                       "the word already added stops being offered")

        let fixed = oneLeft.withUnknownWords([], done: true)
        XCTAssertTrue(fixed.isDone)
        XCTAssertFalse(fixed.isIgnored, "fixed is not dismissed")
        XCTAssertEqual(WorldCandidateCard.offers(for: fixed), [],
                       "a finished card offers nothing — the next build takes it away")
        XCTAssertFalse(WorldIncompleteView.shows(fixed, showing: .remaining,
                                                 ignores: WorldIgnoreStore(storyURL: nil)),
                       "it leaves the working list")
        XCTAssertTrue(WorldIncompleteView.shows(fixed, showing: .all,
                                                ignores: WorldIgnoreStore(storyURL: nil)),
                      "and can still be seen under All")
    }

    /// DECLARING IT ASKS THE NEXT QUESTION (David's ruling). The thing exists now and
    /// says nothing, and the author is already here with the file open.
    func testDefiningSceneryTurnsTheCardIntoADescriptionCard() {
        let span = WorldSourceSpan(line: 1, column: 1, endLine: 4, endColumn: 1)
        let card = WorldFindingRow(title: "“bankside sign” in Tavern",
                                   phrase: "bankside sign", passage: span,
                                   canDefineScenery: true,
                                   room: WorldRoomPlacement(room: "Tavern", host: "Tavern"))

        let next = card.declaredAwaitingDescription(line: 42)
        XCTAssertTrue(next.needsDescription)
        XCTAssertEqual(next.line, 42, "the button goes where the description belongs")
        XCTAssertEqual(WorldCandidateCard.offers(for: next), [.writeDescription, .ignore])
        XCTAssertEqual(WorldCandidateCard.title(of: .writeDescription, row: next),
                       "Write the description")
        XCTAssertTrue(next.title.contains("says nothing"), next.title)
        XCTAssertFalse(next.canDefineScenery, "it is declared — that offer is spent")
    }

    /// A candidate nothing answers to offers to declare it instead.
    func testNoObjectCardOffersToDeclareIt() {
        let span = WorldSourceSpan(line: 1, column: 1, endLine: 4, endColumn: 1)
        let row = WorldFindingRow(title: "“bankside tavern” in Tavern",
                                  phrase: "bankside tavern", passage: span,
                                  canDefineScenery: true,
                                  room: WorldRoomPlacement(room: "Tavern", host: "Tavern"))

        XCTAssertEqual(WorldCandidateCard.offers(for: row), [.defineScenery, .showPhrase, .ignore])
    }
}
