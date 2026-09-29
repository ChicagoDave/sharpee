// What the testing surface posts on its `testingSurface` handler, read on the host's side.
//
// The surface posts a handful of keyed JSON objects down one channel: `{run:true}` for the
// Run button, `{tree:{written,removed}}` for the test tree's changed files (ADR-355 — only
// the segment files a change touched, and the names to remove), `{state:{…}}` for the view
// sidecar, and `{openSource:{file,line}}` when a span in the run column is clicked
// (GH #524 Phase 2). This file reads the tree write and the source request, and lands a
// tree write on disk; the run request stays where it was. A post this host cannot parse is
// view state and not its business, so every reader here answers "not this" rather than
// throwing.
//
// Public interface: TestingSurfacePosts.ReadOpenSource, TestingSurfacePosts.ReadTreeWrite,
// TestingSurfacePosts.IsTreeFileName, TestingSurfacePosts.ApplyTreeWrite, OpenSourceRequest,
// TreeWrite.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text;
using System.Text.Json.Nodes;

namespace PaneHost.Shell;

/// <summary>A span the run column asked the editor to open.</summary>
/// <param name="File">The source file relative to the story folder, or null for the story file itself.</param>
/// <param name="Line">1-based line.</param>
internal readonly record struct OpenSourceRequest(string? File, int Line);

/// <summary>One tree post: the files to write, by name, and the names to remove.</summary>
/// <param name="Written">File name → contents, each a canonical segment file or the manifest.</param>
/// <param name="Removed">File names to delete from the tree directory.</param>
internal sealed record TreeWrite(IReadOnlyDictionary<string, string> Written, IReadOnlyList<string> Removed);

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

    /// <summary>
    /// The `tree` write in a post, or null when the post is anything else. Entries that are
    /// not strings, and names failing <see cref="IsTreeFileName"/>, are dropped — the write
    /// never names a file outside the tree directory.
    /// </summary>
    /// <param name="body">The raw JSON the page posted.</param>
    /// <returns>The write, or null.</returns>
    public static TreeWrite? ReadTreeWrite(string body)
    {
        try
        {
            if (JsonNode.Parse(body)?["tree"] is not JsonObject tree) return null;
            var written = new Dictionary<string, string>(StringComparer.Ordinal);
            if (tree["written"] is JsonObject files)
            {
                foreach (var (name, value) in files)
                {
                    if (IsTreeFileName(name) && value is JsonValue text && text.TryGetValue<string>(out var contents))
                        written[name] = contents;
                }
            }
            var removed = new List<string>();
            if (tree["removed"] is JsonArray names)
            {
                foreach (var entry in names)
                {
                    if (entry is JsonValue value && value.TryGetValue<string>(out var name) && IsTreeFileName(name))
                        removed.Add(name);
                }
            }
            return new TreeWrite(written, removed);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Whether the page may name this file: a plain `&lt;name&gt;.json` inside the tree
    /// directory — no path component, no parent step, no dotfile.
    /// </summary>
    /// <param name="name">The file name the post carried.</param>
    /// <returns>True for a name the writer may touch.</returns>
    public static bool IsTreeFileName(string name) =>
        name.Length > 0
        && !name.StartsWith('.')
        && !name.Contains('/')
        && !name.Contains('\\')
        && name.EndsWith(".json", StringComparison.Ordinal);

    /// <summary>
    /// Lands a tree write in a directory: each written file (UTF-8, no BOM — the tree is
    /// JSON the CLI walker and the surface both re-read, and a BOM breaks JSON parsers) and
    /// each removed name deleted. Creates the directory when it is missing.
    /// </summary>
    /// <param name="directory">The `&lt;story-id&gt;.tests/` directory.</param>
    /// <param name="write">The write <see cref="ReadTreeWrite"/> produced.</param>
    public static void ApplyTreeWrite(string directory, TreeWrite write)
    {
        Directory.CreateDirectory(directory);
        foreach (var (name, contents) in write.Written)
        {
            if (IsTreeFileName(name)) File.WriteAllText(Path.Combine(directory, name), contents, new UTF8Encoding(false));
        }
        foreach (var name in write.Removed)
        {
            var path = Path.Combine(directory, name);
            if (IsTreeFileName(name) && File.Exists(path)) File.Delete(path);
        }
    }
}
