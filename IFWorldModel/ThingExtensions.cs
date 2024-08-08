using System;
using System.Collections.Generic;
using System.Linq;

namespace IFWorldModel
{
    public static class ThingExtensions
    {
        public static Thing MakeContainer(this Thing thing, bool initiallyOpen = true)
        {
            thing.IsContainer = true;
            thing.IsOpen = initiallyOpen;
            return thing;
        }

        public static Thing MakeSupporter(this Thing thing)
        {
            thing.IsSupporter = true;
            return thing;
        }

        public static Thing MakeOpenable(this Thing thing, bool initiallyOpen = false)
        {
            thing.IsOpenable = true;
            thing.IsOpen = initiallyOpen;
            return thing;
        }

        public static Thing MakeLockable(this Thing thing, bool initiallyLocked = false)
        {
            thing.IsLockable = true;
            thing.IsLocked = initiallyLocked;
            return thing;
        }

        public static Thing MakeContainerAndSupporter(this Thing thing, bool initiallyOpen = true)
        {
            return thing.MakeContainer(initiallyOpen).MakeSupporter();
        }

        public static Thing MakeOpenableContainer(this Thing thing, bool initiallyOpen = false)
        {
            return thing.MakeContainer().MakeOpenable(initiallyOpen);
        }

        public static Thing MakeOpenableAndLockableContainer(this Thing thing, bool initiallyOpen = false, bool initiallyLocked = false)
        {
            return thing.MakeContainer().MakeOpenable(initiallyOpen).MakeLockable(initiallyLocked);
        }

        public static Thing AddToContainer(this Thing item, Thing container)
        {
            container.AddItem(item);
            return item;
        }

        public static Thing AddToSupporter(this Thing item, Thing supporter)
        {
            supporter.AddSupportedItem(item);
            return item;
        }

        public static IEnumerable<Thing> ContainedIn(this Thing item)
        {
            return item.GetAdjacentNodesOfEdgeType("contains").OfType<Thing>().Where(t => t.IsContainer);
        }

        public static IEnumerable<Thing> SupportedBy(this Thing item)
        {
            return item.GetAdjacentNodesOfEdgeType("supports").OfType<Thing>().Where(t => t.IsSupporter);
        }

        public static Thing Describe(this Thing thing, string description)
        {
            return thing.SetProperty("description", description);
        }

        public static string Description(this Thing thing)
        {
            return thing.GetPropertyValue<string>("description") ?? "You see nothing special about it.";
        }

        public static Thing SetWeight(this Thing thing, double weight)
        {
            return thing.SetProperty("weight", weight);
        }

        public static double GetWeight(this Thing thing)
        {
            return thing.GetPropertyValue<double>("weight");
        }

        public static Thing SetSize(this Thing thing, int size)
        {
            return thing.SetProperty("size", size);
        }

        public static int GetSize(this Thing thing)
        {
            return thing.GetPropertyValue<int>("size");
        }

        public static bool TryOpen(this Thing thing)
        {
            if (!thing.IsOpenable)
            {
                Console.WriteLine($"The {thing.Name} can't be opened.");
                return false;
            }
            if (thing.IsLocked)
            {
                Console.WriteLine($"The {thing.Name} is locked.");
                return false;
            }
            if (thing.IsOpen)
            {
                Console.WriteLine($"The {thing.Name} is already open.");
                return false;
            }
            thing.Open();
            Console.WriteLine($"You open the {thing.Name}.");
            return true;
        }

        public static bool TryClose(this Thing thing)
        {
            if (!thing.IsOpenable)
            {
                Console.WriteLine($"The {thing.Name} can't be closed.");
                return false;
            }
            if (!thing.IsOpen)
            {
                Console.WriteLine($"The {thing.Name} is already closed.");
                return false;
            }
            thing.Close();
            Console.WriteLine($"You close the {thing.Name}.");
            return true;
        }

        public static bool TryLock(this Thing thing)
        {
            if (!thing.IsLockable)
            {
                Console.WriteLine($"The {thing.Name} can't be locked.");
                return false;
            }
            if (thing.IsLocked)
            {
                Console.WriteLine($"The {thing.Name} is already locked.");
                return false;
            }
            if (thing.IsOpen)
            {
                Console.WriteLine($"You need to close the {thing.Name} first.");
                return false;
            }
            thing.Lock();
            Console.WriteLine($"You lock the {thing.Name}.");
            return true;
        }

        public static bool TryUnlock(this Thing thing)
        {
            if (!thing.IsLockable)
            {
                Console.WriteLine($"The {thing.Name} can't be unlocked.");
                return false;
            }
            if (!thing.IsLocked)
            {
                Console.WriteLine($"The {thing.Name} is already unlocked.");
                return false;
            }
            thing.Unlock();
            Console.WriteLine($"You unlock the {thing.Name}.");
            return true;
        }
    }
}