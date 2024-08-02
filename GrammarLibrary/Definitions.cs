using System;
using System.Collections.Generic;
using System.Linq;

namespace GrammarLibrary
{
    public class Verb
    {
        public string Name { get; }
        public string[] Aliases { get; }
        private List<Pattern> Patterns { get; } = new List<Pattern>();

        public Verb(string name, params string[] aliases)
        {
            Name = name.ToLowerInvariant();
            Aliases = aliases.Select(a => a.ToLowerInvariant()).ToArray();
        }

        public Verb Pattern(params PatternElement[] elements)
        {
            Patterns.Add(new Pattern(elements));
            return this;
        }

        // Corrected method to get patterns
        public IReadOnlyList<Pattern> GetPatterns() => Patterns.AsReadOnly();
    }

    public class Pattern
    {
        public PatternElement[] Elements { get; }

        public Pattern(PatternElement[] elements)
        {
            Elements = elements;
        }
    }

    public abstract class PatternElement { }

    public class Lit : PatternElement
    {
        public string Text { get; }

        public Lit(string text)
        {
            Text = text.ToLowerInvariant();
        }
    }

    public class Var : PatternElement
    {
        public string Name { get; }

        public Var(string name)
        {
            Name = name;
        }
    }

    public class Choice : PatternElement
    {
        public PatternElement[] Options { get; }

        public Choice(params PatternElement[] options)
        {
            Options = options;
        }
    }

    public class Multi : PatternElement { }

    public class MultiInside : PatternElement { }

    public static class Definitions
    {
        private static List<Verb> Verbs { get; } = new List<Verb>();

        public static Verb Define(string name, params string[] aliases)
        {
            var verb = new Verb(name, aliases);
            Verbs.Add(verb);
            return verb;
        }

        public static Lit Lit(string text) => new Lit(text);
        public static Var Var(string name) => new Var(name);
        public static Choice Choice(params PatternElement[] options) => new Choice(options);
        public static Multi Multi() => new Multi();
        public static MultiInside MultiInside() => new MultiInside();

        // Add a method to get all defined verbs
        public static IReadOnlyList<Verb> GetAllVerbs() => Verbs.AsReadOnly();
    }
}