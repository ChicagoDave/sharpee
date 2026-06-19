// SharpeeErrorTranslator.swift
// Translates raw JS/TS runtime error messages into author-facing "Sharpee speak": a plain
// title plus a how-to-fix hint for the patterns IF authors commonly hit. Unknown errors
// fall back to the raw message (never worse than showing the original).
// Public interface: TranslatedError, SharpeeErrorTranslator.translate(message:sourceLine:).
// Owner context: tools/ide — Play.

import Foundation

/// An error rendered for an author — the output of the Actual Error → Sharpee Translation
/// layer. The view just renders these fields.
struct TranslatedError: Equatable {
    /// Short plain-language restatement (e.g. "The world has no `getLastCreatedEntityId` method").
    let title: String
    /// What happened, in Sharpee/IF-authoring terms (the "why").
    let explanation: String?
    /// How to fix it — concrete, with an example where useful.
    let fix: String?
    /// The original message, always preserved.
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
            return TranslatedError(title: matched.title, explanation: matched.explanation,
                                   fix: matched.fix, raw: message)
        }
        return TranslatedError(title: cleaned, explanation: nil, fix: nil, raw: message)
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
                explanation: "While your story was building its world, it called world.\(method)(). "
                    + "The Sharpee world model has no such method, so the call fails the moment the "
                    + "world is set up — which is why the game won’t start.",
                fix: "Use the entity each create-call returns instead of looking it back up. For example, "
                    + "capture it:\n\n    const item = createSceneryItem(world, …);\n"
                    + "    world.moveEntity(item.id, RoomIds.foyer);\n\n"
                    + "rather than calling a world.\(method)()-style lookup afterwards.",
                raw: message)
        }
        let name = parts.last ?? callee
        return TranslatedError(
            title: "\(name) is not a function",
            explanation: "Your story called \(callee)(), but \(callee) isn’t a function at that point — "
                + "it’s undefined, or it’s a value of another kind.",
            fix: "Check \(callee) for a typo or a missing import, and confirm it’s actually a function "
                + "where you call it.",
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
            explanation: "Your story tried to read \(prop) from a value that was undefined. In IF terms "
                + "this usually means an entity you expected wasn’t there — an id that didn’t match, an "
                + "entity that was never created, or a trait that wasn’t added.",
            fix: "Check the entity/value just before this line: make sure it was created and (if you "
                + "looked it up) that the id is correct, and that any trait you read was added to it.",
            raw: message)
    }

    /// `foo is not defined` (ReferenceError).
    private static func notDefined(_ message: String, _ sourceLine: String?) -> TranslatedError? {
        guard let name = firstMatch(#"^(.*?) is not defined"#, in: message) else { return nil }
        return TranslatedError(
            title: "\(name) isn’t defined",
            explanation: "Your story used \(name), but nothing by that name is in scope here — it was "
                + "never declared, or it lives in another file that isn’t imported.",
            fix: "Add an import for \(name), or fix the spelling to match where it’s defined.",
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
