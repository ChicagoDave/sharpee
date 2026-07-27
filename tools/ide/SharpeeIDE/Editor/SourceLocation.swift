// SourceLocation.swift
// A resolved source position the editor can open. Shared by Problems rows,
// symbolicated Play-runtime stack frames, and the Diagnosis pane so all
// click-to-jump surfaces use one path into the editor.
// Public interface: SourceLocation.
// Owner context: tools/ide — Editor.

import Foundation

struct SourceLocation: Equatable {
    let file: URL
    let line: Int
    let column: Int
}
