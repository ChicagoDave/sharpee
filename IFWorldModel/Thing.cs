using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Thing
    {
        protected readonly World _world;
        protected readonly string _id;

        public Thing(World world, string name, string type)
        {
            _world = world;
            _id = _world.AddNode(new Property("name", name), new Property("type", type));
        }

        public string Name => _world.Nodes[_id].GetPropertyValue<string>("name");
        public string Type => _world.Nodes[_id].GetPropertyValue<string>("type");

        public Thing SetProperty(string propertyName, object value)
        {
            _world.SetNodeProperty(_id, propertyName, value);
            return this;
        }

        public T GetProperty<T>(string propertyName)
        {
            return _world.Nodes[_id].GetPropertyValue<T>(propertyName);
        }

        public Thing AddToContainer(Thing container)
        {
            _world.ConnectNodesById(_id, container._id, "in", "contains");
            return this;
        }

        public Thing RemoveFromContainer()
        {
            var containerEdge = _world.Nodes[_id].Edges.FirstOrDefault(e => e.EdgeType == "in");
            if (containerEdge != null)
            {
                _world.DisconnectNodesById(_id, containerEdge.Id2);
            }
            return this;
        }

        public IEnumerable<Thing> Contents()
        {
            return _world.Nodes[_id].Edges
                .Where(e => e.EdgeType == "contains")
                .Select(e => new Thing(_world, e.Id2));
        }

        public bool IsIn(Thing container)
        {
            return _world.Nodes[_id].Edges.Any(e => e.EdgeType == "in" && e.Id2 == container._id);
        }

        public Thing MoveTo(Thing destination)
        {
            RemoveFromContainer();
            AddToContainer(destination);
            return this;
        }

        protected Thing(World world, string id)
        {
            _world = world;
            _id = id;
        }
    }
}