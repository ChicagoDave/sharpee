using System.Collections.Generic;

namespace DataStore
{
    /// <summary>
    /// Represents a type of edge in the graph, including its reverse relationship.
    /// </summary>
    public class EdgeType
    {
        public string ForwardName { get; }
        public string ReverseName { get; }

        public EdgeType(string forwardName, string reverseName)
        {
            ForwardName = forwardName ?? throw new ArgumentNullException(nameof(forwardName));
            ReverseName = reverseName ?? throw new ArgumentNullException(nameof(reverseName));
        }
    }
}