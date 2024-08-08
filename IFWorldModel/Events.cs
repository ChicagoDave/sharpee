using DataStore;

public class Events : IGraphEventHandler
{
    private readonly Graph _graph;

    public event Action<Node>? NodeAdded;
    public event Action<Node>? NodeRemoved;
    public event Action<Edge>? EdgeAdded;
    public event Action<Edge>? EdgeRemoved;
    public event Action<string, Property>? PropertyChanged;

    public Events(Graph graph)
    {
        _graph = graph;
        _graph.AddEventHandler(this);
    }

    public void HandleNodeAdded(Node node) => NodeAdded?.Invoke(node);
    public void HandleNodeRemoved(Node node) => NodeRemoved?.Invoke(node);
    public void HandleEdgeAdded(Edge edge) => EdgeAdded?.Invoke(edge);
    public void HandleEdgeRemoved(Edge edge) => EdgeRemoved?.Invoke(edge);
    public void HandlePropertyChanged(string nodeOrEdgeId, Property property) =>
        PropertyChanged?.Invoke(nodeOrEdgeId, property);
}