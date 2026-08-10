"use strict";
(() => {
  // packages/branch-tester/src/auto-assertion.ts
  function synthesizePolicyAssertions(policy2, actualOutput, channelValues) {
    if (policy2 === "all-emitted-text") {
      return [{ type: "ok", block: actualOutput.replace(/\s+$/, "").split("\n") }];
    }
    const containsOf = (lines) => lines.length === 1 && !lines[0].includes('"') ? { type: "ok-contains", value: lines[0] } : { type: "ok-contains", block: lines };
    const nameLines = proseTextLinesOf(channelValues?.["room-name"]);
    const descriptionLines = proseTextLinesOf(channelValues?.["room-description"]);
    const assertions = [];
    if (policy2 === "room-name-and-description" && nameLines.length > 0) {
      assertions.push(containsOf(nameLines));
    }
    if (descriptionLines.length > 0) {
      assertions.push(containsOf(descriptionLines));
    }
    return assertions.length > 0 ? assertions : [{ type: "skip" }];
  }
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
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  var CardsView = class {
    constructor(model2, delegate) {
      this.model = model2;
      this.delegate = delegate;
    }
    cards = /* @__PURE__ */ new Map();
    summaries = /* @__PURE__ */ new Map();
    /** One chip row per fork point, keyed `parentId:at`. */
    branchRows = /* @__PURE__ */ new Map();
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
      <div class="ts-run-col">
        <div class="ts-col-head"><span>test run</span>
          <button class="ts-run-btn" id="ts-run-btn"
                  title="Run every transcript in tests/ as a tree, at the pinned seed">Run</button>
        </div>
        <div id="ts-run-results"><span class="ts-pending-note">not run yet</span></div>
      </div>`;
      document.body.appendChild(root);
      document.getElementById("ts-run-btn").addEventListener("click", () => this.delegate.onRun());
      const inputBar = document.getElementById("input-area");
      if (inputBar) root.querySelector(".ts-input-row").appendChild(inputBar);
      this.host = document.getElementById("ts-cards");
      this.session = root.querySelector(".ts-session");
      this.installSelectionGesture();
      this.installFocusGuard();
    }
    /**
     * The client keeps a document-level click handler that refocuses its
     * command input on every click — which would yank focus out of the
     * surface's inline inputs (the Branch…/Not contains… prompts, the picker
     * filter) the instant they spawn or are clicked. The guard runs after the
     * whole click dispatch (capture + setTimeout) and gives focus back to the
     * surface field the click was for; a click anywhere else retires any open
     * inline prompt.
     */
    installFocusGuard() {
      document.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const container = target?.closest(".ts-actions, .ts-picker") ?? null;
        if (container) {
          const field = container.querySelector("input");
          if (field) setTimeout(() => field.focus(), 0);
        } else {
          this.retirePrompt();
        }
      }, true);
    }
    /** The one open inline action-row prompt, if any. */
    activePrompt = null;
    retirePrompt() {
      this.activePrompt?.remove();
      this.activePrompt = null;
    }
    /** Contains-by-selection (design §5, ADR-301's default gesture): select
     *  prose in a card and a floating Add contains button appears. */
    installSelectionGesture() {
      const button = document.createElement("button");
      button.id = "ts-add-contains";
      button.textContent = "Add contains";
      document.body.appendChild(button);
      let pending = null;
      document.addEventListener("selectionchange", () => {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : "";
        if (!text || !selection || selection.rangeCount === 0) {
          button.style.display = "none";
          pending = null;
          return;
        }
        const node = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
        const prose = node?.closest?.(".ts-prose");
        const row = prose?.closest?.("[data-ts-ordinal]");
        const ordinal = row ? Number(row.getAttribute("data-ts-ordinal")) : NaN;
        if (!Number.isFinite(ordinal)) {
          button.style.display = "none";
          pending = null;
          return;
        }
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        button.style.left = `${Math.max(8, rect.left)}px`;
        button.style.top = `${rect.bottom + 6}px`;
        button.style.display = "block";
        pending = { ordinal, text };
      });
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        if (!pending) return;
        this.delegate.onAddContains(pending.ordinal, pending.text);
        window.getSelection()?.removeAllRanges();
        button.style.display = "none";
        pending = null;
      });
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
    addTurnCard(ordinal, boot, branch = false) {
      const staging = this.stagingPane();
      if (!staging) return;
      const isBanner = (el) => [...el.classList].some((name) => name.startsWith("sharpee-banner-"));
      let stamped = [...staging.children].filter((el) => el.getAttribute("data-turn") === String(ordinal));
      if (!this.cards.has(0) && this.model.hasOpening) {
        const openingElements = [];
        for (const child of [...staging.children]) {
          if (child.hasAttribute("data-turn")) break;
          openingElements.push(child);
        }
        if (boot) {
          openingElements.push(...stamped.filter(isBanner));
          stamped = stamped.filter((el) => !isBanner(el));
        }
        this.buildRow(0, false, false, openingElements);
      }
      this.buildRow(ordinal, boot, branch, stamped);
    }
    buildRow(ordinal, boot, branch, prose) {
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
      const collapseButton = document.createElement("button");
      collapseButton.textContent = "Collapse";
      collapseButton.title = "Collapse this transcript into its summary card";
      strip.append(autoName, collapseButton);
      const block = document.createElement("div");
      block.className = "ts-block";
      const meta = document.createElement("div");
      meta.className = "ts-meta";
      meta.textContent = ordinal === 0 ? "opening" : `turn ${ordinal}${boot ? " \xB7 boot" : ""}${branch ? " \xB7 branch" : ""}`;
      const proseHost = document.createElement("div");
      proseHost.className = "ts-prose";
      for (const el of prose) proseHost.appendChild(el);
      block.append(meta, proseHost);
      const actions = document.createElement("div");
      actions.className = "ts-actions";
      const promptText = (placeholder, commit) => {
        this.retirePrompt();
        const input = document.createElement("input");
        input.placeholder = placeholder;
        actions.appendChild(input);
        this.activePrompt = input;
        input.focus();
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && input.value.trim()) {
            commit(input.value.trim());
            this.retirePrompt();
          } else if (event.key === "Escape") {
            this.retirePrompt();
          }
        });
      };
      const notButton = document.createElement("button");
      notButton.textContent = "Not contains\u2026";
      notButton.title = "Text that must NOT appear in this turn";
      notButton.addEventListener("click", () => promptText(
        "text that must NOT appear\u2026",
        (text) => this.delegate.onNotContains(ordinal, text)
      ));
      actions.appendChild(notButton);
      let exactButton = null;
      if (ordinal > 0) {
        exactButton = document.createElement("button");
        exactButton.textContent = "Exact";
        exactButton.title = "This turn asserts its whole output \u2014 [OK] + literal block";
        exactButton.addEventListener("click", () => this.delegate.onToggleExact(ordinal));
        actions.appendChild(exactButton);
        const stateButton = document.createElement("button");
        stateButton.textContent = "State\u2026";
        stateButton.title = "Assert something the world holds after this turn";
        stateButton.addEventListener("click", () => this.delegate.onStatePicker(ordinal, stateButton));
        actions.appendChild(stateButton);
        const eventButton = document.createElement("button");
        eventButton.textContent = "Event\u2026";
        eventButton.title = "Assert an event this turn emitted";
        eventButton.addEventListener("click", () => this.delegate.onEventPicker(ordinal, eventButton));
        actions.appendChild(eventButton);
        const channelButton = document.createElement("button");
        channelButton.textContent = "Channel\u2026";
        channelButton.title = "Assert on a channel this turn captured";
        channelButton.addEventListener("click", () => this.delegate.onChannelPicker(ordinal, channelButton));
        actions.appendChild(channelButton);
      }
      let branchButton = null;
      if (ordinal > 0) {
        branchButton = document.createElement("button");
        branchButton.textContent = "Branch\u2026";
        branchButton.title = "Try a different command at this point \u2014 the shared prefix becomes the parent of all siblings";
        branchButton.style.display = "none";
        branchButton.addEventListener("click", () => promptText(
          "alternate command, e.g. east",
          (command) => this.delegate.onBranch(ordinal, command)
        ));
        actions.appendChild(branchButton);
      }
      block.appendChild(actions);
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
        exactButton,
        branchButton
      });
    }
    /** Dead lineage (restart fence): every card, summary, and chip row goes. */
    clear() {
      for (const { row } of this.cards.values()) row.remove();
      for (const summary of this.summaries.values()) summary.remove();
      for (const row of this.branchRows.values()) row.remove();
      this.cards.clear();
      this.summaries.clear();
      this.branchRows.clear();
    }
    /** The fork points the active lineage's path descends through — their
     *  chip rows stay visible even though the fork ordinal itself is cut. */
    pointsOnActivePath() {
      const keys = /* @__PURE__ */ new Set();
      const chain = this.model.pathOf(this.model.activeLineage);
      for (const id of chain) {
        const info = this.model.lineageInfo(id);
        if (info?.parentId !== void 0 && info.forkAt !== void 0) {
          keys.add(`${info.parentId}:${info.forkAt}`);
        }
      }
      return keys;
    }
    /** Re-derives every card's visuals from the model (mock's applySegments),
     *  including the lineage cut (design §6): a turn past a fork shows only
     *  while the branch that played it is the active lineage. */
    render() {
      for (const [ordinal, card] of [...this.cards]) {
        const exists = ordinal === 0 ? this.model.hasOpening : this.model.turns.some((t) => t.ordinal === ordinal);
        if (!exists) {
          card.row.remove();
          this.cards.delete(ordinal);
        }
      }
      const activePathPoints = this.pointsOnActivePath();
      for (const [ordinal, card] of this.cards) {
        const segment = this.model.segmentOf(ordinal);
        const assigned = segment !== void 0;
        const ticked = assigned && (ordinal === segment.start || ordinal === segment.end);
        const collapsed = assigned && segment.collapsed;
        const visible = this.model.isTurnVisible(ordinal);
        card.row.style.display = collapsed || !visible ? "none" : "";
        card.row.classList.toggle("ts-selected", assigned && !collapsed);
        card.checkbox.checked = ticked;
        card.checkbox.classList.toggle("ts-implied", assigned && !ticked);
        card.checkbox.title = this.checkboxTitle(ordinal, segment);
        const isFirst = assigned && ordinal === segment.start && !collapsed;
        card.row.classList.toggle("ts-segment-start", isFirst);
        card.strip.style.display = isFirst ? "" : "none";
        card.stripNote.style.display = "none";
        if (isFirst && segment) this.renderStrip(card, segment);
        if (card.branchButton) {
          const forkable = assigned && segment.end !== null && !collapsed && (ordinal > Math.max(segment.start, 1) || this.model.parentOf(segment) !== void 0);
          card.branchButton.style.display = forkable ? "" : "none";
        }
        card.exactButton?.classList.toggle(
          "ts-active",
          this.model.claimsOf(ordinal).exact
        );
      }
      this.renderSummaries();
      this.renderBranchRows(activePathPoints);
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
        row.style.display = segment.collapsed && this.model.isTurnVisible(segment.start) ? "" : "none";
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
    /**
     * One chip row per fork point (design §6): main line first, then each
     * sibling in creation order — "all continue from the parent". The row
     * sits where the fork is; it stays visible while the path descends
     * through it (the fork ordinal itself is cut then), and hides when the
     * point lies wholly past an earlier cut.
     */
    renderBranchRows(activePathPoints) {
      const points = this.model.branchPoints();
      const liveKeys = new Set(points.map((p) => `${p.parentId}:${p.at}`));
      for (const [key, row] of this.branchRows) {
        if (!liveKeys.has(key)) {
          row.remove();
          this.branchRows.delete(key);
        }
      }
      for (const point of points) {
        const key = `${point.parentId}:${point.at}`;
        let row = this.branchRows.get(key);
        if (!row) {
          row = document.createElement("div");
          row.className = "ts-turn ts-branch-point";
          row.innerHTML = '<div class="ts-pick"></div><div class="ts-card-column"><div class="ts-branch-row"></div></div>';
          const anchor = this.cards.get(point.at)?.row ?? null;
          this.host.insertBefore(row, anchor);
          this.branchRows.set(key, row);
        }
        const visible = this.model.isTurnVisible(point.at) || activePathPoints.has(key);
        row.style.display = visible ? "" : "none";
        if (!visible) continue;
        this.renderChips(row, point);
      }
    }
    renderChips(row, point) {
      const container = row.querySelector(".ts-branch-row");
      container.innerHTML = "";
      const chain = this.model.pathOf(this.model.activeLineage);
      const selectedSibling = point.siblings.find((id) => chain.includes(id));
      const mainSegment = this.model.segmentOf(point.at);
      const forkTurn = this.model.turns.find((t) => t.ordinal === point.at);
      const mainChip = document.createElement("div");
      mainChip.className = "ts-branch-chip" + (selectedSibling === void 0 ? " ts-chip-selected" : "");
      const mainTitle = mainSegment ? this.model.titleOf(mainSegment) : `turn ${point.at}`;
      const mainSpan = mainSegment ? `&gt; ${escapeHtml(forkTurn?.command ?? "")} \xB7 turns ${mainSegment.start}\u2013${mainSegment.end ?? mainSegment.start}` : `&gt; ${escapeHtml(forkTurn?.command ?? "")}`;
      mainChip.innerHTML = `<div class="ts-meta">branch</div>
       <div class="ts-chip-title">${escapeHtml(mainTitle)}</div>
       <div class="ts-chip-span">${mainSpan}</div>`;
      mainChip.addEventListener("click", () => this.delegate.onSelectLineage(point.parentId));
      container.appendChild(mainChip);
      for (const sibling of point.siblings) {
        const info = this.model.lineageInfo(sibling);
        const firstTurn = this.model.turns.find((t) => t.lineage === sibling);
        const segment = this.model.segments.find((s) => s.lineage === sibling);
        const pending = info?.pendingCommand !== void 0;
        const title = pending ? this.model.pendingTitleOf(sibling) ?? "" : segment ? this.model.titleOf(segment) : firstTurn?.command ?? "";
        const command = info?.pendingCommand ?? firstTurn?.command ?? "";
        const count = segment ? this.model.turns.filter((t) => t.lineage === sibling && t.ordinal >= segment.start && t.ordinal <= (segment.end ?? segment.start)).length : 0;
        const span = pending ? `&gt; ${escapeHtml(command)} \xB7 replay pending` : `&gt; ${escapeHtml(command)} \xB7 ${count} ${count === 1 ? "turn" : "turns"}`;
        const chip = document.createElement("div");
        chip.className = "ts-branch-chip" + (selectedSibling === sibling ? " ts-chip-selected" : "");
        chip.innerHTML = `<div class="ts-meta">branch</div>
         <div class="ts-chip-title">${escapeHtml(title)}</div>
         <div class="ts-chip-span">${span}</div>`;
        chip.addEventListener("click", () => this.delegate.onSelectLineage(sibling));
        const remove = document.createElement("button");
        remove.className = "ts-chip-delete";
        remove.textContent = "\u2715";
        remove.title = "Delete this branch \u2014 its transcript (and any branches forked from it) go too";
        remove.addEventListener("click", (event) => {
          event.stopPropagation();
          if (remove.classList.contains("ts-armed")) {
            this.delegate.onDeleteLineage(sibling);
          } else {
            remove.classList.add("ts-armed");
            remove.textContent = "delete?";
            setTimeout(() => {
              remove.classList.remove("ts-armed");
              remove.textContent = "\u2715";
            }, 2500);
          }
        });
        chip.appendChild(remove);
        container.appendChild(chip);
      }
      const prefix = mainSegment ? this.model.parentOf(mainSegment) : void 0;
      row.title = prefix ? `all continue from "${this.model.titleOf(prefix)}"` : "all continue from the shared prefix";
    }
    /** The run column (design §7): one row per transcript — branches
     *  included — with PASS/FAIL, the first failure on one line, and a tally.
     *  An open range isn't a file and doesn't run; a pending branch (no
     *  landed turn yet) shows a dash. */
    renderRunColumn() {
      const results = document.getElementById("ts-run-results");
      if (!results) return;
      const run = this.delegate.runColumn();
      const button = document.getElementById("ts-run-btn");
      if (button) {
        button.disabled = run.inFlight;
        button.textContent = run.inFlight ? "Running\u2026" : "Run";
      }
      const closed = this.model.segments.filter((s) => s.end !== null);
      const pending = this.model.lineages.filter(
        (info) => this.model.pendingTitleOf(info.id) !== void 0
      );
      results.innerHTML = "";
      if (closed.length === 0 && pending.length === 0 && run.results.size === 0) {
        results.innerHTML = '<span class="ts-pending-note">no transcripts yet</span>';
        return;
      }
      if (run.note) {
        const note = document.createElement("div");
        note.className = "ts-run-note";
        note.textContent = run.note;
        results.appendChild(note);
      }
      const row = (badgeText, badgeClass, title, why) => {
        const line = document.createElement("div");
        line.className = "ts-run-row";
        const badge = document.createElement("span");
        badge.className = `ts-badge${badgeClass ? ` ${badgeClass}` : ""}`;
        badge.textContent = badgeText;
        const name = document.createElement("div");
        name.className = "ts-name";
        name.textContent = title;
        const why_ = document.createElement("div");
        why_.className = "ts-why";
        why_.textContent = why;
        line.append(badge, name, why_);
        results.appendChild(line);
      };
      for (const [stem, result] of run.results) {
        switch (result.status) {
          case "passed":
            row("PASS", "ts-pass", stem, `${result.passed} turn${result.passed === 1 ? "" : "s"}`);
            break;
          case "skipped":
            row("\u2014", "", stem, "no commands \u2014 ran as a skip");
            break;
          case "unreached":
            row("\u2014", "", stem, result.firstFailure ?? "blocked by an ancestor");
            break;
          default: {
            const more = result.moreFailures > 0 ? ` +${result.moreFailures} more` : "";
            row("FAIL", "ts-fail", stem, `${result.firstFailure ?? "failed"}${more}`);
          }
        }
      }
      for (const segment of [...closed].sort((a, b) => a.start - b.start)) {
        const title = this.model.titleOf(segment);
        if (run.results.has(title)) continue;
        row("\u2014", "", title, run.inFlight ? "running\u2026" : "not run yet");
      }
      for (const info of pending) {
        row("\u2014", "", this.model.pendingTitleOf(info.id) ?? "pending branch", "pending branch");
      }
      if (run.tally) {
        const tally = document.createElement("div");
        tally.className = "ts-run-tally";
        const parts = [`${run.tally.passed} passing`, `${run.tally.failed} failures`];
        if (run.tally.errors > 0) parts.push(`${run.tally.errors} errors`);
        if (run.tally.unreached > 0) parts.push(`${run.tally.unreached} unreached`);
        tally.textContent = parts.join(", ");
        results.appendChild(tally);
      }
    }
    scrollToLatest() {
      this.session.scrollTop = this.session.scrollHeight;
    }
  };

  // packages/branch-tester/src/parser.ts
  var MAX_SEED = Number.MAX_SAFE_INTEGER;
  var CONFIG_KEYS = ["seed", "seeds", "channels", "events", "locale", "forces", "point-seed"];
  var FORCE_ENTRY = /^([^#=\s]+)\s*(?:#\s*(\d+))?\s*=\s*([^=\s]+)$/;
  var POINT_SEED_ENTRY = /^([^#=\s]+)\s*=\s*(\d+)$/;
  var CONTINUES_STEM = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  var CONTINUES_REJECTIONS = [
    {
      // `doormat at 4`, `doormat#4`, `doormat:4` — interior addressing.
      pattern: /\s+at\s+\d+\s*$|#\d+\s*$|:\d+\s*$/i,
      message: (v) => `continues: "${v}" addresses a point inside the parent \u2014 a parent is always a whole file (ADR-302 D1). There is no \`at <n>\` form: split the parent at that point into its own transcript and continue from it instead.`
    },
    {
      pattern: /\.transcript\s*$/i,
      message: (v) => `continues: "${v}" carries a file extension \u2014 name the filename STEM alone (ADR-302 D1), e.g. \`continues: ${v.replace(/\.transcript\s*$/i, "")}\`.`
    },
    {
      pattern: /[\\/]/,
      message: (v) => `continues: "${v}" carries a path \u2014 a parent is a transcript in the SAME story, named by stem alone (ADR-302 D1). A cross-story pointer is not expressible and would be rejected by tree validation anyway.`
    }
  ];
  var REMOVED_FORMS = [
    {
      pattern: /^\[SEED\s*:/i,
      form: "[SEED: N]",
      message: "[SEED: N] was removed (ADR-294 D3) \u2014 declare the seed in the header instead: seed: N above the --- separator"
    },
    {
      pattern: /^\[WHILE\s*:/i,
      form: "[WHILE:]",
      message: "[WHILE:] was removed (ADR-294 D4) \u2014 output is deterministic at a pinned seed; write the fixed command list the loop produced"
    },
    {
      pattern: /^\[END\s+WHILE\s*\]$/i,
      form: "[END WHILE]",
      message: "[END WHILE] was removed (ADR-294 D4) \u2014 output is deterministic at a pinned seed; write the fixed command list the loop produced"
    },
    {
      pattern: /^\[RETRY\s*:/i,
      form: "[RETRY:]",
      message: "[RETRY:] was removed (ADR-294 D4) \u2014 output is deterministic at a pinned seed; write the fixed command list the retries produced"
    },
    {
      pattern: /^\[END\s+RETRY\s*\]$/i,
      form: "[END RETRY]",
      message: "[END RETRY] was removed (ADR-294 D4) \u2014 output is deterministic at a pinned seed; write the fixed command list the retries produced"
    },
    {
      pattern: /^\[DO\s*\]$/i,
      form: "[DO]",
      message: "[DO] was removed (ADR-294 D4) \u2014 output is deterministic at a pinned seed; write the fixed command list the loop produced"
    },
    {
      pattern: /^\[UNTIL\s/i,
      form: "[UNTIL]",
      message: "[UNTIL] was removed (ADR-294 D4) \u2014 output is deterministic at a pinned seed; write the fixed command list the loop produced"
    },
    {
      pattern: /^\[ENSURES\s*:/i,
      form: "[ENSURES:]",
      message: `[ENSURES:] was removed (ADR-294 D4) \u2014 durable regression protection is the transcript's own assertions; for unit intent use [OK: contains "..."] or [STATE:]`
    },
    {
      pattern: /^\[REQUIRES\s*:/i,
      form: "[REQUIRES:]",
      message: "[REQUIRES:] was removed (ADR-294 D4) \u2014 state is deterministic at a pinned seed; a precondition either always holds or the transcript is wrong"
    },
    {
      pattern: /^\[IF\s*:/i,
      form: "[IF:]",
      message: "[IF:] was removed (ADR-294 D4) \u2014 state is deterministic at a pinned seed, so a condition never varies; write the branch that actually happens"
    },
    {
      pattern: /^\[END\s+IF\s*\]$/i,
      form: "[END IF]",
      message: "[END IF] was removed (ADR-294 D4) \u2014 state is deterministic at a pinned seed, so a condition never varies; write the branch that actually happens"
    },
    {
      pattern: /^\[OK\s*:\s*contains_any\s/i,
      form: "[OK: contains_any]",
      message: '[OK: contains_any] was removed (ADR-294 D2) \u2014 output is deterministic at a pinned seed; use [OK: contains "..."] with the text that actually occurs'
    },
    {
      pattern: /^\[OK\s*:\s*matches\s/i,
      form: "[OK: matches]",
      message: '[OK: matches] was removed (ADR-294 D2) \u2014 output is deterministic at a pinned seed; use [OK: contains "..."] or an [OK] exact block'
    },
    {
      pattern: /^\[NAVIGATE\s+TO\s*:/i,
      form: "[NAVIGATE TO:]",
      message: "[NAVIGATE TO:] was removed (ADR-294 D4) \u2014 write the literal movement commands; the runner never pathfinds"
    },
    {
      pattern: /^\[OK\s*:\s*any\s*\]$/i,
      form: "[OK: any]",
      message: '[OK: any] was removed (ADR-294 D2) \u2014 presence-only assertion masks failure; use [OK: contains "..."], or [SKIP] for deliberately unasserted output'
    },
    {
      pattern: /^\[EVENTS\s*:/i,
      form: "[EVENTS: N]",
      message: '[EVENTS: N] was removed (ADR-300 D5) \u2014 a bare count names no event and breaks whenever any unrelated event is added anywhere in the turn; use [EVENT: true, type="..."] to name the event you mean'
    }
  ];
  function detectRemovedForm(trimmed) {
    for (const removed of REMOVED_FORMS) {
      if (removed.pattern.test(trimmed)) {
        return removed;
      }
    }
    return null;
  }
  var BLOCK_OPEN = "text";
  var BLOCK_CLOSE = "end text";
  function isBlockLine(line, keyword) {
    return line.trimEnd() === keyword;
  }
  function acceptsBlock(assertion) {
    return assertion.type === "ok" || assertion.type === "ok-contains" && assertion.value === void 0;
  }
  function readTextBlock(lines, openIndex) {
    const content = [];
    for (let i = openIndex + 1; i < lines.length; i++) {
      if (isBlockLine(lines[i], BLOCK_CLOSE)) {
        return { content, closeIndex: i };
      }
      content.push(lines[i]);
    }
    return null;
  }
  function commentBody(trimmedLine) {
    const afterHash = trimmedLine.slice(1).replace(/\s+$/, "");
    return afterHash.startsWith(" ") ? afterHash.slice(1) : afterHash;
  }
  function parseTranscript(content, filePath = "<inline>") {
    const lines = content.split("\n");
    const transcript = {
      filePath,
      header: {},
      commands: [],
      items: [],
      goals: [],
      comments: [],
      // Defaults per ADR-294: unseeded, main channel only, prose-pure, primary
      // locale, no forces. Header fields overwrite these during parsing.
      config: { seeds: [], channels: [], events: false, forces: [] }
    };
    let inHeader = true;
    let currentCommand = null;
    const parseErrors = [];
    const seenConfigKeys = /* @__PURE__ */ new Map();
    let pendingHeader = null;
    const flushHeader = () => {
      if (!pendingHeader) return;
      const { key, value, lineNumber } = pendingHeader;
      pendingHeader = null;
      transcript.header[key] = value;
      if (key === "continues") {
        checkContinues(value, lineNumber, parseErrors);
      }
      if (CONFIG_KEYS.includes(key)) {
        parseConfigField(transcript, key, value, lineNumber, parseErrors, seenConfigKeys);
      }
    };
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineNumber = index + 1;
      const trimmed = line.trim();
      if (trimmed === "") {
        if (currentCommand && currentCommand.expectedOutput.length > 0) {
          currentCommand.expectedOutput.push("");
        }
        continue;
      }
      if (trimmed === "---") {
        flushHeader();
        inHeader = false;
        continue;
      }
      if (inHeader && pendingHeader && /^[ \t]/.test(line)) {
        pendingHeader.value += (pendingHeader.value ? " " : "") + trimmed;
        continue;
      }
      if (trimmed.startsWith("#") && !trimmed.startsWith("#[")) {
        const commentText = commentBody(trimmed);
        transcript.comments.push(commentText);
        transcript.items.push({
          type: "comment",
          comment: { lineNumber, text: commentText }
        });
        continue;
      }
      if (trimmed.startsWith("[")) {
        const removed = detectRemovedForm(trimmed);
        if (removed) {
          parseErrors.push({ lineNumber, message: removed.message });
          continue;
        }
      }
      if (trimmed.startsWith("$")) {
        if (currentCommand) {
          finalizeCommand(currentCommand, parseErrors);
          currentCommand = null;
        }
        const directive = parseDollarDirective(trimmed, lineNumber);
        if (directive) {
          transcript.items.push({ type: "directive", directive });
        }
        continue;
      }
      if (inHeader && trimmed.includes(":") && !trimmed.startsWith(">")) {
        const colonIndex = trimmed.indexOf(":");
        const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
        const value = trimmed.slice(colonIndex + 1).trim();
        flushHeader();
        pendingHeader = { key, value: value === "|" ? "" : value, lineNumber };
        continue;
      }
      if (trimmed.startsWith(">")) {
        if (currentCommand) {
          finalizeCommand(currentCommand, parseErrors);
        }
        currentCommand = {
          lineNumber,
          input: trimmed.slice(1).trim(),
          expectedOutput: [],
          assertions: []
        };
        transcript.commands.push(currentCommand);
        transcript.items.push({ type: "command", command: currentCommand });
        continue;
      }
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const blockIndex = index + 1;
        const nextIsBlock = blockIndex < lines.length && isBlockLine(lines[blockIndex], BLOCK_OPEN);
        const directive = parseDirective(trimmed, lineNumber);
        if (directive) {
          if (currentCommand) {
            finalizeCommand(currentCommand, parseErrors);
            currentCommand = null;
          }
          transcript.items.push({ type: "directive", directive });
          if (nextIsBlock) {
            index = skipInvalidBlock(
              lines,
              blockIndex,
              parseErrors,
              `A text block cannot follow the directive "${trimmed}" \u2014 blocks attach only to [OK] or [OK: contains]`
            );
          }
          continue;
        }
        if (!currentCommand) {
          const opening = parseAssertion(trimmed);
          if (opening) {
            (transcript.opening ??= []).push(opening);
          }
          continue;
        }
        if (currentCommand) {
          const assertion = parseAssertion(trimmed);
          if (assertion) {
            currentCommand.assertions.push(assertion);
            if (nextIsBlock && !acceptsBlock(assertion)) {
              index = skipInvalidBlock(
                lines,
                blockIndex,
                parseErrors,
                `A text block cannot follow "${trimmed}" \u2014 blocks attach only to [OK] or payload-less [OK: contains]`
              );
            } else if (nextIsBlock) {
              const block = readTextBlock(lines, blockIndex);
              if (!block) {
                parseErrors.push({
                  lineNumber: blockIndex + 1,
                  message: `Unclosed text block \u2014 expected a line reading "${BLOCK_CLOSE}" before end of file`
                });
                index = lines.length;
              } else if (block.content.length === 0) {
                parseErrors.push({
                  lineNumber: blockIndex + 1,
                  message: "Empty text block \u2014 a block must contain at least one line"
                });
                index = block.closeIndex;
              } else {
                assertion.block = block.content;
                assertion.lineNumber = lineNumber;
                index = block.closeIndex;
              }
            } else if (assertion.type === "ok-contains" && assertion.value === void 0) {
              parseErrors.push({
                lineNumber,
                message: "[OK: contains] with no inline payload requires a text block on the next line"
              });
            }
          }
        }
        continue;
      }
      if (currentCommand) {
        currentCommand.expectedOutput.push(line);
        continue;
      }
      const strayConfig = /^([A-Za-z-]+)\s*:/.exec(trimmed);
      if (strayConfig && CONFIG_KEYS.includes(strayConfig[1].toLowerCase())) {
        parseErrors.push({
          lineNumber,
          message: `Header field "${strayConfig[1]}:" appears after the --- separator \u2014 header fields must be declared above it (ADR-294 D3)`
        });
      }
    }
    flushHeader();
    if (currentCommand) {
      finalizeCommand(currentCommand, parseErrors);
    }
    transcript.goals = parseGoals(transcript.items);
    if (parseErrors.length > 0) {
      transcript.parseErrors = parseErrors;
    }
    return transcript;
  }
  function checkContinues(value, lineNumber, parseErrors) {
    const trimmed = value.trim();
    if (trimmed === "") {
      parseErrors.push({
        lineNumber,
        message: "continues: has no value \u2014 name the parent transcript's filename stem, or remove the field to make this a root (ADR-302 D1)"
      });
      return;
    }
    for (const rejection of CONTINUES_REJECTIONS) {
      if (rejection.pattern.test(trimmed)) {
        parseErrors.push({ lineNumber, message: rejection.message(trimmed) });
        return;
      }
    }
    if (!CONTINUES_STEM.test(trimmed)) {
      parseErrors.push({
        lineNumber,
        message: `continues: "${trimmed}" is not a filename stem \u2014 it must be a single name of letters, digits, \`.\`, \`-\` or \`_\` (ADR-302 D1)`
      });
    }
  }
  function parseScalar(raw) {
    const quoted = raw.match(/^"([^"]*)"$/);
    if (quoted) return quoted[1];
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    if (/^true$/i.test(raw)) return true;
    if (/^false$/i.test(raw)) return false;
    return void 0;
  }
  function parseConfigField(transcript, key, value, lineNumber, parseErrors, seenConfigKeys) {
    const config = transcript.config;
    const previousLine = seenConfigKeys.get(key);
    if (previousLine !== void 0) {
      parseErrors.push({
        lineNumber,
        message: `Duplicate header field "${key}:" \u2014 already declared on line ${previousLine}`
      });
      return;
    }
    seenConfigKeys.set(key, lineNumber);
    (transcript.declaredConfigKeys ??= []).push(key);
    const parseSeedValue = (raw) => {
      if (!/^\d+$/.test(raw)) {
        parseErrors.push({
          lineNumber,
          message: `Invalid ${key}: value "${raw}" \u2014 must be a non-negative integer`
        });
        return null;
      }
      const parsed = Number(raw);
      if (parsed > MAX_SEED) {
        parseErrors.push({
          lineNumber,
          message: `Invalid ${key}: value "${raw}" \u2014 out of range (max ${MAX_SEED})`
        });
        return null;
      }
      return parsed;
    };
    const splitList = (raw) => raw.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
    switch (key) {
      case "seed": {
        if (seenConfigKeys.has("seeds")) {
          parseErrors.push({
            lineNumber,
            message: "seed: and seeds: are mutually exclusive \u2014 use seed: N for one pin or seeds: A, B for a matrix (ADR-294 D8)"
          });
          return;
        }
        const seed = parseSeedValue(value);
        if (seed !== null) {
          transcript.seed = seed;
          transcript.seedLineNumber = lineNumber;
          config.seeds = [seed];
        }
        return;
      }
      case "seeds": {
        if (seenConfigKeys.has("seed")) {
          parseErrors.push({
            lineNumber,
            message: "seed: and seeds: are mutually exclusive \u2014 use seed: N for one pin or seeds: A, B for a matrix (ADR-294 D8)"
          });
          return;
        }
        const entries = splitList(value);
        if (entries.length === 0) {
          parseErrors.push({
            lineNumber,
            message: "seeds: declares no values \u2014 expected a comma-separated list (seeds: 42, 777)"
          });
          return;
        }
        const seeds = [];
        for (const entry of entries) {
          const seed = parseSeedValue(entry);
          if (seed === null) return;
          if (seeds.includes(seed)) {
            parseErrors.push({
              lineNumber,
              message: `Duplicate seed ${seed} in seeds: \u2014 each seed gets its own recording, so each may appear once (ADR-294 D8)`
            });
            return;
          }
          seeds.push(seed);
        }
        config.seeds = seeds;
        return;
      }
      case "channels": {
        const channels = splitList(value);
        if (channels.length === 0) {
          parseErrors.push({
            lineNumber,
            message: "channels: declares no values \u2014 expected a comma-separated list (channels: main, status)"
          });
          return;
        }
        const duplicate = channels.find((channel, i) => channels.indexOf(channel) !== i);
        if (duplicate !== void 0) {
          parseErrors.push({
            lineNumber,
            message: `Duplicate channel "${duplicate}" in channels: \u2014 each channel may appear once`
          });
          return;
        }
        config.channels = channels;
        return;
      }
      case "events": {
        const normalized = value.toLowerCase();
        if (normalized !== "true" && normalized !== "false") {
          parseErrors.push({
            lineNumber,
            message: `Invalid events: value "${value}" \u2014 must be true or false (ADR-294 D6)`
          });
          return;
        }
        config.events = normalized === "true";
        return;
      }
      case "locale": {
        if (value === "") {
          parseErrors.push({
            lineNumber,
            message: "locale: declares no value \u2014 expected a locale tag (locale: en-US) or omit the field for the story's primary"
          });
          return;
        }
        config.locale = value;
        return;
      }
      case "forces": {
        if (value === "(none)" || value === "") {
          config.forces = [];
          return;
        }
        const entries = splitList(value);
        const canonical = [];
        const specs = [];
        const seenKeys = /* @__PURE__ */ new Map();
        for (const entry of entries) {
          const match = FORCE_ENTRY.exec(entry);
          if (!match) {
            parseErrors.push({
              lineNumber,
              message: `Invalid forces: entry "${entry}" \u2014 expected point[#occurrence]=CLASS (e.g. dungeo.thief.steal=yes or dungeo.melee.blow.villain#2=SERIOUS_WOUND)`
            });
            return;
          }
          const [, point, occurrenceDigits, cls] = match;
          const occurrence = occurrenceDigits === void 0 ? void 0 : Number(occurrenceDigits);
          if (occurrence !== void 0 && (occurrence < 1 || occurrence > Number.MAX_SAFE_INTEGER)) {
            parseErrors.push({
              lineNumber,
              message: `Invalid forces: entry "${entry}" \u2014 occurrence index must be a positive integer (ADR-293 D9)`
            });
            return;
          }
          const key2 = occurrence === void 0 ? point : `${point}#${occurrence}`;
          const previous = seenKeys.get(key2);
          if (previous !== void 0) {
            parseErrors.push({
              lineNumber,
              message: `Duplicate force key "${key2}" in forces: \u2014 duplicate keys are a load error, not last-wins (ADR-293 D9)`
            });
            return;
          }
          seenKeys.set(key2, entry);
          canonical.push(`${key2}=${cls}`);
          specs.push(
            occurrence === void 0 ? { point, cls, mode: "once" } : { point, occurrence, cls, mode: "once" }
          );
        }
        if (specs.length === 0) {
          parseErrors.push({
            lineNumber,
            message: "forces: declares no entries \u2014 expected a comma-separated list, or (none)"
          });
          return;
        }
        config.forces = canonical;
        config.forceSpecs = specs;
        config.forcesLineNumber = lineNumber;
        return;
      }
      case "point-seed": {
        const entries = splitList(value);
        if (entries.length === 0) {
          parseErrors.push({
            lineNumber,
            message: "point-seed: declares no entries \u2014 expected a comma-separated list (point-seed: dungeo.thief.steal=1234)"
          });
          return;
        }
        const pointSeeds = [];
        for (const entry of entries) {
          const match = POINT_SEED_ENTRY.exec(entry);
          if (!match) {
            parseErrors.push({
              lineNumber,
              message: `Invalid point-seed: entry "${entry}" \u2014 expected point=seed with a non-negative integer seed (ADR-293 D11)`
            });
            return;
          }
          const [, point, seedDigits] = match;
          const seed = Number(seedDigits);
          if (seed > MAX_SEED) {
            parseErrors.push({
              lineNumber,
              message: `Invalid point-seed: entry "${entry}" \u2014 seed out of range (max ${MAX_SEED})`
            });
            return;
          }
          if (pointSeeds.some((existing) => existing.point === point)) {
            parseErrors.push({
              lineNumber,
              message: `Duplicate point "${point}" in point-seed: \u2014 each point may be overridden once (ADR-293 D11)`
            });
            return;
          }
          pointSeeds.push({ point, seed });
        }
        config.pointSeeds = pointSeeds;
        config.pointSeedsLineNumber = lineNumber;
        return;
      }
    }
  }
  function skipInvalidBlock(lines, openIndex, parseErrors, message) {
    const block = readTextBlock(lines, openIndex);
    parseErrors.push({ lineNumber: openIndex + 1, message });
    return block ? block.closeIndex : lines.length;
  }
  function parseDirective(tag, lineNumber) {
    const inner = tag.slice(1, -1).trim();
    const goalMatch = inner.match(/^GOAL:\s*(.+)$/i);
    if (goalMatch) {
      return { type: "goal", lineNumber, goalName: goalMatch[1].trim() };
    }
    if (inner.toUpperCase() === "END GOAL") {
      return { type: "end_goal", lineNumber };
    }
    return null;
  }
  function parseDollarDirective(line, lineNumber) {
    const trimmed = line.trim();
    const saveMatch = trimmed.match(/^\$save\s+(.+)$/i);
    if (saveMatch) {
      return { type: "save", lineNumber, saveName: saveMatch[1].trim() };
    }
    const restoreMatch = trimmed.match(/^\$restore\s+(.+)$/i);
    if (restoreMatch) {
      return { type: "restore", lineNumber, saveName: restoreMatch[1].trim() };
    }
    const testCommandMatch = trimmed.match(/^\$(\w+)(.*)$/);
    if (testCommandMatch) {
      return { type: "test-command", lineNumber, testCommand: trimmed };
    }
    return null;
  }
  function parseGoals(items) {
    const goals = [];
    let currentGoal = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type !== "directive") continue;
      const directive = item.directive;
      switch (directive.type) {
        case "goal":
          if (currentGoal) {
            console.warn(`Line ${directive.lineNumber}: Nested goals not allowed. Closing previous goal.`);
            goals.push({ ...currentGoal, endIndex: i - 1 });
          }
          currentGoal = {
            name: directive.goalName,
            lineNumber: directive.lineNumber,
            startIndex: i + 1
          };
          break;
        case "end_goal":
          if (currentGoal) {
            goals.push({ ...currentGoal, endIndex: i });
            currentGoal = null;
          }
          break;
      }
    }
    if (currentGoal) {
      console.warn(`Unclosed goal: ${currentGoal.name}`);
      goals.push({ ...currentGoal, endIndex: items.length - 1 });
    }
    return goals;
  }
  function parseAssertion(tag) {
    const inner = tag.slice(1, -1).trim();
    if (inner === "OK") {
      return { type: "ok" };
    }
    if (inner === "SKIP") {
      return { type: "skip" };
    }
    if (/^OK:\s*contains$/i.test(inner)) {
      return { type: "ok-contains" };
    }
    const containsMatch = inner.match(/^OK:\s*contains\s+"([^"]+)"$/i);
    if (containsMatch) {
      return { type: "ok-contains", value: containsMatch[1] };
    }
    const notContainsMatch = inner.match(/^OK:\s*not\s+contains\s+"([^"]+)"$/i);
    if (notContainsMatch) {
      return { type: "ok-not-contains", value: notContainsMatch[1] };
    }
    const failMatch = inner.match(/^FAIL(?::\s*(.+))?$/i);
    if (failMatch) {
      return { type: "fail", reason: failMatch[1] || "Expected failure" };
    }
    const todoMatch = inner.match(/^TODO(?::\s*(.+))?$/i);
    if (todoMatch) {
      return { type: "todo", reason: todoMatch[1] || "Not implemented" };
    }
    const eventAssertMatch = inner.match(/^EVENT:\s*(true|false)\s*,\s*(.+)$/i);
    if (eventAssertMatch) {
      const assertTrue = eventAssertMatch[1].toLowerCase() === "true";
      const rest = eventAssertMatch[2];
      const positionMatch = rest.match(/^(\d+)\s*,\s*(.+)$/);
      let eventPosition;
      let propsStr;
      if (positionMatch) {
        eventPosition = parseInt(positionMatch[1], 10);
        propsStr = positionMatch[2];
      } else {
        propsStr = rest;
      }
      const eventData = {};
      let eventType;
      const propRegex = /(\w+)="([^"]+)"/g;
      let match;
      while ((match = propRegex.exec(propsStr)) !== null) {
        const [, key, value] = match;
        if (key === "type") {
          eventType = value;
        } else {
          eventData[key] = value;
        }
      }
      if (eventType) {
        return {
          type: "event-assert",
          assertTrue,
          eventPosition,
          eventType,
          eventData: Object.keys(eventData).length > 0 ? eventData : void 0
        };
      }
    }
    const channelMatch = inner.match(/^CHANNEL:\s*([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\s*,\s*(.+)$/i);
    if (channelMatch) {
      const [channelId, ...channelPath] = channelMatch[1].split(".");
      const rest = channelMatch[2].trim();
      const target = { channelId, ...channelPath.length > 0 ? { channelPath } : {} };
      if (/^is\s+absent$/i.test(rest)) {
        return { type: "channel-absent", ...target };
      }
      if (/^is\s+present$/i.test(rest)) {
        return { type: "channel-present", ...target };
      }
      const notContains = rest.match(/^not\s+contains\s+"([^"]+)"$/i);
      if (notContains) {
        return { type: "channel-not-contains", ...target, value: notContains[1] };
      }
      const contains = rest.match(/^contains\s+"([^"]+)"$/i);
      if (contains) {
        return { type: "channel-contains", ...target, value: contains[1] };
      }
      const isNot = rest.match(/^is\s+not\s+(.+)$/i);
      if (isNot) {
        const expected = parseScalar(isNot[1].trim());
        if (expected !== void 0) {
          return { type: "channel-is-not", ...target, channelExpected: expected };
        }
      }
      const is = rest.match(/^is\s+(.+)$/i);
      if (is) {
        const expected = parseScalar(is[1].trim());
        if (expected !== void 0) {
          return { type: "channel-is", ...target, channelExpected: expected };
        }
      }
    }
    const stateAssertMatch = inner.match(/^STATE:\s*(true|false)\s*,\s*(.+)$/i);
    if (stateAssertMatch) {
      const assertTrue = stateAssertMatch[1].toLowerCase() === "true";
      const expression = stateAssertMatch[2].trim();
      return {
        type: "state-assert",
        assertTrue,
        stateExpression: expression
      };
    }
    console.warn(`Unknown assertion format: ${tag}`);
    return null;
  }
  function finalizeCommand(command, parseErrors) {
    while (command.expectedOutput.length > 0 && command.expectedOutput[command.expectedOutput.length - 1].trim() === "") {
      command.expectedOutput.pop();
    }
    if (command.assertions.length === 0 && command.expectedOutput.length > 0) {
      command.assertions.push({ type: "ok" });
    }
    const blocked = command.assertions.find((a) => a.block !== void 0);
    if (blocked && command.expectedOutput.length > 0) {
      parseErrors.push({
        lineNumber: blocked.lineNumber ?? command.lineNumber,
        message: `Command "${command.input}" carries both a text block and a classic expected-output block \u2014 use one or the other`
      });
    }
  }

  // packages/branch-tester/src/serializer.ts
  var HEADER_ORDER = [
    "title",
    "story",
    "entry",
    // ADR-302 D1: the parent pointer sits with the other identity fields, above
    // the prose ones — a reader asking "where does this start?" should not have
    // to read past the description to find out.
    "continues",
    "author",
    "description",
    "seed",
    "seeds",
    "channels",
    "events",
    "locale",
    "forces",
    "point-seed"
  ];
  var FOLD_WIDTH = 78;
  var FOLD_INDENT = "  ";
  var DEFAULT_FAIL_REASON = "Expected failure";
  var DEFAULT_TODO_REASON = "Not implemented";
  function foldHeaderField(key, value) {
    const words = value.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return [`${key}:`];
    const lines = [];
    let current = `${key}:`;
    let indent = "";
    for (const word of words) {
      const candidate = current === indent ? `${indent}${word}` : `${current} ${word}`;
      if (candidate.length > FOLD_WIDTH && current !== indent) {
        lines.push(current);
        indent = FOLD_INDENT;
        current = `${indent}${word}`;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
    return lines;
  }
  function serializeHeader(transcript) {
    const lines = [];
    const emitted = /* @__PURE__ */ new Set();
    for (const key of HEADER_ORDER) {
      const value = transcript.header[key];
      if (value === void 0) continue;
      lines.push(...foldHeaderField(key, value));
      emitted.add(key);
    }
    for (const key of Object.keys(transcript.header)) {
      if (emitted.has(key)) continue;
      const value = transcript.header[key];
      if (value === void 0) continue;
      lines.push(...foldHeaderField(key, value));
    }
    return lines;
  }
  function serializeAssertionTag(assertion) {
    switch (assertion.type) {
      case "ok":
        return "[OK]";
      case "ok-contains":
        return assertion.value === void 0 ? "[OK: contains]" : `[OK: contains "${assertion.value}"]`;
      case "ok-not-contains":
        return `[OK: not contains "${assertion.value}"]`;
      case "skip":
        return "[SKIP]";
      case "fail":
        return assertion.reason === DEFAULT_FAIL_REASON ? "[FAIL]" : `[FAIL: ${assertion.reason}]`;
      case "todo":
        return assertion.reason === DEFAULT_TODO_REASON ? "[TODO]" : `[TODO: ${assertion.reason}]`;
      case "event-assert": {
        const parts = [String(assertion.assertTrue)];
        if (assertion.eventPosition !== void 0) {
          parts.push(String(assertion.eventPosition));
        }
        const props = [`type="${assertion.eventType}"`];
        for (const [key, value] of Object.entries(assertion.eventData ?? {})) {
          props.push(`${key}="${value}"`);
        }
        return `[EVENT: ${parts.join(", ")}, ${props.join(" ")}]`;
      }
      case "state-assert":
        return `[STATE: ${assertion.assertTrue}, ${assertion.stateExpression}]`;
      case "channel-contains":
        return `[CHANNEL: ${channelTarget(assertion)}, contains "${assertion.value}"]`;
      case "channel-not-contains":
        return `[CHANNEL: ${channelTarget(assertion)}, not contains "${assertion.value}"]`;
      case "channel-is":
        return `[CHANNEL: ${channelTarget(assertion)}, is ${literal(assertion.channelExpected)}]`;
      case "channel-is-not":
        return `[CHANNEL: ${channelTarget(assertion)}, is not ${literal(assertion.channelExpected)}]`;
      case "channel-absent":
        return `[CHANNEL: ${channelTarget(assertion)}, is absent]`;
      case "channel-present":
        return `[CHANNEL: ${channelTarget(assertion)}, is present]`;
    }
  }
  function channelTarget(assertion) {
    const path = assertion.channelPath ?? [];
    return path.length > 0 ? `${assertion.channelId}.${path.join(".")}` : `${assertion.channelId}`;
  }
  function literal(value) {
    return typeof value === "string" ? `"${value}"` : String(value);
  }
  function serializeAssertion(assertion) {
    const lines = [serializeAssertionTag(assertion)];
    if (assertion.block !== void 0) {
      lines.push("text", ...assertion.block, "end text");
    }
    return lines;
  }
  function serializeCommand(command) {
    const lines = [`> ${command.input}`];
    for (const assertion of command.assertions) {
      lines.push(...serializeAssertion(assertion));
    }
    lines.push(...command.expectedOutput);
    return lines;
  }
  function serializeDirective(directive) {
    switch (directive.type) {
      case "goal":
        return [`[GOAL: ${directive.goalName}]`];
      case "end_goal":
        return ["[END GOAL]"];
      case "save":
        return [`$save ${directive.saveName}`];
      case "restore":
        return [`$restore ${directive.saveName}`];
      case "test-command":
        return [directive.testCommand];
    }
  }
  function opensStanza(item) {
    return item.type === "command" || item.type === "directive";
  }
  function serializeTranscript(transcript) {
    const lines = [];
    lines.push(...serializeHeader(transcript));
    lines.push("");
    lines.push("---");
    lines.push("");
    for (const assertion of transcript.opening ?? []) {
      lines.push(...serializeAssertion(assertion));
    }
    if (transcript.opening && transcript.opening.length > 0) lines.push("");
    const items = transcript.items ?? [];
    let pendingComments = [];
    let firstStanza = true;
    const openStanza = () => {
      if (!firstStanza) lines.push("");
      firstStanza = false;
      lines.push(...pendingComments);
      pendingComments = [];
    };
    for (const item of items) {
      if (item.type === "comment") {
        const text = item.comment.text;
        pendingComments.push(text ? `# ${text}` : "#");
        continue;
      }
      if (!opensStanza(item)) continue;
      openStanza();
      if (item.type === "command") {
        lines.push(...serializeCommand(item.command));
      } else {
        const directive = item.directive;
        lines.push(...serializeDirective(directive));
        if (directive.type === "goal") {
          lines.push("");
          firstStanza = true;
        }
      }
    }
    if (pendingComments.length > 0) {
      if (!firstStanza) lines.push("");
      lines.push(...pendingComments);
    }
    return lines.join("\n") + "\n";
  }

  // tools/ide/web/testing-surface/src/compose.ts
  function nonProseEntries(claims, ordinal) {
    const entries = [];
    claims.states.forEach((expression, index) => entries.push({
      assertion: { type: "state-assert", assertTrue: true, stateExpression: expression },
      del: { kind: "state", ordinal, index }
    }));
    claims.events.forEach((type, index) => entries.push({
      assertion: { type: "event-assert", assertTrue: true, eventType: type },
      del: { kind: "event", ordinal, index }
    }));
    claims.channels.forEach((channel, index) => entries.push({
      assertion: channel.contains !== void 0 ? { type: "channel-contains", channelId: channel.id, value: channel.contains } : { type: "channel-is", channelId: channel.id, channelExpected: channel.is },
      del: { kind: "channel", ordinal, index }
    }));
    return entries;
  }
  function turnEntries(claims, ordinal, policy2, source) {
    if (claims.exact) {
      const block = (source?.output ?? "").split("\n");
      return [
        { assertion: { type: "ok", block }, del: { kind: "exact", ordinal } },
        ...nonProseEntries(claims, ordinal)
      ];
    }
    const entries = [];
    if (claims.contains.length === 0 && !claims.noDefaults && policy2 && source) {
      const synthesized = synthesizePolicyAssertions(policy2, source.output, source.channelValues);
      const containsDefaults = synthesized.filter((a) => a.type === "ok-contains" && a.value !== void 0).map((a) => a.value);
      let containsIndex = 0;
      for (const assertion of synthesized) {
        if (assertion.type === "ok-contains" && assertion.value !== void 0) {
          entries.push({
            assertion,
            del: { kind: "default", ordinal, index: containsIndex, defaults: containsDefaults }
          });
          containsIndex += 1;
        } else {
          entries.push({ assertion, del: { kind: "defaultWhole", ordinal } });
        }
      }
    }
    claims.contains.forEach((value, index) => entries.push({
      assertion: { type: "ok-contains", value },
      del: { kind: "contains", ordinal, index }
    }));
    claims.notContains.forEach((value, index) => entries.push({
      assertion: { type: "ok-not-contains", value },
      del: { kind: "notContains", ordinal, index }
    }));
    entries.push(...nonProseEntries(claims, ordinal));
    if (entries.length === 0) return [{ assertion: { type: "skip" } }];
    return entries;
  }
  function segmentPlan(options) {
    const { model: model2, segment, policy: policy2, seed, source } = options;
    void seed;
    const title = model2.titleOf(segment);
    const parent = model2.parentOf(segment);
    const turns = [];
    for (const turn of model2.turnsForCompose(segment)) {
      const inRange = turn.ordinal >= Math.max(segment.start, 1) && !model2.isSkipped(turn.ordinal);
      turns.push({
        ordinal: turn.ordinal,
        command: turn.command,
        entries: inRange ? turnEntries(model2.claimsOf(turn.ordinal), turn.ordinal, policy2, source(turn.ordinal)) : [{ assertion: { type: "skip" } }]
      });
    }
    const opening = [];
    if (segment.start === 0) {
      const claims = model2.claimsOf(0);
      claims.contains.forEach((value, index) => opening.push({
        assertion: { type: "ok-contains", value },
        del: { kind: "contains", ordinal: 0, index }
      }));
      claims.notContains.forEach((value, index) => opening.push({
        assertion: { type: "ok-not-contains", value },
        del: { kind: "notContains", ordinal: 0, index }
      }));
      opening.push(...nonProseEntries(claims, 0));
    }
    return parent ? { title, parentTitle: model2.titleOf(parent), turns, opening } : { title, turns, opening };
  }
  function composeSegmentTranscript(options) {
    const plan = segmentPlan(options);
    const header = plan.parentTitle !== void 0 ? { title: plan.title, continues: plan.parentTitle } : { title: plan.title, seed: String(options.seed) };
    const commands = plan.turns.map((turn) => ({
      lineNumber: 0,
      input: turn.command,
      expectedOutput: [],
      assertions: turn.entries.map((entry) => entry.assertion)
    }));
    const items = commands.map((command) => ({ type: "command", command }));
    const transcript = {
      filePath: `tests/${plan.title}.transcript`,
      header,
      commands,
      items,
      comments: []
    };
    if (plan.opening.length > 0) {
      transcript.opening = plan.opening.map((entry) => entry.assertion);
    }
    return { title: plan.title, text: serializeTranscript(transcript) };
  }
  function rehydrateSegmentClaims(options, fileText) {
    const { model: model2, segment, policy: policy2, source } = options;
    const parsed = parseTranscript(fileText, "rehydrate.transcript");
    if ((parsed.parseErrors ?? []).length > 0) return "unmapped";
    const walk = model2.turnsForCompose(segment);
    if (parsed.commands.length !== walk.length) return "unmapped";
    const lift = (n, assertions) => {
      for (const assertion of assertions) {
        switch (assertion.type) {
          case "ok":
            if (assertion.block) model2.setExact(n, true);
            break;
          case "ok-contains":
            if (assertion.value !== void 0) model2.addContains(n, assertion.value);
            break;
          case "ok-not-contains":
            if (assertion.value !== void 0) model2.addNotContains(n, assertion.value);
            break;
          case "state-assert":
            if (assertion.stateExpression) model2.addState(n, assertion.stateExpression);
            break;
          case "event-assert":
            if (assertion.eventType) model2.addEvent(n, assertion.eventType);
            break;
          case "channel-contains":
            if (assertion.channelId && assertion.value !== void 0) {
              model2.addChannel(n, { id: assertion.channelId, contains: assertion.value });
            }
            break;
          case "channel-is":
            if (assertion.channelId && assertion.channelExpected !== void 0) {
              model2.addChannel(n, {
                id: assertion.channelId,
                is: assertion.channelExpected
              });
            }
            break;
          default:
            break;
        }
      }
    };
    parsed.commands.forEach((command, index) => {
      const turn = walk[index];
      const inRange = turn.ordinal >= Math.max(segment.start, 1) && !model2.isSkipped(turn.ordinal);
      if (!inRange) return;
      const onlySkip = command.assertions.every((a) => a.type === "skip");
      if (onlySkip) return;
      const src = source(turn.ordinal);
      const synthesized = policy2 && src ? synthesizePolicyAssertions(policy2, src.output, src.channelValues) : [];
      if (JSON.stringify(command.assertions) === JSON.stringify(synthesized)) return;
      lift(turn.ordinal, command.assertions);
      const claims = model2.claimsOf(turn.ordinal);
      if (!claims.exact && claims.contains.length === 0) {
        model2.removeDefault(turn.ordinal, -1, claims.contains.slice());
      }
    });
    if (segment.start === 0 && parsed.opening) {
      lift(0, parsed.opening);
    }
    return composeSegmentTranscript(options).text === fileText ? "attached" : "diverged";
  }

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
  var ROOT_LINEAGE = 1;
  var SessionModel = class {
    /** Played turns in feed order (opening included once present). */
    turnList = [];
    /** Segments in creation order; render order derives from `start`. */
    segmentList = [];
    /** Ordinals demoted to `[SKIP]` (merge gap turns, and pruned-to-nothing turns). */
    skippedSet = /* @__PURE__ */ new Set();
    /** Authored claims by ordinal (0 = the opening's claims). Absent = untouched. */
    claimsMap = /* @__PURE__ */ new Map();
    /** Logical lineages, root first, in creation order. */
    lineageList = [{ id: ROOT_LINEAGE }];
    /** The lineage that is both viewed and live (Phase 5 rule: one and the
     *  same — chip selection replays the sibling live before it shows). */
    active = ROOT_LINEAGE;
    get turns() {
      return this.turnList;
    }
    get segments() {
      return this.segmentList;
    }
    get lineages() {
      return this.lineageList;
    }
    get activeLineage() {
      return this.active;
    }
    /** True once the opening (ordinal 0) is on the board. */
    get hasOpening() {
      return this.turnList.some((t) => t.ordinal === 0);
    }
    lineageInfo(id) {
      return this.lineageList.find((l) => l.id === id);
    }
    /** The lineage a played ordinal belongs to. */
    lineageOf(n) {
      const turn = this.turnByOrdinal(n);
      return turn === void 0 ? void 0 : turn.lineage ?? ROOT_LINEAGE;
    }
    /**
     * Folds one delivered turn in. The first turn of the session also seats
     * the opening (ordinal 0): the prologue + banner rendered before the boot
     * look, the nameable beginning of a root transcript (design §2). A turn
     * landing on a lineage with a pending fork command completes the branch:
     * it becomes the branch's own closed single-turn segment (design §6 — the
     * chips read "· 1 turn"; the author extends it with ordinary gestures).
     */
    addTurn(meta) {
      const lineage = meta.lineage ?? ROOT_LINEAGE;
      if (this.turnList.length === 0 && meta.ordinal > 0) {
        this.turnList.push({ ordinal: 0, command: "", boot: false, lineage: ROOT_LINEAGE });
      }
      this.turnList.push({ ...meta, lineage });
      const info = this.lineageInfo(lineage);
      if (info?.pendingCommand !== void 0) {
        delete info.pendingCommand;
        this.segmentList.push({
          start: meta.ordinal,
          end: meta.ordinal,
          collapsed: false,
          lineage
        });
      }
    }
    /**
     * A restart fence (ADR-305 D3): everything before it is dead lineage —
     * turns, segments, skips, claims, and the whole fork tree clear. The next
     * delivered turn reseats the opening for the new root lineage.
     */
    fence() {
      this.turnList = [];
      this.segmentList = [];
      this.skippedSet.clear();
      this.claimsMap.clear();
      this.lineageList = [{ id: ROOT_LINEAGE }];
      this.active = ROOT_LINEAGE;
    }
    turnByOrdinal(n) {
      return this.turnList.find((t) => t.ordinal === n);
    }
    turnsOfLineage(id) {
      return this.turnList.filter((t) => (t.lineage ?? ROOT_LINEAGE) === id && t.ordinal > 0);
    }
    // ── lineages and visibility (design §6) ──────────────────────────────
    /** The lineage chain root → … → `id`; empty for an unknown id. */
    pathOf(id) {
      const chain = [];
      let cursor = this.lineageInfo(id);
      while (cursor) {
        chain.unshift(cursor.id);
        cursor = cursor.parentId === void 0 ? void 0 : this.lineageInfo(cursor.parentId);
      }
      return chain;
    }
    /**
     * The turns visible when `id` is active, in play order: each ancestor
     * contributes its turns up to (excluding) the fork the path leaves it at;
     * the lineage itself contributes all its turns. The opening (ordinal 0)
     * rides in front when the root is on the path.
     */
    pathTurns(id) {
      const chain = this.pathOf(id);
      if (chain.length === 0) return [];
      const visible = [];
      const openingTurn = this.turnList.find((t) => t.ordinal === 0);
      if (openingTurn) visible.push(openingTurn);
      for (let i = 0; i < chain.length; i += 1) {
        const cutAt = i + 1 < chain.length ? this.lineageInfo(chain[i + 1])?.forkAt : void 0;
        for (const turn of this.turnsOfLineage(chain[i])) {
          if (cutAt === void 0 || turn.ordinal < cutAt) visible.push(turn);
        }
      }
      return visible;
    }
    /** Whether ordinal `n` shows under the ACTIVE lineage (lineage cut —
     *  design §6: turns past a fork are sticky to the branch that played
     *  them). The opening is visible whenever it exists. */
    isTurnVisible(n) {
      if (n === 0) return this.hasOpening;
      return this.pathTurns(this.active).some((t) => t.ordinal === n);
    }
    /**
     * Forks at ordinal `n` with the typed alternate `command` (design §6):
     * validates that a CLOSED segment covers the point and something shared
     * comes before it, auto-splits so the shared prefix becomes the collapsed
     * parent, registers the branch lineage, and makes it active. The branch
     * is pending until its replayed turn lands (`addTurn` completes it).
     * Returns the new lineage id, or null when the point cannot fork.
     */
    fork(n, command) {
      const segment = this.segmentOf(n);
      if (!segment || segment.end === null) return null;
      let pointLineage = segment.lineage;
      let pointAt = n;
      for (; ; ) {
        const info = this.lineageInfo(pointLineage);
        if (info?.parentId === void 0 || info.forkAt === void 0) break;
        const firstOwn = this.turnsOfLineage(pointLineage)[0]?.ordinal;
        if (firstOwn !== pointAt) break;
        pointAt = info.forkAt;
        pointLineage = info.parentId;
      }
      if (segment.start < n) {
        const before = this.prevInLineage(segment.lineage, n);
        if (before === void 0) return null;
        const main = {
          start: n,
          end: segment.end,
          collapsed: false,
          lineage: segment.lineage
        };
        segment.end = before;
        this.segmentList.push(main);
        segment.collapsed = true;
      } else {
        const parent = this.parentOf(segment);
        if (!parent) return null;
        if (parent.end !== null) parent.collapsed = true;
      }
      const id = Math.max(...this.lineageList.map((l) => l.id)) + 1;
      this.lineageList.push({
        id,
        parentId: pointLineage,
        forkAt: pointAt,
        pendingCommand: command
      });
      this.active = id;
      return id;
    }
    /**
     * Registers a lineage without gesture side effects — the restore driver's
     * door (segment structure arrives wholesale via `restore`, so no
     * auto-split and no pending segment). Refuses duplicate ids.
     */
    registerLineage(info) {
      if (this.lineageInfo(info.id)) return false;
      this.lineageList.push({ ...info });
      return true;
    }
    /** Makes a lineage active (the caller replays it live first — Phase 5's
     *  rule that the viewed lineage IS the played lineage). */
    activateLineage(id) {
      if (!this.lineageInfo(id)) return false;
      this.active = id;
      return true;
    }
    /**
     * Deletes a branch (David's ruling, 2026-08-09): the lineage, its turns,
     * segments, claims, skips — and every descendant branch, which cannot
     * outlive the line it forked from. The root lineage never deletes. When
     * the deletion empties its fork point, the auto-split boundary merges
     * back — with Split retired as a gesture, every boundary is fork-made,
     * so the merge can never destroy deliberate structure.
     *
     * Returns what the caller must reconcile — the surviving parent, and
     * whether the VIEWED lineage died (the caller replays the parent live,
     * Phase 5's view-is-live rule) — or null when `id` cannot delete.
     */
    deleteLineage(id) {
      const info = this.lineageInfo(id);
      if (!info || info.parentId === void 0 || info.forkAt === void 0) return null;
      const doomed = /* @__PURE__ */ new Set([id]);
      for (; ; ) {
        const before = doomed.size;
        for (const lineage of this.lineageList) {
          if (lineage.parentId !== void 0 && doomed.has(lineage.parentId)) {
            doomed.add(lineage.id);
          }
        }
        if (doomed.size === before) break;
      }
      const wasActive = doomed.has(this.active);
      const doomedOrdinals = new Set(
        this.turnList.filter((t) => doomed.has(t.lineage ?? ROOT_LINEAGE)).map((t) => t.ordinal)
      );
      this.turnList = this.turnList.filter((t) => !doomed.has(t.lineage ?? ROOT_LINEAGE));
      this.segmentList = this.segmentList.filter((s) => !doomed.has(s.lineage));
      for (const ordinal of doomedOrdinals) {
        this.skippedSet.delete(ordinal);
        this.claimsMap.delete(ordinal);
      }
      this.lineageList = this.lineageList.filter((l) => !doomed.has(l.id));
      if (wasActive) this.active = info.parentId;
      const pointStillForks = this.lineageList.some((l) => l.parentId === info.parentId && l.forkAt === info.forkAt);
      if (!pointStillForks) {
        const tail = this.segmentList.find((s) => s.lineage === info.parentId && s.start === info.forkAt);
        if (tail && this.parentOf(tail)?.lineage === info.parentId) {
          this.mergeUp(tail);
        }
      }
      return { parentId: info.parentId, wasActive };
    }
    /** Every fork point, grouped by (parent lineage, ordinal), in first-use
     *  order — the cards layer renders one chip row per point. */
    branchPoints() {
      const points = [];
      for (const lineage of this.lineageList) {
        if (lineage.parentId === void 0 || lineage.forkAt === void 0) continue;
        let point = points.find((p) => p.parentId === lineage.parentId && p.at === lineage.forkAt);
        if (!point) {
          point = { parentId: lineage.parentId, at: lineage.forkAt, siblings: [] };
          points.push(point);
        }
        point.siblings.push(lineage.id);
      }
      return points;
    }
    /** The commands that reproduce the shared prefix of a fork at `n`: every
     *  non-boot command path-before `n` on the path into `n`'s lineage. */
    ancestryCommandsBefore(n) {
      const lineage = this.lineageOf(n);
      if (lineage === void 0) return [];
      return this.pathTurns(lineage).filter((t) => t.ordinal > 0 && t.ordinal < n && !t.boot).map((t) => t.command);
    }
    /** The commands that replay lineage `id` live from a fresh boot: its full
     *  path, boot looks excluded (a fresh boot plays its own). */
    pathCommandsOf(id) {
      return this.pathTurns(id).filter((t) => t.ordinal > 0 && !t.boot).map((t) => t.command);
    }
    /** The pending chip's name: route-from + the typed command (design §4 —
     *  "a pending branch uses the typed command until its replay lands"). */
    pendingTitleOf(id) {
      const info = this.lineageInfo(id);
      if (info?.pendingCommand === void 0 || info.forkAt === void 0) return void 0;
      const prev = this.prevPathTurnBefore(id, info.forkAt);
      return `${slugify(prev?.room ?? "session")}-${slugify(info.pendingCommand)}-1`;
    }
    /** The nearest path-visible turn before ordinal `n` on lineage `id`'s
     *  path (`n` itself need not belong to `id` — fork points sit in the
     *  parent). Falls back through the path when `n` heads it. */
    prevPathTurnBefore(id, n) {
      const path = this.pathTurns(id).filter((t) => t.ordinal > 0);
      let prev;
      for (const turn of path) {
        if (turn.ordinal >= n) break;
        prev = turn;
      }
      return prev ?? path[0];
    }
    /** The lineage's previous own-turn ordinal before `n`, if any. */
    prevInLineage(id, n) {
      let prev;
      for (const turn of this.turnsOfLineage(id)) {
        if (turn.ordinal >= n) break;
        prev = turn.ordinal;
      }
      return prev;
    }
    /**
     * The turns a segment's transcript walks, in path order: everything
     * strictly after its parent segment's end (or the path's beginning) up to
     * the segment's end — pre-range turns write `[SKIP]`, in-range turns
     * carry their claims (compose's iteration source; never ordinal windows,
     * which would cross lineages).
     */
    turnsForCompose(s) {
      const path = this.pathTurns(s.lineage).filter((t) => t.ordinal > 0);
      const parent = this.parentOf(s);
      const afterIndex = parent === void 0 ? -1 : path.findIndex((t) => t.ordinal === this.endOf(parent));
      const endIndex = path.findIndex((t) => t.ordinal === this.endOf(s));
      if (endIndex < 0) return [];
      return path.slice(afterIndex + 1, endIndex + 1);
    }
    // ── segments (design §3) ─────────────────────────────────────────────
    /** End used for ordering/containment: an open segment ends at its start. */
    endOf(s) {
      return s.end ?? s.start;
    }
    /** The segment covering ordinal `n`, if any — same-lineage containment
     *  only (a segment never spans lineages). */
    segmentOf(n) {
      const lineage = n === 0 ? ROOT_LINEAGE : this.lineageOf(n);
      return this.segmentList.find((s) => s.lineage === lineage && n >= s.start && n <= this.endOf(s));
    }
    /** The at-most-one open segment (global — one recording at a time). */
    openSegment() {
      return this.segmentList.find((s) => s.end === null);
    }
    /**
     * The segment `s` continues from: the nearest one whose end sits
     * path-before `s` on `s`'s own path — an ancestor-lineage segment for a
     * branch's first transcript, an earlier same-lineage one otherwise.
     */
    parentOf(s) {
      const path = this.pathTurns(s.lineage);
      const indexOf = (n) => n === 0 ? -0.5 : path.findIndex((t) => t.ordinal === n);
      const startIndex = indexOf(s.start);
      const candidates = this.segmentList.filter((x) => x !== s).map((x) => ({ segment: x, endIndex: indexOf(this.endOf(x)) })).filter((x) => x.endIndex >= 0 && x.endIndex < startIndex);
      return candidates.sort((a, b) => b.endIndex - a.endIndex)[0]?.segment;
    }
    /** True when any same-lineage segment intersects [from, to] (inclusive). */
    overlaps(lineage, from, to, ignoring) {
      return this.segmentList.some((s) => s !== ignoring && s.lineage === lineage && this.endOf(s) >= from && s.start <= to);
    }
    /**
     * Ticks the rail box on ordinal `n` (design §3): starts a segment, extends
     * the open one's start downward, or closes it — never overlapping another
     * segment, and never crossing lineages (a range is one coherent path).
     */
    tick(n) {
      if (n !== 0 && !this.turnByOrdinal(n)) return "noop";
      if (n === 0 && !this.hasOpening) return "noop";
      if (this.segmentOf(n)) return "noop";
      const lineage = n === 0 ? ROOT_LINEAGE : this.lineageOf(n) ?? ROOT_LINEAGE;
      const open = this.openSegment();
      if (!open) {
        this.segmentList.push({ start: n, end: null, collapsed: false, lineage });
        return "started";
      }
      if (open.lineage !== lineage) return "noop";
      if (n < open.start) {
        if (this.overlaps(lineage, n, open.start - 1, open)) return "noop";
        open.start = n;
        return "extended";
      }
      if (this.overlaps(lineage, open.start + 1, n, open)) return "noop";
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
     * Returns false when `s` has no parent, or the parent lives in another
     * lineage (a merged range would span lineages — refused).
     */
    mergeUp(s) {
      const parent = this.parentOf(s);
      if (!parent || parent.lineage !== s.lineage) return false;
      for (const t of this.turnsOfLineage(s.lineage)) {
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
      const before = this.prevInLineage(s.lineage, n);
      if (before === void 0 || before < s.start) return false;
      const tail = { start: n, end: s.end, collapsed: false, lineage: s.lineage };
      s.end = before;
      s.collapsed = false;
      this.segmentList.push(tail);
      return true;
    }
    /** Whether ordinal `n` rides as `[SKIP]` (merge gaps; pruned turns). */
    isSkipped(n) {
      return this.skippedSet.has(n);
    }
    /**
     * Captures the authoring state — segments, skips, claims, lineage table,
     * the active lineage — WITHOUT the played-turn list. The undo stack's
     * unit (David's ruling, 2026-08-09): gestures over what was played are
     * undoable; the played turns themselves are not, so a memento never
     * resurrects a lineage whose turns are gone (which is why fork and
     * branch-delete clear the stack instead of joining it).
     */
    captureAuthoring() {
      return {
        segments: this.segmentList.map((s) => ({ ...s })),
        skipped: new Set(this.skippedSet),
        claims: new Map([...this.claimsMap].map(([n, c]) => [n, {
          ...c,
          contains: [...c.contains],
          notContains: [...c.notContains],
          states: [...c.states],
          events: [...c.events],
          channels: c.channels.map((ch) => ({ ...ch }))
        }])),
        lineages: this.lineageList.map((l) => ({ ...l })),
        active: this.active
      };
    }
    /** Puts a captured authoring state back — the undo gesture's whole act. */
    restoreAuthoring(memento) {
      this.segmentList = memento.segments.map((s) => ({ ...s }));
      this.skippedSet = new Set(memento.skipped);
      this.claimsMap = new Map([...memento.claims].map(([n, c]) => [n, {
        ...c,
        contains: [...c.contains],
        notContains: [...c.notContains],
        states: [...c.states],
        events: [...c.events],
        channels: c.channels.map((ch) => ({ ...ch }))
      }]));
      this.lineageList = memento.lineages.map((l) => ({ ...l }));
      this.active = memento.active;
    }
    /**
     * Containment for marks: unlike `segmentOf` (where an open range covers
     * only its start, so a later tick still reads as "close here"), a mark
     * inside an open range is inside it up to the lineage's latest played
     * turn — a merge that left the range open must not shed its gap `[SKIP]`s.
     */
    coveredByAnySegment(n) {
      const lineage = n === 0 ? ROOT_LINEAGE : this.lineageOf(n);
      return this.segmentList.some((s) => {
        if (s.lineage !== lineage) return false;
        const latest = this.turnsOfLineage(s.lineage).reduce((m, t) => Math.max(m, t.ordinal), 0);
        return n >= s.start && n <= (s.end ?? latest);
      });
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
      if (n !== 0 && !this.turnByOrdinal(n)) return false;
      if (n === 0 && !this.hasOpening) return false;
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
    // ── naming (design §4) ───────────────────────────────────────────────
    /**
     * Where the player STOOD when the range began: the previous path turn's
     * room — for a branch's first transcript that is the parent lineage's
     * pre-fork room; for a range at the very beginning, the boot room.
     */
    startRoomOf(s) {
      const path = this.pathTurns(s.lineage).filter((t) => t.ordinal > 0);
      if (path.length === 0) return "session";
      if (s.start <= path[0].ordinal) return path[0].room ?? "session";
      let prev = path[0];
      for (const turn of path) {
        if (turn.ordinal >= s.start) break;
        prev = turn;
      }
      return prev.room ?? "session";
    }
    endRoomOf(s) {
      return this.turnByOrdinal(this.endOf(s))?.room ?? "session";
    }
    /** Played-turn count of the range — the lineage's own turns inside it
     *  (never ordinal arithmetic: lineage ordinals gap after forks). */
    turnCountOf(s) {
      const count = this.turnsOfLineage(s.lineage).filter((t) => t.ordinal >= s.start && t.ordinal <= this.endOf(s)).length;
      return Math.max(1, count);
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
     * an earlier segment (by start ordinal, any lineage — one `tests/`
     * namespace) already claimed the same route.
     */
    titleOf(s) {
      const base = this.baseTitleOf(s);
      const earlier = this.segmentList.filter((x) => x.start < s.start && this.baseTitleOf(x) === base).length;
      return earlier === 0 ? base : `${base}-${earlier + 1}`;
    }
    // ── persistence (ADR-306 D8) ─────────────────────────────────────────
    /** A turn's 1-based position within its own lineage (0 = the opening) —
     *  the stable key persistence and the driver use (ordinals don't survive
     *  restore-by-replay; positions do). */
    positionOf(n) {
      if (n === 0) return this.hasOpening ? { lineage: ROOT_LINEAGE, pos: 0 } : void 0;
      const lineage = this.lineageOf(n);
      if (lineage === void 0) return void 0;
      const index = this.turnsOfLineage(lineage).findIndex((t) => t.ordinal === n);
      return index < 0 ? void 0 : { lineage, pos: index + 1 };
    }
    /**
     * The persisted view state (ADR-306 D8): the fork tree with each
     * lineage's own commands (restore-by-replay's script), segment structure,
     * and skips — all position-keyed, no assertions, no transcript content.
     */
    snapshot() {
      const lineages = this.lineageList.map((info) => {
        const entry = {
          id: info.id,
          turns: this.turnsOfLineage(info.id).map((t) => ({ command: t.command, boot: t.boot }))
        };
        if (info.parentId !== void 0) entry.parentId = info.parentId;
        if (info.forkAt !== void 0) {
          const at = this.positionOf(info.forkAt);
          if (at) entry.forkAtPos = at.pos;
        }
        if (info.pendingCommand !== void 0) entry.pendingCommand = info.pendingCommand;
        return entry;
      });
      const segments = [];
      for (const s of this.segmentList) {
        const start = this.positionOf(s.start);
        if (!start) continue;
        const end = s.end === null ? null : this.positionOf(s.end)?.pos;
        if (end === void 0) continue;
        segments.push({
          lineage: s.lineage,
          startPos: start.pos,
          endPos: end,
          collapsed: s.collapsed
        });
      }
      const skipped = [];
      for (const n of [...this.skippedSet].sort((a, b) => a - b)) {
        const at = this.positionOf(n);
        if (at) skipped.push({ lineage: at.lineage, pos: at.pos });
      }
      return { lineages, active: this.active, segments, skipped };
    }
    /**
     * Re-applies a persisted snapshot after restore-by-replay re-fed the
     * turns (ADR-306 D8). `ordinalAt` maps a snapshot position back to the
     * REPLAYED session's fresh ordinal (the driver tracked them as turns
     * landed); position 0 of the root is the opening. Degraded-tolerant by
     * rule: entries that no longer fit — unknown positions, overlaps, a
     * second open range — are dropped silently, never an error. Lineage
     * registration is the driver's job (it happens before replay); this
     * applies structure only.
     */
    restore(snap, ordinalAt) {
      this.segmentList = [];
      this.skippedSet.clear();
      const resolve = (lineage, pos) => {
        if (pos === 0) return this.hasOpening ? 0 : void 0;
        const n = ordinalAt(lineage, pos);
        if (n === void 0 || !this.turnByOrdinal(n)) return void 0;
        return this.lineageOf(n) === lineage ? n : void 0;
      };
      for (const raw of snap.segments ?? []) {
        if (typeof raw?.startPos !== "number" || typeof raw?.lineage !== "number") continue;
        const start = resolve(raw.lineage, raw.startPos);
        if (start === void 0) continue;
        const end = raw.endPos === null || raw.endPos === void 0 ? null : resolve(raw.lineage, raw.endPos);
        if (raw.endPos !== null && raw.endPos !== void 0 && end === void 0) continue;
        if (end !== null && end !== void 0 && end < start) continue;
        if (end === null && this.openSegment()) continue;
        const lineage = start === 0 ? ROOT_LINEAGE : this.lineageOf(start) ?? ROOT_LINEAGE;
        if (this.overlaps(lineage, start, end ?? start)) continue;
        this.segmentList.push({
          start,
          end: end ?? null,
          collapsed: end !== null && end !== void 0 && raw.collapsed === true,
          lineage
        });
      }
      for (const raw of snap.skipped ?? []) {
        if (typeof raw?.lineage !== "number" || typeof raw?.pos !== "number") continue;
        const n = resolve(raw.lineage, raw.pos);
        if (n !== void 0 && this.coveredByAnySegment(n)) this.skippedSet.add(n);
      }
      if (typeof snap.active === "number" && this.lineageInfo(snap.active)) {
        this.active = snap.active;
      }
    }
  };

  // tools/ide/web/testing-surface/src/picker.ts
  var openPickerElement = null;
  var outsideListener = null;
  function closePicker() {
    openPickerElement?.remove();
    openPickerElement = null;
    if (outsideListener) {
      document.removeEventListener("mousedown", outsideListener);
      outsideListener = null;
    }
  }
  function mountPicker(anchor) {
    closePicker();
    const menu = document.createElement("div");
    menu.className = "ts-picker";
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 340))}px`;
    menu.style.top = `${rect.bottom + 4}px`;
    document.body.appendChild(menu);
    openPickerElement = menu;
    outsideListener = (event) => {
      if (openPickerElement && !openPickerElement.contains(event.target)) closePicker();
    };
    setTimeout(() => {
      if (outsideListener) document.addEventListener("mousedown", outsideListener);
    }, 0);
    return menu;
  }
  function showListPicker(anchor, head, items, onPick) {
    const menu = mountPicker(anchor);
    const header = document.createElement("div");
    header.className = "ts-picker-head";
    header.textContent = head;
    menu.appendChild(header);
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ts-picker-empty";
      empty.textContent = "nothing captured this turn";
      menu.appendChild(empty);
      return;
    }
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "ts-item";
      row.textContent = item;
      row.addEventListener("click", () => {
        onPick(item, index);
        closePicker();
      });
      menu.appendChild(row);
    });
  }
  function showStatePicker(anchor, facts, onPick) {
    const menu = mountPicker(anchor);
    const header = document.createElement("div");
    header.className = "ts-picker-head";
    const title = document.createElement("span");
    title.textContent = "world after this turn";
    const groupToggle = document.createElement("button");
    groupToggle.className = "ts-picker-group-toggle";
    groupToggle.textContent = "Grouped";
    header.append(title, groupToggle);
    menu.appendChild(header);
    const filter = document.createElement("input");
    filter.className = "ts-picker-filter";
    filter.placeholder = "filter\u2026";
    menu.appendChild(filter);
    const list = document.createElement("div");
    list.className = "ts-picker-list";
    menu.appendChild(list);
    let grouped = false;
    const collapsed = /* @__PURE__ */ new Set();
    const factRow = (fact) => {
      const row = document.createElement("div");
      row.className = "ts-item";
      row.textContent = fact.label;
      row.title = fact.expression;
      row.addEventListener("click", () => {
        onPick(fact);
        closePicker();
      });
      return row;
    };
    const render = () => {
      const query = filter.value.trim().toLowerCase();
      const hits = facts.filter((fact) => query === "" || fact.label.toLowerCase().includes(query) || fact.expression.toLowerCase().includes(query));
      list.textContent = "";
      if (hits.length === 0) {
        const empty = document.createElement("div");
        empty.className = "ts-picker-empty";
        empty.textContent = facts.length === 0 ? "no unseen facts this turn" : "no matches";
        list.appendChild(empty);
        return;
      }
      if (!grouped) {
        for (const fact of hits) list.appendChild(factRow(fact));
        return;
      }
      const kinds = [...new Set(hits.map((fact) => fact.kind))];
      for (const kind of kinds) {
        const sectionHead = document.createElement("div");
        sectionHead.className = "ts-picker-section";
        const folded = query === "" && collapsed.has(kind);
        sectionHead.textContent = `${folded ? "\u25B8" : "\u25BE"} ${kind}`;
        sectionHead.addEventListener("click", () => {
          if (collapsed.has(kind)) collapsed.delete(kind);
          else collapsed.add(kind);
          render();
        });
        list.appendChild(sectionHead);
        if (folded) continue;
        for (const fact of hits.filter((f) => f.kind === kind)) {
          list.appendChild(factRow(fact));
        }
      }
    };
    groupToggle.addEventListener("click", () => {
      grouped = !grouped;
      groupToggle.classList.toggle("ts-active", grouped);
      render();
    });
    filter.addEventListener("input", render);
    render();
    filter.focus();
  }

  // packages/ide-protocol/src/run-events.ts
  var RUN_EVENT_SCHEMA_VERSION = 2;
  function isObject(v) {
    return typeof v === "object" && v !== null;
  }
  function isStringArray(v) {
    return Array.isArray(v) && v.every((entry) => typeof entry === "string");
  }
  function hasEnvelopeAndType(v, type) {
    return v.schemaVersion === RUN_EVENT_SCHEMA_VERSION && v.type === type && typeof v.seq === "number" && typeof v.elapsedMs === "number";
  }
  function isRunStartEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "run-start") && (value.mode === "tests" || value.mode === "chain" || value.mode === "tree" || value.mode === "explore") && (value.transcriptCount === void 0 || typeof value.transcriptCount === "number");
  }
  function isPhaseEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "phase") && (value.name === "compile" || value.name === "load" || value.name === "assemble" || value.name === "execute") && (value.status === "started" || value.status === "finished") && (value.detail === void 0 || typeof value.detail === "string");
  }
  function isTranscriptStartEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "transcript-start") && typeof value.file === "string" && typeof value.index === "number" && (value.commandCount === void 0 || typeof value.commandCount === "number") && (value.parent === void 0 || typeof value.parent === "string") && (value.replayed === void 0 || typeof value.replayed === "boolean") && (value.world === void 0 || isWorldSnapshot(value.world));
  }
  function isCommandResultEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "command-result") && typeof value.file === "string" && typeof value.line === "number" && typeof value.input === "string" && typeof value.passed === "boolean" && typeof value.expectedFailure === "boolean" && typeof value.skipped === "boolean" && (value.error === void 0 || typeof value.error === "string") && (value.actualOutput === void 0 || typeof value.actualOutput === "string") && (value.turn === void 0 || typeof value.turn === "number") && (value.ending === void 0 || value.ending === "victory" || value.ending === "defeat" || value.ending === "quit") && (value.failure === void 0 || typeof value.failure === "string") && (value.world === void 0 || isWorldSnapshot(value.world));
  }
  function isWorldEntityRef(value) {
    if (!isObject(value)) return false;
    return typeof value.name === "string" && typeof value.token === "string";
  }
  function isWorldSnapshot(value) {
    if (!isObject(value)) return false;
    return (value.location === void 0 || isWorldEntityRef(value.location)) && Array.isArray(value.inventory) && value.inventory.every(isWorldEntityRef);
  }
  function isTranscriptEndEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "transcript-end") && typeof value.file === "string" && (value.status === "passed" || value.status === "failed" || value.status === "error" || value.status === "unreached" || value.status === "skipped") && typeof value.passed === "number" && typeof value.failed === "number" && typeof value.expectedFailures === "number" && typeof value.skipped === "number" && typeof value.duration === "number" && (value.errorMessage === void 0 || typeof value.errorMessage === "string") && (value.blockedBy === void 0 || typeof value.blockedBy === "string");
  }
  function isBudgetUse(value) {
    if (!isObject(value)) return false;
    return (value.unit === "states" || value.unit === "seconds" || value.unit === "depth" || value.unit === "commands") && typeof value.spent === "number" && typeof value.limit === "number";
  }
  function isProgressEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "progress") && (value.scope === "commands" || value.scope === "transcripts" || value.scope === "nodes" || value.scope === "states") && typeof value.done === "number" && (value.total === void 0 || typeof value.total === "number") && (value.budgets === void 0 || Array.isArray(value.budgets) && value.budgets.every(isBudgetUse));
  }
  function isCoveragePoint(value) {
    if (!isObject(value)) return false;
    return typeof value.name === "string" && typeof value.fired === "number" && (value.classes === void 0 || isStringArray(value.classes)) && (value.observed === void 0 || isStringArray(value.observed)) && (value.unobserved === void 0 || isStringArray(value.unobserved));
  }
  function isCoverageEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "coverage") && Array.isArray(value.points) && value.points.every(isCoveragePoint) && typeof value.pointsFired === "number" && typeof value.pointsNeverFired === "number" && typeof value.classesUnobserved === "number";
  }
  function isRunEndEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "run-end") && typeof value.totalPassed === "number" && typeof value.totalFailed === "number" && typeof value.totalExpectedFailures === "number" && typeof value.totalSkipped === "number" && typeof value.totalErrors === "number" && typeof value.totalUnreached === "number" && typeof value.totalDuration === "number" && typeof value.exitCode === "number";
  }
  function isRunEvent(value) {
    return isRunStartEvent(value) || isPhaseEvent(value) || isTranscriptStartEvent(value) || isCommandResultEvent(value) || isTranscriptEndEvent(value) || isProgressEvent(value) || isCoverageEvent(value) || isRunEndEvent(value);
  }

  // tools/ide/web/testing-surface/src/run.ts
  function createRunState() {
    return { inFlight: false, results: /* @__PURE__ */ new Map(), replaying: /* @__PURE__ */ new Set() };
  }
  function beginRun(state) {
    state.inFlight = true;
    state.results.clear();
    state.replaying.clear();
    delete state.tally;
    delete state.note;
  }
  function stemOf(file) {
    const base = file.split("/").at(-1) ?? file;
    return base.replace(/\.transcript$/, "");
  }
  function foldRunLine(state, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (!isRunEvent(parsed)) return;
    fold(state, parsed);
  }
  function fold(state, event) {
    switch (event.type) {
      case "transcript-start": {
        if (event.replayed === true) state.replaying.add(event.file);
        else state.replaying.delete(event.file);
        return;
      }
      case "command-result": {
        if (event.passed || event.skipped || state.replaying.has(event.file)) return;
        const stem = stemOf(event.file);
        const existing = state.results.get(stem);
        if (existing?.firstFailure !== void 0) {
          existing.moreFailures += 1;
          return;
        }
        const message = event.failure ?? event.error ?? "failed";
        const where = event.turn !== void 0 ? `turn ${event.turn}` : `line ${event.line}`;
        state.results.set(stem, {
          status: "failed",
          passed: 0,
          failed: 1,
          firstFailure: `${where} \u2014 ${message}`,
          moreFailures: existing?.moreFailures ?? 0
        });
        return;
      }
      case "transcript-end": {
        if (state.replaying.has(event.file)) {
          state.replaying.delete(event.file);
          return;
        }
        const stem = stemOf(event.file);
        const partial = state.results.get(stem);
        const result = {
          status: event.status,
          passed: event.passed,
          failed: event.failed,
          moreFailures: Math.max(0, event.failed - 1)
        };
        if (partial?.firstFailure !== void 0) result.firstFailure = partial.firstFailure;
        else if (event.status === "error" && event.errorMessage !== void 0) {
          result.firstFailure = event.errorMessage;
        } else if (event.status === "unreached") {
          result.firstFailure = event.blockedBy !== void 0 ? `blocked by ${stemOf(event.blockedBy)}` : "blocked by an ancestor";
        }
        state.results.set(stem, result);
        return;
      }
      case "run-end": {
        state.inFlight = false;
        state.tally = {
          passed: event.totalPassed,
          failed: event.totalFailed,
          errors: event.totalErrors,
          unreached: event.totalUnreached
        };
        return;
      }
      default:
        return;
    }
  }
  function resetRun(state) {
    state.inFlight = false;
    state.results.clear();
    state.replaying.clear();
    delete state.tally;
    delete state.note;
  }
  function finishRun(state, ok, note) {
    state.inFlight = false;
    if (!ok && state.tally === void 0) {
      state.note = note ?? "The run ended without completing its stream.";
    }
  }

  // tools/ide/web/testing-surface/src/main.ts
  var model = new SessionModel();
  var activeSegment = null;
  var records = /* @__PURE__ */ new Map();
  var policy;
  var currentLogical = 1;
  var ordinalByPos = /* @__PURE__ */ new Map();
  var dialogOutcomes = /* @__PURE__ */ new Map();
  var dropBeforeFence = false;
  var expectDriverFence = false;
  var suppressDelivery = false;
  var replayActive = false;
  var driverBusy = false;
  var armedOutcomeKey = null;
  function turnSource(ordinal) {
    const record = records.get(ordinal);
    if (!record || typeof record.output !== "string") return void 0;
    const channelValues = {};
    for (const capture of record.captures ?? []) {
      channelValues[capture.channel] = [...channelValues[capture.channel] ?? [], ...capture.values];
    }
    return { output: record.output, channelValues };
  }
  var undoStack = [];
  var UNDO_DEPTH = 100;
  function pushUndo() {
    undoStack.push(model.captureAuthoring());
    if (undoStack.length > UNDO_DEPTH) undoStack.shift();
  }
  function clearUndo() {
    undoStack.length = 0;
  }
  function performUndo() {
    if (driverBusy || replayActive) return;
    const memento = undoStack.pop();
    if (!memento) return;
    model.restoreAuthoring(memento);
    if (activeSegment && !model.segments.includes(activeSegment)) {
      activeSegment = model.openSegment() ?? null;
    }
    update();
  }
  var cards = new CardsView(model, {
    onTick(ordinal, checked) {
      pushUndo();
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
      pushUndo();
      model.setCollapsed(segment, true);
      update();
    },
    onExpand(segment) {
      pushUndo();
      model.setCollapsed(segment, false);
      activeSegment = segment;
      update();
    },
    onDeleteLineage(lineage) {
      void performDeleteLineage(lineage);
    },
    onActivate(segment) {
      activeSegment = segment;
    },
    onAddContains(ordinal, text) {
      pushUndo();
      touchSegmentAt(ordinal);
      if (model.addContains(ordinal, text)) {
        activeSegment = model.segmentOf(ordinal) ?? activeSegment;
        update();
      }
    },
    onNotContains(ordinal, text) {
      pushUndo();
      touchSegmentAt(ordinal);
      if (model.addNotContains(ordinal, text)) {
        activeSegment = model.segmentOf(ordinal) ?? activeSegment;
        update();
      }
    },
    onToggleExact(ordinal) {
      pushUndo();
      touchSegmentAt(ordinal);
      if (model.setExact(ordinal, !model.claimsOf(ordinal).exact)) {
        activeSegment = model.segmentOf(ordinal) ?? activeSegment;
        update();
      }
    },
    onStatePicker(ordinal, anchor) {
      const entities = records.get(ordinal)?.world?.entities ?? [];
      const facts = entities.map((entity) => ({
        label: `${entity.name} \u2014 ${entity.location.name}`,
        expression: `${entity.token}.location = ${entity.location.token}`,
        kind: entity.kind === "npc" ? "NPC locations" : "item locations"
      }));
      showStatePicker(anchor, facts, (fact) => {
        pushUndo();
        touchSegmentAt(ordinal);
        if (model.addState(ordinal, fact.expression)) {
          activeSegment = model.segmentOf(ordinal) ?? activeSegment;
          update();
        }
      });
    },
    onEventPicker(ordinal, anchor) {
      const events = records.get(ordinal)?.events ?? [];
      showListPicker(anchor, "events this turn emitted", events, (event) => {
        pushUndo();
        touchSegmentAt(ordinal);
        if (model.addEvent(ordinal, event)) {
          activeSegment = model.segmentOf(ordinal) ?? activeSegment;
          update();
        }
      });
    },
    onChannelPicker(ordinal, anchor) {
      const captures = records.get(ordinal)?.captures ?? [];
      const labels = captures.map((capture) => {
        const flat = proseTextLinesOf(capture.values).join(" ");
        const scalar = capture.values.length === 1 && typeof capture.values[0] !== "object" ? String(capture.values[0]) : null;
        return `${capture.channel} \u2014 ${scalar ?? `"${flat.slice(0, 40)}"`}`;
      });
      showListPicker(anchor, "channels this turn captured", labels, (_label, index) => {
        const capture = captures[index];
        if (!capture) return;
        const scalarValue = capture.values.length === 1 && (typeof capture.values[0] === "number" || typeof capture.values[0] === "boolean") ? capture.values[0] : null;
        const flat = proseTextLinesOf(capture.values).join(" ");
        const claim = scalarValue !== null ? { id: capture.channel, is: scalarValue } : { id: capture.channel, contains: flat.slice(0, 60) };
        pushUndo();
        touchSegmentAt(ordinal);
        if (model.addChannel(ordinal, claim)) {
          activeSegment = model.segmentOf(ordinal) ?? activeSegment;
          update();
        }
      });
    },
    onBranch(ordinal, command) {
      void performBranch(ordinal, command);
    },
    onSelectLineage(lineage) {
      void selectLineage(lineage);
    },
    onRun() {
      if (runState.inFlight || driverBusy || replayActive) return;
      beginRun(runState);
      cards.render();
      postToBridge({ run: true });
    },
    runColumn: () => runState
  });
  var runState = createRunState();
  function deliverRunLine(text) {
    foldRunLine(runState, text);
    cards.render();
  }
  function deliverRunExit(ok, note) {
    finishRun(runState, ok, note);
    cards.render();
  }
  function update() {
    if (activeSegment && !model.segments.includes(activeSegment)) {
      activeSegment = null;
    }
    if (!driverBusy) {
      const suiteChanged = syncWrites();
      if (suiteChanged && !runState.inFlight) resetRun(runState);
      cards.render();
      postState();
    } else {
      cards.render();
    }
  }
  var written = /* @__PURE__ */ new Map();
  var detached = /* @__PURE__ */ new Set();
  function touchSegmentAt(ordinal) {
    const segment = model.segmentOf(ordinal);
    if (segment) detached.delete(segment);
  }
  function postToBridge(payload) {
    try {
      window.webkit?.messageHandlers?.testingSurface?.postMessage(JSON.stringify(payload));
    } catch {
    }
  }
  function syncWrites() {
    let changed = false;
    for (const [segment, last] of [...written]) {
      if (!model.segments.includes(segment)) {
        written.delete(segment);
        postToBridge({ remove: { name: last.name } });
        changed = true;
      }
    }
    for (const segment of [...detached]) {
      if (!model.segments.includes(segment)) detached.delete(segment);
    }
    for (const segment of model.segments) {
      if (detached.has(segment)) continue;
      if (segment.end === null) {
        const last2 = written.get(segment);
        if (last2) {
          written.delete(segment);
          postToBridge({ remove: { name: last2.name } });
          changed = true;
        }
        continue;
      }
      const { title, text } = composeSegmentTranscript({
        model,
        segment,
        policy,
        seed: 42,
        source: turnSource
      });
      const last = written.get(segment);
      if (last && last.name === title && last.text === text) continue;
      const payload = { write: { name: title, text } };
      if (last && last.name !== title) {
        payload.write.previousName = last.name;
      }
      written.set(segment, { name: title, text });
      postToBridge(payload);
      changed = true;
    }
    return changed;
  }
  function postState() {
    const stems = {};
    for (const [segment, last] of written) {
      const at = model.positionOf(segment.start);
      if (at) stems[`${segment.lineage}:${segment.start === 0 ? 0 : at.pos}`] = last.name;
    }
    const composite = {
      model: model.snapshot(),
      stems,
      dialogs: [...dialogOutcomes]
    };
    postToBridge({ state: composite });
  }
  var pendingDialogOutcome = null;
  function installDialogHooks() {
    const saveDialog = document.getElementById("save-dialog");
    const restoreDialog = document.getElementById("restore-dialog");
    const startupDialog = document.getElementById("startup-dialog");
    saveDialog?.addEventListener("close", () => {
      if (replayActive) return;
      const name = document.getElementById("save-name-input")?.value;
      pendingDialogOutcome = saveDialog.returnValue === "confirm" && name ? { type: "save", slot: name } : { type: "save", slot: null };
    });
    restoreDialog?.addEventListener("close", () => {
      if (replayActive) return;
      const selected = document.querySelector(
        "#restore-slots-list .save-slot.selected"
      );
      pendingDialogOutcome = restoreDialog.returnValue === "confirm" ? { type: "restore", slot: selected?.dataset.slotName ?? null } : { type: "restore", slot: null };
    });
    const observe = (dialog, drive) => {
      if (!dialog) return;
      new MutationObserver(() => {
        if (dialog.open && replayActive) setTimeout(drive, 0);
      }).observe(dialog, { attributes: true, attributeFilter: ["open"] });
    };
    observe(saveDialog, () => {
      const outcome = armedOutcomeKey ? dialogOutcomes.get(armedOutcomeKey) : void 0;
      const input = document.getElementById("save-name-input");
      if (outcome?.type === "save" && outcome.slot !== null && input) {
        input.value = outcome.slot;
        document.getElementById("save-confirm-btn")?.click();
      } else {
        document.getElementById("save-cancel-btn")?.click();
      }
    });
    observe(restoreDialog, () => {
      const outcome = armedOutcomeKey ? dialogOutcomes.get(armedOutcomeKey) : void 0;
      const slot = outcome?.type === "restore" && outcome.slot !== null ? document.querySelector(
        `#restore-slots-list .save-slot[data-slot-name="${CSS.escape(outcome.slot)}"]`
      ) : null;
      if (slot) {
        slot.click();
        document.getElementById("restore-confirm-btn")?.click();
      } else {
        document.getElementById("restore-cancel-btn")?.click();
      }
    });
    observe(startupDialog, () => {
      document.getElementById("startup-new-btn")?.click();
    });
  }
  var expectBoot = true;
  var nextTurnWaiters = [];
  var fenceWaiters = [];
  function roomOf(record) {
    const capture = (record.captures ?? []).filter((c) => c.channel === "room-name").at(-1);
    return proseTextLinesOf(capture?.values).at(-1);
  }
  function deliver(raw) {
    const record = raw;
    if (!record || typeof record.turn !== "number") return;
    if (record.restart === true) {
      dropBeforeFence = false;
      if (expectDriverFence) {
        expectDriverFence = false;
        expectBoot = true;
        const waiters2 = fenceWaiters;
        fenceWaiters = [];
        for (const resolve of waiters2) resolve();
        return;
      }
      cards.clear();
      clearUndo();
      model.fence();
      records.clear();
      written.clear();
      detached.clear();
      dialogOutcomes.clear();
      ordinalByPos.clear();
      currentLogical = 1;
      activeSegment = null;
      expectBoot = true;
      pendingDialogOutcome = null;
      update();
      return;
    }
    if (dropBeforeFence) return;
    const boot = expectBoot;
    expectBoot = false;
    if (suppressDelivery) {
      const waiters2 = nextTurnWaiters;
      nextTurnWaiters = [];
      for (const resolve of waiters2) resolve();
      return;
    }
    cards.ensureLayout();
    records.set(record.turn, record);
    const room = roomOf(record);
    model.addTurn({
      ordinal: record.turn,
      command: record.command ?? "",
      ...room !== void 0 ? { room } : {},
      boot,
      lineage: currentLogical
    });
    const at = model.positionOf(record.turn);
    if (at) ordinalByPos.set(`${at.lineage}:${at.pos}`, record.turn);
    if (pendingDialogOutcome && at) {
      dialogOutcomes.set(`${at.lineage}:${at.pos}`, pendingDialogOutcome);
      pendingDialogOutcome = null;
    }
    cards.addTurnCard(record.turn, boot, currentLogical !== 1);
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
  var awaitFence = (timeoutMs) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    fenceWaiters.push(() => {
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
  function setInputHeld(held, placeholder = "") {
    const input = document.getElementById("command-input");
    if (!input) return;
    input.disabled = held;
    input.placeholder = placeholder;
    if (!held) input.focus();
  }
  async function driveFreshBoot(logical, replay, live) {
    const wasBusy = driverBusy;
    driverBusy = true;
    replayActive = true;
    setInputHeld(true, "replaying\u2026");
    try {
      localStorage.clear();
      dropBeforeFence = true;
      expectDriverFence = true;
      postToBridge({ forkBoot: true });
      typeCommand("restart");
      if (!await awaitFence(15e3)) return false;
      suppressDelivery = true;
      if (!await awaitNextTurn(15e3)) return false;
      for (const step of replay) {
        armedOutcomeKey = step.key;
        typeCommand(step.command);
        const landed = await awaitNextTurn(15e3);
        armedOutcomeKey = null;
        if (!landed) return false;
      }
      suppressDelivery = false;
      currentLogical = logical;
      for (const step of live) {
        armedOutcomeKey = step.key;
        typeCommand(step.command);
        const landed = await awaitNextTurn(15e3);
        armedOutcomeKey = null;
        if (!landed) return false;
      }
      return true;
    } finally {
      dropBeforeFence = false;
      expectDriverFence = false;
      suppressDelivery = false;
      armedOutcomeKey = null;
      replayActive = false;
      driverBusy = wasBusy;
      setInputHeld(driverBusy, driverBusy ? "restoring session\u2026" : "");
      update();
    }
  }
  function ancestryStepsBefore(n) {
    const lineage = model.lineageOf(n);
    if (lineage === void 0) return [];
    return model.pathTurns(lineage).filter((t) => t.ordinal > 0 && t.ordinal < n && !t.boot).map((t) => {
      const at = model.positionOf(t.ordinal);
      return { command: t.command, key: at ? `${at.lineage}:${at.pos}` : "" };
    });
  }
  async function performBranch(ordinal, command) {
    if (replayActive) return;
    clearUndo();
    const ancestry = ancestryStepsBefore(ordinal);
    const id = model.fork(ordinal, command);
    if (id === null) return;
    update();
    await driveFreshBoot(id, ancestry, [{ command, key: "" }]);
  }
  async function selectLineage(lineage) {
    if (replayActive || lineage === model.activeLineage) return;
    clearUndo();
    if (!model.activateLineage(lineage)) return;
    const path = model.pathTurns(lineage).filter((t) => t.ordinal > 0 && !t.boot).map((t) => {
      const at = model.positionOf(t.ordinal);
      return { command: t.command, key: at ? `${at.lineage}:${at.pos}` : "" };
    });
    update();
    await driveFreshBoot(lineage, path, []);
  }
  async function performDeleteLineage(lineage) {
    if (replayActive || driverBusy) return;
    const result = model.deleteLineage(lineage);
    if (result === null) return;
    clearUndo();
    if (activeSegment && !model.segments.includes(activeSegment)) {
      activeSegment = model.openSegment() ?? null;
    }
    update();
    if (result.wasActive) {
      const path = model.pathTurns(result.parentId).filter((t) => t.ordinal > 0 && !t.boot).map((t) => {
        const at = model.positionOf(t.ordinal);
        return { command: t.command, key: at ? `${at.lineage}:${at.pos}` : "" };
      });
      await driveFreshBoot(result.parentId, path, []);
    }
  }
  function snapshotAncestrySteps(snap, lineageId, uptoPos) {
    const byId = new Map(snap.lineages.map((l) => [l.id, l]));
    const chain = [];
    let cursor = byId.get(lineageId);
    let cut = uptoPos;
    while (cursor) {
      chain.unshift({ id: cursor.id, cutPos: cut });
      cut = cursor.forkAtPos;
      cursor = cursor.parentId === void 0 ? void 0 : byId.get(cursor.parentId);
    }
    const steps = [];
    for (const { id, cutPos } of chain) {
      const lineage = byId.get(id);
      if (!lineage) continue;
      lineage.turns.forEach((turn, index) => {
        const pos = index + 1;
        if (cutPos !== void 0 && pos >= cutPos) return;
        if (turn.boot) return;
        steps.push({ command: turn.command, key: `${id}:${pos}` });
      });
    }
    return steps;
  }
  function isComposite(value) {
    return typeof value === "object" && value !== null && "model" in value && Array.isArray(value.model?.lineages);
  }
  async function restoreComposite(composite, files) {
    const snap = composite.model;
    dialogOutcomes = new Map(composite.dialogs ?? []);
    driverBusy = true;
    replayActive = true;
    setInputHeld(true, "restoring session\u2026");
    try {
      if (model.turns.length === 0) await awaitNextTurn(15e3);
      const root = snap.lineages.find((l) => l.id === 1);
      let intact = true;
      for (const [index, turn] of (root?.turns ?? []).entries()) {
        if (turn.boot) continue;
        armedOutcomeKey = `1:${index + 1}`;
        typeCommand(turn.command);
        const landed = await awaitNextTurn(15e3);
        armedOutcomeKey = null;
        if (!landed) {
          intact = false;
          break;
        }
      }
      replayActive = false;
      if (intact) {
        const branches = snap.lineages.filter((l) => l.id !== 1 && l.parentId !== void 0).sort((a, b) => a.id - b.id);
        for (const lineage of branches) {
          const forkOrdinal = lineage.forkAtPos !== void 0 && lineage.parentId !== void 0 ? ordinalByPos.get(`${lineage.parentId}:${lineage.forkAtPos}`) : void 0;
          model.registerLineage({
            id: lineage.id,
            ...lineage.parentId !== void 0 ? { parentId: lineage.parentId } : {},
            ...forkOrdinal !== void 0 ? { forkAt: forkOrdinal } : {},
            ...lineage.pendingCommand !== void 0 ? { pendingCommand: lineage.pendingCommand } : {}
          });
          if (lineage.turns.length === 0) continue;
          const ancestry = snapshotAncestrySteps(snap, lineage.parentId, lineage.forkAtPos);
          const live = lineage.turns.map((turn, index) => ({
            command: turn.command,
            key: `${lineage.id}:${index + 1}`
          }));
          if (!await driveFreshBoot(lineage.id, ancestry, live)) break;
        }
        if (typeof snap.active === "number" && snap.active !== currentLogical && model.activateLineage(snap.active)) {
          const path = snapshotAncestrySteps(snap, snap.active, void 0);
          await driveFreshBoot(snap.active, path, []);
        }
      }
      model.restore(snap, (lineage, pos) => ordinalByPos.get(`${lineage}:${pos}`));
      activeSegment = model.openSegment() ?? model.segments[model.segments.length - 1] ?? null;
      for (const [key, stem] of Object.entries(composite.stems ?? {})) {
        const [lineageText, posText] = key.split(":");
        const start = Number(posText) === 0 ? model.hasOpening ? 0 : void 0 : ordinalByPos.get(`${Number(lineageText)}:${Number(posText)}`);
        if (start === void 0) continue;
        const segment = model.segmentOf(start);
        if (!segment || segment.start !== start || segment.end === null) continue;
        const fileText = files[stem];
        if (typeof fileText !== "string") continue;
        const result = rehydrateSegmentClaims({
          model,
          segment,
          policy,
          seed: 42,
          source: turnSource
        }, fileText);
        if (result === "attached") {
          written.set(segment, { name: stem, text: fileText });
        } else {
          detached.add(segment);
        }
      }
    } finally {
      replayActive = false;
      driverBusy = false;
      armedOutcomeKey = null;
      setInputHeld(false);
      update();
    }
  }
  async function restoreLinear(session) {
    const commands = session.replay ?? [];
    if (commands.length > 0) {
      replayActive = true;
      setInputHeld(true, "restoring session\u2026");
      if (model.turns.length === 0) await awaitNextTurn(15e3);
      for (const command of commands) {
        typeCommand(command);
        if (!await awaitNextTurn(15e3)) break;
      }
      replayActive = false;
      setInputHeld(false);
    }
    update();
  }
  var surfaceWindow = window;
  var queued = surfaceWindow.__sharpeeTestingSurface?.q ?? [];
  surfaceWindow.__sharpeeTestingSurface = {
    deliver,
    runLine: deliverRunLine,
    runExit: deliverRunExit
  };
  cards.ensureLayout();
  installDialogHooks();
  document.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key !== "z" || event.shiftKey) return;
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    event.preventDefault();
    performUndo();
  });
  for (const record of queued) deliver(record);
  var bootSession = surfaceWindow.__SHARPEE_TESTING_SESSION__;
  policy = bootSession?.policy;
  if (bootSession) {
    if (isComposite(bootSession.snapshot)) {
      void restoreComposite(bootSession.snapshot, bootSession.files ?? {});
    } else if ((bootSession.replay?.length ?? 0) > 0) {
      void restoreLinear(bootSession);
    }
  }
})();
