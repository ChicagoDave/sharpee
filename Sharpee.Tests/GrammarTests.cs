using Microsoft.VisualStudio.TestTools.UnitTesting;
using GrammarLibrary;
using StandardLibrary;
using System.Linq;

namespace GrammarTests
{
    [TestClass]
    public class StandardGrammarTests
    {
        [TestInitialize]
        public void Initialize()
        {
            StandardGrammar.DefineStandardGrammar();
        }

        [TestMethod]
        public void TestVerbDefinitions()
        {
            var verbs = typeof(Definitions).GetField("Verbs", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static).GetValue(null) as List<Verb>;

            Assert.IsNotNull(verbs);
            Assert.IsTrue(verbs.Any(v => v.Name == "get"));
            Assert.IsTrue(verbs.Any(v => v.Name == "drop"));
            Assert.IsTrue(verbs.Any(v => v.Name == "look"));
            Assert.IsTrue(verbs.Any(v => v.Name == "inventory"));
            // Test for direction verbs
            Assert.IsTrue(verbs.Any(v => v.Name == "north"));
            Assert.IsTrue(verbs.Any(v => v.Name == "south"));
            Assert.IsTrue(verbs.Any(v => v.Name == "east"));
            Assert.IsTrue(verbs.Any(v => v.Name == "west"));
            // Test for meta verbs
            Assert.IsTrue(verbs.Any(v => v.Name == "score"));
            Assert.IsTrue(verbs.Any(v => v.Name == "restart"));
            Assert.IsTrue(verbs.Any(v => v.Name == "quit"));
        }

        [TestMethod]
        public void TestVerbAliases()
        {
            var verbs = typeof(Definitions).GetField("Verbs", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static).GetValue(null) as List<Verb>;

            var getVerb = verbs.FirstOrDefault(v => v.Name == "get");
            Assert.IsNotNull(getVerb);
            CollectionAssert.Contains(getVerb.Aliases, "take");

            var inventoryVerb = verbs.FirstOrDefault(v => v.Name == "inventory");
            Assert.IsNotNull(inventoryVerb);
            CollectionAssert.Contains(inventoryVerb.Aliases, "i");

            var quitVerb = verbs.FirstOrDefault(v => v.Name == "quit");
            Assert.IsNotNull(quitVerb);
            CollectionAssert.Contains(quitVerb.Aliases, "q");
        }

        [TestMethod]
        public void TestVerbPatterns()
        {
            var verbs = typeof(Definitions).GetField("Verbs", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static).GetValue(null) as List<Verb>;

            var lookVerb = verbs.FirstOrDefault(v => v.Name == "look");
            Assert.IsNotNull(lookVerb);
            var patterns = typeof(Verb).GetField("Patterns", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance).GetValue(lookVerb) as List<Pattern>;
            Assert.IsTrue(patterns.Any(p => p.Elements.Length == 0)); // "look"
            Assert.IsTrue(patterns.Any(p => p.Elements.Length == 2 && p.Elements[0] is Lit lit && lit.Text == "at")); // "look at X"

            var putVerb = verbs.FirstOrDefault(v => v.Name == "put");
            Assert.IsNotNull(putVerb);
            patterns = typeof(Verb).GetField("Patterns", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance).GetValue(putVerb) as List<Pattern>;
            Assert.IsTrue(patterns.Any(p => p.Elements.Length == 3 && p.Elements[1] is Choice)); // "put X on/in/under Y"
        }
    }
}