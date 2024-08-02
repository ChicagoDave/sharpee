using Microsoft.VisualStudio.TestTools.UnitTesting;
using GrammarLibrary;
using StandardLibrary;
using System.Linq;
using System.Collections.Generic;

namespace GrammarTests
{
    [TestClass]
    public class StandardGrammarTests
    {
        private static IReadOnlyList<Verb> _verbs;

        [ClassInitialize]
        public static void ClassInitialize(TestContext context)
        {
            StandardGrammar.DefineStandardGrammar();
            _verbs = Definitions.GetAllVerbs();
        }

        [TestMethod]
        public void TestVerbDefinitions()
        {
            Assert.IsNotNull(_verbs);
            Assert.IsTrue(_verbs.Any(v => v.Name == "get"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "drop"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "look"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "inventory"));
            // Test for direction verbs
            Assert.IsTrue(_verbs.Any(v => v.Name == "north"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "south"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "east"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "west"));
            // Test for meta verbs
            Assert.IsTrue(_verbs.Any(v => v.Name == "score"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "restart"));
            Assert.IsTrue(_verbs.Any(v => v.Name == "quit"));
        }

        [TestMethod]
        public void TestVerbAliases()
        {
            var getVerb = _verbs.FirstOrDefault(v => v.Name == "get");
            Assert.IsNotNull(getVerb);
            CollectionAssert.Contains(getVerb.Aliases, "take");

            var inventoryVerb = _verbs.FirstOrDefault(v => v.Name == "inventory");
            Assert.IsNotNull(inventoryVerb);
            CollectionAssert.Contains(inventoryVerb.Aliases, "i");

            var quitVerb = _verbs.FirstOrDefault(v => v.Name == "quit");
            Assert.IsNotNull(quitVerb);
            CollectionAssert.Contains(quitVerb.Aliases, "q");
        }

        [TestMethod]
        public void TestVerbPatterns()
        {
            var lookVerb = _verbs.FirstOrDefault(v => v.Name == "look");
            Assert.IsNotNull(lookVerb);
            var patterns = lookVerb.GetPatterns();
            Assert.IsTrue(patterns.Any(p => p.Elements.Length == 0)); // "look"
            Assert.IsTrue(patterns.Any(p => p.Elements.Length == 2 && p.Elements[0] is Lit lit && lit.Text == "at")); // "look at X"

            var putVerb = _verbs.FirstOrDefault(v => v.Name == "put");
            Assert.IsNotNull(putVerb);
            patterns = putVerb.GetPatterns();
            Assert.IsTrue(patterns.Any(p => p.Elements.Length == 3 && p.Elements[1] is Choice)); // "put X on/in/under Y"
        }
    }
}