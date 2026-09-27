// The testing pane's boot session — the payload PaneServer bakes into the testing page.
//
// One builder, used by every window that opens the panes, so the story id, the document
// text and the seed always travel together. The seed is the DOCUMENT'S pin when the story
// has a tree document (ADR-307 D5 — a tree is reproducible only at its own seed) and the
// IDE's fixed play seed for a fresh tree (ADR-305 D1). Until 2026-09-27 both windows wrote
// the constant regardless, so the pane recorded cards at one seed that `sharpee test --tree`
// replayed at another (GH #540).
//
// Public interface: TestingSession.Build, TestingSession.DocumentSeed, TestingSession.FreshTreeSeed.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json;
using System.Text.Json.Nodes;

namespace PaneHost.Shell;

/// <summary>Builds the testing pane's boot session.</summary>
internal static class TestingSession
{
    /// <summary>The seed a fresh tree is pinned at — the IDE's fixed play seed (ADR-305 D1).</summary>
    public const int FreshTreeSeed = 42;

    /// <summary>The session payload: story id, seed, and the document's text.</summary>
    /// <param name="storyId">The story's id — a fresh tree's `story` field.</param>
    /// <param name="documentText">The tree document's text, or "{}" when the story has none.</param>
    /// <returns>The session object the boot script reads `seed` from and the surface reads whole.</returns>
    public static JsonObject Build(string storyId, string documentText) => new()
    {
        ["story"] = storyId,
        ["seed"] = DocumentSeed(documentText) ?? FreshTreeSeed,
        ["document"] = documentText,
    };

    /// <summary>
    /// The seed a tree document pins, or null when the text is not a JSON object carrying
    /// an integer `seed`. This host reads that ONE field; the surface validates the rest.
    /// </summary>
    /// <param name="documentText">The document's text as read from disk.</param>
    /// <returns>The pinned seed, or null.</returns>
    public static int? DocumentSeed(string documentText)
    {
        try
        {
            return JsonNode.Parse(documentText) is JsonObject document
                && document["seed"] is JsonValue value
                && value.TryGetValue<int>(out var seed)
                ? seed
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
