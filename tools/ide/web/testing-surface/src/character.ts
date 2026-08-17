/**
 * character.ts — the "explain this NPC's turn" panel model (ADR-318 D11 /
 * ADR-310 D12).
 *
 * Purpose: turns a delivered turn's `character` channel capture — the author
 *   channel's raw per-NPC rows (ledger mints and pins, pressure deposits and
 *   drains, arbitration verdicts, paralysis warnings, witnessed acts, and
 *   `npc.character.*` state transitions) — into legible, grouped explain
 *   lines for the card's NPC panel. Pure projection: no DOM, no model
 *   mutation, nothing persisted — the rows are session observation, never
 *   document content.
 *
 * Row kinds are rendered best-effort by a per-kind describer with a compact
 * raw fallback, so an unknown or future event kind still shows honestly
 * rather than vanishing.
 *
 * Public interface: characterRowsOf(channelValues), explainGroups(rows,
 * nameOf); types CharacterRow, ExplainLine, ExplainGroup.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

/** One author-channel row as stdlib's `character` channel produces it. */
export interface CharacterRow {
  turn: number;
  /** The event type, e.g. 'character.author.ledger_mint'. */
  kind: string;
  /** The NPC the event is about (the event's actor), when attributed. */
  npcId?: string;
  /** The event's payload, verbatim. */
  data: Record<string, unknown>;
}

/** One rendered explain line. `warn` marks author-attention rows. */
export interface ExplainLine {
  text: string;
  tone: 'normal' | 'warn';
  /** The row's raw payload, compact — shown on demand. */
  raw: string;
  /**
   * Click-to-assert fragments: `"key":"value"` pairs of the row's
   * load-bearing fields, each a substring of the row's `JSON.stringify`
   * rendering (the exact text the runner's channel `contains` checks
   * against). Together they pin THIS event on THIS NPC in a channel claim
   * on `claimChannel` — volatile fields (turn, curve values, audiences)
   * are deliberately left out so the claim survives unrelated churn.
   */
  fragments: string[];
  /**
   * The channel the line's click-to-assert claim targets — `character`
   * for interior rows here; the scene module's lines claim on `scene` /
   * `exchange-affordances` (ADR-320 D12).
   */
  claimChannel: string;
}

/** One NPC's lines for the turn, in emission order. */
export interface ExplainGroup {
  npcLabel: string;
  lines: ExplainLine[];
}

/** Extracts the turn's character rows from its per-channel capture values.
 *  Values arrive as the channel produced them (arrays of rows); anything
 *  that is not row-shaped is skipped — observation must never throw. */
export function characterRowsOf(
  channelValues: Record<string, unknown[]> | undefined,
): CharacterRow[] {
  const rows: CharacterRow[] = [];
  for (const value of channelValues?.['character'] ?? []) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry === null || typeof entry !== 'object') continue;
      const row = entry as Partial<CharacterRow>;
      if (typeof row.kind !== 'string') continue;
      rows.push({
        turn: typeof row.turn === 'number' ? row.turn : 0,
        kind: row.kind,
        ...(typeof row.npcId === 'string' ? { npcId: row.npcId } : {}),
        data: (row.data && typeof row.data === 'object'
          ? row.data
          : {}) as Record<string, unknown>,
      });
    }
  }
  return rows;
}

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '?';

/** `from → to` when both ends exist, else nothing. */
function arrow(data: Record<string, unknown>): string {
  return typeof data.from === 'string' && typeof data.to === 'string'
    ? `${data.from} → ${data.to}`
    : '';
}

/** The pressure rows' shared tail: value, band, and the band transition. */
function pressureTail(data: Record<string, unknown>): string {
  const transition = data.transition as Record<string, unknown> | undefined;
  const band = transition && typeof transition === 'object'
    ? `${text(transition.from)} → ${text(transition.to)}`
    : text(data.band);
  return `${text(data.value)} (${band})`;
}

/** Resolves an entity-valued payload field to a display name. */
type Who = (value: unknown) => string;

