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
            Define("Get", "take")
                .Pattern(Multi())
                .Pattern(Multi(), Choice(Lit("from"), Lit("off")), Var("container"));

            // DROP
            Define("Drop", "drop", "discard")
                .Pattern(Multi());

            // LOOK
            Define("Look", "l")
                .Pattern()
                .Pattern(Lit("at"), Multi())
                .Pattern(Lit("in"), Var("container"))
                .Pattern(Lit("under"), Var("object"))
                .Pattern(Lit("on"), Var("surface"));

            // INVENTORY
            Define("Inventory", "i")
                .Pattern();

            // Directions
            Define("North", "n").Pattern();
            Define("Northeast", "ne").Pattern();
            Define("East", "e").Pattern();
            Define("Southeast", "se").Pattern();
            Define("South", "s").Pattern();
            Define("Southwest", "sw").Pattern();
            Define("West", "w").Pattern();
            Define("Northwest", "nw").Pattern();

            // IN/OUT
            Define("In", "enter")
                .Pattern()
                .Pattern(Var("object"));

            Define("Out", "exit")
                .Pattern()
                .Pattern(Lit("of"), Var("object"));

            // UP/DOWN
            Define("Up", "u")
                .Pattern()
                .Pattern(Var("object"));

            Define("Down", "d")
                .Pattern()
                .Pattern(Var("object"));

            // XYZZY (Easter egg command)
            Define("Xyzzy")
                .Pattern();

            // PUT x ON y
            Define("Put")
                .Pattern(Multi(), Choice(Lit("on"), Lit("in"), Lit("under")), Var("target"));

            // REMOVE x
            Define("Remove")
                .Pattern(Multi())
                .Pattern(Multi(), Choice(Lit("from"), Lit("off")), Var("object"));

            // HANG x ON y
            Define("Hang")
                .Pattern(Multi(), Lit("on"), Var("target"));

            // HANG UP x
            Define("HangUp")
                .Pattern(Multi());
        }

        private static void DefineMetaVerbs()
        {
            // SCORE
            Define("Score")
                .Pattern();

            // RESTART
            Define("Restart")
                .Pattern();

            // QUIT
            Define("Quit", "q")
                .Pattern();

            // TURNS
            Define("Turns")
                .Pattern();

            // SAVE
            Define("Save")
                .Pattern()
                .Pattern(Var("filename"));

            // RESTORE
            Define("Restore", "load")
                .Pattern()
                .Pattern(Var("filename"));

            // VERBOSE
            Define("Verbose")
                .Pattern();

            // BRIEF
            Define("Brief")
                .Pattern();

            // HELP
            Define("Help", "?")
                .Pattern()
                .Pattern(Var("topic"));
        }
    }
}