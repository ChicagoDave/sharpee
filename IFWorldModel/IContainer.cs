using IFWorldModel;

public interface IContainer
{
    IEnumerable<Thing> Contents { get; }
    bool CanContain(Thing item);
    void AddItem(Thing item);
    void RemoveItem(Thing item);

    bool IsOpen { get; }
    bool IsOpenable { get; }
    bool IsLockable { get; }
    bool IsLocked { get; }

    bool Open();
    bool Close();
    bool Lock();
    bool Unlock();
}