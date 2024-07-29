using DataStore;
using GrammarLibrary;

namespace StandardLibrary
{
    public class Core
    {
        private World _world;

        public Core(World world)
        {
            // Load up the grammar definitions...
            StandardGrammar.DefineStandardGrammar();

            _world = new World();
        }

    }
}
