// Tests for the story index, against fernhill's REAL IR — the file a build actually emits.
//
// STUB JUSTIFICATION (rule 13a): none. The IR here is not a fixture written to match the
// reader; it is the build's own output, read from disk. A hand-written IR is exactly how a
// reader and the thing it reads drift apart — the shape changes upstream, the fixture does
// not, and the tests keep passing. A missing build fails loudly rather than skipping, the
// way the other real-path suites here do.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using PaneHost.Hosting;
using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class StoryIndexTests
{
    private static StoryIndexDocument Fernhill()
    {
        var path = RepoPaths.RequireDevelopmentStory(RepoPaths.FernhillIr, "fernhill's story IR");
        var index = StoryIndex.Read(File.ReadAllText(path));
        Assert.NotNull(index);
        return index!;
    }

    [Fact]
    public void the_real_ir_yields_the_story_its_identity()
    {
        var index = Fernhill();

        Assert.Equal("fernhill", index.Id);
        Assert.False(string.IsNullOrWhiteSpace(index.Title));
    }

    [Fact]
    public void sections_come_in_display_order_and_none_is_empty()
    {
        var index = Fernhill();

        Assert.NotEmpty(index.Sections);
        Assert.All(index.Sections, section => Assert.NotEmpty(section.Rows));

        var kinds = index.Sections.Select(s => s.Kind).ToArray();
        Assert.Equal(kinds.OrderBy(k => (int)k).ToArray(), kinds);
    }

    [Fact]
    public void the_build_banner_counts_the_rows_the_index_lists()
    {
        // The phase's exit condition, and the reason the banner reads the index rather than
        // the IR: the tab and the banner cannot report different numbers for one story.
        var index = Fernhill();
        var report = StoryBuildReport.From(index);

        foreach (var section in index.Sections)
        {
            var expected = section.Rows.Count == 1
                ? $"1 {section.Singular}"
                : $"{section.Rows.Count} {section.Plural}";
            Assert.Contains(expected, report);
        }
    }

    [Fact]
    public void a_rooms_section_is_present_and_every_room_knows_where_it_was_written()
    {
        // Navigation is the tab's whole point, so a room without a span is a real defect.
        var index = Fernhill();
        var rooms = index.Sections.Single(s => s.Kind == IndexSectionKind.Rooms);

        Assert.NotEmpty(rooms.Rows);
        Assert.All(rooms.Rows, row =>
        {
            Assert.NotNull(row.Span);
            Assert.True(row.Span!.Value.Line >= 1);
        });
    }

    [Fact]
    public void every_span_names_a_file_that_exists_beside_the_story()
    {
        // A span that cannot be opened is a row that cannot be navigated to.
        var index = Fernhill();
        var folder = Path.GetDirectoryName(
            RepoPaths.RequireDevelopmentStory(RepoPaths.FernhillStory, "fernhill's story"))!;

        // A span with no file means the story's own file, which is how a single-file story
        // spells every one of its spans.
        foreach (var row in index.Sections.SelectMany(s => s.Rows).Where(r => r.Span?.File is not null))
            Assert.True(File.Exists(Path.Combine(folder, row.Span!.Value.File!)),
                $"{row.Title} points at {row.Span.Value.File}, which is not beside the story");
    }

    [Fact]
    public void a_dotted_phrase_key_is_a_platform_id_and_is_not_listed()
    {
        var index = Fernhill();
        var phrases = index.Sections.SingleOrDefault(s => s.Kind == IndexSectionKind.Phrases);

        Assert.NotNull(phrases);
        Assert.All(phrases!.Rows, row => Assert.DoesNotContain('.', row.Title));
        Assert.All(phrases.Rows, row => Assert.True(row.IsCode));
    }

    [Fact]
    public void entities_are_listed_in_case_insensitive_name_order()
    {
        var index = Fernhill();

        foreach (var kind in new[] { IndexSectionKind.Rooms, IndexSectionKind.Things, IndexSectionKind.People })
        {
            if (index.Sections.SingleOrDefault(s => s.Kind == kind) is not { } section) continue;
            var titles = section.Rows.Select(r => r.Title).ToArray();
            Assert.Equal(titles.OrderBy(t => t, StringComparer.OrdinalIgnoreCase).ToArray(), titles);
        }
    }

    [Fact]
    public void no_entity_is_listed_in_two_sections()
    {
        // The bucketing rule is first-match-wins; a room that is also a container must not
        // appear under Things as well.
        var index = Fernhill();
        var entitySections = new[]
        {
            IndexSectionKind.Rooms, IndexSectionKind.Regions,
            IndexSectionKind.Things, IndexSectionKind.People,
        };
        var titles = index.Sections
            .Where(s => entitySections.Contains(s.Kind))
            .SelectMany(s => s.Rows.Select(r => r.Title))
            .ToArray();

        Assert.Equal(titles.Length, titles.Distinct(StringComparer.Ordinal).Count());
    }

    [Fact]
    public void an_unreadable_ir_yields_no_index_rather_than_a_throw()
    {
        Assert.Null(StoryIndex.Read("{ this is not json"));
    }
}
