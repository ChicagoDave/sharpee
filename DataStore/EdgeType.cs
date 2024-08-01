using System.Collections.Generic;

namespace DataStore
{
    /// <summary>
    /// Represents a type of edge in the graph, including its reverse relationship.
    /// </summary>
    public class EdgeType
    {
        /// <summary>
        /// Gets the name of this edge type.
        /// </summary>
        public string Name { get; }

        /// <summary>
        /// Gets the name of the reverse relationship for this edge type.
        /// </summary>
        public string ReverseName { get; }

        /// <summary>
        /// Initializes a new instance of the EdgeType class.
        /// </summary>
        /// <param name="name">The name of the edge type.</param>
        /// <param name="reverseName">The name of the reverse relationship.</param>
        public EdgeType(string name, string reverseName)
        {
            Name = name;
            ReverseName = reverseName;
        }
    }
}