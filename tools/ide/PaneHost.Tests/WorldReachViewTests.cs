// Tests for the Reach view's derivation — its headline and its sectioned rows — against
// analyzer output shaped exactly as `sharpee world-index` emits it.
//
// STUB JUSTIFICATION (rule 13a): none needed for the derivation. Headline and Rows are pure
// functions of the analyzer's answer, which is the whole reason the Swift reference split
// them out that way: the wording can be pinned without an app running. The rendering half
// (the drawn surface) is exercised by `--app-exit-state` against a real story's analysis.
//
// The JSON below is not invented: every key is one this repo's own world-index output
// carries for secret-letter (verified 2026-09-18), trimmed to the sections under test.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json.Nodes;
using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class WorldReachViewTests
{
    private static JsonNode Reach(string json) => JsonNode.Parse(json)!;

    private const string Clean = """
    { "start": "hall", "rooms": { "total": 3, "reachable": 3, "unreached": [] },
      "blocked": [], "brokenExits": [], "stranded": [], "nothingToRead": [],
      "findingCount": 0 }
    """;

    private const string Findings = """
    { "start": "northwest-junction",
      "rooms": { "total": 21, "reachable": 20, "unreached": ["cellar"] },
      "blocked": [ { "from": "hall", "to": "vault", "direction": "north",
                     "reason": "the gate is never unlocked", "line": 88 } ],
      "brokenExits": [ { "from": "alley", "to": "nowhere", "direction": "east", "line": 12 } ],
      "stranded": [ { "id": "sword", "name": "sword",
                      "reason": "placed nowhere and never moved into play" } ],
      "nothingToRead": [ { "id": "nails", "name": "nails", "room": "alley" } ],
      "findingCount": 3 }
    """;

    [Fact]
    public void the_headline_leads_with_rooms_then_the_start_then_the_findings()
    {
        // Rooms first because that is the number an author checks against what they think
        // they wrote; "findings" rather than "errors" because an unreached room can be
        // deliberate.
        Assert.Equal("21 rooms · from northwest-junction · 3 findings",
            WorldReachView.Headline0(Reach(Findings), null));
    }

    [Fact]
    public void a_clean_story_is_told_nothing_is_unreachable_not_that_it_has_zero_findings()
    {
        Assert.Equal("3 rooms · from hall · nothing unreachable",
            WorldReachView.Headline0(Reach(Clean), null));
    }

    [Fact]
    public void a_story_with_no_start_room_says_so_rather_than_naming_none()
    {
        var reach = Reach("""{ "rooms": { "total": 1, "unreached": [] }, "findingCount": 0 }""");

        Assert.Equal("1 room · no start room declared · nothing unreachable",
            WorldReachView.Headline0(reach, null));
    }

    [Fact]
    public void unannounced_things_are_their_own_clause_not_folded_into_the_finding_count()
    {
        // A story can be entirely reachable and still never tell the player a thing exists;
        // that is a different claim, so it gets its own clause.
        var tools = JsonNode.Parse("""[ { "name": "lens", "room": "study" } ]""") as JsonArray;

        Assert.Equal("3 rooms · from hall · nothing unreachable · 1 thing nothing mentions",
            WorldReachView.Headline0(Reach(Clean), tools));
    }

    [Fact]
    public void a_clean_story_produces_no_rows_at_all()
    {
        // Not empty sections — no sections. An author with no broken exits should not be
        // shown a broken-exit heading.
        Assert.Empty(WorldReachView.Rows(Reach(Clean), null));
    }

    [Fact]
    public void every_section_that_holds_something_gets_a_header_carrying_its_count()
    {
        var rows = WorldReachView.Rows(Reach(Findings), null);
        var headers = rows.Where(r => r.IsHeader).Select(r => r.Title).ToArray();

        Assert.Equal(new[]
        {
            "Rooms play never arrives at · 1",
            "Exits that never open · 1",
            "Exits to nowhere · 1",
            "Things play can never hold · 1",
            "Reachable, with nothing written · 1",
        }, headers);
    }

    [Fact]
    public void a_blocked_exit_reads_as_a_direction_and_carries_its_reason_and_line()
    {
        var rows = WorldReachView.Rows(Reach(Findings), null);
        var blocked = rows.Single(r => r.Title.Contains("vault", StringComparison.Ordinal));

        Assert.Equal("hall north → vault", blocked.Title);
        Assert.Equal("the gate is never unlocked", blocked.Detail);
        Assert.Equal(88, blocked.Line);
        Assert.True(blocked.Severe);
    }

    [Fact]
    public void a_thing_with_nothing_written_names_where_it_is()
    {
        var rows = WorldReachView.Rows(Reach(Findings), null);
        var nails = rows.Single(r => r.Title == "nails");

        Assert.Equal("in alley", nails.Detail);
        Assert.False(nails.Severe);
    }

    [Fact]
    public void a_progression_critical_unnamed_thing_says_what_it_costs_and_reads_as_severe()
    {
        var tools = JsonNode.Parse(
            """[ { "name": "key", "room": "study", "role": "progressionInfo" } ]""") as JsonArray;
        var rows = WorldReachView.Rows(Reach(Clean), tools);

        var key = rows.Single(r => r.Title == "key");
        Assert.Equal("in study · the story cannot be finished without it", key.Detail);
        Assert.True(key.Severe);
        Assert.Contains(rows, r => r.Title == "Nothing tells the player these exist · 1");
    }

    [Fact]
    public void no_analysis_yields_no_rows_and_a_headline_that_says_why()
    {
        Assert.Empty(WorldReachView.Rows(null, null));
        Assert.Equal("no world analysis yet — build the story", WorldReachView.Headline0(null, null));
    }
}
