import React, { useState, useMemo } from "react";

// ============================================================================
// THE ALDERMAN — Case Diagram Sketch
// A reference UI for the deduction surface: evidence pile (auto), case board
// (player-curated), and the parser-driven assertions that wire them together.
// ============================================================================

const SUSPECTS = [
  { id: "ross", name: "Ross Bielack", role: "Baseball player" },
  { id: "viola", name: "Viola Wainright", role: "Actress" },
  { id: "barber", name: "John Barber", role: "Local fixer" },
  { id: "catherine", name: "Catherine Shelby", role: "Hostess" },
  { id: "jack", name: "Jack Margolin", role: "Real estate" },
  { id: "chelsea", name: "Chelsea Sumner", role: "Cigarette girl" },
];

const WEAPONS = [
  { id: "revolver", name: "Revolver" },
  { id: "knife", name: "Knife" },
  { id: "champagne", name: "Champagne bottle" },
  { id: "poker", name: "Fireplace poker" },
  { id: "iron", name: "Sad iron" },
  { id: "cord", name: "Curtain cord" },
];

const LOCATIONS = [
  { id: "stephanies-room", name: "Stephanie's room" },
  { id: "laundry", name: "Laundry" },
  { id: "kitchen", name: "Kitchen" },
  { id: "elevator", name: "Elevator" },
  { id: "ballroom", name: "Ballroom" },
  { id: "jacks-room", name: "Jack's room" },
];

// Evidence pile: auto-populated as the player encounters claims and observations.
// Each item has a source, a kind (claim | observation | inference), and provenance.
const SEED_EVIDENCE = [
  {
    id: "e1",
    kind: "claim",
    source: "Catherine Shelby",
    text: "I served Ross drinks all evening at the bar.",
    salience: 0.9,
    turn: 4,
  },
  {
    id: "e2",
    kind: "claim",
    source: "Catherine Shelby",
    text: "I stepped away for about twenty minutes around half past nine.",
    salience: 0.85,
    turn: 11,
  },
  {
    id: "e3",
    kind: "claim",
    source: "Viola Wainright",
    text: "Rehearsal ran late — I was at McVicker's until nearly ten.",
    salience: 0.8,
    turn: 6,
  },
  {
    id: "e4",
    kind: "observation",
    source: "Foyer table",
    text: "A discarded theatre program. The rehearsal ended at nine.",
    salience: 0.95,
    turn: 9,
  },
  {
    id: "e5",
    kind: "observation",
    source: "Kitchen",
    text: "The knife block has a gap. One blade is missing.",
    salience: 1.0,
    turn: 14,
  },
  {
    id: "e6",
    kind: "claim",
    source: "Jack Margolin",
    text: "I called for room service at nine. Stayed in my room.",
    salience: 0.7,
    turn: 7,
  },
  {
    id: "e7",
    kind: "claim",
    source: "Hotel staff",
    text: "Room service to 308 logged at 9:00pm sharp.",
    salience: 0.6,
    turn: 8,
  },
];

// Player-built board: assertions linking evidence to suspects/weapons/locations.
// Each assertion is a structured tuple emitted by a parser action.
const SEED_ASSERTIONS = [
  {
    id: "a1",
    verb: "IDENTIFY GAP",
    target: { kind: "suspect", id: "ross" },
    supporting: ["e1", "e2"],
    note: "Catherine's testimony covers the bar but admits a 20-minute absence.",
  },
  {
    id: "a2",
    verb: "CONTRADICT",
    target: { kind: "suspect", id: "viola" },
    supporting: ["e3", "e4"],
    note: "Viola's claim conflicts with the program's printed time.",
  },
];

// ============================================================================
// Component
// ============================================================================

