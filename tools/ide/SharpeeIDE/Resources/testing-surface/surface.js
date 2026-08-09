"use strict";
(() => {
  // packages/branch-tester/src/auto-assertion.ts
  function proseTextLinesOf(values) {
    const textOf = (v) => {
      if (typeof v === "string") return v;
      if (Array.isArray(v)) return v.map(textOf).join("");
      if (v !== null && typeof v === "object" && "content" in v) {
        return textOf(v.content);
      }
      return "";
    };
    return (values ?? []).map(textOf).map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // tools/ide/web/testing-surface/src/cards.ts
  var CardsView = class {
    constructor(model2, delegate) {
      this.model = model2;
      this.delegate = delegate;
    }
    cards = /* @__PURE__ */ new Map();
    summaries = /* @__PURE__ */ new Map();
    host;
    session;
    /**
     * Takes the page over once: hides the client's window (its prose pane
     * keeps receiving turns as staging), builds cards/source/run columns, and
     * reparents the client's input bar under the cards column so play
     * continues to work untouched.
     */
    ensureLayout() {
      if (document.getElementById("ts-root")) return;
      document.body.classList.add("ts-active");
      const root = document.createElement("div");
      root.id = "ts-root";
      root.innerHTML = `
      <div class="ts-left">
        <div class="ts-session"><div id="ts-cards"></div></div>
        <div class="ts-input-row"><div class="ts-gutter-cap"></div></div>
      </div>
      <div class="ts-source-col">
        <div class="ts-col-head"><span id="ts-source-title">created transcript</span></div>
        <div id="ts-source"></div>
      </div>
      <div class="ts-run-col">
        <div class="ts-col-head"><span>test run</span>
          <button class="ts-run-btn" disabled
                  title="Runs land with the run column phase (ADR-306 plan Phase 6)">Run</button>
        </div>
        <div id="ts-run-results"><span class="ts-pending-note">not run yet</span></div>
      </div>`;
      document.body.appendChild(root);
      const inputBar = document.getElementById("input-area");
      if (inputBar) root.querySelector(".ts-input-row").appendChild(inputBar);
      this.host = document.getElementById("ts-cards");
      this.session = root.querySelector(".ts-session");
    }
    /** The prose staging pane the client renders into. */
    stagingPane() {
      return document.getElementById("text-content");
    }
    /**
     * Builds the card for a delivered turn by MOVING its `data-turn`-stamped
     * elements out of the staging pane (the 6f anchor contract — the client
     * stamps before it posts, so the elements are there by delivery time).
     * The session's first turn also drains everything staged before it into
     * the opening card (ordinal 0 — prologue + banner, design §2).
     */
    addTurnCard(ordinal, boot) {
      const staging = this.stagingPane();
      if (!staging) return;
      if (!this.cards.has(0) && this.model.hasOpening) {
        const openingElements = [];
        for (const child of [...staging.children]) {
          if (child.hasAttribute("data-turn")) break;
          openingElements.push(child);
        }
        this.buildRow(0, false, openingElements);
      }
      const elements = [...staging.children].filter((el) => el.getAttribute("data-turn") === String(ordinal));
      this.buildRow(ordinal, boot, elements);
    }
    buildRow(ordinal, boot, prose) {
      const row = document.createElement("div");
      row.className = "ts-turn";
      row.setAttribute("data-ts-ordinal", String(ordinal));
      const pick = document.createElement("label");
      pick.className = "ts-pick";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      pick.appendChild(checkbox);
      checkbox.addEventListener("change", () => this.delegate.onTick(ordinal, checkbox.checked));
      const column = document.createElement("div");
      column.className = "ts-card-column";
      const stripNote = document.createElement("div");
      stripNote.className = "ts-strip-note";
      stripNote.style.display = "none";
      const strip = document.createElement("div");
      strip.className = "ts-title-strip";
      strip.style.display = "none";
      const autoName = document.createElement("div");
      autoName.className = "ts-auto-name";
      autoName.title = "Auto-named: start location + end location + turns";
      const mergeButton = document.createElement("button");
      mergeButton.textContent = "Merge \u2191";
      mergeButton.title = "Merge this transcript into the previous one \u2014 former gap turns ride as [SKIP]";
      const collapseButton = document.createElement("button");
      collapseButton.textContent = "Collapse";
      collapseButton.title = "Collapse this transcript into its summary card";
      strip.append(autoName, mergeButton, collapseButton);
      const block = document.createElement("div");
      block.className = "ts-block";
      const meta = document.createElement("div");
      meta.className = "ts-meta";
      meta.textContent = ordinal === 0 ? "opening" : `turn ${ordinal}${boot ? " \xB7 boot" : ""}`;
      const proseHost = document.createElement("div");
      proseHost.className = "ts-prose";
      for (const el of prose) proseHost.appendChild(el);
      block.append(meta, proseHost);
      let splitButton = null;
      if (ordinal > 0) {
        const actions = document.createElement("div");
        actions.className = "ts-actions";
        actions.style.display = "none";
        splitButton = document.createElement("button");
        splitButton.textContent = "Split here";
        splitButton.title = "Start a new transcript at this turn \u2014 it continues from the one it left";
        splitButton.addEventListener("click", () => this.delegate.onSplitAt(ordinal));
        actions.appendChild(splitButton);
        block.appendChild(actions);
      }
      column.append(stripNote, strip, block);
      row.append(pick, column);
      this.host.appendChild(row);
      this.cards.set(ordinal, {
        row,
        checkbox,
        stripNote,
        strip,
        autoName,
        collapseButton,
        mergeButton,
        splitButton
      });
    }
    /** Dead lineage (restart fence): every card and summary goes. */
    clear() {
      for (const { row } of this.cards.values()) row.remove();
      for (const summary of this.summaries.values()) summary.remove();
      this.cards.clear();
      this.summaries.clear();
    }
    /** Re-derives every card's visuals from the model (mock's applySegments). */
    render() {
      for (const [ordinal, card] of this.cards) {
        const segment = this.model.segmentOf(ordinal);
        const assigned = segment !== void 0;
        const ticked = assigned && (ordinal === segment.start || ordinal === segment.end);
        const collapsed = assigned && segment.collapsed;
        card.row.style.display = collapsed ? "none" : "";
        card.row.classList.toggle("ts-selected", assigned && !collapsed);
        card.checkbox.checked = ticked;
        card.checkbox.classList.toggle("ts-implied", assigned && !ticked);
        card.checkbox.title = this.checkboxTitle(ordinal, segment);
        const isFirst = assigned && ordinal === segment.start && !collapsed;
        card.row.classList.toggle("ts-segment-start", isFirst);
        card.strip.style.display = isFirst ? "" : "none";
        card.stripNote.style.display = "none";
        if (isFirst && segment) this.renderStrip(card, segment);
        if (card.splitButton) {
          const splittable = assigned && segment.end !== null && !collapsed && ordinal > Math.max(segment.start, 1);
          card.splitButton.parentElement.style.display = splittable ? "" : "none";
        }
      }
      this.renderSummaries();
      this.renderRunColumn();
    }
    checkboxTitle(ordinal, segment) {
      if (segment) {
        const title = this.model.titleOf(segment);
        if (ordinal === segment.start) return `Starts "${title}"`;
        if (ordinal === segment.end) return `Ends "${title}"`;
        return `In "${title}"`;
      }
      if (ordinal === 0) return "Start a transcript at the beginning";
      return this.model.openSegment() ? `End the transcript at turn ${ordinal}` : `Start a new transcript at turn ${ordinal}`;
    }
    renderStrip(card, segment) {
      const title = this.model.titleOf(segment);
      card.autoName.innerHTML = "";
      card.autoName.append(title);
      const saved = document.createElement("span");
      saved.className = "ts-saved";
      saved.textContent = `tests/${title}.transcript`;
      card.autoName.appendChild(saved);
      card.autoName.onclick = () => this.delegate.onActivate(segment);
      card.collapseButton.style.display = segment.end !== null ? "" : "none";
      card.collapseButton.onclick = () => this.delegate.onCollapse(segment);
      const parent = this.model.parentOf(segment);
      card.mergeButton.style.display = parent ? "" : "none";
      card.mergeButton.onclick = () => this.delegate.onMergeUp(segment);
      if (parent) {
        card.stripNote.textContent = `\u21B3 continues from \u201C${this.model.titleOf(parent)}\u201D`;
        card.stripNote.style.display = "";
      }
    }
    /** One summary card per collapsed segment, sitting where its range was. */
    renderSummaries() {
      for (const [segment, row] of this.summaries) {
        if (!this.model.segments.includes(segment)) {
          row.remove();
          this.summaries.delete(segment);
        }
      }
      for (const segment of this.model.segments) {
        let row = this.summaries.get(segment);
        if (segment.collapsed && !row) {
          row = this.buildSummaryRow(segment);
          this.summaries.set(segment, row);
        }
        if (!row) continue;
        row.style.display = segment.collapsed ? "" : "none";
        if (segment.collapsed) {
          const end = segment.end ?? segment.start;
          const count = Math.max(1, end - Math.max(segment.start, 1) + 1);
          row.querySelector(".ts-summary-title").textContent = this.model.titleOf(segment);
          row.querySelector(".ts-summary-span").textContent = `turns ${segment.start}\u2013${end} \xB7 ${count} ${count === 1 ? "turn" : "turns"}`;
        }
      }
    }
    buildSummaryRow(segment) {
      const row = document.createElement("div");
      row.className = "ts-turn";
      row.innerHTML = `
      <div class="ts-pick"></div>
      <div class="ts-card-column">
        <div class="ts-block ts-summary" title="Click to expand">
          <div class="ts-meta">transcript</div>
          <div class="ts-summary-title"></div>
          <div class="ts-summary-span"></div>
        </div>
      </div>`;
      row.querySelector(".ts-summary").addEventListener("click", () => this.delegate.onExpand(segment));
      const anchor = this.cards.get(segment.start)?.row ?? null;
      this.host.insertBefore(row, anchor);
      return row;
    }
    /** Run-column skeleton: a row per closed transcript, unrun ("—") until the
     *  run column phase wires the real harness. */
    renderRunColumn() {
      const results = document.getElementById("ts-run-results");
      if (!results) return;
      const closed = this.model.segments.filter((s) => s.end !== null);
      if (closed.length === 0) {
        results.innerHTML = '<span class="ts-pending-note">no transcripts yet</span>';
        return;
      }
      results.innerHTML = "";
      for (const segment of [...closed].sort((a, b) => a.start - b.start)) {
        const row = document.createElement("div");
        row.className = "ts-run-row";
        const badge = document.createElement("span");
        badge.className = "ts-badge";
        badge.textContent = "\u2014";
        const name = document.createElement("div");
        name.className = "ts-name";
        name.textContent = this.model.titleOf(segment);
        const why = document.createElement("div");
        why.className = "ts-why";
        why.textContent = "not run yet";
        row.append(badge, name, why);
        results.appendChild(row);
      }
    }
    scrollToLatest() {
      this.session.scrollTop = this.session.scrollHeight;
    }
  };

  // tools/ide/web/testing-surface/src/model.ts
  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  var emptyClaims = () => ({
    contains: [],
    notContains: [],
    exact: false,
    states: [],
    events: [],
    channels: [],
    noDefaults: false
  });
  function claimsAnything(claims) {
    return claims.exact || claims.contains.length > 0 || claims.notContains.length > 0 || claims.states.length > 0 || claims.events.length > 0 || claims.channels.length > 0 || !claims.noDefaults;
  }
  var SessionModel = class {
    /** Played turns in feed order (opening included once present). */
    turnList = [];
    /** Segments in creation order; render order derives from `start`. */
    segmentList = [];
    /** Ordinals demoted to `[SKIP]` (merge gap turns, and pruned-to-nothing turns). */
    skippedSet = /* @__PURE__ */ new Set();
    /** Authored claims by ordinal (0 = the opening's claims). Absent = untouched. */
    claimsMap = /* @__PURE__ */ new Map();
    get turns() {
      return this.turnList;
    }
    get segments() {
      return this.segmentList;
    }
    /** True once the opening (ordinal 0) is on the board. */
    get hasOpening() {
      return this.turnList.some((t) => t.ordinal === 0);
    }
    /**
     * Folds one delivered turn in. The first turn of the session also seats
     * the opening (ordinal 0): the prologue + banner rendered before the boot
     * look, the nameable beginning of a root transcript (design §2).
     */
    addTurn(meta) {
      if (this.turnList.length === 0 && meta.ordinal > 0) {
        this.turnList.push({ ordinal: 0, command: "", boot: false });
      }
      this.turnList.push(meta);
    }
    /**
     * A restart fence (ADR-305 D3): everything before it is dead lineage —
     * turns, segments, and skips all clear. The next delivered turn reseats
     * the opening for the new lineage.
     */
    fence() {
      this.turnList = [];
      this.segmentList = [];
      this.skippedSet.clear();
      this.claimsMap.clear();
    }
    turnByOrdinal(n) {
      return this.turnList.find((t) => t.ordinal === n);
    }
    /** End used for ordering/containment: an open segment ends at its start. */
    endOf(s) {
      return s.end ?? s.start;
    }
    /** The segment covering ordinal `n`, if any. */
    segmentOf(n) {
      return this.segmentList.find((s) => n >= s.start && n <= this.endOf(s));
    }
    /** The at-most-one open segment. */
    openSegment() {
      return this.segmentList.find((s) => s.end === null);
    }
    /** The segment `s` continues from: the nearest one ending before it. */
    parentOf(s) {
      return this.segmentList.filter((x) => x !== s && this.endOf(x) < s.start).sort((a, b) => this.endOf(b) - this.endOf(a))[0];
    }
    /** True when any segment intersects [from, to] (both inclusive). */
    overlaps(from, to, ignoring) {
      return this.segmentList.some((s) => s !== ignoring && this.endOf(s) >= from && s.start <= to);
    }
    /**
     * Ticks the rail box on ordinal `n` (design §3): starts a segment, extends
     * the open one's start downward, or closes it — never overlapping another
     * segment (an extension that would swallow a neighbour is a 'noop').
     */
    tick(n) {
      if (!this.turnByOrdinal(n)) return "noop";
      if (this.segmentOf(n)) return "noop";
      const open = this.openSegment();
      if (!open) {
        this.segmentList.push({ start: n, end: null, collapsed: false });
        return "started";
      }
      if (n < open.start) {
        if (this.overlaps(n, open.start - 1, open)) return "noop";
        open.start = n;
        return "extended";
      }
      if (this.overlaps(open.start + 1, n, open)) return "noop";
      open.end = n;
      return "closed";
    }
    /**
     * Unticks a segment boundary: a lone or closed start drops the segment
     * whole; unticking the end reopens the range. Implied (mid-range) boxes
     * are not ticked, so there is nothing to untick there.
     */
    untick(n) {
      const s = this.segmentOf(n);
      if (!s) return;
      if (n === s.start) {
        this.segmentList.splice(this.segmentList.indexOf(s), 1);
      } else if (n === s.end) {
        s.end = null;
        s.collapsed = false;
      }
      this.dropOrphanedSkips();
    }
    /** Collapse is purely visual (design §3); only a closed range collapses. */
    setCollapsed(s, collapsed) {
      if (s.end === null && collapsed) return;
      s.collapsed = collapsed;
    }
    /**
     * Merge ↑ (design §3): folds `s` into the segment it continues from.
     * Former gap turns join as deliberate `[SKIP]`s — the merged range is the
     * true concatenation, nothing silently gains assertions. Merging an open
     * segment leaves the merged range open (the author keeps recording).
     * Returns false when `s` has no parent to merge into.
     */
    mergeUp(s) {
      const parent = this.parentOf(s);
      if (!parent) return false;
      for (const t of this.turnList) {
        if (t.ordinal > this.endOf(parent) && t.ordinal < s.start) {
          this.skippedSet.add(t.ordinal);
        }
      }
      parent.end = s.end === null ? null : s.end;
      parent.collapsed = false;
      this.segmentList.splice(this.segmentList.indexOf(s), 1);
      return true;
    }
    /**
     * Split here (design §3): cuts a closed segment before ordinal `n`; the
     * tail continues from the head. Round-trips with mergeUp. Returns false
     * off a closed range or at a position with nothing before it to keep.
     */
    splitAt(n) {
      const s = this.segmentOf(n);
      if (!s || s.end === null || n <= Math.max(s.start, 1)) return false;
      const tail = { start: n, end: s.end, collapsed: false };
      s.end = n - 1;
      s.collapsed = false;
      this.segmentList.push(tail);
      return true;
    }
    /** Whether ordinal `n` rides as `[SKIP]` (merge gap; pruning in Phase 4). */
    isSkipped(n) {
      return this.skippedSet.has(n);
    }
    /**
     * Containment for marks: unlike `segmentOf` (where an open range covers
     * only its start, so a later tick still reads as "close here"), a mark
     * inside an open range is inside it up to the latest played turn — a
     * merge that left the range open must not shed its gap `[SKIP]`s.
     */
    coveredByAnySegment(n) {
      const latest = this.turnList.reduce((m, t) => Math.max(m, t.ordinal), 0);
      return this.segmentList.some((s) => n >= s.start && n <= (s.end ?? latest));
    }
    /** Turns no segment covers carry no marks (design §3: leaving a range
     *  drops what was authored on the way through — skips AND claims). */
    dropOrphanedSkips() {
      for (const n of [...this.skippedSet]) {
        if (!this.coveredByAnySegment(n)) this.skippedSet.delete(n);
      }
      for (const n of [...this.claimsMap.keys()]) {
        if (!this.coveredByAnySegment(n)) this.claimsMap.delete(n);
      }
    }
    // ── authoring (design §5) ────────────────────────────────────────────
    /** The turn's claims, read-only; an untouched turn reads as all-default. */
    claimsOf(n) {
      return this.claimsMap.get(n) ?? emptyClaims();
    }
    mutableClaims(n) {
      let claims = this.claimsMap.get(n);
      if (!claims) {
        claims = emptyClaims();
        this.claimsMap.set(n, claims);
      }
      return claims;
    }
    /**
     * Authoring a claim INCLUDES the turn (design §5): it joins its segment,
     * extends/closes the open one, or starts a fresh one — and un-demotes a
     * `[SKIP]`. Returns false for an unknown ordinal (nothing changed).
     */
    includeForAuthoring(n) {
      if (!this.turnByOrdinal(n)) return false;
      this.skippedSet.delete(n);
      if (!this.segmentOf(n)) this.tick(n);
      return true;
    }
    addContains(n, text) {
      if (!this.includeForAuthoring(n)) return false;
      this.mutableClaims(n).contains.push(text);
      return true;
    }
    addNotContains(n, text) {
      if (!this.includeForAuthoring(n)) return false;
      this.mutableClaims(n).notContains.push(text);
      return true;
    }
    /** Toggles the Exact block ([OK] + literal whole-turn text). */
    setExact(n, exact) {
      if (exact && !this.includeForAuthoring(n)) return false;
      this.mutableClaims(n).exact = exact;
      if (!exact) this.demoteIfEmpty(n);
      return true;
    }
    addState(n, expression) {
      if (!this.includeForAuthoring(n)) return false;
      this.mutableClaims(n).states.push(expression);
      return true;
    }
    addEvent(n, type) {
      if (!this.includeForAuthoring(n)) return false;
      this.mutableClaims(n).events.push(type);
      return true;
    }
    addChannel(n, claim) {
      if (!this.includeForAuthoring(n)) return false;
      this.mutableClaims(n).channels.push(claim);
      return true;
    }
    /**
     * Deletes one POLICY-DEFAULT line: the others become authored contains —
     * the author narrows the claim, never silently abandons it (design §5).
     * `defaults` are the rendered default fragments, `index` the deleted one.
     */
    removeDefault(n, index, defaults) {
      const claims = this.mutableClaims(n);
      claims.contains = defaults.filter((_, i) => i !== index);
      claims.noDefaults = true;
      this.demoteIfEmpty(n);
    }
    removeContains(n, index) {
      const claims = this.mutableClaims(n);
      claims.contains.splice(index, 1);
      claims.noDefaults = true;
      this.demoteIfEmpty(n);
    }
    removeNotContains(n, index) {
      this.mutableClaims(n).notContains.splice(index, 1);
      this.demoteIfEmpty(n);
    }
    removeState(n, index) {
      this.mutableClaims(n).states.splice(index, 1);
      this.demoteIfEmpty(n);
    }
    removeEvent(n, index) {
      this.mutableClaims(n).events.splice(index, 1);
      this.demoteIfEmpty(n);
    }
    removeChannel(n, index) {
      this.mutableClaims(n).channels.splice(index, 1);
      this.demoteIfEmpty(n);
    }
    /**
     * A turn pruned to nothing demotes to `[SKIP]` in place; the opening just
     * claims nothing — absence is its no-claim form (design §5).
     */
    demoteIfEmpty(n) {
      if (n === 0) return;
      if (!claimsAnything(this.claimsOf(n))) this.skippedSet.add(n);
    }
    /**
     * Where the player STOOD when the range began: the previous turn's room,
     * or the boot room for a range starting at the beginning (design §4).
     */
    startRoomOf(s) {
      const source = s.start <= 1 ? this.turnByOrdinal(1) : this.turnByOrdinal(s.start - 1);
      return source?.room ?? "session";
    }
    endRoomOf(s) {
      return this.turnByOrdinal(this.endOf(s))?.room ?? "session";
    }
    /** Played-turn count of the range — the opening is not a turn. */
    turnCountOf(s) {
      return Math.max(1, this.endOf(s) - Math.max(s.start, 1) + 1);
    }
    /** The route-derived base name, before collision suffixing. */
    baseTitleOf(s) {
      const from = slugify(this.startRoomOf(s));
      const to = slugify(this.endRoomOf(s));
      const count = this.turnCountOf(s);
      return from === to ? `${from}-${count}` : `${from}-to-${to}-${count}`;
    }
    /**
     * The auto-derived name (design §4): route + turn count, `-2`/`-3` when
     * an earlier segment (by start) already claimed the same route. Naming
     * only — the write-back to `tests/` is Phase 4's auto-save writer.
     */
    titleOf(s) {
      const base = this.baseTitleOf(s);
      const earlier = this.segmentList.filter((x) => x.start < s.start && this.baseTitleOf(x) === base).length;
      return earlier === 0 ? base : `${base}-${earlier + 1}`;
    }
    /** The persisted view state (ADR-306 D8): segments + skips, nothing more —
     *  no assertions, no transcript content, no test truth. */
    snapshot() {
      return {
        segments: this.segmentList.map((s) => ({
          start: s.start,
          end: s.end,
          collapsed: s.collapsed
        })),
        skipped: [...this.skippedSet].sort((a, b) => a - b)
      };
    }
    /**
     * Re-applies a persisted snapshot after restore-by-replay re-fed the
     * turns (ADR-306 D8). Degraded-tolerant by rule: entries that no longer
     * fit the replayed session — unknown ordinals, overlaps, a second open
     * range — are dropped silently, never an error.
     */
    restore(snap) {
      this.segmentList = [];
      this.skippedSet.clear();
      const known = (n) => this.turnByOrdinal(n) !== void 0;
      for (const raw of snap.segments ?? []) {
        if (typeof raw?.start !== "number" || !known(raw.start)) continue;
        const end = raw.end === null ? null : raw.end;
        if (end !== null && (typeof end !== "number" || end < raw.start || !known(end))) continue;
        if (end === null && this.openSegment()) continue;
        const upper = end ?? raw.start;
        if (this.overlaps(raw.start, upper)) continue;
        this.segmentList.push({
          start: raw.start,
          end,
          collapsed: end !== null && raw.collapsed === true
        });
      }
      for (const n of snap.skipped ?? []) {
        if (typeof n === "number" && this.coveredByAnySegment(n)) this.skippedSet.add(n);
      }
    }
  };

  // tools/ide/web/testing-surface/src/source.ts
  var escapeHTML = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function renderSource(model2, active) {
    const source = document.getElementById("ts-source");
    const title = document.getElementById("ts-source-title");
    if (!source || !title) return;
    if (!active || !model2.segments.includes(active)) {
      title.textContent = "created transcript";
      source.innerHTML = '<span class="ts-skip"># tick the opening or a turn to start a transcript</span>';
      return;
    }
    const name = model2.titleOf(active);
    title.textContent = `created transcript \xB7 ${name}`;
    const parent = model2.parentOf(active);
    const end = active.end ?? active.start;
    const lines = [];
    lines.push(`<span class="ts-hdr">title: ${escapeHTML(name)}</span>`);
    lines.push(parent ? `<span class="ts-hdr">continues: ${escapeHTML(model2.titleOf(parent))}</span>` : `<span class="ts-hdr">seed: 42</span>`);
    lines.push("");
    lines.push('<span class="ts-hdr">---</span>');
    lines.push("");
    lines.push(`<span class="ts-skip"># in-range turns assert via the story's auto-assertion policy \u2014 authoring lands in Phase 4</span>`);
    lines.push("");
    const from = parent ? (parent.end ?? parent.start) + 1 : 1;
    for (const turn of model2.turns) {
      if (turn.ordinal < from || turn.ordinal > end || turn.ordinal === 0) continue;
      lines.push(`<span class="ts-cmd">&gt; ${escapeHTML(turn.command)}</span>`);
      const inRange = turn.ordinal >= Math.max(active.start, 1);
      if (!inRange || model2.isSkipped(turn.ordinal)) {
        lines.push('<span class="ts-skip">[SKIP]</span>');
      }
      lines.push("");
    }
    source.innerHTML = lines.join("\n").replace(/\n$/, "");
  }

  // tools/ide/web/testing-surface/src/main.ts
  var model = new SessionModel();
  var activeSegment = null;
  var cards = new CardsView(model, {
    onTick(ordinal, checked) {
      if (checked) {
        const result = model.tick(ordinal);
        if (result !== "noop") activeSegment = model.segmentOf(ordinal) ?? null;
      } else {
        model.untick(ordinal);
        if (activeSegment && !model.segments.includes(activeSegment)) {
          activeSegment = model.segmentOf(ordinal) ?? null;
        }
      }
      update();
    },
    onCollapse(segment) {
      model.setCollapsed(segment, true);
      update();
    },
    onExpand(segment) {
      model.setCollapsed(segment, false);
      activeSegment = segment;
      update();
    },
    onMergeUp(segment) {
      const parent = model.parentOf(segment);
      if (model.mergeUp(segment)) activeSegment = parent ?? null;
      update();
    },
    onSplitAt(ordinal) {
      if (model.splitAt(ordinal)) activeSegment = model.segmentOf(ordinal) ?? null;
      update();
    },
    onActivate(segment) {
      activeSegment = segment;
      renderSource(model, activeSegment);
    }
  });
  function update() {
    if (activeSegment && !model.segments.includes(activeSegment)) {
      activeSegment = null;
    }
    cards.render();
    renderSource(model, activeSegment);
    postState();
  }
  function postState() {
    try {
      window.webkit?.messageHandlers?.testingSurface?.postMessage(
        JSON.stringify({ state: model.snapshot() })
      );
    } catch {
    }
  }
  var expectBoot = true;
  var nextTurnWaiters = [];
  function roomOf(record) {
    const capture = (record.captures ?? []).filter((c) => c.channel === "room-name").at(-1);
    return proseTextLinesOf(capture?.values).at(-1);
  }
  function deliver(raw) {
    const record = raw;
    if (!record || typeof record.turn !== "number") return;
    if (record.restart === true) {
      cards.clear();
      model.fence();
      activeSegment = null;
      expectBoot = true;
      update();
      return;
    }
    cards.ensureLayout();
    const boot = expectBoot;
    expectBoot = false;
    const room = roomOf(record);
    model.addTurn({
      ordinal: record.turn,
      command: record.command ?? "",
      ...room !== void 0 ? { room } : {},
      boot
    });
    cards.addTurnCard(record.turn, boot);
    update();
    cards.scrollToLatest();
    const waiters = nextTurnWaiters;
    nextTurnWaiters = [];
    for (const resolve of waiters) resolve();
  }
  var awaitNextTurn = (timeoutMs) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    nextTurnWaiters.push(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  function typeCommand(command) {
    const input = document.getElementById("command-input");
    if (!input) return;
    input.value = command;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  }
  async function restoreSession(session) {
    const input = document.getElementById("command-input");
    const commands = session.replay ?? [];
    if (commands.length > 0) {
      if (input) {
        input.disabled = true;
        input.placeholder = "restoring session\u2026";
      }
      for (const command of commands) {
        typeCommand(command);
        if (!await awaitNextTurn(15e3)) break;
      }
      if (input) {
        input.disabled = false;
        input.placeholder = "";
        input.focus();
      }
    }
    if (session.snapshot) {
      model.restore(session.snapshot);
      activeSegment = model.openSegment() ?? model.segments[model.segments.length - 1] ?? null;
      update();
    }
  }
  var surfaceWindow = window;
  var queued = surfaceWindow.__sharpeeTestingSurface?.q ?? [];
  surfaceWindow.__sharpeeTestingSurface = { deliver };
  cards.ensureLayout();
  for (const record of queued) deliver(record);
  var bootSession = surfaceWindow.__SHARPEE_TESTING_SESSION__;
  if (bootSession && ((bootSession.replay?.length ?? 0) > 0 || bootSession.snapshot)) {
    void (async () => {
      if (model.turns.length === 0) await awaitNextTurn(15e3);
      await restoreSession(bootSession);
    })();
  }
})();
