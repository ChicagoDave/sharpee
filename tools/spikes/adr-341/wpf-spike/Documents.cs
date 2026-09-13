// SPIKE CODE — ADR-341 D2, Phase 3. Not product; never shipped.
//
// The editor's document set. The parity table's editor row names these behaviours
// explicitly — "open in tabs, switch, close, save, save all, reload from disk,
// unsaved-change tracking" — so the spike has to actually do them, not merely draw
// a tab strip. Each open document keeps its own tree-sitter highlighter, because
// switching tabs must not re-parse from scratch.

using System.IO;
using ICSharpCode.AvalonEdit.Document;

namespace Adr341.WpfSpike;

public sealed class EditorDocument : IDisposable
{
    public string Path { get; private set; }
    public string Name => System.IO.Path.GetFileName(Path);
    public TextDocument Document { get; }

    /// <summary>Null when the file's language has no tree-sitter grammar (e.g. Chord).</summary>
    public TreeSitterHighlighter? Highlighter { get; }

    /// <summary>What to show instead of a span count when there is no grammar.</summary>
    public string GrammarNote => Highlighter is not null
        ? $"{Highlighter.SpanCount} spans · reparse {Highlighter.LastReparseMs:F2} ms"
        : $"no tree-sitter grammar for {System.IO.Path.GetExtension(Path)} (ADR-182 pending)";

    /// <summary>Caret/scroll restored when the tab is switched back to.</summary>
    public int CaretOffset { get; set; }
    public double ScrollOffset { get; set; }

    private string _savedText;
    public bool IsDirty => Document.Text != _savedText;

    public EditorDocument(string path)
    {
        Path = path;
        var text = File.Exists(path) ? File.ReadAllText(path) : "";
        _savedText = text;
        Document = new TextDocument(text);
        Highlighter = TreeSitterHighlighter.TryCreate(Document, path);
    }

    public void Save()
    {
        File.WriteAllText(Path, Document.Text);
        _savedText = Document.Text;
    }

    /// <summary>Reload from disk, discarding in-memory edits.</summary>
    public void Reload()
    {
        if (!File.Exists(Path)) return;
        var text = File.ReadAllText(Path);
        Document.Text = text;
        _savedText = text;
    }

    public void Dispose() => Highlighter?.Dispose();
}

public sealed class DocumentSet
{
    private readonly List<EditorDocument> _docs = [];

    public IReadOnlyList<EditorDocument> Documents => _docs;
    public int ActiveIndex { get; private set; } = -1;
    public EditorDocument? Active => ActiveIndex >= 0 && ActiveIndex < _docs.Count ? _docs[ActiveIndex] : null;

    public event Action? Changed;

    /// <summary>Opens, or re-focuses if already open — the behaviour of every editor.</summary>
    public EditorDocument Open(string path)
    {
        var existing = _docs.FindIndex(d =>
            string.Equals(d.Path, path, StringComparison.OrdinalIgnoreCase));
        if (existing >= 0)
        {
            ActiveIndex = existing;
            Changed?.Invoke();
            return _docs[existing];
        }

        var doc = new EditorDocument(path);
        _docs.Add(doc);
        ActiveIndex = _docs.Count - 1;
        Changed?.Invoke();
        return doc;
    }

    public void Activate(int index)
    {
        if (index < 0 || index >= _docs.Count) return;
        ActiveIndex = index;
        Changed?.Invoke();
    }

    public void Close(int index)
    {
        if (index < 0 || index >= _docs.Count) return;
        _docs[index].Dispose();
        _docs.RemoveAt(index);
        // Keep the neighbour selected rather than snapping to the first tab.
        if (_docs.Count == 0) ActiveIndex = -1;
        else if (ActiveIndex >= _docs.Count) ActiveIndex = _docs.Count - 1;
        else if (index < ActiveIndex) ActiveIndex--;
        Changed?.Invoke();
    }

    public int SaveAll()
    {
        var n = 0;
        foreach (var d in _docs.Where(d => d.IsDirty)) { d.Save(); n++; }
        Changed?.Invoke();
        return n;
    }
}
