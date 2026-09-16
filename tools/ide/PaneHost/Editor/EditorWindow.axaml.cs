// Phase 3's editor measurement harness.
//
// Loads the same 1755-line Chord file the WPF and OpenSilver spikes measured,
// colors it from the real lexer through ChordLexerService, then runs the
// parity-table rows in order and writes every number to the run log: whole-
// document style pass, per-character typed cost, select-and-scroll from outside
// the editor, programmatic undoable replace with a hash round trip, line numbers,
// and word wrap.
//
// Public interface: EditorWindow, constructed by App when --editor is passed.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Threading;
using AvaloniaEdit.Document;
using PaneHost.Hosting;

namespace PaneHost.Editor;

public partial class EditorWindow : Window
{
    // The spike measured against a generated 1755-line file outside the repository.
    // In-repo the editor opens fernhill's own source, which is checked in.
    private static string MeasureFile => RepoPaths.FernhillStory;
    private static string LexerServer => RepoPaths.EditorBridge;
    private static string VendoredNode => RepoPaths.Node;

    private readonly ProbeLog _log = new(Path.Combine(RepoPaths.DevOut, "editor-log.txt"));
    private readonly ChordColorizer _colorizer = new();
    private ChordLexerService? _lexer;

    public EditorWindow()
    {
        InitializeComponent();
        Editor.TextArea.TextView.LineTransformers.Add(_colorizer);
    }

    protected override void OnLoaded(RoutedEventArgs e)
    {
        base.OnLoaded(e);
        _ = RunAsync();
    }

    private async Task RunAsync()
    {
        try
        {
            await StartLexerAsync();
            await LoadAsync();
            await MeasureStylePassAsync();
            await MeasureTypingAsync();
            await SelectAndScrollAsync();
            await ReplaceAndUndoAsync();
            ReportGutterAndWrap();
            _log.Line("editor: done");
        }
        catch (Exception ex)
        {
            _log.Line($"editor: FAILED with {ex.GetType().Name}: {ex.Message}");
        }

        // --hold leaves the window up so the styled document can be captured;
        // without it the harness is a batch run that closes itself. The check
        // sits outside the finally because control may not leave one.
        if (Environment.GetCommandLineArgs().Contains("--hold"))
        {
            _log.Line("editor: holding the window open (--hold)");
            return;
        }

        _lexer?.Dispose();
        await Task.Delay(400);
        Dispatcher.UIThread.Post(Close);
    }

    private async Task StartLexerAsync()
    {
        var clock = Stopwatch.StartNew();
        _lexer = new ChordLexerService(VendoredNode, LexerServer);
        await _lexer.StartAsync();
        _log.Line($"lexer service: ready in {clock.Elapsed.TotalMilliseconds:F0} ms — "
                  + $"packages/chord/src/lexer.ts under the vendored node, kinds=[{string.Join(",", _lexer.Kinds)}]");
    }

    private async Task LoadAsync()
    {
        var text = await File.ReadAllTextAsync(MeasureFile);
        Editor.Document = new TextDocument(text);
        var lex = await StyleAsync();
        _log.Line($"loaded: {Path.GetFileName(MeasureFile)} — {text.Length} chars, "
                  + $"{Editor.Document.LineCount} lines, {lex.TokenCount} tokens, "
                  + $"{_colorizer.RunCount} styled runs, {_colorizer.CommentLineCount} comment lines, "
                  + $"payload {lex.PayloadBytes} bytes");
    }

    /// <summary>One whole-document style pass: lex, rebuild the index, redraw.</summary>
    private async Task<LexResult> StyleAsync()
    {
        var lex = await _lexer!.LexAsync(Editor.Document.Text);
        _colorizer.Apply(lex, _lexer.Kinds, Editor.Document);
        Editor.TextArea.TextView.Redraw();
        return lex;
    }

