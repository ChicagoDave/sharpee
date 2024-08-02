namespace DataStore
{
    public interface IGraphEventObserver
    {
        void OnNodeAdded(INode node);
        void OnNodeRemoved(INode node);
        void OnEdgeAdded(IEdge edge);
        void OnEdgeRemoved(IEdge edge);
        void OnPropertyChanged(INode node, string propertyName, object oldValue, object newValue);
    }
}