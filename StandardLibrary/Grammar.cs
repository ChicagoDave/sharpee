using GrammarLibrary;
using static GrammarLibrary.Definitions;

namespace StandardLibrary
{
    public static class StandardGrammar
    {
        public static void DefineStandardGrammar()
        {
            // SCORE, TIME, etc
            DefineMetaVerbs();

            // GET/TAKE
            new Verb("Get", "take")
                .Pattern(Multi())
                .Pattern(Multi(), Choice(Lit("from"), Lit("off")), Var("container"));

            // DROP
            new Verb("Drop", "drop", "discard")
                .Pattern(Multi());

            // LOOK
            new Verb("Look", "l")
                .Pattern()
                .Pattern(Lit("at"), Multi())
                .Pattern(Lit("in"), Var("container"))
                .Pattern(Lit("under"), Var("object"))
                .Pattern(Lit("on"), Var("surface"));

            // INVENTORY
            new Verb("Inventory", "i")
                .Pattern();

            // Directions
            new Verb("North", "n").Pattern();
            new Verb("Northeast", "ne").Pattern();
            new Verb("East", "e").Pattern();
            new Verb("Southeast", "se").Pattern();
            new Verb("South", "s").Pattern();
            new Verb("Southwest", "sw").Pattern();
            new Verb("West", "w").Pattern();
            new Verb("Northwest", "nw").Pattern();

            // IN/OUT
            new Verb("In", "enter")
                .Pattern()
                .Pattern(Var("object"));

            new Verb("Out", "exit")
                .Pattern()
                .Pattern(Lit("of"), Var("object"));

            // UP/DOWN
            new Verb("Up", "u")
                .Pattern()
                .Pattern(Var("object"));

            new Verb("Down", "d")
                .Pattern()
                .Pattern(Var("object"));

            // XYZZY (Easter egg command)
            new Verb("Xyzzy")
                .Pattern();

            // PUT x ON y
            new Verb("Put")
                .Pattern(Multi(), Choice(Lit("on"), Lit("in"), Lit("under")), Var("target"));

            // REMOVE x
            new Verb("Remove")
                .Pattern(Multi())
                .Pattern(Multi(), Choice(Lit("from"), Lit("off")), Var("object"));

            // HANG x ON y
            new Verb("Hang")
                .Pattern(Multi(), Lit("on"), Var("target"));

            // HANG UP x
            new Verb("HangUp")
                .Pattern(Multi());
        }

        private static void DefineMetaVerbs()
        {
            // SCORE
            new Verb("Score")
                .Pattern();

            // RESTART
            new Verb("Restart")
                .Pattern();

            // QUIT
            new Verb("Quit", "q")
                .Pattern();

            // TURNS
            new Verb("Turns")
                .Pattern();

            // SAVE
            new Verb("Save")
                .Pattern()
                .Pattern(Var("filename"));

            // RESTORE
            new Verb("Restore", "load")
                .Pattern()
                .Pattern(Var("filename"));

            // VERBOSE
            new Verb("Verbose")
                .Pattern();

            // BRIEF
            new Verb("Brief")
                .Pattern();

            // HELP
            new Verb("Help", "?")
                .Pattern()
                .Pattern(Var("topic"));
        }
    }

}