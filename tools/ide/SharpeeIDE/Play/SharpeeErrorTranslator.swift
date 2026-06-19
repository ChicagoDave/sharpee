// SharpeeErrorTranslator.swift
// Translates raw JS/TS runtime error messages into author-facing "Sharpee speak": a plain
// title plus a how-to-fix hint for the patterns IF authors commonly hit. Unknown errors
// fall back to the raw message (never worse than showing the original).
// Public interface: TranslatedError, SharpeeErrorTranslator.translate(message:sourceLine:).
// Owner context: tools/ide — Play.

import Foundation

/// An error rendered for an author: a plain-language title, an optional fix hint, and the
/// original message (always kept, shown as "Original error").
struct TranslatedError: Equatable {
    let title: String
    let fix: String?
    let raw: String
}

enum SharpeeErrorTranslator {

    /// Translates `message` (the raw error line), optionally using the offending `sourceLine`
    /// for context. Returns the first matching rule's translation, else a raw fallback.
    static func translate(message: String, sourceLine: String? = nil) -> TranslatedError {
        let cleaned = stripPrefix(message)
        let matched = notAFunction(cleaned, sourceLine)
            ?? readingPropertyOfUndefined(cleaned, sourceLine)
            ?? notDefined(cleaned, sourceLine)
        // Always keep the true original message as `raw` (the rules see the cleaned form).
        if let matched {
            return TranslatedError(title: matched.title, fix: matched.fix, raw: message)
        }
        return TranslatedError(title: cleaned, fix: nil, raw: message)
    }

    // MARK: - Rules

    /// `world.foo is not a function` / `x.y is not a function`. Note: the `raw` it records is
    /// the cleaned message (prefix already stripped) — callers keep the true original too.
    private static func notAFunction(_ message: String, _ sourceLine: String?) -> TranslatedError? {
        guard let m = firstMatch(#"^(.*?) is not a function"#, in: message) else { return nil }
        let callee = m // e.g. "world.getLastCreatedEntityId"
        let parts = callee.split(separator: ".").map(String.init)
        if parts.count >= 2, parts[0] == "world" {
            let method = parts[1]
            return TranslatedError(
                title: "The world has no \(method) method",
                fix: "Your story called world.\(method)(…), but that isn’t part of the world model. "
                    + "Check the method name against the world API, or use the value returned when the "
                    + "entity is created instead of looking it up afterwards.",
                raw: message)
        }
        let name = parts.last ?? callee
        return TranslatedError(
            title: "\(name) is not a function",
            fix: "Your story called \(callee)(…), which isn’t available here — check for a typo or a "
                + "missing import.",
            raw: message)
    }

    /// `Cannot read properties of undefined (reading 'id')` / `undefined is not an object (evaluating '…id')`.
    private static func readingPropertyOfUndefined(_ message: String, _ sourceLine: String?) -> TranslatedError? {
        let property = firstMatch(#"reading '([^']+)'"#, in: message)
            ?? firstMatch(#"evaluating '[^']*\.([A-Za-z0-9_]+)'"#, in: message)
        let isUndefined = message.contains("undefined") &&
            (message.contains("Cannot read propert") || message.contains("is not an object"))
        guard isUndefined else { return nil }
        let prop = property.map { "‘\($0)’" } ?? "a property"
        return TranslatedError(
            title: "Something was undefined when reading \(prop)",
            fix: "A value was undefined where your story expected an object. A common cause is an entity "
                + "lookup that found nothing (wrong id), or a trait/property that wasn’t set before it was used.",
            raw: message)
    }

    /// `foo is not defined` (ReferenceError).
    private static func notDefined(_ message: String, _ sourceLine: String?) -> TranslatedError? {
        guard let name = firstMatch(#"^(.*?) is not defined"#, in: message) else { return nil }
        return TranslatedError(
            title: "\(name) isn’t defined",
            fix: "\(name) isn’t in scope here — check for a missing import or a typo.",
            raw: message)
    }

    // MARK: - Helpers

    /// Drops a leading "Unhandled rejection: " / "TypeError: " style prefix for matching/title.
    private static func stripPrefix(_ message: String) -> String {
        var text = message
        for prefix in ["Unhandled rejection: ", "Uncaught "] where text.hasPrefix(prefix) {
            text.removeFirst(prefix.count)
        }
        // Drop a leading error-class label like "TypeError: ".
        if let range = text.range(of: #"^[A-Z][A-Za-z]*Error: "#, options: .regularExpression) {
            text.removeSubrange(range)
        }
        return text
    }

    private static func firstMatch(_ pattern: String, in text: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let ns = text as NSString
        guard let match = regex.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)),
              match.numberOfRanges >= 2, match.range(at: 1).location != NSNotFound else { return nil }
        return ns.substring(with: match.range(at: 1))
    }
}
