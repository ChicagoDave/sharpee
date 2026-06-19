// ShellEnvironment.swift
// Resolves the environment a spawned build needs — chiefly a PATH that includes the
// user's toolchain (node, pnpm, tsf). A GUI app launched from Finder/LaunchServices
// inherits only a minimal PATH, so `./sharpee`'s `exec node` fails with "node: not found"
// (exit 127). We consult the user's login+interactive shell once to recover the real PATH
// (nvm / homebrew / volta all live there).
// Public interface: ShellEnvironment.buildEnvironment(), loginPATH().
// Owner context: tools/ide — Build.

import Foundation

@MainActor
enum ShellEnvironment {

    private static var cachedPATH: String?
    private static var didResolve = false

    /// The environment for a build subprocess: the app's environment with PATH replaced
    /// by the user's login-shell PATH, falling back to common toolchain directories when
    /// the shell can't be consulted.
    static func buildEnvironment() -> [String: String] {
        var env = ProcessInfo.processInfo.environment
        if let path = loginPATH(), !path.isEmpty {
            env["PATH"] = path
        } else {
            let fallback = "/opt/homebrew/bin:/usr/local/bin"
            env["PATH"] = env["PATH"].map { "\($0):\(fallback)" } ?? fallback
        }
        return env
    }

    /// The user's PATH as their login+interactive shell defines it, resolved once and
    /// cached. Returns nil if the shell can't be run or yields nothing.
    static func loginPATH() -> String? {
        if didResolve { return cachedPATH }
        didResolve = true
        cachedPATH = resolveLoginPATH()
        return cachedPATH
    }

    private static func resolveLoginPATH() -> String? {
        let shell = ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh"
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: shell)
        // Login + interactive so .zprofile AND .zshrc run (nvm typically lives in .zshrc).
        // Sentinel-wrap the value so any shell-startup chatter on stdout is easy to strip.
        proc.arguments = ["-ilc", "printf '<<<SHARPEE_PATH>>>%s<<<END>>>' \"$PATH\""]

        let out = Pipe()
        proc.standardOutput = out
        proc.standardError = Pipe() // discard startup noise

        do {
            try proc.run()
            let data = out.fileHandleForReading.readDataToEndOfFile()
            proc.waitUntilExit()
            guard let text = String(data: data, encoding: .utf8),
                  let start = text.range(of: "<<<SHARPEE_PATH>>>"),
                  let end = text.range(of: "<<<END>>>"),
                  start.upperBound <= end.lowerBound else { return nil }
            let path = String(text[start.upperBound..<end.lowerBound])
            return path.isEmpty ? nil : path
        } catch {
            return nil
        }
    }
}
