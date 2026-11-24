// What the testing surface posts on its `testingSurface` handler, read on the host's side.
//
// The surface posts a handful of keyed JSON objects down one channel: `{run:true}` for the
// Run button, `{tree:{written,removed}}` for the test tree's changed files (ADR-355 — only
// the segment files a change touched, and the names to remove), `{state:{…}}` for the view
// sidecar, and `{openSource:{file,line}}` when a span in the run column is clicked
// (GH #524 Phase 2) — `{openSource:{file,line,column,length}}` when a lens card names its
// phrase (ADR-408 D9), which PhraseSelection places in the document's text. This file reads the tree write and the source request, and lands a
// tree write on disk; the run request stays where it was. A post this host cannot parse is
// view state and not its business, so every reader here answers "not this" rather than
// throwing.
//
// The page also posts `{lock:{args}}` (ADR-367 D7): the `sharpee claim` argument list for one
// step of the lock gesture, which the host spawns and whose one-object stdout it hands back
// through `lockResult`.
//
// Public interface: TestingSurfacePosts.ReadOpenSource, TestingSurfacePosts.PhraseSelection,
// TestingSurfacePosts.ReadTreeWrite,
// TestingSurfacePosts.ReadLock, TestingSurfacePosts.IsTreeFileName,
// TestingSurfacePosts.ApplyTreeWrite, TestingSurfacePosts.SnapshotTree,
// TestingSurfacePosts.RestoreTree, OpenSourceRequest, SourcePhrase, TreeWrite, TreeRestore.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text;
using System.Text.Json.Nodes;

namespace PaneHost.Shell;

/// <summary>A span the run column asked the editor to open.</summary>
/// <param name="File">The source file relative to the story folder, or null for the story file itself.</param>
/// <param name="Line">1-based line.</param>
/// <param name="Phrase">
/// The phrase to select on that line (ADR-408 D9), or null for a line-only request, which
/// reveals the line as before (AC-6).
/// </param>
internal readonly record struct OpenSourceRequest(string? File, int Line, SourcePhrase? Phrase = null);

/// <summary>
/// Where a phrase starts on its line and how long it is, as a lens card's source request
/// carries it: a 1-based column and a length, both in UTF-16 code units, the length counting
/// any line break inside the phrase. Both are at least 1; <see cref="TestingSurfacePosts.ReadOpenSource"/>
/// builds one only then.
/// </summary>
/// <param name="Column">1-based column the phrase starts at.</param>
/// <param name="Length">Its length.</param>
internal readonly record struct SourcePhrase(int Column, int Length);

/// <summary>One tree post: the files to write, by name, and the names to remove.</summary>
/// <param name="Written">File name → contents, each a canonical segment file or the manifest.</param>
/// <param name="Removed">File names to delete from the tree directory.</param>
internal sealed record TreeWrite(IReadOnlyDictionary<string, string> Written, IReadOnlyList<string> Removed);

