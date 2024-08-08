using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Thing : INode, IContainer, ISupporter
    {
        protected readonly Graph _graph;

        public string Id { get; }
        public IDictionary<string, IProperty> Properties { get; }
        private readonly List<IEdge> _outgoingEdges = new List<IEdge>();
        private readonly List<IEdge> _incomingEdges = new List<IEdge>();

        public Thing(Graph graph, string name, string type)
        {
            _graph = graph ?? throw new ArgumentNullException(nameof(graph));
            SetProperty("name", name);
            SetProperty("type", type);

            _graph.AddNode(this);
        }

        public string Name => GetPropertyValue<string>("name");
        public string Type => GetPropertyValue<string>("type");

        public virtual Thing Clone(Graph graph)
        {
            var clone = new Thing(graph, this.Name, this.Type);
            CopyPropertiesTo(clone);
            return clone;
        }

        protected void CopyPropertiesTo(Thing target)
        {
            foreach (var prop in Properties)
            {
                if (prop.Key != "name" && prop.Key != "type")
                {
                    target.SetProperty(prop.Key, prop.Value.GetRawValue());
                }
            }
        }

        // Container and Supporter properties
        public bool IsContainer { get; set; }
        public bool IsSupporter { get; set; }

        // Openable and Lockable properties
        public bool IsOpen { get; set; }
        public bool IsOpenable { get; set; }
        public bool IsLockable { get; set; }
        public bool IsLocked { get; set; }

        // IContainer implementation
        public IEnumerable<Thing> Contents =>
            IsContainer && (IsOpen || !IsOpenable)
                ? GetAdjacentNodesOfEdgeType("contains").OfType<Thing>()
                : Enumerable.Empty<Thing>();

        public virtual bool CanContain(Thing item) => IsContainer && (IsOpen || !IsOpenable);

        public void AddItem(Thing item)
        {
            if (!CanContain(item))
                throw new InvalidOperationException($"{Name} cannot contain {item.Name} (IsOpen: {IsOpen}, IsOpenable: {IsOpenable})");
            _graph.CreateEdge(Guid.NewGuid().ToString(), this.Id, item.Id, "contains");
        }

        public void RemoveItem(Thing item)
        {
            if (!IsOpen && IsOpenable)
                throw new InvalidOperationException($"Cannot remove {item.Name} from {Name} because it is closed.");
            var edge = _graph.GetEdgesBetween(this.Id, item.Id).FirstOrDefault(e => e.Type == "contains");
            if (edge != null)
                _graph.RemoveEdge(edge);
        }

        public static Thing FromNode(Graph graph, INode node)
        {
            if (node == null)
                throw new ArgumentNullException(nameof(node));

            if (node is Thing thing)
            {
                return thing.Clone(graph);
            }

            // If it's not already a Thing, create a new Thing
            var newThing = new Thing(graph, node.GetPropertyValue<string>("name"), node.GetPropertyValue<string>("type"));

            // Copy all properties from the node to the new Thing
            foreach (var property in node.Properties)
            {
                if (property.Key != "name" && property.Key != "type" && property.Key != "id")
                {
                    newThing.SetProperty(property.Key, property.Value.GetRawValue());
                }
            }

            // Set specific boolean properties
            newThing.IsContainer = node.GetPropertyValue<bool>("IsContainer");
            newThing.IsSupporter = node.GetPropertyValue<bool>("IsSupporter");
            newThing.IsOpen = node.GetPropertyValue<bool>("IsOpen");
            newThing.IsOpenable = node.GetPropertyValue<bool>("IsOpenable");
            newThing.IsLockable = node.GetPropertyValue<bool>("IsLockable");
            newThing.IsLocked = node.GetPropertyValue<bool>("IsLocked");

            // Note: We don't copy edges here because the new Thing is added to the graph
            // and should establish its own connections

            return newThing;
        }

        // ISupporter implementation
        public IEnumerable<Thing> SupportedItems =>
            IsSupporter ? GetAdjacentNodesOfEdgeType("supports").OfType<Thing>() : Enumerable.Empty<Thing>();

        public virtual bool CanSupport(Thing item) => IsSupporter;

        public void AddSupportedItem(Thing item)
        {
            if (!CanSupport(item))
                throw new InvalidOperationException($"{Name} cannot support {item.Name}");
            _graph.CreateEdge(Guid.NewGuid().ToString(), this.Id, item.Id, "supports");
        }

        public void RemoveSupportedItem(Thing item)
        {
            var edge = _graph.GetEdgesBetween(this.Id, item.Id).FirstOrDefault(e => e.Type == "supports");
            if (edge != null)
                _graph.RemoveEdge(edge);
        }

        // Openable and Lockable methods
        public bool Open()
        {
            if (!IsOpenable || IsLocked)
                return false;
            IsOpen = true;
            return true;
        }

        public bool Close()
        {
            if (!IsOpenable)
                return false;
            IsOpen = false;
            return true;
        }

        public bool Lock()
        {
            if (!IsLockable || IsOpen)
                return false;
            IsLocked = true;
            return true;
        }

        public bool Unlock()
        {
            if (!IsLockable)
                return false;
            IsLocked = false;
            return true;
        }

        // Property management methods
        public Thing SetProperty(string propertyName, object value)
        {
            SetPropertyValue(propertyName, value);
            return this;
        }

        // Relationship check methods
        public bool IsIn(Thing container) =>
            _outgoingEdges.Any(e => e.Type == "contains" && e.Target.Id == container.Id);

        public bool IsOn(Thing supporter) =>
            _outgoingEdges.Any(e => e.Type == "supports" && e.Target.Id == supporter.Id);

        // INode interface implementation
        public IReadOnlyCollection<IEdge> OutgoingEdges => _outgoingEdges.AsReadOnly();
        public IReadOnlyCollection<IEdge> IncomingEdges => _incomingEdges.AsReadOnly();

        public void AddOutgoingEdge(IEdge edge)
        {
            if (edge == null) throw new ArgumentNullException(nameof(edge));
            if (edge.Source != this) throw new InvalidOperationException("Edge source must be this node.");
            _outgoingEdges.Add(edge);
        }

        public void AddIncomingEdge(IEdge edge)
        {
            if (edge == null) throw new ArgumentNullException(nameof(edge));
            if (edge.Target != this) throw new InvalidOperationException("Edge target must be this node.");
            _incomingEdges.Add(edge);
        }

        public bool RemoveOutgoingEdge(IEdge edge) => _outgoingEdges.Remove(edge);

        public bool RemoveIncomingEdge(IEdge edge) => _incomingEdges.Remove(edge);

        public IEnumerable<Thing> GetContents()
        {
            return GetAdjacentNodesOfEdgeType("in")
                .Select(node => Thing.FromNode(_graph, node));
        }

        public IEnumerable<INode> GetAdjacentNodes()
        {
            return _outgoingEdges.Select(e => e.Target)
                .Concat(_incomingEdges.Select(e => e.Source))
                .OfType<INode>()
                .Distinct();
        }

        public IEnumerable<INode> GetAdjacentNodesOfEdgeType(string edgeType)
        {
            return _outgoingEdges.Where(e => e.Type == edgeType).Select(e => e.Target)
                .Concat(_incomingEdges.Where(e => e.Type == edgeType).Select(e => e.Source))
                .OfType<INode>()
                .Distinct();
        }

        public IEnumerable<IEdge> GetEdgesToNode(INode targetNode)
        {
            return _outgoingEdges.Where(e => e.Target == targetNode)
                .Concat(_incomingEdges.Where(e => e.Source == targetNode));
        }

        public T? GetPropertyValue<T>(string propertyName)
        {
            if (Properties.TryGetValue(propertyName, out var property))
            {
                return property.GetValue<T>();
            }
            return default;
        }

        public INode SetPropertyValue(string propertyName, object? value)
        {
            if (Properties.TryGetValue(propertyName, out var existingProperty))
            {
                existingProperty.SetValue(value);
            }
            else
            {
                Properties[propertyName] = new Property(propertyName, value);
            }
            return this;
        }
    }
}