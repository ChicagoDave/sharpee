// World Index — Map, Reach, Incomplete over a compiled Chord Story IR.
// No engine run. Usage: node world-index.js <story>.ir.json
//
// Semantics verified against source rather than assumed:
//   states[0] is the implicit initial state        story-loader/src/loader.ts:608
//   doors default to isLocked: true                story-loader/src/loader.ts:2003
//   `starts unlocked` overrides that               chord/src/catalog.ts:108 STARTS_STATE_PAIRINGS
//   every exit is bidirectional                    world-model/src/world/WorldModel.ts:1854
//   a Chord object's whole vocabulary is name+aka  the IR carries no adjectives field, and the
//                                                  loader never sets IdentityTrait.adjectives
'use strict';
const fs = require('fs');
const ir = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const ents = ir.entities;
const byId = new Map(ents.map(e => [e.id, e]));
const kind = e => (e.kinds || []).map(k => k.name);
const isRoom = e => kind(e).includes('room');
const rooms = ents.filter(isRoom);
const player = ents.find(e => e.isPlayer);
const start = player && player.placement ? player.placement.place : null;
const loc = (ir.phrases && ir.phrases.locales) ? ir.phrases.locales[ir.phrases.defaultLocale] || {} : {};

// ───────────────────────── containment ─────────────────────────
const holderOf = new Map();
for (const e of ents) {
  for (const c of e.carries || []) holderOf.set(c, e.id);
  for (const w of e.wears || []) holderOf.set(w, e.id);
  for (const c of e.containing || []) holderOf.set(c.id || c, e.id);
}
const movedIn = new Map();
(function scan(n) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) return n.forEach(scan);
  if (n.kind === 'move' && n.entity && n.entity.kind === 'entity') movedIn.set(n.entity.id, n.span);
  for (const k of Object.keys(n)) scan(n[k]);
})(ir);

const roomOf = id => {
  let cur = id;
  for (let guard = 0; guard < 24; guard++) {
    const e = byId.get(cur);
    if (!e) return null;
    if (isRoom(e)) return e.id;
    if (e.placement && e.placement.place) { cur = e.placement.place; continue; }
    const h = holderOf.get(cur);
    if (h) { cur = h; continue; }
    return null;
  }
  return null;
};

// ───────────────────────── MAP ─────────────────────────
// Exits are bidirectional, so an authored row implies its mirror.
const link = new Map(rooms.map(r => [r.id, new Set()]));
const badExits = [];
for (const r of rooms) for (const x of r.exits || []) {
  const t = byId.get(x.to);
  if (!t || !isRoom(t)) { badExits.push({ from: r.id, dir: x.direction, to: x.to }); continue; }
  link.get(r.id).add(x.to);
  if (link.has(x.to)) link.get(x.to).add(r.id);
}
const connections = new Set();
for (const [a, bs] of link) for (const b of bs) connections.add([a, b].sort().join('|'));

const doorBetween = new Map();
for (const r of rooms) for (const x of r.exits || []) if (x.via) doorBetween.set([r.id, x.to].sort().join('|'), x.via);

// grid layout: walk exits from start, one cell per compass step
const STEP = {
  north: [0, 1, 0], south: [0, -1, 0], east: [1, 0, 0], west: [-1, 0, 0],
  northeast: [1, 1, 0], northwest: [-1, 1, 0], southeast: [1, -1, 0], southwest: [-1, -1, 0],
  up: [0, 0, 1], down: [0, 0, -1],
};
const pos = new Map(), cellTaken = new Map(), collisions = [], skew = [];
if (start && byId.has(start)) {
  pos.set(start, [0, 0, 0]); cellTaken.set('0,0,0', start);
  const q = [start], queued = new Set([start]);
  while (q.length) {
    const rid = q.shift();
    for (const x of (byId.get(rid).exits || [])) {
      const d = STEP[x.direction];
      if (!d || !link.get(rid) || !link.get(rid).has(x.to)) continue;
      const [px, py, pz] = pos.get(rid);
      const cell = [px + d[0], py + d[1], pz + d[2]];
      const key = cell.join(',');
      if (pos.has(x.to)) {
        if (pos.get(x.to).join(',') !== key) skew.push({ from: rid, dir: x.direction, to: x.to, wanted: key, sits: pos.get(x.to).join(',') });
        continue;
      }
      if (cellTaken.has(key)) { collisions.push({ cell: key, wanted: x.to, taken: cellTaken.get(key), from: rid, dir: x.direction }); continue; }
      pos.set(x.to, cell); cellTaken.set(key, x.to);
      if (!queued.has(x.to)) { queued.add(x.to); q.push(x.to); }
    }
  }
}

