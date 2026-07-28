// FontFamilyTests.swift
// The reader font choices resolve to real faces. Pins SF Mono in particular:
// its standalone PostScript face (SFMono-Regular) is NOT registered system-wide
// on macOS — it ships inside Terminal.app's Resources — so the choice must
// resolve through the system monospaced face, which IS the SF Mono design.
// Asserts the ACTUAL NSFont handed back, not the name we asked for.

import XCTest
import AppKit
@testable import SharpeeIDE

final class FontFamilyTests: XCTestCase {

    func testSFMonoIsOfferedAsAFamilyChoice() {
        XCTAssertTrue(FontFamily.allCases.contains(.sfMono),
                      "SF Mono must appear in the Font menu, which is built from allCases")
        XCTAssertEqual(FontFamily.sfMono.displayName, "SF Mono")
    }

    func testSFMonoResolvesToAFixedPitchFace() {
        let font = FontFamily.sfMono.font(size: 13)
        XCTAssertTrue(font.isFixedPitch,
                      "SF Mono must render monospaced, got: \(font.fontName)")
        XCTAssertEqual(font.pointSize, 13)
        XCTAssertNotEqual(font.fontName, NSFont.systemFont(ofSize: 13).fontName,
                          "must not silently fall through to the proportional system font")
    }

    func testSFMonoBoldIsFixedPitchAndActuallyBold() {
        let bold = FontFamily.sfMono.boldFont(size: 13)
        XCTAssertTrue(bold.isFixedPitch,
                      "the bold face must stay monospaced, got: \(bold.fontName)")
        XCTAssertTrue(bold.fontDescriptor.symbolicTraits.contains(.bold),
                      "bold must be visibly bold, not a fallback to the regular weight (got: \(bold.fontName))")
        XCTAssertNotEqual(bold.fontName, FontFamily.sfMono.font(size: 13).fontName,
                          "bold and regular must be different faces")
    }

    func testEveryFamilyResolvesToARealFaceAtTheRequestedSize() {
        for family in FontFamily.allCases {
            let regular = family.font(size: 15)
            let bold = family.boldFont(size: 15)
            XCTAssertEqual(regular.pointSize, 15, "\(family.displayName) regular")
            XCTAssertEqual(bold.pointSize, 15, "\(family.displayName) bold")
            XCTAssertTrue(bold.fontDescriptor.symbolicTraits.contains(.bold),
                          "\(family.displayName) bold resolved to a non-bold face: \(bold.fontName)")
        }
    }
}
