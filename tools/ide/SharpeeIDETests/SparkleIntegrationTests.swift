// SparkleIntegrationTests.swift
// Pins Chord Writer's Sparkle auto-update wiring (ADR-279 D7) against the real
// built app bundle: the framework and its helpers are actually embedded, the
// two Info.plist values the updater cannot run without are present, and the
// App menu offers "Check for Updates…".
// Public interface: XCTest cases, run by the SharpeeIDETests bundle.
// Owner context: tools/ide — App shell.

import XCTest
import AppKit
@testable import SharpeeIDE

/// These read `Bundle.main`, which under a unit-test bundle with a TEST_HOST is
/// the host app — the same "assert against the real bundle" approach
/// `StoryScaffoldTests` uses for the story template. They therefore fail if the
/// project spec stops embedding Sparkle, which is the regression worth catching:
/// an app that builds and launches perfectly well but can never update itself.
/// Main-actor isolated, matching `AutoAssertionMenuTests`: the menu case builds
/// an `AppDelegate`, whose initializer is main-actor bound.
@MainActor
final class SparkleIntegrationTests: XCTestCase {

    // MARK: - The framework is embedded, not merely linked

    /// Sparkle is useless as a link-only dependency: the updater relaunches the
    /// app from a helper that must be physically present inside the bundle. A
    /// build that links Sparkle but fails to copy it produces an app that
    /// launches, shows the menu item, and fails the moment an update exists.
    func testTheAppBundleEmbedsTheSparkleFramework() throws {
        let frameworks = try XCTUnwrap(Bundle.main.privateFrameworksURL)
        let sparkle = frameworks.appendingPathComponent("Sparkle.framework")
        XCTAssertTrue(FileManager.default.fileExists(atPath: sparkle.path),
                      "Sparkle.framework is not embedded — check the `packages:` entry and the target's package dependency in project.yml")
    }

    /// Sparkle installs updates out of process. `Autoupdate` performs the
    /// replacement after the app exits, and the two XPC services do the
    /// downloading and installing under the app's sandbox rather than in it.
    /// Each is a separate copy step, so each can go missing on its own.
    func testTheEmbeddedFrameworkCarriesItsUpdateHelpers() throws {
        let frameworks = try XCTUnwrap(Bundle.main.privateFrameworksURL)
        let versioned = frameworks
            .appendingPathComponent("Sparkle.framework")
            .appendingPathComponent("Versions")
            .appendingPathComponent("B")

        for helper in ["Autoupdate", "Updater.app",
                       "XPCServices/Downloader.xpc", "XPCServices/Installer.xpc"] {
            let url = versioned.appendingPathComponent(helper)
            XCTAssertTrue(FileManager.default.fileExists(atPath: url.path),
                          "Sparkle.framework is embedded but \(helper) is missing — the update would download and then fail to install")
        }
    }

    // MARK: - The two values the updater cannot run without

    /// The feed URL must be https. Sparkle will refuse a plain-http feed unless
    /// explicitly opted out of, and an updater fetching its instructions over a
    /// channel anyone can rewrite is the whole reason the EdDSA key exists.
    func testTheBundleCarriesAnHTTPSFeedURL() throws {
        let raw = try XCTUnwrap(
            Bundle.main.object(forInfoDictionaryKey: "SUFeedURL") as? String,
            "SUFeedURL is absent from Info.plist — the updater has nowhere to look")
        let url = try XCTUnwrap(URL(string: raw), "SUFeedURL is not a parseable URL: \(raw)")
        XCTAssertEqual(url.scheme, "https",
                       "the appcast must be fetched over https — an updater that trusts a rewritable feed defeats the signature check")
    }

    /// Each architecture polls its own appcast, because Sparkle has no
    /// architecture filter — `sparkle:hardwareRequirements` can require Apple
    /// silicon but cannot express "Intel only", and Rosetta means an
    /// Apple-silicon Mac matches an Intel item anyway. A slice pointed at the
    /// wrong feed hands the author the other architecture's build: an app that
    /// launches and then cannot build a story, which is exactly the failure
    /// separate per-arch installers exist to prevent.
    ///
    /// This asserts the built binary's OWN architecture against the URL compiled
    /// into it, so a broken `$(ARCHS)` substitution fails here rather than in an
    /// author's update.
    func testTheFeedURLMatchesTheBuildsArchitecture() throws {
        let raw = try XCTUnwrap(Bundle.main.object(forInfoDictionaryKey: "SUFeedURL") as? String)

        #if arch(arm64)
        let expected = "arm64"
        #elseif arch(x86_64)
        let expected = "x86_64"
        #else
        let expected = "unsupported"
        XCTFail("this build is neither arm64 nor x86_64 — the per-arch feed scheme needs revisiting")
        #endif

        XCTAssertTrue(raw.hasSuffix("appcast-\(expected).xml"),
                      "a \(expected) build points at \(raw) — it would be offered the other architecture's update")
    }