/** Per-kind describers. Text only — tone is decided below. */
const DESCRIBERS: Record<string, (data: Record<string, unknown>, who: Who) => string> = {
  'character.author.arbitration': (d) => {
    const readings = Array.isArray(d.readings)
      ? d.readings
          .map((r) => {
            const reading = r as Record<string, unknown>;
            return `${text(reading.force)} ${text(reading.intensity ?? reading.value)}`;
          })
          .join(', ')
      : '';
    const defeats = Array.isArray(d.defeats) && d.defeats.length > 0
      ? ` · defeated: ${d.defeats
          .map((def) => text((def as Record<string, unknown>).feed))
          .join(', ')}`
      : '';
    const temperament = d.temperamentApplied ? ` · temperament: ${text(d.temperamentApplied)}` : '';
    return `arbitration (${text(d.site)} · ${text(d.topic)}) — ${text(d.winner)} wins, ${text(d.act)}`
      + (readings ? ` · forces: ${readings}` : '') + defeats + temperament;
  },
  'character.author.ledger_mint': (d, who) =>
    `lie minted — claims ${text(d.factId)} is ${text(d.claimedValue)}`
    + ` (holds ${text(d.heldValue)}) to ${who(d.audience)}`,
  'character.author.pin_held': (d, who) =>
    `pin held — maintains ${text(d.factId)} is ${text(d.claimedValue)} to ${who(d.audience)}`,
  'character.author.pin_released': (d, who) =>
    `pin released — ${who(d.audience)} got the truth about ${text(d.factId)}`
    + ` (was claiming ${text(d.claimedValue)})`,
  'character.author.pressure_deposit': (d) =>
    `conscience deposit (${text(d.feed)}) — ${pressureTail(d)}`,
  'character.author.pressure_drain': (d) =>
    `conscience discharge${d.goalId !== undefined ? ` (goal ${text(d.goalId)})` : ''}`
    + ` — ${pressureTail(d)}`,
  'character.author.paralysis_warning': (d) => {
    const principles = Array.isArray(d.principles)
      ? d.principles.map((p) => `"${text(p)}"`).join(' vs ')
      : '?';
    return `PARALYSIS on ${text(d.topic)} — colliding principles: ${principles}`;
  },
  'character.author.act_witnessed': (d, who) => {
    if (Array.isArray(d.acts)) {
      const acts = d.acts
        .map((a) => {
          const act = a as Record<string, unknown>;
          return `${who(act.actorId)} ${text(act.act)} (${text(act.topic)})`;
        })
        .join('; ');
      return `witnessed — ${acts}`;
    }
    return `witnessed — ${text(d.act)} (${text(d.topic)})`;
  },
  'npc.character.mood_changed': (d) => `mood ${arrow(d) || text(d.to)}`,
  'npc.character.threat_changed': (d) => `threat ${arrow(d) || text(d.to)}`,
  'npc.character.disposition_changed': (d, who) =>
    `disposition${d.toward !== undefined ? ` toward ${who(d.toward)}` : ''} ${arrow(d) || text(d.to)}`,
  'npc.character.fact_learned': (d) => `learned — ${text(d.topic ?? d.factId)}`,
  'npc.character.lucidity_shift': (d) => `lucidity ${arrow(d) || text(d.to)}`,
  'npc.character.lucidity_baseline_restored': () => 'lucidity restored to baseline',
  'npc.character.hallucination_onset': () => 'hallucination onset',
};

/** Rows whose arrival an author almost certainly wants to notice. */
const WARN_KINDS = new Set(['character.author.paralysis_warning']);

/** One `"key":"value"` fragment — a substring of the row's JSON rendering.
 *  Only scalar values qualify; anything else yields nothing. */
function frag(key: string, value: unknown): string[] {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? [`${JSON.stringify(key)}:${JSON.stringify(value)}`]
    : [];
}

/** The data fields that identify each kind for click-to-assert. */
const FRAGMENT_FIELDS: Record<string, string[]> = {
  'character.author.arbitration': ['winner', 'act', 'topic'],
  'character.author.ledger_mint': ['factId', 'claimedValue'],
  'character.author.pin_held': ['factId', 'claimedValue'],
  'character.author.pin_released': ['factId'],
  'character.author.pressure_deposit': ['feed'],
  'character.author.pressure_drain': ['goalId'],
  'character.author.paralysis_warning': ['topic'],
  'character.author.act_witnessed': ['act', 'topic'],
  'npc.character.mood_changed': ['to'],
  'npc.character.threat_changed': ['to'],
  'npc.character.disposition_changed': ['toward', 'to'],
  'npc.character.fact_learned': ['topic', 'factId'],
  'npc.character.lucidity_shift': ['to'],
};

/** A row's assert fragments: the kind, the NPC, and its identifying fields. */
function fragmentsOf(row: CharacterRow): string[] {
  return [
    ...frag('kind', row.kind),
    ...(row.npcId !== undefined ? frag('npcId', row.npcId) : []),
    ...(FRAGMENT_FIELDS[row.kind] ?? []).flatMap((field) => frag(field, row.data[field])),
  ];
}

/** A row's compact raw payload — the on-demand detail. */
function rawOf(row: CharacterRow): string {
  try {
    return JSON.stringify(row.data);
  } catch {
    return '{}';
  }
}

/** One row → one line, falling back to `kind {payload}` for unknown kinds. */
function lineOf(row: CharacterRow, who: Who): ExplainLine {
  const describe = DESCRIBERS[row.kind];
  const tail = row.kind.replace(/^character\.author\.|^npc\.character\./, '');
  return {
    text: describe ? describe(row.data, who) : `${tail} ${rawOf(row)}`,
    tone: WARN_KINDS.has(row.kind) ? 'warn' : 'normal',
    raw: rawOf(row),
    fragments: fragmentsOf(row),
    claimChannel: 'character',
  };
}

/**
 * Groups a turn's rows by NPC, preserving emission order within and across
 * groups (first appearance orders the groups).
 *
 * @param rows the turn's character rows.
 * @param nameOf resolves a world id to a display name (the world digest);
 *   unresolvable ids label as the id itself, unattributed rows as "story".
 */
export function explainGroups(
  rows: CharacterRow[],
  nameOf: (npcId: string) => string | undefined,
): ExplainGroup[] {
  // Party fields (audience, witnessed actorId, disposition toward) resolve
  // through the digest like the group headers do — but the digest excludes
  // the player by design, so an unresolvable entity id IS the player (every
  // non-player entity with a location is listed). The literal token 'player'
  // reads the same way.
  const who: Who = (value) => {
    const id = text(value);
    return nameOf(id) ?? 'the player';
  };
  const groups = new Map<string, ExplainGroup>();
  for (const row of rows) {
    const key = row.npcId ?? '';
    let group = groups.get(key);
    if (!group) {
      const npcLabel = row.npcId === undefined
        ? 'story'
        : nameOf(row.npcId) ?? row.npcId;
      group = { npcLabel, lines: [] };
      groups.set(key, group);
    }
    group.lines.push(lineOf(row, who));
  }
  return [...groups.values()];
}
