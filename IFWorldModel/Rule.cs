using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class Rule : Thing
    {
        public Rule(World world, string name) : base(world, name, "rule")
        {
            SetProperty("isEnabled", true);
        }

        public bool IsEnabled => GetProperty<bool>("isEnabled");

        public Rule SetEnabled(bool value)
        {
            return (Rule)SetProperty("isEnabled", value);
        }

        public virtual void Execute(Thing actor, Thing subject)
        {
            // Base implementation does nothing
        }

        public new Rule SetProperty(string propertyName, object value)
        {
            return (Rule)base.SetProperty(propertyName, value);
        }
    }

    public class BeforeRule : Rule
    {
        public BeforeRule(World world, string name) : base(world, name)
        {
            SetProperty("type", "beforeRule");
        }

        public override void Execute(Thing actor, Thing subject)
        {
            // Implementation for before rule execution
        }
    }

    public class AfterRule : Rule
    {
        public AfterRule(World world, string name) : base(world, name)
        {
            SetProperty("type", "afterRule");
        }

        public override void Execute(Thing actor, Thing subject)
        {
            // Implementation for after rule execution
        }
    }

    public class World
    {
        // ... existing code ...

        private List<BeforeRule> _beforeRules = new List<BeforeRule>();
        private List<AfterRule> _afterRules = new List<AfterRule>();
        private Dictionary<Rule, (HashSet<Rule> Before, HashSet<Rule> After)> _ruleRelations =
            new Dictionary<Rule, (HashSet<Rule>, HashSet<Rule>)>();

        public World AddBeforeRule(BeforeRule rule)
        {
            _beforeRules.Add(rule);
            _ruleRelations[rule] = (new HashSet<Rule>(), new HashSet<Rule>());
            return this;
        }

        public World AddAfterRule(AfterRule rule)
        {
            _afterRules.Add(rule);
            _ruleRelations[rule] = (new HashSet<Rule>(), new HashSet<Rule>());
            return this;
        }

        public World SetRuleOrder(Rule first, Rule second)
        {
            if (!_ruleRelations.ContainsKey(first) || !_ruleRelations.ContainsKey(second))
            {
                throw new ArgumentException("Both rules must be added to the world before setting their order.");
            }

            _ruleRelations[first].After.Add(second);
            _ruleRelations[second].Before.Add(first);
            return this;
        }

        public World AddRuleBefore(Rule newRule, Rule existingRule)
        {
            if (newRule is BeforeRule)
                AddBeforeRule((BeforeRule)newRule);
            else if (newRule is AfterRule)
                AddAfterRule((AfterRule)newRule);
            else
                throw new ArgumentException("Invalid rule type");

            SetRuleOrder(newRule, existingRule);
            return this;
        }

        public World AddRuleAfter(Rule newRule, Rule existingRule)
        {
            if (newRule is BeforeRule)
                AddBeforeRule((BeforeRule)newRule);
            else if (newRule is AfterRule)
                AddAfterRule((AfterRule)newRule);
            else
                throw new ArgumentException("Invalid rule type");

            SetRuleOrder(existingRule, newRule);
            return this;
        }

        public void ExecuteBeforeRules(Thing actor, Thing subject)
        {
            foreach (var rule in TopologicalSort(_beforeRules).Where(r => r.IsEnabled))
            {
                rule.Execute(actor, subject);
            }
        }

        public void ExecuteAfterRules(Thing actor, Thing subject)
        {
            foreach (var rule in TopologicalSort(_afterRules).Where(r => r.IsEnabled))
            {
                rule.Execute(actor, subject);
            }
        }

        private IEnumerable<T> TopologicalSort<T>(IEnumerable<T> rules) where T : Rule
        {
            var sorted = new List<T>();
            var visited = new HashSet<T>();

            foreach (var rule in rules)
            {
                Visit(rule, visited, sorted);
            }

            return sorted;

            void Visit(T rule, HashSet<T> visited, List<T> sorted)
            {
                if (!visited.Contains(rule))
                {
                    visited.Add(rule);

                    foreach (var dep in _ruleRelations[rule].Before.OfType<T>())
                    {
                        Visit(dep, visited, sorted);
                    }

                    sorted.Add(rule);
                }
                else if (!sorted.Contains(rule))
                {
                    throw new InvalidOperationException("Circular dependency detected in rules.");
                }
            }
        }
    }
}