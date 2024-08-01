namespace DataStore
{
    /// <summary>
    /// Defines methods for handling graph events.
    /// </summary>
    public interface IGraphEventHandler
    {
        /// <summary>
        /// Handles the event when a node is added to the graph.
        /// </summary>
        /// <param name="node">The node that was added.</param>
        void HandleNodeAdded(Node node);

        /// <summary>
        /// Handles the event when a node is removed from the graph.
        /// </summary>
        /// <param name="node">The node that was removed.</param>
        void HandleNodeRemoved(Node node);

        /// <summary>
        /// Handles the event when an edge is added to the graph.
        /// </summary>
        /// <param name="edge">The edge that was added.</param>
        void HandleEdgeAdded(Edge edge);

        /// <summary>
        /// Handles the event when an edge is removed from the graph.
        /// </summary>
        /// <param name="edge">The edge that was removed.</param>
        void HandleEdgeRemoved(Edge edge);

        /// <summary>
        /// Handles the event when a property of a node or edge is changed.
        /// </summary>
        /// <param name="nodeOrEdgeId">The ID of the node or edge whose property was changed.</param>
        /// <param name="property">The property that was changed.</param>
        void HandlePropertyChanged(string nodeOrEdgeId, Property property);
    }
}