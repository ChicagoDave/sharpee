// The testing pane's boot session (GH #540): the seed the pane boots the engine at is the
// loaded document's own pin, and the IDE's fixed play seed only for a fresh tree.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head.

using PaneHost.Shell;

namespace PaneHost.Tests;

public class TestingSessionTests
{
    [Fact]
    public void the_session_carries_the_documents_own_seed()
    {
        const string document = """{"version": 2, "story": "secret-letter", "seed": 1209, "cards": []}""";

        var session = TestingSession.Build("secret-letter", document);

        Assert.Equal(1209, (int)session["seed"]!);
        Assert.Equal("secret-letter", (string)session["story"]!);
        Assert.Equal(document, (string)session["document"]!);
    }

    [Fact]
    public void a_story_without_a_document_boots_at_the_fresh_tree_seed()
    {
        var session = TestingSession.Build("fresh", "{}");

        Assert.Equal(TestingSession.FreshTreeSeed, (int)session["seed"]!);
        Assert.Equal(42, TestingSession.FreshTreeSeed);
    }

    [Fact]
    public void a_malformed_document_boots_at_the_fresh_tree_seed()
    {
        Assert.Null(TestingSession.DocumentSeed("not json {{{"));
        Assert.Equal(TestingSession.FreshTreeSeed, (int)TestingSession.Build("broken", "not json {{{")["seed"]!);
    }

    [Fact]
    public void a_non_integer_or_non_object_seed_is_not_a_pin()
    {
        Assert.Null(TestingSession.DocumentSeed("""{"seed": 1209.5}"""));
        Assert.Null(TestingSession.DocumentSeed("""{"seed": "1209"}"""));
        Assert.Null(TestingSession.DocumentSeed("""[1209]"""));
    }
}
