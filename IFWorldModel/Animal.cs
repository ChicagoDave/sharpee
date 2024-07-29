using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Animal : Thing
    {
        public Animal(World world, string name) : base(world, name, "animal")
        {
            // The "animate" property is set to true by default in the constructor
            SetProperty("animate", true);
        }

        public bool IsAnimate => GetProperty<bool>("animate");

        // We'll keep this method in case we need to change the animate status for any reason
        public Animal SetAnimate(bool value)
        {
            return (Animal)SetProperty("animate", value);
        }

        // Additional animal-specific methods could be added here

        public new Animal SetProperty(string propertyName, object value)
        {
            return (Animal)base.SetProperty(propertyName, value);
        }

        public new Animal AddToContainer(Thing container)
        {
            return (Animal)base.AddToContainer(container);
        }

        public new Animal RemoveFromContainer()
        {
            return (Animal)base.RemoveFromContainer();
        }

        public new Animal MoveTo(Thing destination)
        {
            return (Animal)base.MoveTo(destination);
        }
    }
}