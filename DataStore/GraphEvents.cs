using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DataStore
{
    /// <summary>
    /// Represents the base class for all graph events.
    /// </summary>
    public abstract class GraphEvent
    {
        // Common properties and methods for graph events can be added here
    }

    /// <summary>
    /// Represents an event that occurs when a node is added to the graph.
    /// </summary>
    public class NodeAddedEvent : GraphEvent
    {
        /// <summary>
        /// Gets the node that was added to the graph.
        /// </summary>
        public Node AddedNode { get; }

        /// <summary>
        /// Initializes a new instance of the NodeAddedEvent class.
        /// </summary>
        /// <param name="node">The node that was added to the graph.</param>
        public NodeAddedEvent(Node node)
        {
            AddedNode = node;
        }
    }

    /// <summary>
    /// Represents an event that occurs when a node is removed from the graph.
    /// </summary>
    public class NodeRemovedEvent : GraphEvent
    {
        /// <summary>
        /// Gets the node that was removed from the graph.
        /// </summary>
        public Node RemovedNode { get; }

        /// <summary>
        /// Initializes a new instance of the NodeRemovedEvent class.
        /// </summary>
        /// <param name="node">The node that was removed from the graph.</param>
        public NodeRemovedEvent(Node node)
        {
            RemovedNode = node;
        }
    }

    /// <summary>
    /// Represents an event that occurs when an edge is added to the graph.
    /// </summary>
    public class EdgeAddedEvent : GraphEvent
    {
        /// <summary>
        /// Gets the edge that was added to the graph.
        /// </summary>
        public Edge AddedEdge { get; }

        /// <summary>
        /// Initializes a new instance of the EdgeAddedEvent class.
        /// </summary>
        /// <param name="edge">The edge that was added to the graph.</param>
        public EdgeAddedEvent(Edge edge)
        {
            AddedEdge = edge;
        }
    }

    /// <summary>
    /// Represents an event that occurs when an edge is removed from the graph.
    /// </summary>
    public class EdgeRemovedEvent : GraphEvent
    {
        /// <summary>
        /// Gets the edge that was removed from the graph.
        /// </summary>
        public Edge RemovedEdge { get; }

        /// <summary>
        /// Initializes a new instance of the EdgeRemovedEvent class.
        /// </summary>
        /// <param name="edge">The edge that was removed from the graph.</param>
        public EdgeRemovedEvent(Edge edge)
        {
            RemovedEdge = edge;
        }
    }

    /// <summary>
    /// Represents an event that occurs when a property of a node or edge is changed.
    /// </summary>
    public class PropertyChangedEvent : GraphEvent
    {
        /// <summary>
        /// Gets the ID of the node or edge whose property was changed.
        /// </summary>
        public string NodeOrEdgeId { get; }

        /// <summary>
        /// Gets the property that was changed.
        /// </summary>
        public Property Property { get; }

        /// <summary>
        /// Initializes a new instance of the PropertyChangedEvent class.
        /// </summary>
        /// <param name="nodeOrEdgeId">The ID of the node or edge whose property was changed.</param>
        /// <param name="property">The property that was changed.</param>
        public PropertyChangedEvent(string nodeOrEdgeId, Property property)
        {
            NodeOrEdgeId = nodeOrEdgeId;
            Property = property;
        }
    }
}