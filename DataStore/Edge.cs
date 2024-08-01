using System.Collections.Generic;

namespace DataStore
{
    /// <summary>
    /// Represents a directional connection between two nodes in the graph.
    /// </summary>
    public class Edge
    {
        /// <summary>
        /// Gets the ID of the source node.
        /// </summary>
        public string Id1 { get; }

        /// <summary>
        /// Gets the ID of the target node.
        /// </summary>
        public string Id2 { get; }

        /// <summary>
        /// Gets the type of the edge.
        /// </summary>
        public string EdgeType { get; }

        /// <summary>
        /// Gets the list of properties associated with this edge.
        /// </summary>
        public List<Property> Properties { get; }

        /// <summary>
        /// Initializes a new instance of the Edge class.
        /// </summary>
        /// <param name="id1">The ID of the source node.</param>
        /// <param name="id2">The ID of the target node.</param>
        /// <param name="edgeType">The type of the edge.</param>
        /// <param name="properties">Optional initial properties for the edge.</param>
        public Edge(string id1, string id2, string edgeType, List<Property>? properties = null)
        {
            Id1 = id1;
            Id2 = id2;
            EdgeType = edgeType;
            Properties = properties?.ToList() ?? new List<Property>();
        }
    }
}