/// <summary>What restoring a tree directory to a snapshot changed.</summary>
/// <param name="Rewritten">Files written back because they differed or were missing.</param>
/// <param name="Removed">Tree files deleted because the snapshot did not hold them.</param>
internal readonly record struct TreeRestore(int Rewritten, int Removed);

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
            return new OpenSourceRequest(file, line, ReadPhrase(open));
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// The phrase's place on an `openSource` body: its `column` and `length` when both are
    /// whole numbers of at least 1, otherwise null, so a line-only or malformed range opens
    /// the line as before (AC-6).
    /// </summary>
    private static SourcePhrase? ReadPhrase(JsonObject open)
    {
        if (open["column"] is not JsonValue columnValue || !columnValue.TryGetValue<int>(out var column)) return null;
        if (open["length"] is not JsonValue lengthValue || !lengthValue.TryGetValue<int>(out var length)) return null;
        return column >= 1 && length >= 1 ? new SourcePhrase(column, length) : null;
    }

    /// <summary>
    /// Where a phrase lies in a document's text: the offset of its first character and its
    /// length, for the editor's selection. Lines are counted at `\n`, as SharpeeIDE's
    /// `EditorViewController.phraseRange` counts them, so both heads select the same text.
    /// </summary>
    /// <param name="text">The open document's whole text.</param>
    /// <param name="line">The 1-based line the phrase starts on.</param>
    /// <param name="phrase">Its column and length.</param>
    /// <returns>
    /// The offset and length; null when the line is beyond the text, the column lies past the
    /// line's end, or the phrase runs past the text's end — a range from an older build, which
    /// the caller answers by revealing the line instead.
    /// </returns>
    public static (int Offset, int Length)? PhraseSelection(string text, int line, SourcePhrase phrase)
    {
        if (line < 1 || phrase.Column < 1 || phrase.Length < 1) return null;
        var start = 0;
        for (var current = 1; current < line; current++)
        {
            var newline = text.IndexOf('\n', start);
            if (newline < 0) return null;
            start = newline + 1;
        }
        var lineEnd = text.IndexOf('\n', start);
        var contentsEnd = lineEnd < 0 ? text.Length : lineEnd;
        if (contentsEnd > start && text[contentsEnd - 1] == '\r') contentsEnd--;
        var offset = start + phrase.Column - 1;
        if (offset >= contentsEnd || offset + phrase.Length > text.Length) return null;
        return (offset, phrase.Length);
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

    /// <summary>
    /// The tree files in a tree directory, by name, as exact bytes: the files
    /// <see cref="IsTreeFileName"/> lets the surface write, and no others. A driver takes
    /// this before it types into the surface, so it can put the author's tree back
    /// (<see cref="RestoreTree"/>). Empty when the directory does not exist.
    /// </summary>
    /// <param name="directory">The `&lt;story-id&gt;.tests/` directory.</param>
    /// <returns>Each tree file's name and contents.</returns>
    public static IReadOnlyDictionary<string, byte[]> SnapshotTree(string directory)
    {
        var files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        if (!Directory.Exists(directory)) return files;
        foreach (var path in Directory.GetFiles(directory))
        {
            var name = Path.GetFileName(path);
            if (IsTreeFileName(name)) files[name] = File.ReadAllBytes(path);
        }
        return files;
    }

    /// <summary>
    /// Puts a tree directory back to a <see cref="SnapshotTree"/> reading: each recorded
    /// file rewritten when its bytes differ or it is missing, and each tree file the
    /// snapshot does not hold deleted. Touches tree files only — the same set
    /// <see cref="ApplyTreeWrite"/> may touch — so nothing else in the directory moves.
    /// </summary>
    /// <param name="directory">The `&lt;story-id&gt;.tests/` directory.</param>
    /// <param name="snapshot">The reading to restore.</param>
    /// <returns>How many files were rewritten and how many removed.</returns>
    public static TreeRestore RestoreTree(string directory, IReadOnlyDictionary<string, byte[]> snapshot)
    {
        var rewritten = 0;
        var removed = 0;
        if (Directory.Exists(directory))
        {
            foreach (var path in Directory.GetFiles(directory))
            {
                var name = Path.GetFileName(path);
                if (!IsTreeFileName(name) || snapshot.ContainsKey(name)) continue;
                File.Delete(path);
                removed++;
            }
        }
        foreach (var (name, bytes) in snapshot)
        {
            var path = Path.Combine(directory, name);
            if (File.Exists(path) && File.ReadAllBytes(path).AsSpan().SequenceEqual(bytes)) continue;
            Directory.CreateDirectory(directory);
            File.WriteAllBytes(path, bytes);
            rewritten++;
        }
        return new TreeRestore(rewritten, removed);
    }

    /// <summary>
    /// The `lock` request in a post (ADR-367 D7), or null when the post is anything else.
    /// The page writes the whole `sharpee claim` argument list itself — one spelling of the
    /// CLI's flags, in the page — and this host only spawns it; so the list must start with
    /// `claim` and hold strings alone, and the host appends the project. Any other shape is
    /// "not this".
    /// </summary>
    /// <param name="body">The raw JSON the page posted.</param>
    /// <returns>The arguments after the executable, or null.</returns>
    public static IReadOnlyList<string>? ReadLock(string body)
    {
        try
        {
            if (JsonNode.Parse(body)?["lock"] is not JsonObject lock_) return null;
            if (lock_["args"] is not JsonArray array || array.Count == 0) return null;
            var args = new List<string>(array.Count);
            foreach (var entry in array)
            {
                if (entry is not JsonValue value || !value.TryGetValue<string>(out var text)) return null;
                args.Add(text);
            }
            return args[0] == "claim" ? args : null;
        }
        catch
        {
            return null;
        }
    }
}
