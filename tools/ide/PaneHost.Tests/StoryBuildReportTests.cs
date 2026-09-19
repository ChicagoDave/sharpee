// Tests for the build panel's closing report, against the real IR of a real story.
//
// STUB JUSTIFICATION (rule 13a): none needed — StoryBuildReport owns no dependency; it is
// a pure function from IR text to report text. The IR it is fed here is the one
// `sharpee build` emits, read from disk, not a hand-written shape that could drift from it.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class StoryBuildReportTests
{
    /// <summary>A minimal IR carrying one of each bucket, plus the dotted phrase key trap.</summary>
    private const string Ir = """
    {
      "meta": { "title": "A Story", "fields": {
        "id": "a-story", "storyVersion": "1.2.0", "authors": ["Ada", "Grace"] } },
      "entities": [
        { "id": "hall",  "kinds": [{ "name": "room" }],   "isPlayable": false },
        { "id": "north", "kinds": [{ "name": "region" }], "isPlayable": false },
        { "id": "you",   "kinds": [],                     "isPlayable": true  },
        { "id": "cook",  "kinds": [{ "name": "person" }], "isPlayable": false },
        { "id": "lamp",  "kinds": [{ "name": "thing" }],  "isPlayable": false }
      ],
      "actions": [ { "id": "polish" } ],
      "hatches": [],
      "phrases": { "defaultLocale": "en-US", "locales": { "en-US": {
        "lamp-lit": "", "hall.description": "", "hall.detail": "" } } }
    }
    """;

    [Fact]
    public void each_entity_is_counted_once_in_the_first_bucket_it_matches()
    {
        var report = StoryBuildReport.From(Ir);

        Assert.NotNull(report);
        // A playable entity with no kinds is a person, not a thing; the lamp is the only thing.
        Assert.Contains("1 room · 1 region · 1 thing", report);
        Assert.Contains("2 people · 1 action", report);
    }

    [Fact]
    public void a_dotted_phrase_key_is_a_platform_id_and_is_not_counted()
    {
        // Three keys are present; only `lamp-lit` was written by an author.
        var report = StoryBuildReport.From(Ir);

        Assert.Contains("1 phrase", report);
        Assert.DoesNotContain("3 phrases", report);
    }

    [Fact]
    public void a_zero_count_is_omitted_rather_than_printed()
    {
        // hatches is empty, so the report must not mention hatch modules at all.
        var report = StoryBuildReport.From(Ir);

        Assert.DoesNotContain("hatch", report);
        Assert.DoesNotContain("0 ", report);
    }

    [Fact]
    public void the_byline_carries_every_author_and_the_id_with_its_version()
    {
        var report = StoryBuildReport.From(Ir);

        Assert.Contains("  A Story", report);
        Assert.Contains("  by Ada, Grace · a-story 1.2.0", report);
    }

    [Fact]
    public void a_story_with_no_authors_prints_the_id_alone()
    {
        var report = StoryBuildReport.From(Ir.Replace("""["Ada", "Grace"]""", "[]"));

        Assert.NotNull(report);
        Assert.DoesNotContain(" by ", report);
        Assert.Contains("  a-story 1.2.0", report);
    }

    [Fact]
    public void an_unreadable_ir_yields_no_report_rather_than_a_throw()
    {
        // A build that succeeded did succeed; the report is a courtesy.
        Assert.Null(StoryBuildReport.From("{ this is not json"));
    }
}