    /// The public key is what makes a tampered download detectable. Its absence
    /// does not disable Sparkle loudly; it produces an updater that cannot
    /// verify, which is the failure mode most worth a test.
    func testTheBundleCarriesTheEdDSAPublicKey() throws {
        let key = try XCTUnwrap(
            Bundle.main.object(forInfoDictionaryKey: "SUPublicEDKey") as? String,
            "SUPublicEDKey is absent from Info.plist — downloads could not be verified")
        XCTAssertFalse(key.isEmpty, "SUPublicEDKey is present but empty")

        // Ed25519 public keys are 32 bytes; Sparkle carries them base64-encoded.
        // A truncated or placeholder value would still be a non-empty string.
        let decoded = try XCTUnwrap(Data(base64Encoded: key),
                                    "SUPublicEDKey is not valid base64: \(key)")
        XCTAssertEqual(decoded.count, 32,
                       "SUPublicEDKey decodes to \(decoded.count) bytes, not the 32 an Ed25519 public key occupies")
    }

    /// D7 chose full auto-update over a check-for-updates stopgap, so the
    /// scheduled check is part of the decision rather than a preference.
    func testScheduledChecksAreEnabled() {
        let enabled = Bundle.main.object(forInfoDictionaryKey: "SUEnableAutomaticChecks") as? Bool
        XCTAssertEqual(enabled, true,
                       "scheduled checks are off — that reduces D7's full auto-update to a manual menu item")
    }

    // MARK: - The controller reads what the bundle carries

    /// `isConfigured` gates the menu item, so a wrong answer here shows up as a
    /// permanently disabled (or falsely enabled) "Check for Updates…".
    func testTheUpdateControllerSeesACompleteConfiguration() {
        XCTAssertTrue(UpdateController().isConfigured,
                      "the controller reports an incomplete Sparkle configuration despite the bundle carrying both values")
    }

    /// The controller's `feedURL` must agree with the raw plist value — they are
    /// read through different paths and a disagreement means the About panel or
    /// a diagnostic would report a feed the updater does not actually poll.
    func testTheControllerReportsTheBundlesFeedURL() throws {
        let raw = try XCTUnwrap(Bundle.main.object(forInfoDictionaryKey: "SUFeedURL") as? String)
        XCTAssertEqual(UpdateController().feedURL?.absoluteString, raw)
    }

    // MARK: - The menu surface

    /// Placement is the assertion, not just presence: macOS users look directly
    /// under About for this item, and the menu is built programmatically, so
    /// nothing else pins where it sits.
    func testTheAppMenuOffersCheckForUpdatesDirectlyBelowAbout() throws {
        let delegate = AppDelegate()
        let mainMenu = MenuBuilder.makeMainMenu(target: delegate)
        let appMenu = try XCTUnwrap(mainMenu.items.first?.submenu,
                                    "the main menu has no application menu")

        let index = try XCTUnwrap(
            appMenu.items.firstIndex(where: { $0.action == #selector(AppDelegate.checkForUpdates(_:)) }),
            "the App menu has no \"Check for Updates…\" item")
        let item = appMenu.items[index]

        XCTAssertEqual(item.title, "Check for Updates…")
        XCTAssertTrue(item.target === delegate,
                      "the item is not targeted at the AppDelegate, so selecting it would do nothing")

        // About, then a separator, then this item.
        let aboutIndex = try XCTUnwrap(
            appMenu.items.firstIndex(where: { $0.action == #selector(AppDelegate.showAboutPanel(_:)) }))
        XCTAssertEqual(index, aboutIndex + 2,
                       "\"Check for Updates…\" should sit directly below About (separated by one separator), but About is at \(aboutIndex) and this is at \(index)")
    }
}
