// What toggling the project pane does to the body grid, as arithmetic rather than as
// property writes on a live window.
//
// The rule worth protecting is not "hide the pane" — it is that the column, not just its
// child, goes to zero, and that a collapse never becomes the width the pane reopens at.
// Both were wrong in the shipped build (the child hid and its 220 px stayed), and both are
// decisions, so they live where a headless test can reach them: this project has no
// Avalonia headless harness, and a rule only a running window can answer is a rule only a
// human reading a probe log can check.
//
// Public interface: ProjectPaneLayout, ProjectPaneLayoutRules.For.
// Owner context: tools/ide — the Avalonia desktop head's shell.

namespace PaneHost.Shell;

/// <summary>
/// The body grid's project columns after a toggle, plus the width to reopen at.
/// </summary>
/// <param name="PaneWidth">Width for the pane's own column, in pixels.</param>
/// <param name="SplitterWidth">Width for the splitter column beside it, in pixels.</param>
/// <param name="RememberedWidth">The width the next reopen should use.</param>
internal readonly record struct ProjectPaneLayout(
    double PaneWidth,
    double SplitterWidth,
    double RememberedWidth);

/// <summary>The project pane's show/hide arithmetic.</summary>
internal static class ProjectPaneLayoutRules
{
    /// <summary>
    /// The splitter column's width while the pane is showing. This is the grip: a
    /// GridSplitter is hit-testable only across its own bounds, so the track's width is
    /// the whole target the pointer has to find.
    /// </summary>
    internal const double SplitterWidth = 10;

    /// <summary>
    /// Works out the columns for a toggle.
    /// </summary>
    /// <param name="visible">true when the pane is being shown, false when collapsed.</param>
    /// <param name="rememberedWidth">The width carried from the last time it was showing.</param>
    /// <param name="measuredWidth">
    /// The pane column's width as the grid currently measures it — what the author dragged
    /// it to. Ignored when showing, and ignored when it is zero or less: a collapse must
    /// never become the width the pane reopens at.
    /// </param>
    internal static ProjectPaneLayout For(bool visible, double rememberedWidth, double measuredWidth)
    {
        if (visible) return new ProjectPaneLayout(rememberedWidth, SplitterWidth, rememberedWidth);

        var remembered = measuredWidth > 0 ? measuredWidth : rememberedWidth;
        return new ProjectPaneLayout(0, 0, remembered);
    }
}
