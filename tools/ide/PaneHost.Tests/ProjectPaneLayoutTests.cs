// Tests for the project pane's show/hide arithmetic: the column goes to zero, not just
// its child, and a collapse never becomes the width the pane reopens at.
//
// No stub and no real-path caveat (rule 13a): ProjectPaneLayoutRules owns no dependency.
// The binding to the live grid is exercised by `--shell-probe`, which reads the column's
// measured width back off the running window.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class ProjectPaneLayoutTests
{
    [Fact]
    public void collapsing_takes_the_column_to_zero_not_just_the_pane()
    {
        // The defect this exists for: hiding only the child left the column's 220 px
        // standing, so the pane read as blank rather than closed.
        var layout = ProjectPaneLayoutRules.For(visible: false, rememberedWidth: 220, measuredWidth: 220);

        Assert.Equal(0, layout.PaneWidth);
        Assert.Equal(0, layout.SplitterWidth);
    }

    [Fact]
    public void collapsing_remembers_the_width_the_author_dragged_to()
    {
        var layout = ProjectPaneLayoutRules.For(visible: false, rememberedWidth: 220, measuredWidth: 315);

        Assert.Equal(315, layout.RememberedWidth);
    }

    [Fact]
    public void a_collapsed_measurement_never_becomes_the_reopen_width()
    {
        // A second collapse, or one measured after the grid has already zeroed the column,
        // must not persist the 0 — the pane would reopen at no width at all.
        var layout = ProjectPaneLayoutRules.For(visible: false, rememberedWidth: 315, measuredWidth: 0);

        Assert.Equal(315, layout.RememberedWidth);
        Assert.Equal(0, layout.PaneWidth);
    }

    [Fact]
    public void showing_restores_the_remembered_width_and_the_splitter()
    {
        var layout = ProjectPaneLayoutRules.For(visible: true, rememberedWidth: 315, measuredWidth: 0);

        Assert.Equal(315, layout.PaneWidth);
        Assert.Equal(ProjectPaneLayoutRules.SplitterWidth, layout.SplitterWidth);
        // The grip is the track, so the track has to be big enough to catch.
        Assert.True(ProjectPaneLayoutRules.SplitterWidth >= 10);
        Assert.Equal(315, layout.RememberedWidth);
    }

    [Fact]
    public void a_dragged_width_survives_a_hide_and_show()
    {
        // The round trip as the shell drives it: collapse carrying the measured width,
        // then show carrying whatever the collapse chose to remember.
        var collapsed = ProjectPaneLayoutRules.For(visible: false, rememberedWidth: 220, measuredWidth: 315);
        var shown = ProjectPaneLayoutRules.For(visible: true, collapsed.RememberedWidth, measuredWidth: 0);

        Assert.Equal(315, shown.PaneWidth);
    }
}