export default function AldermanCaseBoard() {
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [hoveredAssertion, setHoveredAssertion] = useState(null);
  const [eliminations, setEliminations] = useState({
    suspects: new Set(),
    weapons: new Set(["revolver"]),
    locations: new Set(["ballroom"]),
  });
  const [suspicions, setSuspicions] = useState(new Set(["ross", "viola"]));
  const [parserInput, setParserInput] = useState("");
  const [parserHistory, setParserHistory] = useState([
    { in: "identify gap in catherine's alibi", out: "You note a twenty-minute window unaccounted for. Added to the board." },
    { in: "contradict viola's rehearsal claim with the program", out: "Two facts pinned in opposition. The board reflects it." },
    { in: "is it possible jack is lying", out: "(check jack's truthfulness) — His room service places him at nine, but nothing covers the half hour after. You aren't sure yet." },
  ]);

  const evidenceById = useMemo(
    () => Object.fromEntries(SEED_EVIDENCE.map((e) => [e.id, e])),
    []
  );

  const toggleEliminated = (col, id) => {
    setEliminations((prev) => {
      const next = { ...prev, [col]: new Set(prev[col]) };
      if (next[col].has(id)) next[col].delete(id);
      else next[col].add(id);
      return next;
    });
  };

  const toggleSuspicion = (id) => {
    setSuspicions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitParser = () => {
    if (!parserInput.trim()) return;
    const cmd = parserInput.trim().toLowerCase();
    let out = "";
    if (cmd.startsWith("check ") || cmd.startsWith("is it possible") || cmd.startsWith("could ")) {
      out = "(epistemic query) — The PC reflects on what's known. The board is unchanged.";
    } else if (cmd.startsWith("identify gap")) {
      out = "You'd want supporting evidence in the pile. If it's there, the board updates.";
    } else if (cmd.startsWith("contradict")) {
      out = "Two facts pinned in opposition.";
    } else if (cmd.startsWith("suspect ") || cmd.startsWith("clear ")) {
      out = "Marked.";
    } else if (cmd.startsWith("accuse")) {
      out = "Hold that thought — you'd want the case built on the board first.";
    } else {
      out = "The PC stares at the page. Try CHECK, IDENTIFY, CONTRADICT, SUSPECT, CLEAR, or ACCUSE.";
    }
    setParserHistory((h) => [...h, { in: parserInput, out }]);
    setParserInput("");
  };

  return (
    <div style={styles.root}>
      <style>{globalCss}</style>

      {/* MASTHEAD */}
      <header style={styles.masthead}>
        <div style={styles.mastheadLeft}>
          <div style={styles.eyebrow}>CASE BOARD · CONFIDENTIAL</div>
          <h1 style={styles.title}>The Bordeau Affair</h1>
          <div style={styles.subtitle}>
            The Alderman Hotel · Chicago · the morning of the 14th
          </div>
        </div>
        <div style={styles.mastheadRight}>
          <Stat label="Turn" value="17" />
          <Stat label="Evidence" value={SEED_EVIDENCE.length} />
          <Stat label="Assertions" value={SEED_ASSERTIONS.length} />
          <Stat label="Attempts left" value="3" />
        </div>
      </header>

      {/* MAIN GRID */}
      <main style={styles.main}>
        {/* LEFT: EVIDENCE PILE (auto-populated) */}
        <section style={styles.evidencePane}>
          <PaneHeader
            kicker="Auto · platform"
            title="Evidence pile"
            note="What you've heard, seen, or been told."
          />
          <div style={styles.evidenceList}>
            {SEED_EVIDENCE.map((e) => {
              const usedIn = SEED_ASSERTIONS.filter((a) => a.supporting.includes(e.id));
              const isHighlighted = hoveredAssertion
                ? hoveredAssertion.supporting.includes(e.id)
                : selectedEvidence === e.id;
              return (
                <div
                  key={e.id}
                  className="ev-card"
                  data-active={isHighlighted}
                  onClick={() =>
                    setSelectedEvidence(selectedEvidence === e.id ? null : e.id)
                  }
                  style={styles.evCard}
                >
                  <div style={styles.evMeta}>
                    <span style={styles.evKind} data-kind={e.kind}>
                      {e.kind}
                    </span>
                    <span style={styles.evTurn}>t.{e.turn}</span>
                  </div>
                  <div style={styles.evSource}>{e.source}</div>
                  <div style={styles.evText}>"{e.text}"</div>
                  {usedIn.length > 0 && (
                    <div style={styles.evUsed}>
                      cited in {usedIn.length} assertion{usedIn.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CENTER: CASE BOARD (three columns) */}
        <section style={styles.boardPane}>
          <PaneHeader
            kicker="Player · curated"
            title="The case"
            note="Eliminate, suspect, accuse. The PC's working theory."
          />
          <div style={styles.threeCol}>
            <Column
              label="Suspects"
              items={SUSPECTS}
              eliminated={eliminations.suspects}
              suspected={suspicions}
              onToggleElim={(id) => toggleEliminated("suspects", id)}
              onToggleSuspect={toggleSuspicion}
              assertions={SEED_ASSERTIONS}
              hoveredAssertion={hoveredAssertion}
              setHoveredAssertion={setHoveredAssertion}
              kind="suspect"
            />
            <Column
              label="Weapons"
              items={WEAPONS}
              eliminated={eliminations.weapons}
              onToggleElim={(id) => toggleEliminated("weapons", id)}
              kind="weapon"
            />
            <Column
              label="Locations"
              items={LOCATIONS}
              eliminated={eliminations.locations}
              onToggleElim={(id) => toggleEliminated("locations", id)}
              kind="location"
            />
          </div>

          {/* Assertions list — the wires drawn between pile and board */}
          <div style={styles.assertions}>
            <div style={styles.assertionsHeader}>Player assertions</div>
            {SEED_ASSERTIONS.map((a) => {
              const target = SUSPECTS.find((s) => s.id === a.target.id);
              return (
                <div
                  key={a.id}
                  className="assertion"
                  onMouseEnter={() => setHoveredAssertion(a)}
                  onMouseLeave={() => setHoveredAssertion(null)}
                  style={styles.assertion}
                >
                  <div style={styles.assertionHead}>
                    <span style={styles.assertionVerb}>{a.verb}</span>
                    <span style={styles.assertionArrow}>→</span>
                    <span style={styles.assertionTarget}>{target?.name}</span>
                  </div>
                  <div style={styles.assertionNote}>{a.note}</div>
                  <div style={styles.assertionRefs}>
                    {a.supporting.map((eid) => (
                      <span key={eid} style={styles.assertionRef}>
                        {evidenceById[eid].source}, t.{evidenceById[eid].turn}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT: PARSER (the verb surface) */}
        <section style={styles.parserPane}>
          <PaneHeader
            kicker="Input · verbs"
            title="The notebook"
            note="CHECK · IDENTIFY · CONTRADICT · SUSPECT · CLEAR · ACCUSE"
          />
          <div style={styles.transcript}>
            {parserHistory.map((p, i) => (
              <div key={i} style={styles.transcriptItem}>
                <div style={styles.transcriptIn}>&gt; {p.in}</div>
                <div style={styles.transcriptOut}>{p.out}</div>
              </div>
            ))}
          </div>
          <div style={styles.parserInputRow}>
            <span style={styles.prompt}>&gt;</span>
            <input
              style={styles.parserInput}
              value={parserInput}
              onChange={(e) => setParserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitParser()}
              placeholder="check catherine's truthfulness"
            />
          </div>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: "#7a1d1d" }} />
              contradiction edge
            </div>
            <div style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendSwatch,
                  background: "transparent",
                  border: "1px solid #b08a4a",
                }}
              />
              suspected
            </div>
            <div style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendSwatch,
                  background: "#d9d2c3",
                  textDecoration: "line-through",
                }}
              />
              eliminated
            </div>
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        Sharpee · The Alderman · case board sketch — the diagram is a sibling
        surface to the prose; both consume the same domain events.
      </footer>
    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

function PaneHeader({ kicker, title, note }) {
  return (
    <div style={styles.paneHeader}>
      <div style={styles.paneKicker}>{kicker}</div>
      <div style={styles.paneTitle}>{title}</div>
      <div style={styles.paneNote}>{note}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function Column({
  label,
  items,
  eliminated,
  suspected,
  onToggleElim,
  onToggleSuspect,
  assertions,
  hoveredAssertion,
  kind,
}) {
  return (
    <div style={styles.column}>
      <div style={styles.columnLabel}>{label}</div>
      {items.map((item) => {
        const isElim = eliminated.has(item.id);
        const isSusp = suspected?.has(item.id);
        const hasAssertion = assertions?.some(
          (a) => a.target.id === item.id && a.target.kind === kind
        );
        const isHovered =
          hoveredAssertion &&
          hoveredAssertion.target.id === item.id &&
          hoveredAssertion.target.kind === kind;
        return (
          <div
            key={item.id}
            className="case-card"
            data-elim={isElim}
            data-susp={isSusp}
            data-hovered={isHovered}
            data-asserted={hasAssertion}
            style={styles.caseCard}
            onClick={() => onToggleElim(item.id)}
            onContextMenu={(e) => {
              if (onToggleSuspect) {
                e.preventDefault();
                onToggleSuspect(item.id);
              }
            }}
            title={
              onToggleSuspect
                ? "click: eliminate · right-click: suspect"
                : "click: eliminate"
            }
          >
            <div style={styles.caseName}>{item.name}</div>
            {item.role && <div style={styles.caseRole}>{item.role}</div>}
            {hasAssertion && <div style={styles.caseAssertionDot} />}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const cream = "#f3ecdc";
const paper = "#ebe2cd";
const ink = "#1f1a13";
const inkSoft = "#4a4136";
const oxblood = "#7a1d1d";
const brass = "#b08a4a";
const brassSoft = "#d9b97a";
const rule = "#c9bfa6";

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Serif:wght@400;500&display=swap');

  * { box-sizing: border-box; }

  .ev-card {
    transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
    cursor: pointer;
  }
  .ev-card:hover { background: ${paper}; border-color: ${brass}; }
  .ev-card[data-active="true"] {
    background: #fff7e3;
    border-color: ${oxblood};
    box-shadow: inset 3px 0 0 ${oxblood};
  }

  .case-card {
    transition: all 180ms ease;
    cursor: pointer;
    position: relative;
  }
  .case-card:hover { border-color: ${brass}; transform: translateX(2px); }
  .case-card[data-elim="true"] {
    background: ${rule};
    color: ${inkSoft};
    text-decoration: line-through;
    text-decoration-color: ${oxblood};
    text-decoration-thickness: 2px;
    opacity: 0.65;
  }
  .case-card[data-susp="true"] {
    border-color: ${brass};
    background: linear-gradient(180deg, #fff7e3 0%, ${cream} 100%);
    box-shadow: 0 0 0 2px ${brassSoft} inset, 0 4px 12px rgba(176,138,74,0.2);
  }
  .case-card[data-hovered="true"] {
    border-color: ${oxblood} !important;
    box-shadow: 0 0 0 2px ${oxblood} inset !important;
  }
  .case-card[data-asserted="true"] .case-assertion-dot { display: block; }

  .assertion {
    transition: all 180ms ease;
    cursor: default;
  }
  .assertion:hover {
    background: #fff7e3;
    border-color: ${oxblood};
  }

  input::placeholder { color: ${inkSoft}; opacity: 0.6; }

  /* paper grain */
  .paper-grain {
    background-image:
      radial-gradient(rgba(31,26,19,0.04) 1px, transparent 1px),
      radial-gradient(rgba(31,26,19,0.03) 1px, transparent 1px);
    background-size: 3px 3px, 7px 7px;
    background-position: 0 0, 1px 2px;
  }
`;

const styles = {
  root: {
    minHeight: "100vh",
    background: cream,
    color: ink,
    fontFamily: '"IBM Plex Serif", Georgia, serif',
    padding: "32px 40px 48px",
    backgroundImage:
      "radial-gradient(rgba(31,26,19,0.035) 1px, transparent 1px), radial-gradient(rgba(31,26,19,0.025) 1px, transparent 1px)",
    backgroundSize: "3px 3px, 7px 7px",
    backgroundPosition: "0 0, 1px 2px",
  },
  masthead: {
    borderBottom: `2px solid ${ink}`,
    paddingBottom: 18,
    marginBottom: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 24,
    flexWrap: "wrap",
  },
  mastheadLeft: { flex: "1 1 480px" },
  mastheadRight: { display: "flex", gap: 28, alignItems: "flex-end" },
  eyebrow: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: oxblood,
    marginBottom: 6,
  },
  title: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontWeight: 700,
    fontStyle: "italic",
    fontSize: 52,
    lineHeight: 0.95,
    margin: 0,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: inkSoft,
    fontStyle: "italic",
  },
  stat: { textAlign: "right" },
  statValue: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 28,
    fontWeight: 500,
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 9,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: inkSoft,
    marginTop: 4,
  },
  main: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 340px) 1fr minmax(300px, 360px)",
    gap: 24,
    alignItems: "start",
  },
  paneHeader: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: `1px solid ${rule}`,
  },
  paneKicker: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 9,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: brass,
    marginBottom: 4,
  },
  paneTitle: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 22,
    fontWeight: 500,
    lineHeight: 1.1,
  },
  paneNote: {
    fontSize: 12,
    color: inkSoft,
    marginTop: 4,
    fontStyle: "italic",
  },

  // Evidence pile
  evidencePane: {},
  evidenceList: { display: "flex", flexDirection: "column", gap: 10 },
  evCard: {
    background: cream,
    border: `1px solid ${rule}`,
    padding: "10px 12px",
    fontSize: 13,
  },
  evMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  evKind: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 9,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: oxblood,
    background: "#fff7e3",
    padding: "1px 6px",
    border: `1px solid ${rule}`,
  },
  evTurn: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
    color: inkSoft,
  },
  evSource: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 2,
  },
  evText: {
    fontSize: 12.5,
    color: inkSoft,
    fontStyle: "italic",
    lineHeight: 1.45,
  },
  evUsed: {
    marginTop: 6,
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 9,
    letterSpacing: "0.1em",
    color: brass,
  },

  // Board
  boardPane: {},
  threeCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14,
    marginBottom: 22,
  },
  column: { display: "flex", flexDirection: "column", gap: 8 },
  columnLabel: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: ink,
    marginBottom: 4,
    paddingBottom: 6,
    borderBottom: `1px dashed ${rule}`,
  },
  caseCard: {
    background: cream,
    border: `1px solid ${rule}`,
    padding: "10px 12px",
    position: "relative",
  },
  caseName: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1.15,
  },
  caseRole: {
    fontSize: 11,
    color: inkSoft,
    fontStyle: "italic",
    marginTop: 2,
    fontFamily: '"IBM Plex Serif", serif',
  },
  caseAssertionDot: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: oxblood,
  },

  assertions: {
    borderTop: `1px solid ${rule}`,
    paddingTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  assertionsHeader: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: ink,
    marginBottom: 4,
  },
  assertion: {
    background: cream,
    border: `1px solid ${rule}`,
    borderLeft: `3px solid ${oxblood}`,
    padding: "10px 12px",
  },
  assertionHead: { display: "flex", alignItems: "center", gap: 8 },
  assertionVerb: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: oxblood,
    fontWeight: 600,
  },
  assertionArrow: { color: brass },
  assertionTarget: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 16,
    fontWeight: 500,
    fontStyle: "italic",
  },
  assertionNote: {
    fontSize: 13,
    color: inkSoft,
    marginTop: 4,
    fontStyle: "italic",
    lineHeight: 1.45,
  },
  assertionRefs: {
    marginTop: 6,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  assertionRef: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 9,
    letterSpacing: "0.08em",
    color: brass,
    border: `1px solid ${brassSoft}`,
    padding: "1px 6px",
    background: "#fff7e3",
  },

  // Parser
  parserPane: {},
  transcript: {
    background: "#1f1a13",
    color: "#f3ecdc",
    padding: "14px 14px",
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 12,
    lineHeight: 1.55,
    minHeight: 240,
    maxHeight: 360,
    overflowY: "auto",
    border: `1px solid ${ink}`,
  },
  transcriptItem: { marginBottom: 12 },
  transcriptIn: { color: brassSoft },
  transcriptOut: { color: "#e9dcb8", marginTop: 2, fontStyle: "italic" },
  parserInputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 0,
    background: "#1f1a13",
    color: "#f3ecdc",
    padding: "10px 14px",
    borderTop: `1px dashed ${brass}`,
    borderLeft: `1px solid ${ink}`,
    borderRight: `1px solid ${ink}`,
    borderBottom: `1px solid ${ink}`,
  },
  prompt: {
    fontFamily: '"IBM Plex Mono", monospace',
    color: brassSoft,
    fontSize: 14,
  },
  parserInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#f3ecdc",
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 13,
  },
  legend: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 11,
    color: inkSoft,
    fontFamily: '"IBM Plex Mono", monospace',
  },
  legendItem: { display: "flex", alignItems: "center", gap: 8 },
  legendSwatch: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: `1px solid ${rule}`,
  },

  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTop: `1px solid ${rule}`,
    fontSize: 11,
    color: inkSoft,
    fontStyle: "italic",
    fontFamily: '"IBM Plex Mono", monospace',
    letterSpacing: "0.05em",
  },
};