// What the testing surface posts on its `testingSurface` handler, read on the host's side.
//
// The surface posts a handful of keyed JSON objects down one channel: `{run:true}` for the
// Run button, `{document:{text}}` for the tree document, `{state:{…}}` for the view
// sidecar, and `{openSource:{file,line}}` when a span in the run column is clicked
// (GH #524 Phase 2). This file reads the last one; the run request stays where it was.
// A post this host cannot parse is view state and not its business, so every reader here
// answers "not this" rather than throwing.
//
// Public interface: TestingSurfacePosts.ReadOpenSource, OpenSourceRequest.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json.Nodes;

namespace PaneHost.Shell;

/// <summary>A span the run column asked the editor to open.</summary>
/// <param name="File">The source file relative to the story folder, or null for the story file itself.</param>
/// <param name="Line">1-based line.</param>
internal readonly record struct OpenSourceRequest(string? File, int Line);

/// <summary>Readers for the surface's keyed posts.</summary>
internal static class TestingSurfacePosts
{
    /// <summary>
    /// The `openSource` request in a post, or null when the post is anything else — a run
    /// request, a document, view state, or something this host cannot parse.
    /// </summary>
    /// <param name="body">The raw JSON the page posted.</param>
    /// <returns>The request, or null.</returns>
    public static OpenSourceRequest? ReadOpenSource(string body)
    {
        try
        {
            if (JsonNode.Parse(body)?["openSource"] is not JsonObject open) return null;
            if (open["line"] is not JsonValue lineValue || !lineValue.TryGetValue<int>(out var line)) return null;
            if (line < 1) return null;
            var file = open["file"] is JsonValue fileValue && fileValue.TryGetValue<string>(out var text)
                && !string.IsNullOrEmpty(text)
                ? text
                : null;
            return new OpenSourceRequest(file, line);
        }
        catch
        {
            return null;
        }
    }
}
