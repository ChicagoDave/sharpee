/**
 * character-lines.ts — the character model a person declares in words:
 * `mood`, `feels`, `knows`, `thinks`, `spreads`, `goal`, `influence`, and
 * `resists`.
 *
 * Words resolve against the character manifest's closed vocabularies;
 * targets resolve like any entity reference; `thinks` values resolve against
 * the fact table; topics normalize to their canonical key. One level of
 * belief only — a topic or fact containing a mental verb is refused. Each
 * line kind refuses its own duplicates. A non-person block was already
 * reported by the character host gate and is skipped here.
 *
 * Public interface: characterLinesBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-310 D3/D14 — `mood`, `feels`, `knows`, `thinks`; the one-level-of-belief rule.
 * - ADR-310 D8 — goal blocks; D9 — influence blocks and `resists`; D10 — `spreads`.
 * - ADR-329 D10 — the `perform` goal step lowers through the acting grammar.
 */
import { CHARACTER_MANIFEST } from '../../character-manifest.js';
import type { IRGoalStep, IRResistsEntry, IRSpreads } from '../../ir.js';
import { normalizeTopic } from '../topic.js';
import type { EntityLineBuilder } from './context.js';

export const characterLinesBuilder: EntityLineBuilder = {
  name: 'character-lines',
  requires: ['character-host'],
  build(decl, entity, context) {
    if (!entity.isPerson) return;
    const { scope, feels, knows, thinks, goals, influences, resists } = entity;
    let mood: string | undefined;
    let spreads: IRSpreads | undefined;
    if (decl.moods.length > 0) {
      const word = decl.moods[0].word;
      if (!context.isMoodWord(word)) {
        context.diagnostics.error(
          'analysis.unknown-mood-word',
          `\`${word}\` is not a mood word — the vocabulary: ${context.moodVocabulary().join(', ')}${context.suggestText(word, context.moodVocabulary())}.`,
          decl.moods[0].span,
        );
      } else {
        mood = word;
      }
      for (const extra of decl.moods.slice(1)) {
        context.diagnostics.error('analysis.mood-duplicate', 'This `create` block already has a `mood` line.', extra.span);
      }
    }
    for (const f of decl.feels) {
      if (!CHARACTER_MANIFEST.dispositions.includes(f.disposition)) {
        context.diagnostics.error(
          'analysis.unknown-disposition-word',
          `\`${f.disposition}\` is not a disposition word — the vocabulary: ${CHARACTER_MANIFEST.dispositions.join(', ')}.`,
          f.span,
        );
        continue;
      }
      const target = context.resolveEntityId(f.target);
      if (target === null) continue; // resolveEntityId already reported
      if (feels.some((e) => e.target === target)) {
        context.diagnostics.error(
          'analysis.feels-duplicate',
          `This block already declares a feeling toward \`${f.target.words.join(' ')}\`.`,
          f.span,
        );
        continue;
      }
      feels.push({ disposition: f.disposition, target, span: f.span });
    }
    for (const k of decl.knows) {
      if (context.checkTheoryOfMind(k.topic, 'knows')) continue;
      const topic = normalizeTopic(k.topic.words.join(' '));
      const { source, confidence, confided, ok } = context.classifyKnowledgeSlots(k.slots, 'knows');
      if (!ok) continue;
      if (source === undefined) {
        context.diagnostics.error(
          'analysis.knows-missing-source',
          `\`knows ${k.topic.words.join(' ')}\` needs a source — ${CHARACTER_MANIFEST.factSources.join(', ')} (e.g. \`knows the murder, witnessed\`).`,
          k.span,
        );
        continue;
      }
      if (knows.some((e) => e.topic === topic)) {
        context.diagnostics.error('analysis.knows-duplicate', `This block already declares \`knows ${topic}\`.`, k.span);
        continue;
      }
      knows.push({
        topic,
        source,
        ...(confidence !== undefined ? { confidence } : {}),
        ...(confided !== undefined ? { confided } : {}),
        span: k.span,
      });
    }
    for (const t of decl.thinks) {
      if (context.checkTheoryOfMind(t.fact, 'thinks')) continue;
      const factId = t.fact.words.join('-').toLowerCase();
      const fact = context.factById.get(factId);
      if (!fact) {
        context.diagnostics.error(
          'analysis.unknown-fact',
          `No \`define fact\` named \`${t.fact.words.join(' ')}\`${context.suggestText(factId, [...context.factById.keys()])}.`,
          t.fact.span,
        );
        continue;
      }
      const value = context.canonicalFactValue(t.value);
      if (value === null) continue; // canonicalFactValue already reported
      if (!fact.values.includes(value)) {
        context.diagnostics.error(
          'analysis.unknown-fact-value',
          `\`${t.value.words.join(' ')}\` is not a declared value of \`${fact.name}\` — the set: ${fact.values.join(', ')}.`,
          t.value.span,
        );
        continue;
      }
      const { source, confidence, ok } = context.classifyKnowledgeSlots(t.slots, 'thinks');
      if (!ok) continue;
      if (thinks.some((e) => e.factId === factId)) {
        context.diagnostics.error('analysis.thinks-duplicate', `This block already declares a belief about \`${fact.name}\`.`, t.span);
        continue;
      }
      thinks.push({
        factId,
        value,
        ...(confidence !== undefined ? { confidence } : {}),
        ...(source !== undefined ? { source } : {}),
        span: t.span,
      });
    }
    // ADR-310 D10: at most one `spreads` line; the audience resolves
    // against the manifest; topics normalize like `knows` topics.
    for (const extra of decl.spreads.slice(1)) {
      context.diagnostics.error('analysis.spreads-duplicate', 'This block already has a `spreads` line.', extra.span);
    }
    const s = decl.spreads[0];
    if (s?.mode === 'nothing') {
      spreads = { kind: 'nothing', span: s.span };
    } else if (s) {
      if (!CHARACTER_MANIFEST.audiences.includes(s.audience.word)) {
        context.diagnostics.error(
          'analysis.unknown-audience',
          `\`${s.audience.word}\` is not an audience — ${CHARACTER_MANIFEST.audiences.join(', ')}.`,
          s.audience.span,
        );
      } else {
        const topics: string[] = [];
        for (const t of s.topics) {
          const topic = normalizeTopic(t.words.join(' '));
          if (topics.includes(topic)) {
            context.diagnostics.error('analysis.spreads-topic-duplicate', `\`${topic}\` is already in this \`spreads\` list.`, t.span);
            continue;
          }
          topics.push(topic);
        }
        const except = s.except.map((e) => context.resolveEntityId(e)).filter((id): id is string => id !== null);
        spreads = { kind: 'spreads', topics, to: s.audience.word, except, span: s.span };
      }
    }
    // ADR-310 D8: goal blocks. Conditions resolve with `it` = the owner
    // (the on-clause scope); step refs resolve like any entity ref;
    // act/say keys are phrase keys.
    for (const g of decl.goals) {
      if (g.priority === null) continue; // header already errored at parse
      if (!CHARACTER_MANIFEST.goalPriorities.includes(g.priority.word)) {
        context.diagnostics.error(
          'analysis.unknown-priority',
          `\`${g.priority.word}\` is not a goal priority — ${CHARACTER_MANIFEST.goalPriorities.join(', ')}.`,
          g.priority.span,
        );
        continue;
      }
      if (goals.some((e) => e.id === g.name)) {
        context.diagnostics.error('analysis.goal-duplicate', `This block already has a goal named \`${g.name}\`.`, g.span);
        continue;
      }
      const steps: IRGoalStep[] = [];
      for (const step of g.steps) {
        switch (step.kind) {
          case 'seek': {
            const target = context.resolveEntityId(step.target);
            if (target === null) break;
            const inId = step.in ? context.resolveEntityId(step.in) : null;
            if (step.in && inId === null) break;
            steps.push({ kind: 'seek', target, ...(inId !== null ? { in: inId } : {}), span: step.span });
            break;
          }
          case 'acquire': {
            const target = context.resolveEntityId(step.target);
            if (target !== null) steps.push({ kind: 'acquire', target, span: step.span });
            break;
          }
          case 'wait-for':
            steps.push({ kind: 'wait-for', condition: context.resolveCondition(step.condition, scope), span: step.span });
            break;
          case 'move-to': {
            const target = context.resolveEntityId(step.target);
            if (target !== null) steps.push({ kind: 'move-to', target, span: step.span });
            break;
          }
          case 'act':
            context.requirePhrase(step.phraseKey, step.span, null);
            steps.push({ kind: 'act', phraseKey: step.phraseKey, span: step.span });
            break;
          case 'say': {
            context.requirePhrase(step.phraseKey, step.span, null);
            const target = step.target ? context.resolveEntityId(step.target) : null;
            if (step.target && target === null) break;
            steps.push({ kind: 'say', phraseKey: step.phraseKey, ...(target !== null ? { target } : {}), span: step.span });
            break;
          }
          case 'give': {
            const item = context.resolveEntityId(step.item);
            const target = context.resolveEntityId(step.target);
            if (item !== null && target !== null) steps.push({ kind: 'give', item, target, span: step.span });
            break;
          }
          case 'drop': {
            const item = context.resolveEntityId(step.item);
            if (item === null) break;
            const inId = step.in ? context.resolveEntityId(step.in) : null;
            if (step.in && inId === null) break;
            steps.push({ kind: 'drop', item, ...(inId !== null ? { in: inId } : {}), span: step.span });
            break;
          }
          case 'perform': {
            const lowered = context.lowerPerformStep(step);
            if (lowered !== null) steps.push(lowered);
            break;
          }
        }
      }
      goals.push({
        id: g.name,
        priority: g.priority.word,
        activeWhen: g.activeWhen ? context.resolveCondition(g.activeWhen, scope) : null,
        steps,
        span: g.span,
      });
    }
    // ADR-310 D9: influence blocks — header slots classify order-free
    // (mode and range are disjoint vocabularies); effect axes carry
    // vocabulary words; phrase hooks are author-written prose keys.
    for (const inf of decl.influences) {
      if (influences.some((e) => e.name === inf.name)) {
        context.diagnostics.error('analysis.influence-duplicate', `This block already defines an influence named \`${inf.name}\`.`, inf.span);
        continue;
      }
      let mode: string | undefined;
      let range: string | undefined;
      let slotError = false;
      for (const slot of inf.slots) {
        if (CHARACTER_MANIFEST.influenceModes.includes(slot.word)) {
          if (mode !== undefined) slotError = true;
          mode = slot.word;
        } else if (CHARACTER_MANIFEST.influenceRanges.includes(slot.word)) {
          if (range !== undefined) slotError = true;
          range = slot.word;
        } else {
          context.diagnostics.error(
            'analysis.unknown-influence-slot',
            `\`${slot.word}\` is not an influence mode (${CHARACTER_MANIFEST.influenceModes.join(', ')}) or range (${CHARACTER_MANIFEST.influenceRanges.join(', ')}).`,
            slot.span,
          );
          slotError = true;
        }
      }
      if (mode === undefined || range === undefined || slotError) {
        if (!slotError) {
          context.diagnostics.error(
            'analysis.influence-missing-mode-range',
            `An influence header needs a mode (${CHARACTER_MANIFEST.influenceModes.join(', ')}) and a range (${CHARACTER_MANIFEST.influenceRanges.join(', ')}).`,
            inf.span,
          );
        }
        continue;
      }
      const effect: Record<string, string> = {};
      let witnessed: string | undefined;
      let resisted: string | undefined;
      let expired: string | undefined;
      for (const e of inf.effects) {
        if (e.kind === 'clouds-focus') {
          if (effect['focus'] !== undefined) {
            context.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already clouds focus.', e.span);
            continue;
          }
          effect['focus'] = 'clouded';
        } else if (e.kind === 'makes') {
          const vocab = e.axis === 'mood' ? context.moodVocabulary() : e.axis === 'threat' ? [...CHARACTER_MANIFEST.threats] : null;
          if (vocab === null) {
            context.diagnostics.error(
              'analysis.unknown-influence-axis',
              `\`makes ${e.axis}\` is not an influence effect — \`makes mood <word>\`, \`makes threat <word>\`, or \`clouds focus\`.`,
              e.span,
            );
            continue;
          }
          if (!vocab.includes(e.value)) {
            context.diagnostics.error(
              'analysis.unknown-influence-effect-word',
              `\`${e.value}\` is not a ${e.axis} word — the vocabulary: ${vocab.join(', ')}.`,
              e.span,
            );
            continue;
          }
          if (effect[e.axis] !== undefined) {
            context.diagnostics.error('analysis.influence-effect-duplicate', `This influence already sets ${e.axis}.`, e.span);
            continue;
          }
          effect[e.axis] = e.value;
        } else {
          context.requirePhrase(e.key, e.span, null);
          if (e.on === 'witnessed') {
            if (witnessed !== undefined) {
              context.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already has a witnessed phrase.', e.span);
              continue;
            }
            witnessed = e.key;
          } else if (e.on === 'resisted') {
            if (resisted !== undefined) {
              context.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already has a resisted phrase.', e.span);
              continue;
            }
            resisted = e.key;
          } else {
            if (expired !== undefined) {
              context.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already has an expired phrase.', e.span);
              continue;
            }
            expired = e.key;
          }
        }
      }
      influences.push({
        name: inf.name,
        mode,
        range,
        effect,
        ...(witnessed !== undefined ? { witnessed } : {}),
        ...(resisted !== undefined ? { resisted } : {}),
        ...(expired !== undefined ? { expired } : {}),
        span: inf.span,
      });
    }
    // ADR-310 D9: resistance is one line on the target; the influence
    // name joins across entities (checked post-build, when every
    // influence exists — checkInfluenceReferences).
    for (const r of decl.resists) {
      if (resists.some((e) => e.influence === r.influence)) {
        context.diagnostics.error('analysis.resists-duplicate', `This block already resists \`${r.influence}\`.`, r.span);
        continue;
      }
      let exceptFrom: IRResistsEntry['exceptFrom'];
      if (r.exceptFrom) {
        if (r.exceptFrom.article === 'a' || r.exceptFrom.article === 'an') {
          exceptFrom = { kind: 'classifier', value: r.exceptFrom.words.join(' ').toLowerCase() };
        } else {
          const id = context.resolveEntityId(r.exceptFrom);
          if (id === null) continue;
          exceptFrom = { kind: 'entity', value: id };
        }
      }
      resists.push({ influence: r.influence, ...(exceptFrom !== undefined ? { exceptFrom } : {}), span: r.span });
    }
    entity.mood = mood;
    entity.spreads = spreads;
  },
};
