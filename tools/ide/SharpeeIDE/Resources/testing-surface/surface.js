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
  function synthesizeOpeningAssertions(policy2, bootChannelValues) {
    if (policy2 === void 0 || bootChannelValues === void 0) return [];
    const assertions = [];
    const prologueLines = proseTextLinesOf(bootChannelValues["prologue"]);
    if (prologueLines.length > 0) {
      assertions.push({
        type: "channel-contains",
        channelId: "prologue",
        value: prologueLines[0]
      });
    }
    const info = bootChannelValues["info"]?.[0];
    if (info !== null && typeof info === "object" && !Array.isArray(info)) {
      const payload = info;
      if (typeof payload.title === "string" && payload.title.length > 0) {
        assertions.push({
          type: "channel-is",
          channelId: "info",
          channelPath: ["title"],
          channelExpected: payload.title
        });
      }
      if (typeof payload.description === "string" && payload.description.length > 0) {
        assertions.push({
          type: "channel-is",
          channelId: "info",
          channelPath: ["description"],
          channelExpected: payload.description
        });
      }
    }
    return assertions;
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

  // packages/branch-tester/src/tree-document.ts
  var TREE_DOCUMENT_VERSION = 1;
  function emptyTreeDocument(story, seed2) {
    return { version: TREE_DOCUMENT_VERSION, story, seed: seed2, cards: [] };
  }
  function serializeTreeDocument(document2) {
    return `${JSON.stringify(sortKeysDeep(document2), null, 2)}
`;
  }
  function deserializeTreeDocument(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      return {
        status: "malformed",
        message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    if (!isPlainObject(parsed)) {
      return { status: "malformed", message: "the document is not a JSON object" };
    }
    const version = parsed["version"];
    if (typeof version !== "number" || !Number.isInteger(version)) {
      return { status: "malformed", message: `'version' must be an integer` };
    }
    if (version > TREE_DOCUMENT_VERSION) {
      return {
        status: "refused",
        message: `this document is version ${version}; this build reads up to version ${TREE_DOCUMENT_VERSION} \u2014 update Sharpee to open it`
      };
    }
    if (version < TREE_DOCUMENT_VERSION) {
      return { status: "malformed", message: `unknown document version ${version}` };
    }
    const problem = validateDocumentShape(parsed);
    if (problem !== void 0) return { status: "malformed", message: problem };
    return { status: "ok", document: parsed };
  }
  function roomSlugOf(name) {
    if (name === void 0) return void 0;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug.length > 0 ? slug : void 0;
  }
  function mainLineLabelOf(roomSlug) {
    return `opening-${roomSlug ?? "start"}`;
  }
  function branchLineLabelOf(roomSlug, branchId, firstCommand) {
    return `${roomSlug ?? `branch-${branchId}`} \xB7 ${firstCommand ?? "(empty)"}`;
  }
  function sortKeysDeep(value) {
    if (Array.isArray(value)) return value.map(sortKeysDeep);
    if (isPlainObject(value)) {
      const sorted = {};
      for (const key of Object.keys(value).sort()) {
        sorted[key] = sortKeysDeep(value[key]);
      }
      return sorted;
    }
    return value;
  }
  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function validateDocumentShape(document2) {
    const unknownKey = firstUnknownKey(document2, ["version", "story", "seed", "cards"]);
    if (unknownKey !== void 0) return `unknown key '${unknownKey}' at the top level`;
    if (typeof document2["story"] !== "string" || document2["story"] === "") {
      return `'story' must be a non-empty string`;
    }
    if (typeof document2["seed"] !== "number" || !Number.isInteger(document2["seed"])) {
      return `'seed' must be an integer`;
    }
    return validateCards(document2["cards"], "cards");
  }
  function validateCards(value, path) {
    if (!Array.isArray(value)) return `'${path}' must be an array`;
    for (let index = 0; index < value.length; index++) {
      const problem = validateCard(value[index], `${path}[${index}]`);
      if (problem !== void 0) return problem;
    }
    return void 0;
  }
  function validateCard(value, path) {
    if (!isPlainObject(value)) return `'${path}' must be an object`;
    const unknownKey = firstUnknownKey(value, ["type", "command", "assertions", "skip", "branches"]);
    if (unknownKey !== void 0) return `unknown key '${unknownKey}' in '${path}'`;
    const type = value["type"];
    if (type !== "opening" && type !== "boot" && type !== "turn") {
      return `'${path}.type' must be 'opening', 'boot', or 'turn'`;
    }
    if (type === "turn") {
      if (typeof value["command"] !== "string" || value["command"] === "") {
        return `'${path}' is a turn and must carry a non-empty 'command'`;
      }
    } else if (value["command"] !== void 0) {
      return `'${path}' is type '${type}' and must not carry a 'command'`;
    }
    if (value["skip"] !== void 0 && typeof value["skip"] !== "boolean") {
      return `'${path}.skip' must be a boolean`;
    }
    if (value["assertions"] !== void 0) {
      const problem = validateAssertions(value["assertions"], `${path}.assertions`);
      if (problem !== void 0) return problem;
    }
    if (value["branches"] !== void 0) {
      const branches = value["branches"];
      if (!Array.isArray(branches)) return `'${path}.branches' must be an array`;
      const seenIds = /* @__PURE__ */ new Set();
      for (let index = 0; index < branches.length; index++) {
        const problem = validateBranch(branches[index], `${path}.branches[${index}]`, seenIds);
        if (problem !== void 0) return problem;
      }
    }
    return void 0;
  }
  function validateBranch(value, path, seenIds) {
    if (!isPlainObject(value)) return `'${path}' must be an object`;
    const unknownKey = firstUnknownKey(value, ["branch", "cards"]);
    if (unknownKey !== void 0) return `unknown key '${unknownKey}' in '${path}'`;
    const id = value["branch"];
    if (typeof id !== "number" || !Number.isInteger(id)) {
      return `'${path}.branch' must be an integer id`;
    }
    if (seenIds.has(id)) return `'${path}.branch' duplicates sibling id ${id}`;
    seenIds.add(id);
    return validateCards(value["cards"], `${path}.cards`);
  }
  function validateAssertions(value, path) {
    if (!isPlainObject(value)) return `'${path}' must be an object`;
    const unknownKey = firstUnknownKey(value, [
      "contains",
      "notContains",
      "exact",
      "states",
      "events",
      "channels",
      "noDefaults"
    ]);
    if (unknownKey !== void 0) return `unknown assertion family '${unknownKey}' in '${path}'`;
    for (const family of ["contains", "notContains", "exact", "states", "events"]) {
      const entries = value[family];
      if (entries === void 0) continue;
      if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string")) {
        return `'${path}.${family}' must be an array of strings`;
      }
    }
    if (value["noDefaults"] !== void 0 && typeof value["noDefaults"] !== "boolean") {
      return `'${path}.noDefaults' must be a boolean`;
    }
    const channels = value["channels"];
    if (channels !== void 0) {
      if (!Array.isArray(channels)) return `'${path}.channels' must be an array`;
      for (let index = 0; index < channels.length; index++) {
        const problem = validateChannelAssertion(channels[index], `${path}.channels[${index}]`);
        if (problem !== void 0) return problem;
      }
    }
    return void 0;
  }
  function validateChannelAssertion(value, path) {
    if (!isPlainObject(value)) return `'${path}' must be an object`;
    const unknownKey = firstUnknownKey(value, ["id", "contains", "is"]);
    if (unknownKey !== void 0) return `unknown key '${unknownKey}' in '${path}'`;
    if (typeof value["id"] !== "string" || value["id"] === "") {
      return `'${path}.id' must be a non-empty channel id`;
    }
    const hasContains = value["contains"] !== void 0;
    const hasIs = value["is"] !== void 0;
    if (hasContains === hasIs) {
      return `'${path}' must carry exactly one of 'contains' or 'is'`;
    }
    if (hasContains) {
      const entries = value["contains"];
      if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string")) {
        return `'${path}.contains' must be an array of strings`;
      }
    }
    if (hasIs && typeof value["is"] !== "string") {
      return `'${path}.is' must be a string`;
    }
    return void 0;
  }
  function firstUnknownKey(value, allowed) {
    return Object.keys(value).find((key) => !allowed.includes(key));
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
    /** One chip row per fork-point card, keyed by the card's bound ordinal. */
    branchRows = /* @__PURE__ */ new Map();
    host;
    session;
    notice = null;
    /**
     * Takes the page over once: hides the client's window (its prose pane
     * keeps receiving turns as staging), builds the cards and run columns, and
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
                  title="Run the story's test tree at the pinned seed">Run</button>
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
    /** A one-line notice above the cards (the refused-document message, AC-4).
     *  Pass undefined to clear. */
    setNotice(text) {
      if (text === void 0) {
        this.notice?.remove();
        this.notice = null;
        return;
      }
      if (!this.notice) {
        this.notice = document.createElement("div");
        this.notice.className = "ts-notice";
        this.host.before(this.notice);
      }
      this.notice.textContent = text;
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
    /** Contains-by-selection (ADR-301's default gesture): select prose in a
     *  card and a floating Add contains button appears. */
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
     * the opening card (ordinal 0 — prologue + banner).
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
      const gutter = document.createElement("div");
      gutter.className = "ts-pick";
      const column = document.createElement("div");
      column.className = "ts-card-column";
      const block = document.createElement("div");
      block.className = "ts-block";
      const meta = document.createElement("div");
      meta.className = "ts-meta";
      meta.textContent = ordinal === 0 ? "opening" : `turn ${ordinal}${boot ? " \xB7 boot" : ""}${branch ? " \xB7 branch" : ""}`;
      if (this.model.cardAt(ordinal)?.type === "turn") {
        const cut = document.createElement("button");
        cut.className = "ts-card-delete";
        cut.textContent = "\u2715";
        cut.title = "Delete this turn and everything after it \u2014 branches too";
        cut.addEventListener("click", (event) => {
          event.stopPropagation();
          if (cut.classList.contains("ts-armed")) {
            this.delegate.onTailCut(ordinal);
          } else {
            cut.classList.add("ts-armed");
            cut.textContent = "delete?";
            setTimeout(() => {
              cut.classList.remove("ts-armed");
              cut.textContent = "\u2715";
            }, 2500);
          }
        });
        meta.appendChild(cut);
      }
      const proseHost = document.createElement("div");
      proseHost.className = "ts-prose";
      for (const el of prose) proseHost.appendChild(el);
      const asserts = document.createElement("div");
      asserts.className = "ts-asserts";
      asserts.style.display = "none";
      block.append(meta, proseHost, asserts);
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
        exactButton.title = "This turn asserts its whole output \u2014 the literal block";
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
        branchButton.title = "Try a different command from this point \u2014 what follows becomes a sibling branch";
        branchButton.style.display = "none";
        branchButton.addEventListener("click", () => promptText(
          "alternate command, e.g. east",
          (command) => this.delegate.onBranch(ordinal, command)
        ));
        actions.appendChild(branchButton);
      }
      block.appendChild(actions);
      column.append(block);
      row.append(gutter, column);
      this.host.appendChild(row);
      this.cards.set(ordinal, { row, asserts, exactButton, branchButton });
    }
    /** Re-fills one card's assertion list from the delegate's composed lines.
     *  Literal block lines (Exact's whole-turn text) render dimmed and are
     *  never deletable line-by-line — the exact tag deletes the block whole. */
    renderAssertions(card, ordinal) {
      const lines = this.delegate.assertionLines(ordinal);
      card.asserts.innerHTML = "";
      card.asserts.style.display = lines.length === 0 ? "none" : "";
      for (const line of lines) {
        const row = document.createElement("div");
        row.className = `ts-assert-line ts-assert-${line.kind}`;
        const text = document.createElement("span");
        text.className = "ts-assert-text";
        text.textContent = line.text;
        row.appendChild(text);
        if (line.del) {
          const del = line.del;
          const remove = document.createElement("button");
          remove.className = "ts-assert-delete";
          remove.textContent = "\u2715";
          remove.title = "Delete this assertion";
          remove.addEventListener("click", () => this.delegate.onRemoveAssertion(del));
          row.appendChild(remove);
        }
        card.asserts.appendChild(row);
      }
    }
    /** Dead session (restart replay): every card and chip row goes. */
    clear() {
      for (const { row } of this.cards.values()) row.remove();
      for (const row of this.branchRows.values()) row.remove();
      this.cards.clear();
      this.branchRows.clear();
    }
    /**
     * Re-derives every card's visuals from the model: rows for ordinals that
     * left the model go; the active path orders and shows the rest (a card
     * past a fork shows only while the branch that played it is viewed); chip
     * rows render per fork point on the path; the run column folds.
     */
    render() {
      for (const [ordinal, card] of [...this.cards]) {
        if (this.model.cardAt(ordinal) === void 0) {
          card.row.remove();
          this.cards.delete(ordinal);
        }
      }
      const pathOrdinals = this.model.visibleOrdinals();
      const points = this.model.branchPointsOnPath();
      for (const ordinal of pathOrdinals) {
        const card = this.cards.get(ordinal);
        if (!card) continue;
        this.host.appendChild(card.row);
        const chipRow = this.branchRows.get(ordinal);
        if (chipRow && points.some((p) => p.ordinal === ordinal)) {
          this.host.appendChild(chipRow);
        }
      }
      const visible = new Set(pathOrdinals);
      for (const [ordinal, card] of this.cards) {
        card.row.style.display = visible.has(ordinal) ? "" : "none";
        if (card.branchButton) {
          card.branchButton.style.display = this.model.canBranch(ordinal) ? "" : "none";
        }
        card.exactButton?.classList.toggle(
          "ts-active",
          this.model.claimsOf(ordinal)?.exact !== void 0
        );
        this.renderAssertions(card, ordinal);
      }
      this.renderBranchRows(points);
      this.renderRunColumn();
    }
    /**
     * One chip row per fork point on the active path (D5): the fork card's own
     * continuation first (the main chip), then each sibling branch in creation
     * order — "all continue from this card".
     */
    renderBranchRows(points) {
      const liveOrdinals = new Set(points.map((p) => p.ordinal));
      for (const [ordinal, row] of this.branchRows) {
        if (!liveOrdinals.has(ordinal)) {
          row.remove();
          this.branchRows.delete(ordinal);
        }
      }
      for (const point of points) {
        let row = this.branchRows.get(point.ordinal);
        if (!row) {
          row = document.createElement("div");
          row.className = "ts-turn ts-branch-point";
          row.innerHTML = '<div class="ts-pick"></div><div class="ts-card-column"><div class="ts-branch-row"></div></div>';
          const anchor = this.cards.get(point.ordinal)?.row.nextSibling ?? null;
          this.host.insertBefore(row, anchor);
          this.branchRows.set(point.ordinal, row);
        }
        this.renderChips(row, point);
      }
    }
    /** The line ids on the active path, root line first. */
    activeChain() {
      const chain = [];
      let cursor = this.model.activeLine;
      while (cursor !== void 0) {
        chain.unshift(cursor);
        cursor = this.model.lineParentOf(cursor);
      }
      return chain;
    }
    renderChips(row, point) {
      const container = row.querySelector(".ts-branch-row");
      container.innerHTML = "";
      const chain = this.activeChain();
      const selectedSibling = point.siblings.find((id) => chain.includes(id));
      const forkCommand = this.model.cardAt(point.ordinal)?.command ?? "";
      const mainCount = this.model.ownCommandsOf(point.lineId).length;
      const mainChip = document.createElement("div");
      mainChip.className = "ts-branch-chip" + (selectedSibling === void 0 ? " ts-chip-selected" : "");
      mainChip.innerHTML = `<div class="ts-meta">branch</div>
       <div class="ts-chip-title">${escapeHtml(this.model.labelOf(point.lineId))}</div>
       <div class="ts-chip-span">&gt; ${escapeHtml(forkCommand)} \xB7 ${mainCount} ${mainCount === 1 ? "turn" : "turns"}</div>`;
      mainChip.addEventListener("click", () => this.delegate.onSelectLine(point.lineId));
      container.appendChild(mainChip);
      for (const sibling of point.siblings) {
        const pending = this.model.isPending(sibling);
        const count = this.model.ownCommandsOf(sibling).length;
        const firstCommand = this.model.ownCommandsOf(sibling)[0] ?? this.model.labelOf(sibling).split(" \xB7 ").at(-1) ?? "";
        const span = pending ? `&gt; ${escapeHtml(firstCommand)} \xB7 replay pending` : `&gt; ${escapeHtml(firstCommand)} \xB7 ${count} ${count === 1 ? "turn" : "turns"}`;
        const chip = document.createElement("div");
        chip.className = "ts-branch-chip" + (selectedSibling === sibling ? " ts-chip-selected" : "");
        chip.innerHTML = `<div class="ts-meta">branch</div>
         <div class="ts-chip-title">${escapeHtml(this.model.labelOf(sibling))}</div>
         <div class="ts-chip-span">${span}</div>`;
        chip.addEventListener("click", () => this.delegate.onSelectLine(sibling));
        const remove = document.createElement("button");
        remove.className = "ts-chip-delete";
        remove.textContent = "\u2715";
        remove.title = "Delete this branch \u2014 its turns (and any branches forked from it) go too";
        remove.addEventListener("click", (event) => {
          event.stopPropagation();
          if (remove.classList.contains("ts-armed")) {
            this.delegate.onDeleteBranch(sibling);
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
      row.title = "all continue from this card";
    }
    /** The run column: one row per line of the tree — derived labels are the
     *  identities on the wire (D2/Q-8) — with PASS/FAIL, the first failure on
     *  one line, and a tally. A pending branch shows a dash. */
    renderRunColumn() {
      const results = document.getElementById("ts-run-results");
      if (!results) return;
      const run = this.delegate.runColumn();
      const button = document.getElementById("ts-run-btn");
      if (button) {
        button.disabled = run.inFlight;
        button.textContent = run.inFlight ? "Running\u2026" : "Run";
      }
      const lineIds = this.model.lineIds().filter((id) => id === 0 ? this.model.hasOpening : true);
      results.innerHTML = "";
      if (!this.model.hasOpening && run.results.size === 0) {
        results.innerHTML = '<span class="ts-pending-note">no tests yet</span>';
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
      for (const [label, result] of run.results) {
        switch (result.status) {
          case "passed":
            row("PASS", "ts-pass", label, `${result.passed} turn${result.passed === 1 ? "" : "s"}`);
            break;
          case "skipped":
            row("\u2014", "", label, "no commands \u2014 ran as a skip");
            break;
          case "unreached":
            row("\u2014", "", label, result.firstFailure ?? "blocked by an ancestor");
            break;
          default: {
            const more = result.moreFailures > 0 ? ` +${result.moreFailures} more` : "";
            row("FAIL", "ts-fail", label, `${result.firstFailure ?? "failed"}${more}`);
          }
        }
      }
      for (const id of lineIds) {
        const label = this.model.labelOf(id);
        if (run.results.has(label)) continue;
        const why = this.model.isPending(id) ? "pending branch" : run.inFlight ? "running\u2026" : "not run yet";
        row("\u2014", "", label, why);
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

  // tools/ide/web/testing-surface/src/compose.ts
  var quoted = (text) => `"${text}"`;
  function channelLineText(claim) {
    if (claim.is !== void 0) return `channel ${claim.id} is ${quoted(claim.is)}`;
    const fragments = (claim.contains ?? []).map(quoted).join(", ");
    return `channel ${claim.id} contains ${fragments}`;
  }
  function openingDefaultClaims(policy2, bootCaptures2) {
    return synthesizeOpeningAssertions(policy2, bootCaptures2).map((assertion) => {
      const id = (assertion.channelPath?.length ?? 0) > 0 ? `${assertion.channelId}.${assertion.channelPath.join(".")}` : assertion.channelId;
      return assertion.type === "channel-contains" ? { id, contains: [assertion.value] } : { id, is: String(assertion.channelExpected) };
    });
  }
  function turnContainsDefaults(policy2, source) {
    if (policy2 === void 0 || source === void 0) return [];
    return synthesizePolicyAssertions(policy2, source.output, source.channelValues).filter((a) => a.type === "ok-contains" && a.value !== void 0).map((a) => a.value);
  }
  function nonProseLines(ordinal, claims) {
    const lines = [];
    (claims.states ?? []).forEach(
      (expression, index) => lines.push({
        text: `state ${expression}`,
        kind: "assertion",
        del: { kind: "state", ordinal, index }
      })
    );
    (claims.events ?? []).forEach(
      (type, index) => lines.push({
        text: `event ${type}`,
        kind: "assertion",
        del: { kind: "event", ordinal, index }
      })
    );
    (claims.channels ?? []).forEach(
      (claim, index) => lines.push({
        text: channelLineText(claim),
        kind: "assertion",
        del: { kind: "channel", ordinal, index }
      })
    );
    return lines;
  }
  function defaultLines(ordinal, synthesized) {
    const containsDefaults = synthesized.filter((a) => a.type === "ok-contains" && a.value !== void 0).map((a) => a.value);
    const lines = [];
    let containsIndex = 0;
    for (const assertion of synthesized) {
      if (assertion.type === "skip") {
        lines.push({ text: "[SKIP]", kind: "skip" });
      } else if (assertion.type === "ok-contains" && assertion.value !== void 0) {
        lines.push({
          text: `contains ${quoted(assertion.value)}`,
          kind: "assertion",
          del: { kind: "default", ordinal, index: containsIndex, defaults: containsDefaults }
        });
        containsIndex += 1;
      } else if (assertion.type === "ok-contains" && assertion.block !== void 0) {
        lines.push({
          text: `contains (${assertion.block.length} lines)`,
          kind: "assertion",
          del: { kind: "defaultWhole", ordinal }
        });
        lines.push(...assertion.block.map((text) => ({ text, kind: "block" })));
      } else if (assertion.type === "ok" && assertion.block !== void 0) {
        lines.push({
          text: `exact output (${assertion.block.length} lines)`,
          kind: "assertion",
          del: { kind: "defaultWhole", ordinal }
        });
        lines.push(...assertion.block.map((text) => ({ text, kind: "block" })));
      }
    }
    return lines;
  }
  function cardAssertionLines(options, ordinal) {
    const { model: model2, policy: policy2, source, bootCaptures: bootCaptures2 } = options;
    const card = model2.cardAt(ordinal);
    if (card === void 0) return [];
    if (model2.claimsNothing(ordinal)) return [{ text: "[SKIP]", kind: "skip" }];
    const claims = card.assertions;
    const lines = [];
    if (claims?.exact !== void 0) {
      lines.push({
        text: `exact output (${claims.exact.length} lines)`,
        kind: "assertion",
        del: { kind: "exact", ordinal }
      });
      lines.push(...claims.exact.map((text) => ({ text, kind: "block" })));
      lines.push(...nonProseLines(ordinal, claims));
      return lines;
    }
    const hasAuthoredProse = (claims?.contains?.length ?? 0) > 0;
    const authorsAnything = hasAuthoredProse || (claims?.notContains?.length ?? 0) > 0 || (claims?.states?.length ?? 0) > 0 || (claims?.events?.length ?? 0) > 0 || (claims?.channels?.length ?? 0) > 0;
    if (!hasAuthoredProse && claims?.noDefaults !== true && policy2 !== void 0) {
      if (ordinal === 0) {
        if ((claims?.channels?.length ?? 0) === 0) {
          const defaults = openingDefaultClaims(policy2, bootCaptures2);
          defaults.forEach(
            (claim, index) => lines.push({
              text: channelLineText(claim),
              kind: "assertion",
              del: { kind: "openingDefault", index, defaults }
            })
          );
        }
      } else {
        const src = source(ordinal);
        if (src !== void 0) {
          const synthesized = synthesizePolicyAssertions(policy2, src.output, src.channelValues);
          const meaningful = synthesized.filter((a) => a.type !== "skip");
          if (meaningful.length > 0 || !authorsAnything) {
            lines.push(...defaultLines(ordinal, meaningful.length > 0 ? meaningful : synthesized));
          }
        }
      }
    }
    (claims?.contains ?? []).forEach(
      (value, index) => lines.push({
        text: `contains ${quoted(value)}`,
        kind: "assertion",
        del: { kind: "contains", ordinal, index }
      })
    );
    (claims?.notContains ?? []).forEach(
      (value, index) => lines.push({
        text: `not contains ${quoted(value)}`,
        kind: "assertion",
        del: { kind: "notContains", ordinal, index }
      })
    );
    if (claims !== void 0) lines.push(...nonProseLines(ordinal, claims));
    return lines;
  }

  // tools/ide/web/testing-surface/src/model.ts
  var MAIN_LINE = 0;
  function cloneAssertions(assertions) {
    if (assertions === void 0) return void 0;
    const copy = {};
    if (assertions.contains) copy.contains = [...assertions.contains];
    if (assertions.notContains) copy.notContains = [...assertions.notContains];
    if (assertions.exact) copy.exact = [...assertions.exact];
    if (assertions.states) copy.states = [...assertions.states];
    if (assertions.events) copy.events = [...assertions.events];
    if (assertions.channels) copy.channels = assertions.channels.map((c) => ({ ...c }));
    if (assertions.noDefaults !== void 0) copy.noDefaults = assertions.noDefaults;
    return copy;
  }
  var TreeSessionModel = class {
    /** The truth: the live document this session reads and writes. */
    doc;
    // ── session-only indexes (never persisted) ─────────────────────────────
    cardByOrdinal = /* @__PURE__ */ new Map();
    ordinalByCard = /* @__PURE__ */ new Map();
    roomByOrdinal = /* @__PURE__ */ new Map();
    /** Line id → the cards array it owns (MAIN_LINE → `doc.cards`). */
    lineCards = /* @__PURE__ */ new Map();
    /** Branch line id → where it forks from. Absent for the main line. */
    lineMeta = /* @__PURE__ */ new Map();
    /** A just-forked line's typed command, until its replayed turn lands. */
    pending = /* @__PURE__ */ new Map();
    /** Restore-by-replay: the next unbound card index per line. */
    bindCursor = /* @__PURE__ */ new Map();
    active = MAIN_LINE;
    constructor(story, seed2) {
      this.doc = emptyTreeDocument(story, seed2);
      this.lineCards.set(MAIN_LINE, this.doc.cards);
      this.bindCursor.set(MAIN_LINE, 0);
    }
    /** The live document — read-only by convention; mutate through the model. */
    get document() {
      return this.doc;
    }
    /** The document's canonical bytes (the shared serializer, AC-1). */
    serialize() {
      return serializeTreeDocument(this.doc);
    }
    /**
     * Adopt a deserialized document as this session's tree (reopen). Every
     * line's bind cursor starts at 0 — the restore driver replays the
     * document's own commands and delivered turns bind to the existing cards.
     * Branch ids colliding across sibling sets (hand-edited documents; the tab
     * always allocates globally unique ids) are reassigned.
     */
    load(document2) {
      this.doc = document2;
      this.cardByOrdinal.clear();
      this.ordinalByCard.clear();
      this.roomByOrdinal.clear();
      this.lineCards.clear();
      this.lineMeta.clear();
      this.pending.clear();
      this.bindCursor.clear();
      this.active = MAIN_LINE;
      let nextId = 0;
      const collectMax = (cards2) => {
        for (const card of cards2) {
          for (const branch of card.branches ?? []) {
            nextId = Math.max(nextId, branch.branch);
            collectMax(branch.cards);
          }
        }
      };
      collectMax(this.doc.cards);
      const seen = /* @__PURE__ */ new Set();
      const dedupe = (cards2) => {
        for (const card of cards2) {
          for (const branch of card.branches ?? []) {
            if (seen.has(branch.branch)) {
              nextId += 1;
              branch.branch = nextId;
            }
            seen.add(branch.branch);
            dedupe(branch.cards);
          }
        }
      };
      dedupe(this.doc.cards);
      this.rebuildLineRegistry();
    }
    /**
     * Re-derive the line registry from the document: every branch's cards
     * array registered under its id, each line's bind cursor at its first
     * UNBOUND card (bindings are card-keyed and survive structural edits).
     * Lines that left the document lose their pending marks; a dead active
     * line falls back to the main line.
     */
    rebuildLineRegistry() {
      this.lineCards.clear();
      this.lineMeta.clear();
      this.bindCursor.clear();
      const cursorOf = (cards2) => {
        let index = 0;
        while (index < cards2.length && this.ordinalByCard.has(cards2[index])) index += 1;
        return index;
      };
      this.lineCards.set(MAIN_LINE, this.doc.cards);
      this.bindCursor.set(MAIN_LINE, cursorOf(this.doc.cards));
      const register = (cards2, lineId) => {
        for (const card of cards2) {
          for (const branch of card.branches ?? []) {
            this.lineCards.set(branch.branch, branch.cards);
            this.lineMeta.set(branch.branch, { parentLine: lineId, forkCard: card, branch });
            this.bindCursor.set(branch.branch, cursorOf(branch.cards));
            register(branch.cards, branch.branch);
          }
        }
      };
      register(this.doc.cards, MAIN_LINE);
      for (const id of [...this.pending.keys()]) {
        if (!this.lineCards.has(id)) this.pending.delete(id);
      }
      if (!this.lineCards.has(this.active)) this.active = MAIN_LINE;
    }
    /** Start over with a fresh empty tree (the degrade target, AC-4). */
    reset(story, seed2) {
      this.load(emptyTreeDocument(story, seed2));
    }
    /**
     * Unbind every card and rewind every line's cursor — the whole-path replay
     * that re-derives the board after a structural repair or an author restart
     * (D4: the session IS a replay of the tree).
     */
    beginRebindAll() {
      this.cardByOrdinal.clear();
      this.ordinalByCard.clear();
      for (const id of this.lineCards.keys()) this.bindCursor.set(id, 0);
    }
    /** True once the opening card is bound (ordinal 0 is on the board). */
    get hasOpening() {
      return this.cardByOrdinal.has(0);
    }
    /** Every line id, main first, then branches in registration order. */
    lineIds() {
      return [...this.lineCards.keys()];
    }
    get activeLine() {
      return this.active;
    }
    activateLine(id) {
      if (!this.lineCards.has(id)) return false;
      this.active = id;
      return true;
    }
    /** The line a branch forks from, or undefined for the main line. */
    lineParentOf(id) {
      return this.lineMeta.get(id)?.parentLine;
    }
    cardAt(ordinal) {
      return this.cardByOrdinal.get(ordinal);
    }
    ordinalOf(card) {
      return this.ordinalByCard.get(card);
    }
    roomOf(ordinal) {
      return this.roomByOrdinal.get(ordinal);
    }
    /**
     * Folds one delivered turn into the ACTIVE line: binds it to the line's
     * next unbound card when one exists (restore/repair replay), else appends
     * a new card (always recording, D3). The session's first record on the
     * main line also seats the opening card (bound as ordinal 0). A branch
     * line's first landed turn clears its pending command.
     */
    addTurn(delivery) {
      const cards2 = this.lineCards.get(this.active);
      if (cards2 === void 0) return;
      if (delivery.room !== void 0) this.roomByOrdinal.set(delivery.ordinal, delivery.room);
      this.pending.delete(this.active);
      const bind = (card2, ordinal) => {
        this.cardByOrdinal.set(ordinal, card2);
        this.ordinalByCard.set(card2, ordinal);
      };
      let cursor = this.bindCursor.get(this.active) ?? cards2.length;
      if (this.active === MAIN_LINE && !this.hasOpening) {
        if (cursor < cards2.length && cards2[cursor].type === "opening") {
          bind(cards2[cursor], 0);
          cursor += 1;
        } else if (cursor >= cards2.length) {
          const opening = { type: "opening" };
          cards2.push(opening);
          bind(opening, 0);
          cursor = cards2.length;
        }
      }
      if (cursor < cards2.length) {
        bind(cards2[cursor], delivery.ordinal);
        this.bindCursor.set(this.active, cursor + 1);
        return;
      }
      const card = delivery.boot ? { type: "boot" } : { type: "turn", command: delivery.command };
      cards2.push(card);
      bind(card, delivery.ordinal);
      this.bindCursor.set(this.active, cards2.length);
    }
    // ── the active path (visibility, replay scripts, labels) ───────────────
    /** The branch chain root → … → `id`. Each hop carries the fork card IN
     *  ITS PARENT'S cards where the hop's line forks — so `chain[hop + 1]`'s
     *  fork card is where hop `hop`'s cards cut. */
    chainOf(id) {
      const chain = [];
      let lineId = id;
      for (; ; ) {
        const meta = this.lineMeta.get(lineId);
        chain.unshift({ lineId, ...meta !== void 0 ? { forkCard: meta.forkCard } : {} });
        if (meta === void 0) break;
        lineId = meta.parentLine;
      }
      return chain;
    }
    /**
     * The cards visible when `id` is the viewed line, in play order: each
     * ancestor line contributes its cards up to AND INCLUDING the fork card
     * the path leaves it at; the line itself contributes all its cards.
     */
    pathCardsOf(id) {
      const chain = this.chainOf(id);
      if (this.lineCards.get(id) === void 0) return [];
      const path = [];
      for (let hop = 0; hop < chain.length; hop += 1) {
        const cards2 = this.lineCards.get(chain[hop].lineId) ?? [];
        const cutCard = chain[hop + 1]?.forkCard;
        for (const card of cards2) {
          path.push(card);
          if (cutCard !== void 0 && card === cutCard) break;
        }
      }
      return path;
    }
    /** The commands that replay `id`'s full path live from a fresh boot —
     *  opening and boot cards excluded (a fresh boot plays its own look). */
    pathCommands(cards2) {
      return cards2.filter((card) => card.type === "turn").map((card) => card.command).filter((command) => command !== void 0);
    }
    /** The replay prefix of line `id`: every typed command from the root
     *  through its fork card. Empty for the main line. */
    prefixCommandsOf(id) {
      const meta = this.lineMeta.get(id);
      if (meta === void 0) return [];
      const parentPath = this.pathCardsOf(meta.parentLine);
      const forkIndex = parentPath.indexOf(meta.forkCard);
      return this.pathCommands(forkIndex < 0 ? parentPath : parentPath.slice(0, forkIndex + 1));
    }
    /** The line's own typed commands, in card order. */
    ownCommandsOf(id) {
      return this.pathCommands(this.lineCards.get(id) ?? []);
    }
    /** All typed commands on the line's full path (prefix + own). */
    fullPathCommandsOf(id) {
      return this.pathCommands(this.pathCardsOf(id));
    }
    /**
     * Every typed command on the line's full path with its OWNING line and
     * turn index — replay steps with stable keys for session ephemera (a
     * recorded dialog outcome re-applies wherever its command replays).
     */
    pathStepsOf(id) {
      const chain = this.chainOf(id);
      const steps = [];
      for (let hop = 0; hop < chain.length; hop += 1) {
        const lineId = chain[hop].lineId;
        const cards2 = this.lineCards.get(lineId) ?? [];
        const cutCard = chain[hop + 1]?.forkCard;
        let index = 0;
        for (const card of cards2) {
          if (card.type === "turn" && card.command !== void 0) {
            steps.push({ command: card.command, lineId, index });
            index += 1;
          }
          if (cutCard !== void 0 && card === cutCard) break;
        }
      }
      return steps;
    }
    /** Whether the card bound to `ordinal` shows under the active line. */
    isTurnVisible(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      if (card === void 0) return false;
      return this.pathCardsOf(this.active).includes(card);
    }
    /** The active path's bound ordinals, in play order — the render order. */
    visibleOrdinals() {
      const ordinals = [];
      for (const card of this.pathCardsOf(this.active)) {
        const ordinal = this.ordinalByCard.get(card);
        if (ordinal !== void 0) ordinals.push(ordinal);
      }
      return ordinals;
    }
    // ── derived labels (D2/Q-8 — shared formatting, never persisted) ───────
    /** The player's room AT `card` on line `lineId`'s path: the last recorded
     *  room up to and including the card (sparse channels — a turn that moved
     *  nowhere recorded no room; the position's room is the last one seen). */
    roomAtCard(lineId, at) {
      let room;
      for (const card of this.pathCardsOf(lineId)) {
        const ordinal = this.ordinalByCard.get(card);
        if (ordinal !== void 0) {
          room = this.roomByOrdinal.get(ordinal) ?? room;
        }
        if (card === at) break;
      }
      return room;
    }
    /**
     * The line's derived display label: the main line from the room the game
     * opens in, a branch from the room at its fork card and its first typed
     * command (falling back to the pending fork command until the replay
     * lands).
     */
    labelOf(id) {
      const meta = this.lineMeta.get(id);
      if (meta === void 0) {
        const bootCard = this.doc.cards.find((card) => card.type !== "opening");
        const room2 = bootCard !== void 0 ? this.roomAtCard(MAIN_LINE, bootCard) : void 0;
        return mainLineLabelOf(roomSlugOf(room2));
      }
      const room = this.roomAtCard(meta.parentLine, meta.forkCard);
      const firstCommand = (this.lineCards.get(id) ?? []).find((card) => card.type === "turn")?.command ?? this.pending.get(id);
      return branchLineLabelOf(roomSlugOf(room), id, firstCommand);
    }
    /** Lines with no landed turn yet (just forked — chip shows, run row dashes). */
    isPending(id) {
      return this.pending.has(id) && (this.lineCards.get(id) ?? []).length === 0;
    }
    /** The bound card's position among its line's TURN cards — the stable key
     *  session ephemera (dialog outcomes) use; ordinals do not survive
     *  restore-by-replay, positions do. */
    turnIndexOf(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      if (card === void 0 || card.type !== "turn") return void 0;
      for (const [lineId, cards2] of this.lineCards) {
        const turns = cards2.filter((c) => c.type === "turn");
        const index = turns.indexOf(card);
        if (index >= 0) return { lineId, index };
      }
      return void 0;
    }
    // ── branching (D5 — mechanically unchanged, recorded as structure) ─────
    /** Every fork point the active path descends through, in path order. */
    branchPointsOnPath() {
      const points = [];
      const chain = this.chainOf(this.active);
      for (let hop = 0; hop < chain.length; hop += 1) {
        const lineId = chain[hop].lineId;
        const cards2 = this.lineCards.get(lineId) ?? [];
        const cutCard = chain[hop + 1]?.forkCard;
        for (const card of cards2) {
          const ordinal = this.ordinalByCard.get(card);
          if (ordinal !== void 0 && (card.branches?.length ?? 0) > 0) {
            points.push({
              ordinal,
              lineId,
              siblings: (card.branches ?? []).map((branch) => branch.branch)
            });
          }
          if (cutCard !== void 0 && card === cutCard) break;
        }
      }
      return points;
    }
    /**
     * Whether a Branch gesture is offered on this card: it must be bound, on
     * the active path, not the opening (the boot look is automatic — an
     * alternate to it is meaningless), and not the path's tip (typing already
     * continues the recording there).
     */
    canBranch(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      if (card === void 0 || card.type === "opening") return false;
      const path = this.pathCardsOf(this.active);
      const index = path.indexOf(card);
      return index >= 0 && index < path.length - 1;
    }
    /**
     * Forks on the card at `ordinal` with the typed alternate (D2: the fork
     * lives ON the card branched from; the alternative's own cards follow as
     * the author plays them). The new line becomes active and is pending until
     * its replayed turn lands. Returns the new line id, or null when the card
     * cannot fork ({@link canBranch}).
     */
    branch(ordinal, command) {
      if (!this.canBranch(ordinal)) return null;
      const card = this.cardByOrdinal.get(ordinal);
      let owner = MAIN_LINE;
      for (const { lineId } of this.chainOf(this.active)) {
        if ((this.lineCards.get(lineId) ?? []).includes(card)) owner = lineId;
      }
      const id = Math.max(0, ...this.lineCards.keys(), ...this.lineMeta.keys()) + 1;
      const branch = { branch: id, cards: [] };
      (card.branches ??= []).push(branch);
      this.lineCards.set(id, branch.cards);
      this.lineMeta.set(id, { parentLine: owner, forkCard: card, branch });
      this.bindCursor.set(id, 0);
      this.pending.set(id, command);
      this.active = id;
      return id;
    }
    /** Every line inside `id`'s subtree, `id` included. */
    subtreeLines(id) {
      const doomed = /* @__PURE__ */ new Set([id]);
      for (; ; ) {
        const before = doomed.size;
        for (const [lineId, meta] of this.lineMeta) {
          if (doomed.has(meta.parentLine)) doomed.add(lineId);
        }
        if (doomed.size === before) break;
      }
      return doomed;
    }
    /** Drop the session bindings of `card` and everything under it (its
     *  branches' cards recursively included). */
    unbindSubtree(card) {
      const ordinal = this.ordinalByCard.get(card);
      if (ordinal !== void 0) {
        this.cardByOrdinal.delete(ordinal);
        this.roomByOrdinal.delete(ordinal);
      }
      this.ordinalByCard.delete(card);
      for (const branch of card.branches ?? []) {
        for (const nested of branch.cards) this.unbindSubtree(nested);
      }
    }
    /**
     * Deletes a branch whole (the chip's ✕): the branch entry leaves its fork
     * card, and every nested line goes with it. Returns the surviving parent
     * line and whether the VIEWED line died (the caller replays the parent
     * live) — or null for the main line, which never deletes.
     */
    deleteBranch(id) {
      const meta = this.lineMeta.get(id);
      if (meta === void 0) return null;
      const wasActive = this.subtreeLines(id).has(this.active);
      const parentLine = meta.parentLine;
      for (const card of meta.branch.cards) this.unbindSubtree(card);
      const siblings = (meta.forkCard.branches ?? []).filter((branch) => branch !== meta.branch);
      if (siblings.length > 0) meta.forkCard.branches = siblings;
      else delete meta.forkCard.branches;
      this.rebuildLineRegistry();
      if (wasActive) this.active = parentLine;
      return { parentLine, wasActive };
    }
    /**
     * Tail-cut (D4/Q-4, the card's ✕): discard the card at `ordinal` and
     * everything after it on its own line — descendants and their branches
     * included. Only a bound TURN card cuts (the opening and the boot look are
     * the session's fabric, not authored turns). Returns the cut line and
     * whether the viewed line survived — the caller replays the line to
     * realign the engine (the session IS a replay of the tree) — or null when
     * the card cannot cut.
     */
    tailCut(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      if (card === void 0 || card.type !== "turn") return null;
      let lineId;
      for (const [id, cards3] of this.lineCards) {
        if (cards3.includes(card)) {
          lineId = id;
          break;
        }
      }
      if (lineId === void 0) return null;
      const cards2 = this.lineCards.get(lineId);
      const index = cards2.indexOf(card);
      const activeBefore = this.active;
      const removed = cards2.splice(index);
      for (const gone of removed) this.unbindSubtree(gone);
      this.rebuildLineRegistry();
      const activeSurvived = this.lineCards.has(activeBefore);
      this.active = activeSurvived ? activeBefore : lineId;
      return { lineId, activeSurvived };
    }
    // ── splice (D4 — the model operation; gesture chrome is design-phase) ──
    /**
     * Splice a turn IN after the card at `afterOrdinal` on its own line. The
     * new card is unbound — the whole-path replay that follows re-derives
     * every downstream card and binds it ({@link beginRebindAll}).
     */
    spliceIn(afterOrdinal, command) {
      const card = this.cardByOrdinal.get(afterOrdinal);
      if (card === void 0) return false;
      for (const cards2 of this.lineCards.values()) {
        const index = cards2.indexOf(card);
        if (index >= 0) {
          cards2.splice(index + 1, 0, { type: "turn", command });
          this.rebuildLineRegistry();
          return true;
        }
      }
      return false;
    }
    /**
     * Splice a turn OUT: remove the single card at `ordinal`, keeping what
     * follows. Its branches fork from a state that no longer exists, so they
     * go with it. Only a turn card splices out.
     */
    spliceOut(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      if (card === void 0 || card.type !== "turn") return false;
      for (const cards2 of this.lineCards.values()) {
        const index = cards2.indexOf(card);
        if (index >= 0) {
          cards2.splice(index, 1);
          this.unbindSubtree(card);
          this.rebuildLineRegistry();
          return true;
        }
      }
      return false;
    }
    // ── authoring (assertions live in the card — D2) ───────────────────────
    /** The card's authored assertions, if any (readonly by convention). */
    claimsOf(ordinal) {
      return this.cardByOrdinal.get(ordinal)?.assertions;
    }
    /** True when the card authors nothing and withholds its defaults — the
     *  `[SKIP]` demotion's shape (a pruned-to-nothing turn). */
    claimsNothing(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      if (card === void 0) return false;
      if (card.skip === true) return true;
      const a = card.assertions;
      if (a === void 0) return false;
      return a.noDefaults === true && (a.contains?.length ?? 0) === 0 && (a.notContains?.length ?? 0) === 0 && a.exact === void 0 && (a.states?.length ?? 0) === 0 && (a.events?.length ?? 0) === 0 && (a.channels?.length ?? 0) === 0;
    }
    mutable(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      if (card === void 0) return void 0;
      return card.assertions ??= {};
    }
    /** Drop empty family arrays; drop the whole object when nothing remains
     *  and defaults are not withheld (a bare card synthesizes defaults). */
    normalize(ordinal) {
      const card = this.cardByOrdinal.get(ordinal);
      const a = card?.assertions;
      if (card === void 0 || a === void 0) return;
      if (a.contains !== void 0 && a.contains.length === 0) delete a.contains;
      if (a.notContains !== void 0 && a.notContains.length === 0) delete a.notContains;
      if (a.states !== void 0 && a.states.length === 0) delete a.states;
      if (a.events !== void 0 && a.events.length === 0) delete a.events;
      if (a.channels !== void 0 && a.channels.length === 0) delete a.channels;
      if (a.noDefaults === false) delete a.noDefaults;
      if (Object.keys(a).length === 0) delete card.assertions;
    }
    addContains(ordinal, text) {
      const a = this.mutable(ordinal);
      if (a === void 0) return false;
      (a.contains ??= []).push(text);
      return true;
    }
    addNotContains(ordinal, text) {
      const a = this.mutable(ordinal);
      if (a === void 0) return false;
      (a.notContains ??= []).push(text);
      return true;
    }
    /** Set (or clear) the exact literal block — the turn's whole output as
     *  lines, captured by the caller at toggle time (the document's shape). */
    setExact(ordinal, lines) {
      const a = this.mutable(ordinal);
      if (a === void 0) return false;
      if (lines === null) delete a.exact;
      else a.exact = [...lines];
      this.normalize(ordinal);
      return true;
    }
    addState(ordinal, expression) {
      const a = this.mutable(ordinal);
      if (a === void 0) return false;
      (a.states ??= []).push(expression);
      return true;
    }
    addEvent(ordinal, type) {
      const a = this.mutable(ordinal);
      if (a === void 0) return false;
      (a.events ??= []).push(type);
      return true;
    }
    addChannel(ordinal, claim) {
      const a = this.mutable(ordinal);
      if (a === void 0) return false;
      (a.channels ??= []).push({ ...claim });
      return true;
    }
    /**
     * Deletes one POLICY-DEFAULT contains line of a turn: the survivors become
     * authored contains — the author narrows the claim, never silently
     * abandons it. `defaults` are the rendered default fragments; `index` is
     * the deleted one (−1 keeps all, for deleting a non-contains default line
     * whole).
     */
    removeDefault(ordinal, index, defaults) {
      const a = this.mutable(ordinal);
      if (a === void 0) return;
      a.contains = defaults.filter((_, i) => i !== index);
      a.noDefaults = true;
      this.normalize(ordinal);
    }
    /**
     * Deletes one OPENING default (prologue / title / description, ADR-307
     * open question D): the survivors become authored channel claims, defaults
     * withheld — the same narrowing rule in the opening's channel shape.
     */
    removeOpeningDefault(index, defaults) {
      const a = this.mutable(0);
      if (a === void 0) return;
      a.channels = defaults.filter((_, i) => i !== index).map((claim) => ({ ...claim }));
      a.noDefaults = true;
      this.normalize(0);
    }
    removeContains(ordinal, index) {
      const a = this.mutable(ordinal);
      if (a === void 0 || a.contains === void 0) return;
      a.contains.splice(index, 1);
      a.noDefaults = true;
      this.normalize(ordinal);
    }
    removeNotContains(ordinal, index) {
      const a = this.mutable(ordinal);
      if (a === void 0 || a.notContains === void 0) return;
      a.notContains.splice(index, 1);
      this.normalize(ordinal);
    }
    removeState(ordinal, index) {
      const a = this.mutable(ordinal);
      if (a === void 0 || a.states === void 0) return;
      a.states.splice(index, 1);
      this.normalize(ordinal);
    }
    removeEvent(ordinal, index) {
      const a = this.mutable(ordinal);
      if (a === void 0 || a.events === void 0) return;
      a.events.splice(index, 1);
      this.normalize(ordinal);
    }
    removeChannel(ordinal, index) {
      const a = this.mutable(ordinal);
      if (a === void 0 || a.channels === void 0) return;
      a.channels.splice(index, 1);
      this.normalize(ordinal);
    }
    // ── undo (authoring gestures only; structure ops clear the stack) ──────
    /** Capture every card's authored assertions (deep copy, card-keyed). */
    captureAuthoring() {
      const claims = /* @__PURE__ */ new Map();
      const walk = (cards2) => {
        for (const card of cards2) {
          claims.set(card, cloneAssertions(card.assertions));
          for (const branch of card.branches ?? []) walk(branch.cards);
        }
      };
      walk(this.doc.cards);
      return { claims };
    }
    /** Put a captured authoring state back — the ⌘Z gesture's whole act. */
    restoreAuthoring(memento) {
      for (const [card, assertions] of memento.claims) {
        if (assertions === void 0) delete card.assertions;
        else card.assertions = cloneAssertions(assertions);
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
  var surfaceWindow = window;
  var bootSession = surfaceWindow.__SHARPEE_TESTING_SESSION__;
  var storyId = bootSession?.story ?? "story";
  var seed = bootSession?.seed ?? 42;
  var policy = bootSession?.policy;
  var model = new TreeSessionModel(storyId, seed);
  var records = /* @__PURE__ */ new Map();
  var bootCaptures;
  var currentLine = MAIN_LINE;
  var dialogOutcomes = /* @__PURE__ */ new Map();
  var dropBeforeFence = false;
  var expectDriverFence = false;
  var suppressDelivery = false;
  var replayActive = false;
  var driverBusy = false;
  var armedOutcomeKey = null;
  var documentWriteLocked = false;
  var lastDocumentText = "";
  function turnSource(ordinal) {
    const record = records.get(ordinal);
    if (!record || typeof record.output !== "string") return void 0;
    const channelValues = {};
    for (const capture of record.captures ?? []) {
      channelValues[capture.channel] = [...channelValues[capture.channel] ?? [], ...capture.values];
    }
    return { output: record.output, channelValues };
  }
  function composeOptions() {
    return {
      model,
      policy,
      source: turnSource,
      ...bootCaptures !== void 0 ? { bootCaptures } : {}
    };
  }
  function assertionLinesFor(ordinal) {
    return cardAssertionLines(composeOptions(), ordinal);
  }
  function removeAssertion(del) {
    switch (del.kind) {
      case "default":
        model.removeDefault(del.ordinal, del.index, del.defaults);
        break;
      case "defaultWhole":
        model.removeDefault(del.ordinal, -1, turnContainsDefaults(policy, turnSource(del.ordinal)));
        break;
      case "openingDefault":
        model.removeOpeningDefault(del.index, del.defaults);
        break;
      case "contains":
        model.removeContains(del.ordinal, del.index);
        break;
      case "notContains":
        model.removeNotContains(del.ordinal, del.index);
        break;
      case "state":
        model.removeState(del.ordinal, del.index);
        break;
      case "event":
        model.removeEvent(del.ordinal, del.index);
        break;
      case "channel":
        model.removeChannel(del.ordinal, del.index);
        break;
      case "exact":
        model.setExact(del.ordinal, null);
        break;
    }
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
    update();
  }
  var cards = new CardsView(model, {
    onTailCut(ordinal) {
      void performTailCut(ordinal);
    },
    onDeleteBranch(lineId) {
      void performDeleteBranch(lineId);
    },
    onAddContains(ordinal, text) {
      pushUndo();
      if (model.addContains(ordinal, text)) update();
    },
    onNotContains(ordinal, text) {
      pushUndo();
      if (model.addNotContains(ordinal, text)) update();
    },
    onToggleExact(ordinal) {
      pushUndo();
      const exact = model.claimsOf(ordinal)?.exact;
      if (exact !== void 0) {
        model.setExact(ordinal, null);
      } else {
        const output = records.get(ordinal)?.output ?? "";
        model.setExact(ordinal, output.replace(/\s+$/, "").split("\n"));
      }
      update();
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
        if (model.addState(ordinal, fact.expression)) update();
      });
    },
    onEventPicker(ordinal, anchor) {
      const events = records.get(ordinal)?.events ?? [];
      showListPicker(anchor, "events this turn emitted", events, (event) => {
        pushUndo();
        if (model.addEvent(ordinal, event)) update();
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
        const flat = proseTextLinesOf(capture.values).join(" ");
        const scalar = capture.values.length === 1 && (typeof capture.values[0] === "number" || typeof capture.values[0] === "boolean") ? String(capture.values[0]) : null;
        const claim = scalar !== null ? { id: capture.channel, is: scalar } : { id: capture.channel, contains: [flat.slice(0, 60)] };
        pushUndo();
        if (model.addChannel(ordinal, claim)) update();
      });
    },
    onBranch(ordinal, command) {
      void performBranch(ordinal, command);
    },
    onSelectLine(lineId) {
      void selectLine(lineId);
    },
    onRun() {
      if (runState.inFlight || driverBusy || replayActive) return;
      beginRun(runState);
      cards.render();
      postToBridge({ run: true });
    },
    runColumn: () => runState,
    assertionLines: assertionLinesFor,
    onRemoveAssertion(del) {
      pushUndo();
      removeAssertion(del);
      update();
    }
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
  function postToBridge(payload) {
    try {
      window.webkit?.messageHandlers?.testingSurface?.postMessage(JSON.stringify(payload));
    } catch {
    }
  }
  function update() {
    if (!driverBusy) {
      const text = model.serialize();
      if (text !== lastDocumentText) {
        lastDocumentText = text;
        if (!documentWriteLocked) postToBridge({ document: { text } });
        if (!runState.inFlight) resetRun(runState);
      }
      cards.render();
      postState();
    } else {
      cards.render();
    }
  }
  function postState() {
    postToBridge({
      state: {
        active: model.activeLine,
        dialogs: [...dialogOutcomes]
      }
    });
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
  var lastDeliveredOrdinal;
  var nextTurnWaiters = [];
  var fenceWaiters = [];
  function roomOf(record) {
    const capture = (record.captures ?? []).filter((c) => c.channel === "room-name").at(-1);
    return proseTextLinesOf(capture?.values).at(-1);
  }
  function capturesOf(record) {
    const values = {};
    for (const capture of record.captures ?? []) {
      values[capture.channel] = [...values[capture.channel] ?? [], ...capture.values];
    }
    return values;
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
      if (lastDeliveredOrdinal !== void 0 && records.get(lastDeliveredOrdinal)?.command === "restart") {
        model.spliceOut(lastDeliveredOrdinal);
      }
      const activeBefore = model.activeLine;
      cards.clear();
      clearUndo();
      records.clear();
      model.beginRebindAll();
      model.activateLine(MAIN_LINE);
      currentLine = MAIN_LINE;
      expectBoot = true;
      pendingDialogOutcome = null;
      bootCaptures = void 0;
      update();
      void replayTree(activeBefore);
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
    lastDeliveredOrdinal = record.turn;
    if (boot && currentLine === MAIN_LINE) {
      bootCaptures = capturesOf(record);
    }
    const room = roomOf(record);
    model.activateLine(currentLine);
    model.addTurn({
      ordinal: record.turn,
      command: record.command ?? "",
      boot,
      ...room !== void 0 ? { room } : {}
    });
    if (pendingDialogOutcome) {
      const at = model.turnIndexOf(record.turn);
      if (at) dialogOutcomes.set(`${at.lineId}:${at.index}`, pendingDialogOutcome);
      pendingDialogOutcome = null;
    }
    cards.addTurnCard(record.turn, boot, currentLine !== MAIN_LINE);
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
  function pathSteps(lineId) {
    return model.pathStepsOf(lineId).map((step) => ({
      command: step.command,
      key: `${step.lineId}:${step.index}`
    }));
  }
  function prefixSteps(lineId) {
    const prefixLength = model.prefixCommandsOf(lineId).length;
    return pathSteps(lineId).slice(0, prefixLength);
  }
  async function driveFreshBoot(line, replay, live) {
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
      currentLine = line;
      model.activateLine(line);
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
  async function performBranch(ordinal, command) {
    if (replayActive || driverBusy) return;
    clearUndo();
    const id = model.branch(ordinal, command);
    if (id === null) return;
    currentLine = id;
    update();
    await driveFreshBoot(id, prefixSteps(id), [{ command, key: `${id}:0` }]);
  }
  async function selectLine(lineId) {
    if (replayActive || driverBusy || lineId === model.activeLine) return;
    if (!model.activateLine(lineId)) return;
    clearUndo();
    currentLine = lineId;
    update();
    await driveFreshBoot(lineId, pathSteps(lineId), []);
  }
  async function performDeleteBranch(lineId) {
    if (replayActive || driverBusy) return;
    const result = model.deleteBranch(lineId);
    if (result === null) return;
    clearUndo();
    currentLine = model.activeLine;
    update();
    if (result.wasActive) {
      await driveFreshBoot(result.parentLine, pathSteps(result.parentLine), []);
    }
  }
  async function performTailCut(ordinal) {
    if (replayActive || driverBusy) return;
    const result = model.tailCut(ordinal);
    if (result === null) return;
    clearUndo();
    currentLine = model.activeLine;
    update();
    await driveFreshBoot(model.activeLine, pathSteps(model.activeLine), []);
  }
  async function replayTree(activeTarget) {
    driverBusy = true;
    replayActive = true;
    setInputHeld(true, "restoring session\u2026");
    try {
      currentLine = MAIN_LINE;
      model.activateLine(MAIN_LINE);
      if (!model.hasOpening) await awaitNextTurn(15e3);
      let intact = true;
      const mainCommands = model.ownCommandsOf(MAIN_LINE);
      for (const [index, command] of mainCommands.entries()) {
        armedOutcomeKey = `${MAIN_LINE}:${index}`;
        typeCommand(command);
        const landed = await awaitNextTurn(15e3);
        armedOutcomeKey = null;
        if (!landed) {
          intact = false;
          break;
        }
      }
      replayActive = false;
      if (intact) {
        for (const lineId of model.lineIds()) {
          if (lineId === MAIN_LINE) continue;
          const own = model.ownCommandsOf(lineId);
          if (own.length === 0) continue;
          const ownSteps = own.map((command, index) => ({
            command,
            key: `${lineId}:${index}`
          }));
          if (!await driveFreshBoot(lineId, prefixSteps(lineId), ownSteps)) break;
        }
        if (model.lineIds().includes(activeTarget) && activeTarget !== currentLine) {
          model.activateLine(activeTarget);
          await driveFreshBoot(activeTarget, pathSteps(activeTarget), []);
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
  var loadedDocument = false;
  if (bootSession?.document !== void 0) {
    const read = deserializeTreeDocument(bootSession.document);
    if (read.status === "ok") {
      model.load(read.document);
      lastDocumentText = model.serialize();
      dialogOutcomes = new Map(bootSession.view?.dialogs ?? []);
      loadedDocument = true;
    } else if (read.status === "refused") {
      documentWriteLocked = true;
      cards.setNotice(read.message);
    }
  }
  for (const record of queued) deliver(record);
  if (loadedDocument && model.document.cards.length > 0) {
    void replayTree(bootSession?.view?.active ?? MAIN_LINE);
  }
})();