// ───────────────────────── REACH ─────────────────────────
// Topology is too optimistic: honour locked doors and where their keys sit.
const startsLocked = e => (e.traits || []).some(t => t.name === 'lockable')
  && !(e.startsStates || []).includes('unlocked');
const nameToId = new Map(ents.map(e => [String(e.name || '').toLowerCase(), e.id]));
const keyOf = d => {
  const t = (d.traits || []).find(t => t.name === 'lockable');
  const cfg = t && (t.config || []).find(c => c.valueKind === 'name' || c.key === 'key');
  return cfg ? nameToId.get(String(cfg.value).toLowerCase()) || String(cfg.value) : null;
};

const reached = new Set(start ? [start] : []);
const blocked = new Map();
for (let grew = true; grew;) {
  grew = false;
  for (const rid of [...reached]) {
    for (const to of link.get(rid) || []) {
      if (reached.has(to)) continue;
      const doorId = doorBetween.get([rid, to].sort().join('|'));
      const door = doorId && byId.get(doorId);
      if (door && startsLocked(door)) {
        const keyId = keyOf(door);
        const keyRoom = keyId && byId.has(keyId) ? roomOf(keyId) : null;
        const haveKey = keyId && byId.has(keyId) && keyRoom && reached.has(keyRoom);
        if (!haveKey) {
          blocked.set(`${rid}>${to}`, { from: rid, to, door: doorId, key: keyId, keyRoom, reason: !keyId ? 'no key declared' : keyRoom === to ? 'key is inside the room it opens' : 'key not reachable first' });
          continue;
        }
      }
      reached.add(to); grew = true;
    }
  }
}
const unreachedRooms = rooms.filter(r => !reached.has(r.id)).map(r => r.id);
const stillBlocked = [...blocked.values()].filter(b => !reached.has(b.to));

const things = ents.filter(e => !isRoom(e) && !e.isPlayer && !kind(e).includes('region') && !kind(e).includes('door'));
const strandedThings = [];
for (const t of things) {
  const r = roomOf(t.id);
  if (movedIn.has(t.id)) continue;                    // brought into play by a statement
  if (r && reached.has(r)) continue;
  strandedThings.push({ id: t.id, name: t.name, room: r, why: r ? `in ${r}, which nothing reaches` : 'placed nowhere' });
}
const noDescription = things.filter(e => !e.descriptionKey).map(e => ({ id: e.id, name: e.name }));

// gates: `<dir> is blocked while <cond>`
const gates = [];
for (const r of ents) for (const be of r.blockedExits || []) if (be.condition) gates.push({ room: r.id, dir: be.direction });

const endings = [];
(function scanEnd(n) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) return n.forEach(scanEnd);
  if (['win', 'lose', 'kill'].includes(n.kind) && n.span) endings.push({ kind: n.kind, line: n.span.line });
  for (const k of Object.keys(n)) scanEnd(n[k]);
})(ir);

// ───────────────────────── INCOMPLETE ─────────────────────────
// A vocabulary check: resolve every authored noun phrase the way the parser
// resolves a player's command — head noun against name/aka, then the modifiers
// against that object's own words.
const heads = new Map(), wordsOf = new Map();
for (const e of ents) {
  if (e.isPlayer) continue;
  const words = new Set();
  for (const form of [e.name, ...(e.aka || [])].filter(Boolean).map(f => String(f).toLowerCase())) {
    form.split(/\s+/).forEach(w => words.add(w));
    const h = form.split(/\s+/).pop();
    if (!heads.has(h)) heads.set(h, new Set());
    heads.get(h).add(e.id);
  }
  wordsOf.set(e.id, words);
}
const BOUND = new Set(('of in on at to from with by for into onto over under across through toward towards and or but '
  + 'that which who where when while as if than then so is are was were be been being has have had runs run stands stand '
  + 'sits sit rises rise looms loom lies lie hangs hang glimmers glimmer curves curve opens open closes close leads lead '
  + 'goes go comes come takes take gives give holds hold keeps keep smells smell tastes taste feels feel looks look seems '
  + 'seem climbs climb glitter glitters before after against beneath behind beside between within without above below '
  + 'along around past near always never often once again still yet just only even more most less least much many few '
  + 'might must could would should will shall can may shut standing sitting lying hanging pretending shows show hunches '
  + 'hunch waits wait left right turns turn').split(/\s+/));