    private async Task MeasureStylePassAsync()
    {
        // Warm, then 50 back-to-back passes, as the OpenSilver spike measured.
        // Each pass is attributed to its three parts, because "8 ms" is only a
        // useful number for Phase 6 if it says which part is inherent.
        await StyleAsync();
        var lexMs = new List<double>();
        var bridgeMs = new List<double>();
        var applyMs = new List<double>();
        var clock = Stopwatch.StartNew();
        for (var i = 0; i < 50; i++)
        {
            var bridgeClock = Stopwatch.StartNew();
            var lex = await _lexer!.LexAsync(Editor.Document.Text);
            bridgeMs.Add(bridgeClock.Elapsed.TotalMilliseconds);

            var applyClock = Stopwatch.StartNew();
            _colorizer.Apply(lex, _lexer.Kinds, Editor.Document);
            applyMs.Add(applyClock.Elapsed.TotalMilliseconds);

            lexMs.Add(lex.LexMs);
        }
        var perPass = clock.Elapsed.TotalMilliseconds / 50;
        lexMs.Sort(); bridgeMs.Sort(); applyMs.Sort();
        _log.Line($"style pass: {perPass:F2} ms per pass over 50 passes");
        _log.Line($"style pass breakdown (medians): lexer {lexMs[25]:F2} ms inside node | "
                  + $"whole bridge round trip {bridgeMs[25]:F2} ms (serialize + pipe + parse {_colorizer.TokenCount} tokens) | "
                  + $"index rebuild {applyMs[25]:F2} ms in C#");
    }

    private async Task MeasureTypingAsync()
    {
        var end = Editor.Document.TextLength;
        Editor.CaretOffset = end;
        var perChar = new List<double>();
        var clock = Stopwatch.StartNew();

        for (var i = 0; i < 200; i++)
        {
            var charClock = Stopwatch.StartNew();
            Editor.Document.Insert(Editor.Document.TextLength, "x");
            await StyleAsync();
            perChar.Add(charClock.Elapsed.TotalMilliseconds);
        }

        var wall = clock.Elapsed.TotalMilliseconds;
        perChar.Sort();
        _log.Line($"typing: 200 single-character inserts at the end of the document — "
                  + $"{wall:F0} ms wall, {wall / 200:F2} ms per character "
                  + $"(min {perChar[0]:F2}, median {perChar[100]:F2}, p90 {perChar[180]:F2}, max {perChar[199]:F2})");
        _log.Line($"typing: document now {Editor.Document.LineCount} lines, {Editor.Document.TextLength} chars, "
                  + $"{_colorizer.TokenCount} tokens");

        // Leave the document as it was, so the replace/undo round trip below
        // measures against the loaded file rather than the typed-on one.
        Editor.Document.Remove(Editor.Document.TextLength - 200, 200);
        await StyleAsync();
    }

    private Task SelectAndScrollAsync()
    {
        // The same span the OpenSilver spike selected: line 897, columns 8–30.
        var line = Editor.Document.GetLineByNumber(897);
        var from = line.Offset + 7;
        var to = line.Offset + 29;
        Editor.Select(from, to - from);
        Editor.ScrollToLine(897);
        _log.Line($"select: 897:8–897:30 → from={from} to={to} text=\"{Editor.SelectedText}\"; "
                  + $"first visible line after scroll-to = {Editor.TextArea.TextView.GetDocumentLineByVisualTop(Editor.TextArea.TextView.ScrollOffset.Y)?.LineNumber}");
        return Task.CompletedTask;
    }

    private async Task ReplaceAndUndoAsync()
    {
        var before = Hash(Editor.Document.Text);
        var beforeLength = Editor.Document.TextLength;

        // Line 2, columns 10–30 — the title, as the OpenSilver spike replaced it.
        var line = Editor.Document.GetLineByNumber(2);
        var from = line.Offset + 9;
        var length = Math.Min(20, line.EndOffset - from);
        var replaced = Editor.Document.GetText(from, length);
        Editor.Document.Replace(from, length, "The Folly at Fernhill (edited)");
        await StyleAsync();
        _log.Line($"replace: 2:10–2:30 \"{replaced}\" → \"The Folly at Fernhill (edited)\"; "
                  + $"length {beforeLength} → {Editor.Document.TextLength}, hash {Hash(Editor.Document.Text)}");

        Editor.Undo();
        await StyleAsync();
        var after = Hash(Editor.Document.Text);
        _log.Line($"undo: length {Editor.Document.TextLength}, hash {after} — "
                  + $"{(after == before && Editor.Document.TextLength == beforeLength ? "MATCH" : "MISMATCH")} against the pre-edit document");
    }

    private void ReportGutterAndWrap()
    {
        _log.Line($"gutter: ShowLineNumbers={Editor.ShowLineNumbers}, margins={Editor.TextArea.LeftMargins.Count}");
        Editor.ScrollToLine(897);
        Editor.WordWrap = true;
        Editor.TextArea.TextView.Redraw();
        _log.Line($"wrap: WordWrap={Editor.WordWrap} set live, no reload");
        Editor.WordWrap = false;
    }

    private static string Hash(string text) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)))[..8].ToLowerInvariant();
}
