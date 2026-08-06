"use strict";
(() => {
  // ../../packages/ide-protocol/src/run-events.ts
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
    return hasEnvelopeAndType(value, "transcript-start") && typeof value.file === "string" && typeof value.index === "number" && (value.commandCount === void 0 || typeof value.commandCount === "number") && (value.parent === void 0 || typeof value.parent === "string") && (value.replayed === void 0 || typeof value.replayed === "boolean");
  }
  function isCommandResultEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "command-result") && typeof value.file === "string" && typeof value.line === "number" && typeof value.input === "string" && typeof value.passed === "boolean" && typeof value.expectedFailure === "boolean" && typeof value.skipped === "boolean" && (value.error === void 0 || typeof value.error === "string") && (value.actualOutput === void 0 || typeof value.actualOutput === "string");
  }
  function isTranscriptEndEvent(value) {
    if (!isObject(value)) return false;
    return hasEnvelopeAndType(value, "transcript-end") && typeof value.file === "string" && (value.status === "passed" || value.status === "failed" || value.status === "error" || value.status === "unreached") && typeof value.passed === "number" && typeof value.failed === "number" && typeof value.expectedFailures === "number" && typeof value.skipped === "number" && typeof value.duration === "number" && (value.errorMessage === void 0 || typeof value.errorMessage === "string") && (value.blockedBy === void 0 || typeof value.blockedBy === "string");
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

  // web/testing-tab/src/host.ts
  var HANDLER = "testingTab";
  function decodeLine(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
    return isRunEvent(parsed) ? parsed : null;
  }
  function installHost(handlers) {
    const inbound = {
      line(text) {
        for (const raw of text.split("\n")) {
          if (!raw.trim()) continue;
          const event = decodeLine(raw);
          if (event) handlers.onEvent(event);
          else handlers.onUndecodable(raw);
        }
      },
      reset: (story) => handlers.onReset(story),
      status: (text) => handlers.onStatus(text),
      discovered: (files) => handlers.onDiscovered(files),
      restoreMode: (mode) => handlers.onRestoreMode(mode),
      finished: (ok) => handlers.onFinished(ok)
    };
    window.__sharpeeTesting = inbound;
    const webkit = window.webkit;
    const port = webkit?.messageHandlers?.[HANDLER];
    const send = (body) => {
      try {
        port?.postMessage(body);
      } catch {
      }
    };
    return {
      openLocation: (file, line) => send({ action: "openLocation", file, line }),
      runAll: () => send({ action: "runAll" }),
      runChain: () => send({ action: "runChain" }),
      runTree: () => send({ action: "runTree" }),
      cancel: () => send({ action: "cancel" }),
      persistMode: (mode) => send({ action: "persistMode", mode }),
      ready: () => send({ action: "ready" })
    };
  }

  // web/testing-tab/src/model.ts
  function stemOf(file) {
    const base = file.split("/").pop() ?? file;
    return base.replace(/\.transcript$/, "");
  }
  function createModel() {
    return {
      mode: null,
      nodes: /* @__PURE__ */ new Map(),
      roots: [],
      phases: [],
      running: null,
      authoredCommands: 0,
      replayedCommands: 0,
      progress: null,
      coverage: null,
      summary: null,
      inFlight: false,
      open: null
    };
  }
  function nodeFor(model2, file, parent) {
    let node = model2.nodes.get(file);
    if (!node) {
      node = {
        file,
        stem: stemOf(file),
        parent: parent ?? null,
        children: [],
        status: "pending",
        replays: 0,
        turns: [],
        passed: 0,
        failed: 0,
        expectedFailures: 0,
        skipped: 0,
        duration: 0,
        blockedBy: null,
        index: model2.nodes.size
      };
      model2.nodes.set(file, node);
      if (!parent) model2.roots.push(node);
    }
    if (parent && node.parent === null) node.parent = parent;
    if (node.parent) {
      const owner = model2.nodes.get(node.parent);
      if (owner && !owner.children.includes(node)) {
        owner.children.push(node);
        const orphaned = model2.roots.indexOf(node);
        if (orphaned >= 0) model2.roots.splice(orphaned, 1);
      }
    }
    return node;
  }
  function applyTranscriptStart(model2, event) {
    const node = nodeFor(model2, event.file, event.parent);
    node.commandCount = event.commandCount;
    model2.open = { node, replayed: event.replayed === true };
    if (event.replayed) {
      node.replays += 1;
      return;
    }
    node.index = event.index;
    node.status = "running";
    node.turns = [];
    node.passed = 0;
    node.failed = 0;
    node.expectedFailures = 0;
    node.skipped = 0;
    model2.running = node;
  }
  function applyCommandResult(model2, event) {
    if (!model2.open) return;
    if (model2.open.replayed) {
      model2.replayedCommands += 1;
      return;
    }
    model2.authoredCommands += 1;
    model2.open.node.turns.push({
      line: event.line,
      input: event.input,
      passed: event.passed,
      expectedFailure: event.expectedFailure,
      skipped: event.skipped,
      error: event.error,
      actualOutput: event.actualOutput
    });
  }
  function applyTranscriptEnd(model2, event) {
    const node = nodeFor(model2, event.file);
    const replayed = model2.open?.replayed === true;
    model2.open = null;
    if (event.status === "unreached") {
      node.status = "unreached";
      node.blockedBy = event.blockedBy ?? null;
      node.duration = event.duration;
      return;
    }
    if (replayed) return;
    node.status = event.status;
    node.passed = event.passed;
    node.failed = event.failed;
    node.expectedFailures = event.expectedFailures;
    node.skipped = event.skipped;
    node.duration = event.duration;
    node.errorMessage = event.errorMessage;
    if (model2.running === node) model2.running = null;
  }
  function applyPhase(model2, event) {
    const open = model2.phases.find((p) => p.name === event.name && p.finishedAt === void 0);
    if (event.status === "started" || !open) {
      model2.phases.push({
        name: event.name,
        status: event.status,
        detail: event.detail,
        startedAt: event.elapsedMs,
        finishedAt: event.status === "finished" ? event.elapsedMs : void 0
      });
      return;
    }
    open.status = "finished";
    open.finishedAt = event.elapsedMs;
    if (event.detail) open.detail = event.detail;
  }
  function applyEvent(model2, event) {
    switch (event.type) {
      case "run-start":
        model2.mode = event.mode;
        model2.transcriptCount = event.transcriptCount;
        model2.inFlight = true;
        model2.summary = null;
        break;
      case "phase":
        applyPhase(model2, event);
        break;
      case "transcript-start":
        applyTranscriptStart(model2, event);
        break;
      case "command-result":
        applyCommandResult(model2, event);
        break;
      case "transcript-end":
        applyTranscriptEnd(model2, event);
        break;
      case "progress":
        model2.progress = {
          scope: event.scope,
          done: event.done,
          total: event.total,
          budgets: event.budgets
        };
        break;
      case "coverage":
        model2.coverage = event;
        break;
      case "run-end":
        model2.summary = event;
        model2.running = null;
        model2.inFlight = false;
        model2.open = null;
        break;
      default:
        break;
    }
    return model2;
  }
  function ancestry(model2, node) {
    const path = [];
    let cursor = node;
    const guard = /* @__PURE__ */ new Set();
    while (cursor && !guard.has(cursor.file)) {
      guard.add(cursor.file);
      path.unshift(cursor);
      cursor = cursor.parent ? model2.nodes.get(cursor.parent) : void 0;
    }
    return path;
  }
  function subtreeFailureCount(node) {
    return node.children.reduce(
      (total, child) => total + (child.status === "failed" || child.status === "error" ? 1 : 0) + subtreeFailureCount(child),
      0
    );
  }

  // web/testing-tab/src/dom.ts
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function byId(id) {
    const found = document.getElementById(id);
    if (!found) throw new Error(`Testing tab markup is missing #${id}`);
    return found;
  }

  // web/testing-tab/src/views.ts
  function createSurface() {
    return { mode: "column", selected: null, opened: null, follow: true, status: "" };
  }
  function dotClass(node, model2) {
    return `dot ${node === model2.running ? "running" : node.status}`;
  }
  function resultLine(node, model2) {
    switch (node.status) {
      case "unreached":
        return node.blockedBy ? `never ran \u2014 blocked by ${stemOf(node.blockedBy)}` : "never ran \u2014 an ancestor failed";
      case "pending":
        return "queued";
      case "running":
        return `${node.turns.length} of ${node.commandCount ?? "?"} commands\u2026`;
      case "error":
        return node.errorMessage ? `error \u2014 ${node.errorMessage}` : "error \u2014 the transcript never ran";
      default: {
        const parts = [`${node.passed} passed`];
        if (node.failed) parts.push(`${node.failed} failed`);
        if (node.expectedFailures) parts.push(`${node.expectedFailures} expected-fail`);
        if (node.skipped) parts.push(`${node.skipped} skipped`);
        return `${parts.join(" \xB7 ")} in ${node.duration} ms${node === model2.running ? "\u2026" : ""}`;
      }
    }
  }
  function turnRow(node, turn, actions2) {
    const row = el("div", `turn${turn.passed ? "" : " bad"}`);
    const line = el("button", "ln", String(turn.line));
    line.type = "button";
    line.title = `${node.file}:${turn.line}`;
    line.addEventListener("click", () => actions2.openLocation(node.file, turn.line));
    row.append(line);
    const command = el("div", "cmd");
    command.append(el("b", null, "> "), document.createTextNode(turn.input));
    row.append(command);
    const verdict = el("div", "verdict");
    verdict.textContent = turn.skipped ? "SKIP" : turn.expectedFailure ? "XFAIL" : turn.passed ? "PASS" : "FAIL";
    row.append(verdict);
    if (!turn.passed && (turn.error || turn.actualOutput)) {
      const detail = el("div", "detail");
      if (turn.error) detail.append(el("div", "err", turn.error));
      if (turn.actualOutput) detail.append(el("pre", "actual", turn.actualOutput));
      row.append(detail);
    }
    return row;
  }
  function preview(model2, node, actions2) {
    const pane = el("div", "col preview");
    if (!node) {
      pane.append(el("div", "more", "Waiting for the first transcript\u2026"));
      return pane;
    }
    pane.append(el("h3", null, node.stem));
    pane.append(el("div", "sub", node.file));
    const list = el("dl", "kv");
    const pair = (key, value, className) => {
      list.append(el("dt", null, key), el("dd", className, value));
    };
    pair("Result", resultLine(node, model2), node.status === "failed" ? "fail" : void 0);
    pair("Ancestry", ancestry(model2, node).map((a) => a.stem).join(" \u203A "));
    pair("Children", node.children.length ? String(node.children.length) : "none \u2014 a leaf");
    if (node.replays) {
      pair("Replayed", `${node.replays}\xD7 to rebuild a descendant's state`, "replay");
    }
    const blocked = subtreeFailureCount(node);
    if (blocked) pair("Below", `${blocked} failing descendant${blocked === 1 ? "" : "s"}`, "fail");
    pane.append(list);
    const open = el("button", "open", "Open document");
    open.type = "button";
    open.addEventListener("click", () => actions2.open(node));
    pane.append(open);
    if (node.status === "unreached") {
      pane.append(el("div", "more", "No turns \u2014 an ancestor failed, so this branch never executed."));
      return pane;
    }
    const recent = node.turns.slice(-40);
    const turns = el("div", "turns");
    recent.forEach((turn) => turns.append(turnRow(node, turn, actions2)));
    pane.append(turns);
    if (node.turns.length > recent.length) {
      pane.append(el("div", "more", `+ ${node.turns.length - recent.length} earlier turns \u2014 open the document`));
    }
    return pane;
  }
  function columnRow(model2, node, surface2, actions2) {
    const row = el("button", `crow ${node.status}`);
    row.type = "button";
    row.setAttribute("aria-selected", String(node === surface2.selected));
    if (node !== surface2.selected && surface2.selected && ancestry(model2, surface2.selected).includes(node)) {
      row.dataset.inpath = "true";
    }
    row.append(el("span", dotClass(node, model2)));
    row.append(el("span", "stem", node.stem));
    const failures = subtreeFailureCount(node);
    if (failures) row.append(el("span", "badge", String(failures)));
    if (node.replays) row.append(el("span", "tag", "replay"));
    if (node.turns.length) row.append(el("span", "n", String(node.turns.length)));
    if (node.children.length) row.append(el("span", "chev", "\u203A"));
    row.addEventListener("click", () => actions2.select(node));
    row.addEventListener("dblclick", () => actions2.open(node));
    return row;
  }
  function renderColumns(model2, surface2, actions2) {
    const host2 = byId("cols");
    host2.replaceChildren();
    const path = surface2.selected ? ancestry(model2, surface2.selected) : [];
    let level = model2.roots;
    let depth = 0;
    while (level.length) {
      const column = el("div", "col");
      level.forEach((node) => column.append(columnRow(model2, node, surface2, actions2)));
      host2.append(column);
      const step = path[depth];
      if (!step || !step.children.length) break;
      level = step.children;
      depth += 1;
    }
    host2.append(preview(model2, surface2.selected, actions2));
    host2.scrollLeft = host2.scrollWidth;
  }
  function renderList(model2, surface2, actions2) {
    const host2 = byId("list");
    host2.replaceChildren();
    const walk = (node, depth) => {
      const row = el("button", `lrow ${node.status}`);
      row.type = "button";
      row.style.paddingLeft = `${10 + depth * 16}px`;
      row.setAttribute("aria-selected", String(node === surface2.selected));
      row.append(el("span", dotClass(node, model2)));
      row.append(el("span", "twisty", node.children.length ? "\u25BE" : ""));
      row.append(el("span", "stem", node.stem));
      const failures = subtreeFailureCount(node);
      if (failures) row.append(el("span", "badge", String(failures)));
      if (node.replays) row.append(el("span", "tag", "replay"));
      if (node.turns.length) row.append(el("span", "n", String(node.turns.length)));
      row.addEventListener("click", () => actions2.select(node));
      row.addEventListener("dblclick", () => actions2.open(node));
      host2.append(row);
      node.children.forEach((child) => walk(child, depth + 1));
    };
    model2.roots.forEach((root) => walk(root, 0));
    const side = byId("list-side");
    side.replaceChildren(preview(model2, surface2.selected, actions2));
  }
  function documentTile(model2, node, surface2, actions2) {
    const tile = el("button", `doc ${node.status}`);
    tile.type = "button";
    tile.setAttribute("aria-selected", String(node === surface2.selected));
    const sheet = el("div", `sheet ${node.status}`);
    const rules = Math.max(3, Math.min(6, Math.ceil((node.commandCount ?? node.turns.length) / 6)));
    for (let i = 0; i < rules * 2; i += 1) {
      const rule = el("i", i % 2 === 0 ? "cmd" : void 0);
      rule.style.width = `${i % 2 === 0 ? 62 : [88, 70, 80][i / 2 | 0] ?? 74}%`;
      sheet.append(rule);
    }
    tile.append(sheet);
    tile.append(el("span", "name", node.stem));
    tile.append(el("span", "sub", resultLine(node, model2)));
    tile.addEventListener("click", () => actions2.select(node));
    tile.addEventListener("dblclick", () => actions2.open(node));
    return tile;
  }
  function renderDocuments(model2, surface2, actions2) {
    const host2 = byId("docs");
    host2.replaceChildren();
    const group = (label, nodes) => {
      if (!nodes.length) return;
      host2.append(el("div", "groupbar", label));
      const grid = el("div", "grid");
      nodes.forEach((node) => grid.append(documentTile(model2, node, surface2, actions2)));
      host2.append(grid);
    };
    group("roots", model2.roots);
    for (const node of model2.nodes.values()) {
      if (node.children.length) group(`children of ${node.stem}`, node.children);
    }
    if (!model2.nodes.size) {
      host2.append(el("div", "more", "No transcripts yet \u2014 run the suite to fill this in."));
    }
  }
  function renderDocument(model2, surface2, actions2) {
    const view = byId("docview");
    view.replaceChildren();
    const node = surface2.opened;
    if (!node) return;
    const header = el("header");
    const back = el("button", "back", "\u2039 Back");
    back.type = "button";
    back.addEventListener("click", () => actions2.back());
    header.append(back, el("h2", null, node.stem));
    const path = el("button", "path", node.file);
    path.type = "button";
    path.title = "Open this transcript in the editor";
    path.addEventListener("click", () => actions2.openLocation(node.file, 1));
    header.append(path);
    view.append(header);
    const meta = el("div", "docmeta");
    const cell = (key, value, className) => {
      const box = el("div");
      box.append(el("span", "k", key), el("span", `v${className ? ` ${className}` : ""}`, value));
      meta.append(box);
    };
    cell("Result", resultLine(node, model2), node.status === "passed" ? "pass" : node.status === "failed" ? "fail" : void 0);
    cell("Ancestry", ancestry(model2, node).map((a) => a.stem).join(" \u203A "));
    cell("Children", node.children.length ? String(node.children.length) : "leaf");
    if (node.replays) cell("Replays", `${node.replays}\xD7`, "replay");
    view.append(meta);
    const turns = el("div", "turns");
    if (node.status === "unreached") {
      turns.append(
        el(
          "div",
          "more",
          node.blockedBy ? `This branch never executed \u2014 ${stemOf(node.blockedBy)} failed above it.` : "This branch never executed \u2014 an ancestor failed."
        )
      );
    } else if (!node.turns.length) {
      turns.append(el("div", "more", "No turns recorded."));
    } else {
      node.turns.forEach((turn) => turns.append(turnRow(node, turn, actions2)));
    }
    view.append(turns);
  }
  function renderHeader(model2, surface2) {
    const nodes = [...model2.nodes.values()];
    const count = (status2) => nodes.filter((n) => n.status === status2).length;
    const failed = count("failed") + count("error");
    const unreached = count("unreached");
    byId("tally-pass").textContent = String(count("passed"));
    const failCell = byId("tally-fail");
    failCell.textContent = String(failed);
    failCell.className = `v${failed ? " fail" : ""}`;
    const unreachedCell = byId("tally-unreached");
    unreachedCell.textContent = String(unreached);
    unreachedCell.className = `v${unreached ? " unreached" : ""}`;
    const done = model2.authoredCommands + model2.replayedCommands;
    byId("tally-commands").textContent = String(done);
    byId("tally-commands-sub").textContent = `${model2.authoredCommands} authored \xB7 ${model2.replayedCommands} replayed`;
    const total = model2.progress?.total;
    byId("progress-text").textContent = total ? `${model2.progress?.done ?? done} / ${total}` : `${done}`;
    const bar = byId("progress-bar");
    bar.style.width = total ? `${Math.min(100, (model2.progress?.done ?? done) / total * 100)}%` : "0";
    const phases = byId("phases");
    phases.replaceChildren();
    model2.phases.forEach((phase) => {
      const chip = el("span", `chip${phase.finishedAt === void 0 ? " busy" : ""}`);
      chip.append(document.createTextNode(phase.name));
      chip.append(
        el("span", "ms", phase.finishedAt === void 0 ? "\u2026" : `${phase.finishedAt - phase.startedAt} ms`)
      );
      phases.append(chip);
    });
    const meta = [];
    if (model2.mode) meta.push(model2.mode);
    meta.push(`${model2.nodes.size} node${model2.nodes.size === 1 ? "" : "s"}`);
    if (model2.summary) meta.push(`${model2.summary.totalDuration} ms`);
    byId("meta").textContent = meta.join(" \xB7 ");
    const status = byId("status");
    status.textContent = surface2.status;
    status.classList.toggle("on", surface2.status !== "");
    byId("cancel").toggleAttribute("disabled", !model2.inFlight);
    for (const id of ["run-all", "run-chain", "run-tree"]) {
      byId(id).toggleAttribute("disabled", model2.inFlight);
    }
  }
  function renderPathBar(model2, surface2) {
    const bar = byId("pathbar");
    bar.replaceChildren();
    const target = surface2.opened ?? surface2.selected;
    if (target) {
      const path = ancestry(model2, target);
      path.forEach((node, i) => {
        if (i) bar.append(el("span", "sep", "\u203A"));
        bar.append(i === path.length - 1 ? el("b", null, node.stem) : el("span", null, node.stem));
      });
    }
    bar.append(
      el(
        "span",
        "hint",
        surface2.opened ? "Back returns to the view \xB7 click a line number to open it in the editor" : "Click selects \xB7 double-click opens the document"
      )
    );
  }
  function render(model2, surface2, actions2) {
    renderHeader(model2, surface2);
    const showing = surface2.opened !== null;
    byId("docview").classList.toggle("on", showing);
    const panes = {
      column: "pane-column",
      list: "pane-list",
      documents: "pane-documents"
    };
    Object.keys(panes).forEach((mode) => {
      byId(panes[mode]).classList.toggle("on", !showing && surface2.mode === mode);
    });
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === surface2.mode));
    });
    if (showing) renderDocument(model2, surface2, actions2);
    else if (surface2.mode === "column") renderColumns(model2, surface2, actions2);
    else if (surface2.mode === "list") renderList(model2, surface2, actions2);
    else renderDocuments(model2, surface2, actions2);
    renderPathBar(model2, surface2);
  }

  // web/testing-tab/src/main.ts
  var model = createModel();
  var surface = createSurface();
  var framePending = false;
  function scheduleRender() {
    if (framePending) return;
    framePending = true;
    const paint = () => {
      if (!framePending) return;
      framePending = false;
      render(model, surface, actions);
    };
    requestAnimationFrame(paint);
    window.setTimeout(paint, 32);
  }
  function trackRunning() {
    if (surface.opened) return;
    if (surface.follow && model.running) surface.selected = model.running;
    if (!surface.selected) surface.selected = model.roots[0] ?? null;
  }
  var actions = {
    select(node) {
      surface.selected = node;
      surface.follow = false;
      byId("follow").setAttribute("aria-pressed", "false");
      scheduleRender();
    },
    open(node) {
      surface.opened = node;
      surface.selected = node;
      scheduleRender();
    },
    back() {
      surface.opened = null;
      scheduleRender();
    },
    setMode(mode) {
      surface.mode = mode;
      surface.opened = null;
      host.persistMode(mode);
      scheduleRender();
    },
    openLocation(file, line) {
      host.openLocation(file, line);
    }
  };
  var host = installHost({
    onEvent(event) {
      applyEvent(model, event);
      trackRunning();
      scheduleRender();
    },
    onUndecodable(text) {
      surface.status = `Unreadable line from the test run \u2014 the toolchain may be newer than this IDE (${text.slice(0, 120)})`;
      scheduleRender();
    },
    onReset(story) {
      const discovered = [...model.nodes.values()].filter((node) => node.status === "pending").map((node) => node.file);
      model = createModel();
      seedDiscovered(discovered);
      surface.opened = null;
      surface.selected = null;
      surface.follow = true;
      surface.status = "";
      byId("follow").setAttribute("aria-pressed", "true");
      byId("story").textContent = story;
      scheduleRender();
    },
    onStatus(text) {
      surface.status = text;
      scheduleRender();
    },
    onDiscovered(files) {
      seedDiscovered(files);
      trackRunning();
      scheduleRender();
    },
    onRestoreMode(mode) {
      if (mode === "column" || mode === "list" || mode === "documents") surface.mode = mode;
      scheduleRender();
    },
    onFinished(ok) {
      model.inFlight = false;
      if (!ok && !surface.status) surface.status = "The test run ended without completing its stream.";
      scheduleRender();
    }
  });
  function seedDiscovered(files) {
    for (const file of files) {
      if (model.nodes.has(file)) continue;
      const node = {
        file,
        stem: stemOf(file),
        parent: null,
        children: [],
        status: "pending",
        replays: 0,
        turns: [],
        passed: 0,
        failed: 0,
        expectedFailures: 0,
        skipped: 0,
        duration: 0,
        blockedBy: null,
        index: model.nodes.size
      };
      model.nodes.set(file, node);
      model.roots.push(node);
    }
  }
  function installToolbar() {
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => actions.setMode(button.dataset.mode));
    });
    byId("run-all").addEventListener("click", () => host.runAll());
    byId("run-chain").addEventListener("click", () => host.runChain());
    byId("run-tree").addEventListener("click", () => host.runTree());
    byId("cancel").addEventListener("click", () => host.cancel());
    byId("follow").addEventListener("click", () => {
      surface.follow = !surface.follow;
      byId("follow").setAttribute("aria-pressed", String(surface.follow));
      if (surface.follow) trackRunning();
      scheduleRender();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && surface.opened) actions.back();
    });
  }
  installToolbar();
  render(model, surface, actions);
  host.ready();
})();
