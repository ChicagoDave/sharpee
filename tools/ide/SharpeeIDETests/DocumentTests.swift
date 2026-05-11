// DocumentTests.swift
// Covers Document.load(from:), Document.save(), and the isDirty contract on success/failure.

import XCTest
@testable import SharpeeIDE

final class DocumentTests: XCTestCase {

    private var tempDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-DocumentTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let dir = tempDir, FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.removeItem(at: dir)
        }
        tempDir = nil
        super.tearDown()
    }

    // MARK: - load

    func testLoadReadsUTF8FileAndBindsURL() throws {
        let file = tempDir.appendingPathComponent("hello.txt")
        try "Hello, Sharpee.".write(to: file, atomically: true, encoding: .utf8)

        let doc = try Document.load(from: file)

        XCTAssertEqual(doc.url, file)
        XCTAssertEqual(doc.content, "Hello, Sharpee.")
        XCTAssertFalse(doc.isDirty)
    }

    func testLoadThrowsForMissingFile() {
        let missing = tempDir.appendingPathComponent("not-there.txt")
        XCTAssertThrowsError(try Document.load(from: missing))
    }

    func testLoadThrowsNotUTF8ForInvalidBytes() throws {
        let file = tempDir.appendingPathComponent("binary.bin")
        // Lone 0xFF is invalid as UTF-8.
        try Data([0xFF, 0xFE, 0xFD]).write(to: file)

        XCTAssertThrowsError(try Document.load(from: file)) { error in
            guard case DocumentError.notUTF8(let url) = error else {
                return XCTFail("Expected DocumentError.notUTF8, got \(error)")
            }
            XCTAssertEqual(url, file)
        }
    }

    // MARK: - save

    func testSaveWritesContentAndClearsDirty() throws {
        let file = tempDir.appendingPathComponent("out.txt")
        let doc = Document(url: file, content: "first draft", isDirty: true)

        try doc.save()

        XCTAssertFalse(doc.isDirty)
        let onDisk = try String(contentsOf: file, encoding: .utf8)
        XCTAssertEqual(onDisk, "first draft")
    }

    func testSaveOverwritesExistingFile() throws {
        let file = tempDir.appendingPathComponent("over.txt")
        try "old".write(to: file, atomically: true, encoding: .utf8)

        let doc = Document(url: file, content: "new", isDirty: true)
        try doc.save()

        let onDisk = try String(contentsOf: file, encoding: .utf8)
        XCTAssertEqual(onDisk, "new")
        XCTAssertFalse(doc.isDirty)
    }

    func testSaveFailurePreservesIsDirty() {
        // Write into a parent directory that does not exist — the atomic write
        // will fail because the temp file location is invalid.
        let unwritable = tempDir
            .appendingPathComponent("does-not-exist", isDirectory: true)
            .appendingPathComponent("file.txt")

        let doc = Document(url: unwritable, content: "anything", isDirty: true)

        XCTAssertThrowsError(try doc.save())
        XCTAssertTrue(doc.isDirty, "isDirty must remain true so the caller can retry")
        XCTAssertFalse(FileManager.default.fileExists(atPath: unwritable.path))
    }

    // MARK: - isDirty contract

    func testInitDefaultsIsDirtyToFalse() {
        let doc = Document(url: tempDir.appendingPathComponent("x.txt"), content: "")
        XCTAssertFalse(doc.isDirty)
    }

    func testInitAcceptsExplicitDirtyFlag() {
        let doc = Document(url: tempDir.appendingPathComponent("x.txt"),
                           content: "",
                           isDirty: true)
        XCTAssertTrue(doc.isDirty)
    }
}
