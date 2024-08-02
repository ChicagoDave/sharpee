public interface IProperty
{
    string Name { get; }
    Type ValueType { get; }
    bool HasValue { get; }
    T? GetValue<T>();
    object? GetRawValue();
    void SetValue(object? value);
    void RemoveValue();
    bool IsExecutable { get; }
    object? Execute(params object[] args);
}