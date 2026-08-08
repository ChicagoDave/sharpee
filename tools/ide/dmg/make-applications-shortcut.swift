#!/usr/bin/env swift
// -------------------------------------------------------------------
// make-applications-shortcut.swift — create the DMG's "Applications" drop
// target as a Finder ALIAS carrying the Chord Writer folder art.
//
// Owner context: tools/ide — packaging. Called by assemble-dmg.sh.
//
// Public interface:
//   make-applications-shortcut.swift <icon.png> <destination-path>
//     writes a Finder alias to /Applications at <destination-path>, with
//     <icon.png> as its custom icon. Exits non-zero with a message on failure.
//
// WHY AN ALIAS AND NOT A SYMLINK — both routes were measured, not assumed:
//
//   1. A symlink cannot carry a custom icon at all. A custom icon is two
//      extended attributes, and writing com.apple.ResourceFork onto a symlink
//      returns EPERM even with XATTR_NOFOLLOW, while an arbitrary xattr on the
//      same link succeeds. The kernel refuses resource forks on symlinks.
//
//   2. Setting the icon on the symlink WITHOUT NOFOLLOW is worse than useless:
//      NSWorkspace.setIcon follows the link and writes an "Icon\r" file plus a
//      custom-icon flag into the target — the real /Applications on the build
//      machine. Confirmed on a throwaway link, where both landed on the target.
//
// An alias is a regular file, so it takes an icon normally and there is no link
// for anything to follow. The cost is that a bookmark records volume identity
// alongside the path; alias resolution falls back to the path, and /Applications
// is present on every Mac, so this resolves. The assembler verifies resolution
// after the fact rather than trusting that argument.
// -------------------------------------------------------------------

import AppKit

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("make-applications-shortcut: " + message + "\n")
        .data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count == 3 else {
    fail("usage: make-applications-shortcut.swift <icon.png> <destination-path>")
}
let iconPath = args[1], destPath = args[2]

let applications = URL(fileURLWithPath: "/Applications")
var isDir: ObjCBool = false
guard FileManager.default.fileExists(atPath: applications.path, isDirectory: &isDir),
      isDir.boolValue else {
    fail("/Applications is missing or is not a directory on this machine")
}

let dest = URL(fileURLWithPath: destPath)

// The alias itself.
do {
    let bookmark = try applications.bookmarkData(options: .suitableForBookmarkFile,
                                                 includingResourceValuesForKeys: nil,
                                                 relativeTo: nil)
    try URL.writeBookmarkData(bookmark, to: dest)
} catch {
    fail("could not write the alias: \(error.localizedDescription)")
}

// The icon. Redrawn at 512 rather than passing a 1024 master straight through:
// setIcon embeds every representation it is given, and the full-size art
// produces a ~4.6MB resource fork that would then travel inside every DMG.
guard let source = NSImage(contentsOfFile: iconPath) else { fail("could not read \(iconPath)") }
let side: CGFloat = 512
let icon = NSImage(size: NSSize(width: side, height: side))
icon.lockFocus()
NSGraphicsContext.current?.imageInterpolation = .high
source.draw(in: NSRect(x: 0, y: 0, width: side, height: side),
            from: .zero, operation: .sourceOver, fraction: 1.0)
icon.unlockFocus()

guard NSWorkspace.shared.setIcon(icon, forFile: dest.path, options: []) else {
    fail("macOS declined to set the custom icon on \(dest.path)")
}

// --- Assert the outcome, rather than trusting the calls above --------

// 1. The real /Applications must be untouched. This is the failure mode the
//    whole design exists to avoid, so it is checked explicitly.
if FileManager.default.fileExists(atPath: applications.path + "/Icon\r") {
    fail("/Applications gained an Icon file. The icon was written THROUGH the "
       + "shortcut to the real folder. Refusing to report success.")
}

// 2. The alias must actually resolve back to /Applications.
do {
    let resolved = try URL(resolvingAliasFileAt: dest, options: [])
    guard resolved.path == applications.path else {
        fail("the alias resolves to \(resolved.path), not /Applications")
    }
} catch {
    fail("the alias does not resolve: \(error.localizedDescription)")
}

// 3. The custom icon must be readable back off the alias.
guard getxattr(dest.path, "com.apple.ResourceFork", nil, 0, 0, 0) > 0 else {
    fail("no resource fork on the alias — the custom icon did not attach")
}

print("  → Applications alias created, custom icon attached, /Applications untouched")
