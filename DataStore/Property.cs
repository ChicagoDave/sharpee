using System;

namespace DataStore
{
    public class Property : IProperty
    {
        public string Name { get; }
        private object? _value;

        public Type ValueType => _value?.GetType() ?? typeof(object);

        public bool HasValue => _value != null;

        public Property(string name, object? value = null)
        {
            Name = name ?? throw new ArgumentNullException(nameof(name));
            _value = value;
        }

        public T? GetValue<T>()
        {
            if (_value == null)
            {
                return default;
            }

            if (_value is T typedValue)
            {
                return typedValue;
            }

            try
            {
                return (T)Convert.ChangeType(_value, typeof(T));
            }
            catch (InvalidCastException)
            {
                throw new InvalidCastException($"Cannot convert property '{Name}' value of type {_value.GetType().Name} to {typeof(T).Name}");
            }
        }

        public object? GetRawValue()
        {
            return _value;
        }

        public void SetValue(object? value)
        {
            _value = value;
        }

        public void RemoveValue()
        {
            _value = null;
        }

        public bool IsExecutable => _value is Delegate;

        public object? Execute(params object[] args)
        {
            if (!IsExecutable)
            {
                throw new InvalidOperationException($"Property '{Name}' is not executable");
            }

            if (_value is not Delegate del)
            {
                throw new InvalidOperationException($"Property '{Name}' value is not a valid delegate");
            }

            try
            {
                return del.DynamicInvoke(args);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Error executing property '{Name}': {ex.Message}", ex);
            }
        }

        public override string ToString()
        {
            return $"{Name}: {_value ?? "null"}";
        }
    }
}