using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Container : Thing
    {
        public Container(Graph graph, string name, string type) : base(graph, name, type)
        {
        }

        public virtual IEnumerable<Thing> Contents()
        {
            return GetAdjacentNodesOfEdgeType("contains")
                .Select(node => new Thing(_graph, node.Id));
        }

        public virtual bool CanAddItem(Thing item)
        {
            // Default implementation: containers can hold any item
            return true;
        }

        public virtual Container AddItem(Thing item)
        {
            if (!CanAddItem(item))
            {
                throw new InvalidOperationException($"Cannot add {item.Name} to {Name}");
            }

            _graph.CreateEdge(Guid.NewGuid().ToString(), item.Id, this.Id, "in");
            return this;
        }

        public virtual Container RemoveItem(Thing item)
        {
            var itemEdge = GetEdgesToNode(item).FirstOrDefault(e => e.Type == "in");
            if (itemEdge != null)
            {
                _graph.RemoveEdge(itemEdge);
            }
            return this;
        }

        protected Container(Graph graph, string id) : base(graph, id)
        {
        }
    }
}