const STOP = new Set(('north south east west up down here there way air light dark darkness night day morning evening '
  + 'hand hands eye eyes face voice sound smell cold heat time moment place side end edge back front top bottom middle '
  + 'nothing something anything everything one two three other others rest half world year years hour hours minute '
  + 'minutes floor ceiling corner room home ground sky sun moon star stars water fire earth wind rain snow dust dirt '
  + 'thing things kind sort size shape colour color part parts piece pieces bit bits lot lots deal last first next best '
  + 'worst same very quite rather four five six seven eight nine ten dozen score cast long wide tall short deep high low').split(/\s+/));
const ART = new Set(['the', 'a', 'an']);

const noObject = [], ambiguous = [], missingWord = [];
const seen = new Set();
for (const e of ents) {
  const ph = e.descriptionKey && loc[e.descriptionKey];
  if (!ph) continue;
  const line = ph.span ? ph.span.line : null;
  const text = (ph.variants || []).map(v => v.text || '').join(' ').toLowerCase();
  const toks = text.replace(/[^a-z'\s]/g, ' | ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    if (!ART.has(toks[i])) continue;
    const run = [];
    for (let j = i + 1; j < Math.min(i + 5, toks.length); j++) {
      const t = toks[j];
      if (t === '|' || BOUND.has(t) || ART.has(t) || /ly$/.test(t)) break;
      run.push(t);
    }
    if (!run.length || run.length > 3) continue;
    const head = run[run.length - 1];
    if (/(?:ed|ing)$/.test(head) || head.length < 4 || STOP.has(head)) continue;
    const phrase = run.join(' '), mods = run.slice(0, -1);
    const dedupe = `${e.id}|${phrase}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const cands = heads.get(head);
    if (!cands) { noObject.push({ where: e.name, phrase, line }); continue; }
    if (cands.size > 1) {
      const narrowed = [...cands].filter(id => mods.every(m => wordsOf.get(id).has(m)));
      if (narrowed.length !== 1) ambiguous.push({ where: e.name, phrase, candidates: [...cands], line });
      continue;
    }
    const only = [...cands][0];
    const missing = mods.filter(m => !wordsOf.get(only).has(m) && !STOP.has(m));
    if (missing.length) missingWord.push({ where: e.name, phrase, entity: only, missing, knownAs: [...wordsOf.get(only)], line });
  }
}
const headCollisions = [...heads].filter(([, s]) => s.size > 1).map(([noun, s]) => ({ noun, entities: [...s] }));

// ───────────────────────── report ─────────────────────────
console.log(JSON.stringify({
  story: ir.meta.fields.id, version: ir.meta.fields.storyVersion, start,
  map: {
    rooms: rooms.length, connections: connections.size,
    doors: [...doorBetween.values()].length, gates: gates.length,
    layout: {
      placed: pos.size, unplaced: rooms.filter(r => !pos.has(r.id)).map(r => r.id),
      collisions, skew,
      verdict: !collisions.length && !skew.length && pos.size === rooms.length ? 'clean grid' : 'needs resolution',
    },
  },
  reach: {
    rooms: { reachable: reached.size, total: rooms.length, unreached: unreachedRooms },
    blocked: stillBlocked,
    things: { reachable: things.length - strandedThings.length, total: things.length, stranded: strandedThings },
    badExits, noDescription, endings: endings.length,
  },
  incomplete: {
    counts: { missingWord: missingWord.length, ambiguous: ambiguous.length, noObject: noObject.length },
    missingWord, ambiguous, noObject, headCollisions,
  },
}, null, 1));
