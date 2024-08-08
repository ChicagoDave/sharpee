using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Person : Animal
    {
        public Person(Graph graph, string name) : base(graph, name)
        {
            SetProperty("type", "person");
            SetProperty("sentient", true);
            SetProperty("isPlayerCharacter", false);  // By default, a person is not a player character
        }

        public bool IsSentient => GetProperty<bool>("sentient");

        public bool IsPlayerCharacter => GetProperty<bool>("isPlayerCharacter");

        public Person SetSentient(bool value)
        {
            return (Person)SetProperty("sentient", value);
        }

        public Person SetAsPlayerCharacter(bool value = true)
        {
            return (Person)SetProperty("isPlayerCharacter", value);
        }

        // Additional person-specific methods could be added here

        public new Person SetProperty(string propertyName, object value)
        {
            return (Person)base.SetProperty(propertyName, value);
        }

        public new Person AddToContainer(Thing container)
        {
            return (Person)base.AddToContainer(container);
        }

        public new Person RemoveFromContainer()
        {
            return (Person)base.RemoveFromContainer();
        }

        public new Person MoveTo(Thing destination)
        {
            return (Person)base.MoveTo(destination);
        }
    }
}