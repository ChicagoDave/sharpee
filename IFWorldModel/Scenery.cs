using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Scenery : Thing
    {
        public Scenery(World world, string name) : base(world, name, "scenery")
        {
            SetProperty("movable", false);
            SetProperty("examinable", true);
        }

        public Scenery SetDescription(string description)
        {
            return (Scenery)SetProperty("description", description);
        }

        public string GetDescription()
        {
            return GetProperty<string>("description");
        }

        public bool IsExaminable => GetProperty<bool>("examinable");

        public bool IsMovable => GetProperty<bool>("movable");

        public Scenery PlaceIn(Room room)
        {
            return (Scenery)MoveTo(room);
        }

        public Room GetLocation()
        {
            var containerEdge = _world.Nodes[_id].Edges.FirstOrDefault(e => e.EdgeType == "in");
            return containerEdge != null ? new Room(_world, containerEdge.Id2) : null;
        }

        public new Scenery SetProperty(string propertyName, object value)
        {
            return (Scenery)base.SetProperty(propertyName, value);
        }

        // Override these methods to prevent scenery from being moved
        public new Scenery AddToContainer(Thing container)
        {
            if (container is Room)
            {
                return (Scenery)base.AddToContainer(container);
            }
            throw new InvalidOperationException("Scenery can only be placed in rooms.");
        }

        public new Scenery RemoveFromContainer()
        {
            throw new InvalidOperationException("Scenery cannot be removed from its location.");
        }

        public new Scenery MoveTo(Thing destination)
        {
            if (destination is Room)
            {
                return (Scenery)base.MoveTo(destination);
            }
            throw new InvalidOperationException("Scenery can only be moved to rooms.");
        }
    }
}