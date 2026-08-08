#!/usr/bin/env swift
// -------------------------------------------------------------------
// make-background.swift — generate the Chord Writer DMG window background.
//
// Owner context: tools/ide — packaging art. Produces a committed asset;
// package.sh consumes `background.tiff` and never runs this script, so a
// release does not depend on this file or on any drawing toolchain.
//
// Public interface:
//   ./make-background.swift              rewrite background.tiff in place
//   ./make-background.swift --preview P  additionally write a PNG to P showing
//                                        the window as an author will see it,
//                                        with the real icons and their labels
//                                        composited at the Finder positions
//
// Run it only when the artwork changes, then commit background.tiff. The
// preview is a development aid and is NOT committed or shipped.
//
// Why a preview mode exists: the layout is applied by Finder on a mounted
// volume, so the only true check is to look at the mounted window — and that
// is unavailable whenever the machine is locked or headless. The preview draws
// the same geometry constants the assembler uses, so a misplaced icon shows up
// here rather than in a shipped DMG.
//
// Why AppKit rather than ImageMagick: the Homebrew ImageMagick here has no
// FreeType delegate, so text falls through to Ghostscript and, when that is
// absent too, the image is written with the text silently MISSING. Nothing
// used here needs installing; it ships with macOS.
//
// The output is a MULTI-REPRESENTATION TIFF (1x + 2x), which is how a DMG
// background goes Retina: Finder picks the representation matching the display.
// A lone 2x image would be drawn at its pixel size and overflow the window.
// -------------------------------------------------------------------

import AppKit

// Artwork: the torn parchment sheet on a desk, carrying its own "Chord Writer"
// lettering and the staff. Committed downscaled; the 2752x1536 master is not in
// the repo. Because the art supplies the wordmark, nothing is drawn over it
// here — a second title would be the word twice.
let SOURCE_ART = "chord-source.jpg"

// Window geometry — the contract with assemble-dmg.sh, which positions the two
// icons at exactly these centres. The background is drawn at the window's
// content origin, so a change here without the matching change there puts the
// icons off the art. dmg-layout-test.sh asserts the pair agree.
//
// Both icon centres sit in the empty parchment below the staff, and well inside
// the band where Finder leaves icons alone: measured on macOS 26, y=120 was
// thrown out of the window entirely and y=150 came back as 195, while anything
// from ~170 down reopened where it was put.
//
// The two icons are NOT level with each other, and the rise is DELIBERATE
// rather than derived. It started as a fix: the sheet is rotated, its lower
// edge climbs to the right, and a level pair put the right-hand label off the
// parchment and onto the desk where Finder's dark label text does not read.
// The rise here is steeper than the sheet's own few degrees — a design call, so
// the pair reads as a diagonal echoing the staff instead of a near-level row
// that merely looks slightly crooked. Do not "correct" it back to the sheet's
// angle; that was tried and looks like a mistake.
let W: CGFloat = 640, H: CGFloat = 420
let APP_X: CGFloat = 215, APP_Y: CGFloat = 302
let DROP_X: CGFloat = 460, DROP_Y: CGFloat = 268
let ICON_SIZE: CGFloat = 96

func srgb(_ hex: UInt32, _ a: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
            green:   CGFloat((hex >> 8) & 0xFF) / 255,
            blue:    CGFloat(hex & 0xFF) / 255,
            alpha:   a)
}

// Sepia drawn from the artwork's own staff lines rather than the app palette:
// the accent blue that suited the old dark background reads as a sticker on
// parchment. The arrow should look like it was inked on the same page.
let INK = srgb(0x4A3828, 0.85)

// The parchment tone, used only as the fallback fill behind the art.
let PARCHMENT = srgb(0xCBBEAD)

