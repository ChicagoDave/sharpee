using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Room : Thing
    {
        public Room(World world, string name) : base(world, name, "room")
        {
        }

        public Room SetDescription(string description)
        {
            SetProperty("description", description);
            return this;
        }

        public string GetDescription()
        {
            return GetProperty<string>("description");
        }

        public Room AddScenery(string name, string description)
        {
            var scenery = new Scenery(_world, name)
                .SetDescription(description)
                .PlaceIn(this);
            return this;
        }

        public Room AddScenery(params (string name, string description)[] sceneryItems)
        {
            foreach (var (name, description) in sceneryItems)
            {
                new Scenery(_world, name)
                    .SetDescription(description)
                    .PlaceIn(this);
            }
            return this;
        }

        public Room AddExit(string direction, Room destination)
        {
            _world.ConnectNodesById(_id, destination._id, direction, GetReverseDirection(direction));
            return this;
        }

        public Room RemoveExit(string direction)
        {
            var exitEdge = _world.Nodes[_id].Edges.FirstOrDefault(e => e.EdgeType == direction);
            if (exitEdge != null)
            {
                _world.DisconnectNodesById(_id, exitEdge.Id2);
            }
            return this;
        }

        public IEnumerable<(string Direction, Room Destination)> GetExits()
        {
            return _world.Nodes[_id].Edges
                .Where(e => IsDirectionEdge(e.EdgeType))
                .Select(e => (e.EdgeType, new Room(_world, e.Id2)));
        }

        public Room GetExit(string direction)
        {
            var exitEdge = _world.Nodes[_id].Edges.FirstOrDefault(e => e.EdgeType == direction);
            return exitEdge != null ? new Room(_world, exitEdge.Id2) : null;
        }

        private static bool IsDirectionEdge(string edgeType)
        {
            return new[] { "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest", "up", "down" }
                .Contains(edgeType.ToLower());
        }

        private static string GetReverseDirection(string direction)
        {
            return direction.ToLower() switch
            {
                "north" => "south",
                "south" => "north",
                "east" => "west",
                "west" => "east",
                "northeast" => "southwest",
                "northwest" => "southeast",
                "southeast" => "northwest",
                "southwest" => "northeast",
                "up" => "down",
                "down" => "up",
                _ => throw new ArgumentException("Invalid direction", nameof(direction)),
            };
        }
    }
}