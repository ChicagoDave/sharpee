// Document.swift
// Models an open file in the editor — its URL, in-memory content, and dirty state.
// Public interface: Document (the model), Document.load(from:) (loader), DocumentError.
// Owner context: tools/ide — Editor model. UI-free; safe to unit-test.

import Foundation

final class Document {

    let url: URL
    var content: String
    var isDirty: Bool

    init(url: URL, content: String, isDirty: Bool = false) {
        self.url = url
        self.content = content
        self.isDirty = isDirty
    }

    /// Loads a UTF-8 text file from disk.
    /// Throws `DocumentError.notUTF8` for binary or non-UTF-8 files.
    static func load(from url: URL) throws -> Document {
        let data = try Data(contentsOf: url)
        guard let text = String(data: data, encoding: .utf8) else {
            throw DocumentError.notUTF8(url: url)
        }
        return Document(url: url, content: text)
    }

    /// Persists `content` to `url` as UTF-8 with atomic replace, then clears the dirty flag.
    /// Throws the underlying error on failure; `isDirty` remains true on failure.
    func save() throws {
        try content.write(to: url, atomically: true, encoding: .utf8)
        isDirty = false
    }
}

enum DocumentError: LocalizedError {
    case notUTF8(url: URL)

    var errorDescription: String? {
        switch self {
        case .notUTF8(let url):
            return "\(url.lastPathComponent) is not a UTF-8 text file. Sharpee can only display text files."
        }
    }
}
