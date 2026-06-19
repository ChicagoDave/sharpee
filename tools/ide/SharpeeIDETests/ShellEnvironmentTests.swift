// ShellEnvironmentTests.swift
// Real-path coverage for ShellEnvironment: buildEnvironment() actually spawns the login
// shell to resolve PATH and always yields a usable PATH including system directories.

import XCTest
@testable import SharpeeIDE

@MainActor
final class ShellEnvironmentTests: XCTestCase {

    func testBuildEnvironmentPATHIsNonEmptyAndIncludesSystemDirectories() {
        let path = ShellEnvironment.buildEnvironment()["PATH"] ?? ""
        XCTAssertFalse(path.isEmpty)
        XCTAssertTrue(path.contains("/usr/bin") || path.contains("/bin"), "PATH was: \(path)")
    }

    func testBuildEnvironmentRetainsOtherInheritedVariables() {
        // Replacing PATH must not drop the rest of the environment (e.g. HOME).
        let env = ShellEnvironment.buildEnvironment()
        XCTAssertNotNil(env["HOME"])
    }

    func testLoginPATHWhenResolvedIsNonEmpty() {
        // On a dev machine the login shell yields a PATH. Allow nil (e.g. headless), but
        // if present it must be non-empty.
        if let path = ShellEnvironment.loginPATH() {
            XCTAssertFalse(path.isEmpty)
        }
    }
}
