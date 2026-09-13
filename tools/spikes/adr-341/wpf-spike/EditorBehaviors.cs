// SPIKE CODE — ADR-341 D2, Phase 3. Not product; never shipped.
//
// Mirrors of the two pure AppKit editor helpers, ported behaviour-for-behaviour from
// tools/ide/SharpeeIDE/Editor/AutoIndenter.swift and BracketMatcher.swift so the
// spike measures the toolkit, not a different algorithm.
//
// Both Swift originals are pure functions over (text, caret); so are these. The
// AvalonEdit wiring that calls them is below, and is the part actually under test:
// keystroke interception and a transient highlight.

using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using ICSharpCode.AvalonEdit;
using ICSharpCode.AvalonEdit.Document;
using ICSharpCode.AvalonEdit.Rendering;

namespace Adr341.WpfSpike;

public static class AutoIndenter
{
    /// <summary>
    /// The whitespace to insert after a newline at <paramref name="caret"/>: the current
    /// line's leading whitespace, plus one indent unit when the last non-whitespace
    /// character before the caret is '(', '[' or '{'. (AutoIndenter.swift)
    /// </summary>
    public static string IndentOnNewline(string text, int caret, string indentUnit = "  ")
    {
        if (caret < 0 || caret > text.Length) return "";

        var lineStart = caret;
        while (lineStart > 0 && text[lineStart - 1] != '\n') lineStart--;

        var i = lineStart;
        while (i < caret && (text[i] == ' ' || text[i] == '\t')) i++;
        var indent = text[lineStart..i];

        var j = caret - 1;
        while (j >= 0 && char.IsWhiteSpace(text[j])) j--;
        if (j >= 0 && (text[j] == '(' || text[j] == '[' || text[j] == '{')) indent += indentUnit;

        return indent;
    }
}

public static class BracketMatcher
{
    private static readonly Dictionary<char, char> OpenToClose =
        new() { ['('] = ')', ['['] = ']', ['{'] = '}' };
    private static readonly Dictionary<char, char> CloseToOpen =
        new() { [')'] = '(', [']'] = '[', ['}'] = '{' };

    /// <summary>
    /// (bracket, partner) offsets when the caret is adjacent to a bracket with a balanced
    /// partner; prefers the character immediately before the caret. Like the Swift v1, this
    /// does NOT skip brackets inside strings or comments. (BracketMatcher.swift)
    /// </summary>
    public static (int Bracket, int Partner)? Match(string text, int caret)
    {
        foreach (var at in new[] { caret - 1, caret })
        {
            if (at < 0 || at >= text.Length) continue;
            var c = text[at];

            if (OpenToClose.TryGetValue(c, out var close))
            {
                var depth = 0;
                for (var i = at; i < text.Length; i++)
                {
                    if (text[i] == c) depth++;
                    else if (text[i] == close && --depth == 0) return (at, i);
                }
            }
            else if (CloseToOpen.TryGetValue(c, out var open))
            {
                var depth = 0;
                for (var i = at; i >= 0; i--)
                {
                    if (text[i] == c) depth++;
                    else if (text[i] == open && --depth == 0) return (at, i);
                }
            }
        }
        return null;
    }
}

/// <summary>Transient bracket-pair highlight, drawn under the text.</summary>
public sealed class BracketHighlighter : IBackgroundRenderer
{
    private readonly TextEditor _editor;
    private (int A, int B)? _pair;

    public BracketHighlighter(TextEditor editor)
    {
        _editor = editor;
        _editor.TextArea.Caret.PositionChanged += (_, _) => Update();
        _editor.TextArea.TextView.BackgroundRenderers.Add(this);
    }

    public KnownLayer Layer => KnownLayer.Selection;

    private void Update()
    {
        var m = BracketMatcher.Match(_editor.Document.Text, _editor.CaretOffset);
        var next = m is null ? ((int, int)?)null : (m.Value.Bracket, m.Value.Partner);
        if (next?.Item1 == _pair?.A && next?.Item2 == _pair?.B) return;
        _pair = next is null ? null : (next.Value.Item1, next.Value.Item2);
        _editor.TextArea.TextView.InvalidateLayer(Layer);
    }

    public void Draw(TextView textView, DrawingContext drawingContext)
    {
        if (_pair is not { } p) return;
        var brush = Theme.Brush("Accent").Clone();
        brush.Opacity = 0.28;
        brush.Freeze();
        foreach (var offset in new[] { p.A, p.B })
        {
            var seg = new TextSegment { StartOffset = offset, EndOffset = offset + 1 };
            foreach (var r in BackgroundGeometryBuilder.GetRectsForSegment(textView, seg))
                drawingContext.DrawRectangle(brush, null, r);
        }
    }
}

/// <summary>Wires the two mirrored behaviours onto a real AvalonEdit instance.</summary>
public static class EditorWiring
{
    public static void Install(TextEditor editor)
    {
        _ = new BracketHighlighter(editor);

        // Auto-indent: intercept Return before AvalonEdit's own newline handling, and
        // do the whole thing as ONE undo unit so a single Ctrl+Z removes both the
        // newline and the indent — which is what the AppKit editor does.
        editor.PreviewKeyDown += (_, e) =>
        {
            if (e.Key != Key.Return || Keyboard.Modifiers != ModifierKeys.None) return;
            var doc = editor.Document;
            var indent = AutoIndenter.IndentOnNewline(doc.Text, editor.CaretOffset);
            using (doc.RunUpdate())
            {
                if (!editor.TextArea.Selection.IsEmpty) editor.TextArea.Selection.ReplaceSelectionWithText("");
                doc.Insert(editor.CaretOffset, Environment.NewLine + indent);
            }
            e.Handled = true;
        };
    }
}
