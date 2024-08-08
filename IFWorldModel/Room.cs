using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Room : Thing
    {
        public Room(Graph graph, string name) : base(graph, name, "room")
        {
            SetProperty("description", "");
        }

        public override Thing Clone(Graph graph)
        {
            var clone = new Room(graph, this.Name);
            CopyPropertiesTo(clone);
            return clone;
        }

        public string Description
        {
            get => GetPropertyValue<string>("description");
            set => SetProperty("description", value);
        }

        public Room SetDescription(string description)
        {
            Description = description;
            return this;
        }

        public Room AddExit(string direction, Room destination)
        {
            if (destination == null)
                throw new ArgumentNullException(nameof(destination));

            var edgeId = Guid.NewGuid().ToString();
            _graph.CreateEdge(edgeId, this.Id, destination.Id, direction);
            return this;
        }

        public Room RemoveExit(string direction)
        {
            var exitEdge = GetExitEdge(direction);
            if (exitEdge != null)
            {
                _graph.RemoveEdge(exitEdge);
            }
            return this;
        }

        public IEnumerable<(string Direction, Room Destination)> GetExits()
        {
            return _graph.EdgeTypes.Keys
                .Where(IsDirectionEdge)
                .Select(direction => (direction, GetExitRoom(direction)))
                .Where(exit => exit.Item2 != null);
        }

        public Room GetExit(string direction)
        {
            return GetExitRoom(direction);
        }

        public Room AddThing(Thing thing)
        {
            if (thing == null)
                throw new ArgumentNullException(nameof(thing));

            var edgeId = Guid.NewGuid().ToString();
            _graph.CreateEdge(edgeId, thing.Id, this.Id, "in");
            return this;
        }

        public Room RemoveThing(Thing thing)
        {
            if (thing == null)
                throw new ArgumentNullException(nameof(thing));

            var edge = _graph.GetEdgesBetween(thing.Id, this.Id).FirstOrDefault(e => e.Type == "in");
            if (edge != null)
            {
                _graph.RemoveEdge(edge);
            }
            return this;
        }

        public IEnumerable<Thing> GetContents()
        {
            return GetAdjacentNodesOfEdgeType("in")
                .Select(node => Thing.FromNode(_graph, node));
        }

        private Room GetExitRoom(string direction)
        {
            var exitEdge = GetExitEdge(direction);
            return exitEdge != null ? Room.FromNode(_graph, exitEdge.Target) : null;
        }

        private IEdge GetExitEdge(string direction)
        {
            return ((INode)this).OutgoingEdges.FirstOrDefault(e => e.Type == direction);
        }

        private static bool IsDirectionEdge(string edgeType)
        {
            return new[] { "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest", "up", "down" }
                .Contains(edgeType.ToLower());
        }

        public static Room FromNode(Graph graph, INode node)
        {
            if (node.GetPropertyValue<string>("type") != "room")
            {
                throw new ArgumentException("The provided node is not a room", nameof(node));
            }

            if (node is Room room)
            {
                return (Room)room.Clone(graph);
            }

            throw new ArgumentException("The provided node is not a Room instance", nameof(node));
        }
    }
}