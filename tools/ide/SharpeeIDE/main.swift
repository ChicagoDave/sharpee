// main.swift
// Explicit application entry point for Sharpee IDE.
// Top-level code in a file named exactly `main.swift` is the module's entry point —
// no @main attribute and no NSApplicationMain magic.
// Owner context: tools/ide — App shell.

import AppKit

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