/// Draw the background at the given scale.
/// - Parameter scale: 1 for the standard representation, 2 for Retina. Every
///   value is multiplied by it, so the two are one picture at two densities.
/// - Returns: a bitmap whose pixel size is the point size times `scale`.
func render(scale: Int, icons: Bool = false) -> NSBitmapImageRep {
    let s = CGFloat(scale)
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(W * s), pixelsHigh: Int(H * s),
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
    ) else { fatalError("could not allocate the \(scale)x bitmap") }

    // Addressed in POINTS while backed by scale-times pixels, so the drawing
    // below is written once at 1x coordinates.
    rep.size = NSSize(width: W, height: H)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    PARCHMENT.setFill()
    NSRect(x: 0, y: 0, width: W, height: H).fill()

    // --- The artwork, aspect-filled ---------------------------------
    // The source is 16:9 and the window is taller, so the art is scaled to
    // cover and centre-cropped horizontally. That trims some desk at each edge
    // and keeps the whole sheet, which is the subject.
    let artURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().appendingPathComponent(SOURCE_ART)
    guard let art = NSImage(contentsOf: artURL) else {
        fatalError("could not load \(artURL.path)")
    }
    let artSize = art.representations.first.map {
        NSSize(width: $0.pixelsWide, height: $0.pixelsHigh)
    } ?? art.size
    let coverScale = max(W / artSize.width, H / artSize.height)
    let drawn = NSSize(width: artSize.width * coverScale,
                       height: artSize.height * coverScale)
    art.draw(in: NSRect(x: (W - drawn.width) / 2, y: (H - drawn.height) / 2,
                        width: drawn.width, height: drawn.height),
             from: .zero, operation: .sourceOver, fraction: 1.0)

    // AppKit's origin is bottom-left; Finder's is top-left. Everything below is
    // written in Finder coordinates and converted here, so the numbers match
    // the ones assemble-dmg.sh sets.
    func flip(_ y: CGFloat) -> CGFloat { H - y }

    // --- The drag arrow ---------------------------------------------
    // Drawn along the line joining the two icon centres, so it follows the
    // sheet's tilt with them instead of cutting across it. Both ends are pulled
    // back by half an icon plus a margin to clear the artwork.
    let from = NSPoint(x: APP_X, y: flip(APP_Y))
    let to   = NSPoint(x: DROP_X, y: flip(DROP_Y))
    let dx = to.x - from.x, dy = to.y - from.y
    let len = (dx * dx + dy * dy).squareRoot()
    let ux = dx / len, uy = dy / len                 // unit vector along the run
    let clear = ICON_SIZE / 2 + 22
    let a1 = NSPoint(x: from.x + ux * clear, y: from.y + uy * clear)
    let a2 = NSPoint(x: to.x - ux * clear,   y: to.y - uy * clear)
    let head: CGFloat = 13

    INK.setStroke()
    let shaft = NSBezierPath()
    shaft.move(to: a1)
    shaft.line(to: NSPoint(x: a2.x - ux * (head - 1), y: a2.y - uy * (head - 1)))
    shaft.lineWidth = 2.5
    shaft.lineCapStyle = .round
    shaft.stroke()

    // Arrowhead built from the same unit vector and its perpendicular, so it
    // stays square to the shaft at any angle.
    let px = -uy, py = ux                            // perpendicular
    let baseX = a2.x - ux * head, baseY = a2.y - uy * head
    INK.setFill()
    let tip = NSBezierPath()
    tip.move(to: a2)
    tip.line(to: NSPoint(x: baseX + px * head / 2, y: baseY + py * head / 2))
    tip.line(to: NSPoint(x: baseX - px * head / 2, y: baseY - py * head / 2))
    tip.close()
    tip.fill()

    // --- Preview only: the real icons, where Finder will put them ----
    if icons {
        func placeIcon(_ file: String, _ label: String, cx: CGFloat, cy: CGFloat) {
            let url = URL(fileURLWithPath: #filePath)
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .appendingPathComponent("art").appendingPathComponent(file)
            if let img = NSImage(contentsOf: url) {
                // Finder fits the icon inside a square slot centred on the
                // position, preserving aspect.
                let r = min(ICON_SIZE / img.size.width, ICON_SIZE / img.size.height)
                let sz = NSSize(width: img.size.width * r, height: img.size.height * r)
                img.draw(in: NSRect(x: cx - sz.width / 2,
                                    y: flip(cy) - sz.height / 2,
                                    width: sz.width, height: sz.height))
            }
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 12),
                .foregroundColor: NSColor.black,
            ]
            let size = (label as NSString).size(withAttributes: attrs)
            (label as NSString).draw(
                at: NSPoint(x: cx - size.width / 2,
                            y: flip(cy) - ICON_SIZE / 2 - size.height - 4),
                withAttributes: attrs)
        }
        placeIcon("chord-book.png", "Chord Writer", cx: APP_X, cy: APP_Y)

        // The wooden folder IS what ships: assemble-dmg.sh makes the drop target
        // a Finder alias and attaches this art as its custom icon. Drawing it
        // here is therefore honest. It was briefly the system folder instead,
        // back when the shortcut was a symlink and no icon could be attached to
        // it — if that ever regresses, this preview must go back to the system
        // icon rather than keep advertising art the DMG does not carry.
        placeIcon("applications-folder.png", "Applications", cx: DROP_X, cy: DROP_Y)
    }

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let here = URL(fileURLWithPath: #filePath).deletingLastPathComponent()

let image = NSImage(size: NSSize(width: W, height: H))
image.addRepresentation(render(scale: 1))
image.addRepresentation(render(scale: 2))

// LZW rather than the default of none: two representations of a photograph run
// to several megabytes uncompressed, and this asset is committed AND copied
// into every DMG. Lossless, so the art is unchanged.
guard let tiff = NSBitmapImageRep.representationOfImageReps(
    in: image.representations, using: .tiff,
    properties: [.compressionMethod: NSBitmapImageRep.TIFFCompression.lzw.rawValue]
) else { fatalError("NSImage produced no TIFF representation") }

let out = here.appendingPathComponent("background.tiff")
try tiff.write(to: out)

// Assert what was actually written rather than trusting the draw calls: one
// representation means Retina silently did not happen.
let check = NSImage(contentsOf: out)!
print("wrote \(out.path)")
for r in check.representations {
    print("  rep: \(r.pixelsWide)x\(r.pixelsHigh) px at \(Int(r.size.width))x\(Int(r.size.height)) pt")
}
guard check.representations.count == 2 else {
    fatalError("expected 2 representations, got \(check.representations.count)")
}

// --preview <path>
let args = CommandLine.arguments
if let i = args.firstIndex(of: "--preview"), i + 1 < args.count {
    let previewRep = render(scale: 2, icons: true)
    guard let png = previewRep.representation(using: .png, properties: [:]) else {
        fatalError("could not encode the preview")
    }
    try png.write(to: URL(fileURLWithPath: args[i + 1]))
    print("wrote preview \(args[i + 1])")
}
