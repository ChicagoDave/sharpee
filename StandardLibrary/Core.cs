using DataStore;
using GrammarLibrary;

namespace StandardLibrary
{
    public class Core
    {
        private Graph _graph;

        public Core(Graph graph)
        {
            // Load up the grammar definitions...
            StandardGrammar.DefineStandardGrammar();

            _graph = new Graph();
        }

    }
}
