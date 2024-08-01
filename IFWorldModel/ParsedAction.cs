using System.Collections.Generic;
using System.Linq;

namespace IFWorldModel
{
    public class ParsedAction
    {
        public string Verb { get; }
        public List<WordGroup> NounGroups { get; } = new List<WordGroup>();
        public List<string> Adverbs { get; } = new List<string>();
        public Dictionary<string, string> Prepositions { get; } = new Dictionary<string, string>();

        public ParsedAction(string verb)
        {
            Verb = verb.ToLowerInvariant();
        }

        public ParsedAction AddNounGroup(params string[] words)
        {
            NounGroups.Add(new WordGroup(words));
            return this;
        }

        public ParsedAction AddAdverb(string adverb)
        {
            Adverbs.Add(adverb.ToLowerInvariant());
            return this;
        }

        public ParsedAction AddPreposition(string preposition, string object_)
        {
            Prepositions[preposition.ToLowerInvariant()] = object_.ToLowerInvariant();
            return this;
        }

        public string GetNoun(int index = 0)
        {
            return index < NounGroups.Count ? NounGroups[index].Noun : null;
        }

        public List<string> GetAdjectives(int nounIndex = 0)
        {
            return nounIndex < NounGroups.Count ? NounGroups[nounIndex].Adjectives : new List<string>();
        }

        public override string ToString()
        {
            var parts = new List<string> { Verb };
            parts.AddRange(NounGroups.Select(ng => ng.ToString()));
            parts.AddRange(Adverbs);
            parts.AddRange(Prepositions.Select(kvp => $"{kvp.Key} {kvp.Value}"));
            return string.Join(" ", parts);
        }
    }

    public class WordGroup
    {
        public List<string> Adjectives { get; } = new List<string>();
        public string Noun { get; }

        public WordGroup(params string[] words)
        {
            if (words.Length == 0)
                throw new ArgumentException("WordGroup must contain at least one word");

            Noun = words.Last().ToLowerInvariant();
            Adjectives.AddRange(words.Take(words.Length - 1).Select(w => w.ToLowerInvariant()));
        }

        public override string ToString()
        {
            return string.Join(" ", Adjectives.Concat(new[] { Noun }));
        }
    }
}