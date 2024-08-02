using DataStore;

namespace IFWorldModel
{
    public class Thing
    {
        protected readonly Graph _graph;
        protected readonly string _id;

        public Thing(Graph graph, string name, string type)
        {
            _graph = graph ?? throw new ArgumentNullException(nameof(graph));
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be null or whitespace", nameof(name));
            if (string.IsNullOrWhiteSpace(type))
                throw new ArgumentException("Type cannot be null or whitespace", nameof(type));

            var node = new ThingNode(_graph.Nodes.Count.ToString());
            node.SetPropertyValue("name", name)
                .SetPropertyValue("type", type);
            _graph.AddNode(node);
            _id = node.Id;
        }

        public string Name => GetRequiredProperty<string>("name");
        public string Type => GetRequiredProperty<string>("type");

        private T GetRequiredProperty<T>(string propertyName)
        {
            var value = GetProperty<T>(propertyName);
            if (value == null)
            {
                throw new InvalidOperationException($"Required property '{propertyName}' not found for Thing with id {_id}");
            }
            return value;
        }

        public Thing SetProperty(string propertyName, object value)
        {
            if (string.IsNullOrWhiteSpace(propertyName))
                throw new ArgumentException("Property name cannot be null or whitespace", nameof(propertyName));

            if (!_graph.Nodes.TryGetValue(_id, out var node))
                throw new InvalidOperationException($"Node with id {_id} not found in the graph");

            node.SetPropertyValue(propertyName, value);
            return this;
        }

        public T? GetProperty<T>(string propertyName)
        {
            if (string.IsNullOrWhiteSpace(propertyName))
                throw new ArgumentException("Property name cannot be null or whitespace", nameof(propertyName));

            if (!_graph.Nodes.TryGetValue(_id, out var node))
                throw new InvalidOperationException($"Node with id {_id} not found in the graph");

            var value = node.GetPropertyValue<T>(propertyName);

            // If T is a value type and the property doesn't exist, GetPropertyValue will return default(T)
            // For reference types, it will return null if the property doesn't exist
            return value;
        }

        public Thing AddToContainer(Thing container)
        {
            var edge = new ThingEdge($"{_id}-{container._id}", _graph.Nodes[_id], _graph.Nodes[container._id], "in");
            _graph.AddEdge(edge);
            return this;
        }

        public Thing RemoveFromContainer()
        {
            var containerEdge = _graph.Edges.Values.FirstOrDefault(e => e.Source.Id == _id && e.Type == "in");
            if (containerEdge != null)
            {
                _graph.RemoveEdge(containerEdge.Id);
            }
            return this;
        }

        public IEnumerable<Thing> Contents()
        {
            return _graph.Edges.Values
                .Where(e => e.Target.Id == _id && e.Type == "contains")
                .Select(e => new Thing(_graph, e.Source.Id));
        }

        public bool IsIn(Thing container)
        {
            return _graph.Edges.Values.Any(e => e.Source.Id == _id && e.Target.Id == container._id && e.Type == "in");
        }

        public Thing MoveTo(Thing destination)
        {
            RemoveFromContainer();
            AddToContainer(destination);
            return this;
        }

        protected Thing(Graph graph, string id)
        {
            _graph = graph ?? throw new ArgumentNullException(nameof(graph));
            _id = id ?? throw new ArgumentNullException(nameof(id));
        }

        private class ThingNode : Node
        {
            public ThingNode(string id) : base(id) { }
        }

        private class ThingEdge : Edge
        {
            public ThingEdge(string id, INode source, INode target, string type) : base(id, source, target, type) { }
        }
    }
}