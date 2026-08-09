// TranscriptSourceProvider.swift
// The Testing tab's door to the story's transcript files: answers
// `requestSource` by reading one, and `writeTranscript` by replacing one, or
// hands back why it could not do either.
//
// Its own type rather than methods on TestController because it has one job with
// one rule — a request is served only if the file is one of the suite's — and
// because the real-path tests must drive the SAME reader and writer the app does.
// A test that wires its own file-handling closure proves the page renders and
// emits text, not that the IDE ever reads or writes any.
//
// The page never composes a patch: it sends the whole file, produced by the
// grammar's own serializer, so what lands on disk is by construction something
// the runner reads the same way the editor meant it.
//
// Public interface: TranscriptSourceProvider(discovered:), provide(file:to:),
// write(file:text:to:).
// Owner context: tools/ide — Test.

import Foundation

@MainActor
struct TranscriptSourceProvider {

    /// The transcripts the open story was discovered to have. This is the whole
    /// allow-list: the page has no business reading anything else.
    var discovered: [URL]

    /// Reads `file` and delivers it to `tab`, or delivers the reason it could not.
    ///
    /// - Parameters:
    ///   - file: the path the page asked for, as it appeared on the wire.
    ///   - tab: the surface to answer on.
    ///
    /// Every path answers. A request that returns nothing leaves the source pane
    /// reading "Reading the file…" forever, which an author cannot tell apart
    /// from a hung IDE.
    func provide(file: String, to tab: TestingTabViewController?) {
        guard let requested = resolve(file) else {
            tab?.deliverSourceFailure(file: file, message: Self.outsideSuiteNote)
            return
        }
        do {
            let text = try String(contentsOf: requested, encoding: .utf8)
            tab?.deliverSource(file: file, text: text)
        } catch {
            tab?.deliverSourceFailure(
                file: file,
                message: "Could not read \(requested.lastPathComponent): \(error.localizedDescription)")
        }
    }

    /// Replaces `file` with `text` and tells `tab` whether it landed.
    ///
    /// - Parameters:
    ///   - file: the path the page asked to write, as it appeared on the wire.
    ///   - text: the whole file, as the grammar's serializer produced it.
    ///   - tab: the surface to answer on.
    ///
    /// - Returns: the file that changed, or nil if nothing did. Callers use this
    ///   to decide whether anything downstream needs telling — announcing a write
    ///   that was refused would ask the rest of the IDE to react to a file that
    ///   never moved, and at a path this type deliberately declined to touch.
    ///
    /// Written atomically, so an interrupted write cannot leave a half-file where
    /// a transcript was — the failure mode would be an author's suite that no
    /// longer parses, discovered on the next run rather than at the moment of
    /// damage. A failure is always answered: the page still holds the edit, and
    /// silence would let it show an assertion that is not on disk.
    @discardableResult
    func write(file: String, text: String, to tab: TestingTabViewController?) -> URL? {
        guard let target = resolve(file) else {
            tab?.deliverSaveFailure(file: file, message: Self.outsideSuiteNote)
            return nil
        }
        do {
            try text.write(to: target, atomically: true, encoding: .utf8)
            tab?.deliverSaved(file: file)
            return target
        } catch {
            tab?.deliverSaveFailure(
                file: file,
                message: "Could not write \(target.lastPathComponent): \(error.localizedDescription)")
            return nil
        }
    }

    /// Creates a new transcript holding `text`, and reports where it landed.
    ///
    /// - Parameters:
    ///   - name: what the author called it. Turned into a filename here.
    ///   - text: the file's whole content, composed by the page's serializer.
    ///   - storyDirectory: the open story's folder, or nil if none is open.
    ///   - tab: the surface to answer on.
    ///
    /// **The location is inferred, never asked** (ADR-290 D8). ADR-280's
    /// classifier looks for exactly `tests/transcripts/`, so offering a file panel
    /// would offer one right answer and an unbounded set of wrong ones — and the
    /// wrong ones fail silently, as a test that simply never appears.
    ///
    /// An existing file is never overwritten. Two branches with the same name is
    /// an ordinary mistake, and losing the first one to it would not be.
    @discardableResult
    func create(name: String, text: String, in storyDirectory: URL?,
                to tab: TestingTabViewController?) -> URL? {
        guard let storyDirectory else {
            tab?.deliverCreateFailure(message: "No story is open, so there is nowhere to put a transcript.")
            return nil
        }
        let slug = Self.slug(from: name)
        guard !slug.isEmpty else {
            tab?.deliverCreateFailure(message: "\"\(name)\" has no letters or digits to make a filename from.")
            return nil
        }

        let directory = storyDirectory
            .appendingPathComponent("tests", isDirectory: true)
            .appendingPathComponent("transcripts", isDirectory: true)
        let target = directory.appendingPathComponent("\(slug).transcript")
        guard !FileManager.default.fileExists(atPath: target.path) else {
            tab?.deliverCreateFailure(message: "\(slug).transcript already exists.")
            return nil
        }
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try text.write(to: target, atomically: true, encoding: .utf8)
            tab?.deliverCreated(file: target.path)
            return target.standardizedFileURL
        } catch {
            tab?.deliverCreateFailure(
                message: "Could not create \(slug).transcript: \(error.localizedDescription)")
            return nil
        }
    }

    /// Moves a transcript to the Finder's Trash.
    ///
    /// Trashed rather than unlinked, deliberately. A transcript is work, and the
    /// only undo an editor can honestly offer for a whole file is the one the
    /// operating system already has — the in-editor undo stack covers edits to a
    /// file's contents, not the file's existence.
    @discardableResult
    func trash(file: String, to tab: TestingTabViewController?) -> URL? {
        guard let target = resolve(file) else {
            tab?.deliverTrashFailure(file: file, message: Self.outsideSuiteNote)
            return nil
        }
        do {
            try FileManager.default.trashItem(at: target, resultingItemURL: nil)
            tab?.deliverTrashed(file: file)
            return target
        } catch {
            tab?.deliverTrashFailure(
                file: file,
                message: "Could not move \(target.lastPathComponent) to the Trash: \(error.localizedDescription)")
            return nil
        }
    }

    /// A filename from what the author typed.
    ///
    /// Lowercased, letters and digits kept, everything else collapsed to a single
    /// hyphen — the shape every transcript in the corpus already has (`fuse-cut`,
    /// `frost-seal`). Not a security measure: it is how "The vine" becomes a name
    /// that reads the same in a file listing, a `continues:` field and a test
    /// report.
    static func slug(from name: String) -> String {
        let lowered = name.lowercased()
        var out = ""
        var pendingHyphen = false
        for character in lowered {
            if character.isLetter || character.isNumber {
                if pendingHyphen && !out.isEmpty { out.append("-") }
                pendingHyphen = false
                out.append(character)
            } else {
                pendingHyphen = true
            }
        }
        return out
    }

    /// The one boundary the read, write and trash operations share: a path is
    /// served only if it is one of the suite's.
    ///
    /// Not a defence against an attacker — the page ships in this app. It is a
    /// boundary: `discovered` is exactly the set of files the tab has business
    /// touching, so anything else is a bug in the page, and a bug that writes a
    /// file it should not is worth refusing loudly.
    private func resolve(_ file: String) -> URL? {
        let requested = URL(fileURLWithPath: file).standardizedFileURL
        return discovered.first(where: { $0.standardizedFileURL == requested })?.standardizedFileURL
    }

    private static let outsideSuiteNote =
        "That transcript is not one of the open story's — the Testing tab only touches the suite it discovered."
}
