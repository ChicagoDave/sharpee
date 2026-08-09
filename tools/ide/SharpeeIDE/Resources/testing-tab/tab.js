"use strict";
(() => {
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
    return hasEnvelopeAndType(value, "command-result") && typeof value.file === "string" && typeof value.line === "number" && typeof value.input === "string" && typeof value.passed === "boolean" && typeof value.expectedFailure === "boolean" && typeof value.skipped === "boolean" && (value.error === void 0 || typeof value.error === "string") && (value.actualOutput === void 0 || typeof value.actualOutput === "string") && (value.turn === void 0 || typeof value.turn === "number") && (value.ending === void 0 || value.ending === "victory" || value.ending === "defeat" || value.ending === "quit") && (value.diff === void 0 || isCommandDiff(value.diff)) && (value.world === void 0 || isWorldSnapshot(value.world));
  }
  function isCommandDiff(value) {
    if (!isObject(value)) return false;
    const lines2 = (v) => Array.isArray(v) && v.every((line) => typeof line === "string");
    return lines2(value.recorded) && lines2(value.actual) && (value.channel === void 0 || typeof value.channel === "string");
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

  // tools/ide/web/testing-tab/src/host.ts
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
      goldens: (files) => handlers.onGoldens(files),
      restoreMode: (mode) => handlers.onRestoreMode(mode),
      finished: (ok) => handlers.onFinished(ok),
      source: (file, text) => handlers.onSource(file, text),
      sourceFailed: (file, message) => handlers.onSourceFailed(file, message),
      saved: (file) => handlers.onSaved(file),
      saveFailed: (file, message) => handlers.onSaveFailed(file, message),
      created: (file) => handlers.onCreated(file),
      createFailed: (message) => handlers.onCreateFailed(message),
      trashed: (file) => handlers.onTrashed(file),
      trashFailed: (file, message) => handlers.onTrashFailed(file, message),
      goldenRestored: (file) => handlers.onGoldenRestored(file),
      goldenRestoreFailed: (file, message) => handlers.onGoldenRestoreFailed(file, message)
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
      run: () => send({ action: "run" }),
      cancel: () => send({ action: "cancel" }),
      persistMode: (mode) => send({ action: "persistMode", mode }),
      requestSource: (file) => send({ action: "requestSource", file }),
      writeTranscript: (file, text) => send({ action: "writeTranscript", file, text }),
      createTranscript: (name, text) => send({ action: "createTranscript", name, text }),
      trashTranscript: (file) => send({ action: "trashTranscript", file }),
      recordGolden: (file) => send({ action: "recordGolden", file }),
      restoreGolden: (file) => send({ action: "restoreGolden", file }),
      ready: () => send({ action: "ready" })
    };
  }

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
      message: '[ENSURES:] was removed (ADR-294 D4) \u2014 durable regression protection is a golden recording; for unit intent use [OK: contains "..."] or [STATE:]'
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
      message: '[OK: matches] was removed (ADR-294 D2) \u2014 output is deterministic at a pinned seed; use [OK: contains "..."] or a golden recording'
    },
    {
      pattern: /^\[NAVIGATE\s+TO\s*:/i,
      form: "[NAVIGATE TO:]",
      message: "[NAVIGATE TO:] was removed (ADR-294 D4) \u2014 write the literal movement commands; the runner never pathfinds"
    },
    {
      pattern: /^\[OK\s*:\s*any\s*\]$/i,
      form: "[OK: any]",
      message: '[OK: any] was removed (ADR-294 D2) \u2014 presence-only assertion masks failure; use a golden recording or [OK: contains "..."], or [SKIP] for deliberately unasserted output'
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
  function readTextBlock(lines2, openIndex) {
    const content = [];
    for (let i = openIndex + 1; i < lines2.length; i++) {
      if (isBlockLine(lines2[i], BLOCK_CLOSE)) {
        return { content, closeIndex: i };
      }
      content.push(lines2[i]);
    }
    return null;
  }
  function commentBody(trimmedLine) {
    const afterHash = trimmedLine.slice(1).replace(/\s+$/, "");
    return afterHash.startsWith(" ") ? afterHash.slice(1) : afterHash;
  }
  function parseTranscript(content, filePath = "<inline>") {
    const lines2 = content.split("\n");
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
    for (let index = 0; index < lines2.length; index++) {
      const line = lines2[index];
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
        const nextIsBlock = blockIndex < lines2.length && isBlockLine(lines2[blockIndex], BLOCK_OPEN);
        const directive = parseDirective(trimmed, lineNumber);
        if (directive) {
          if (currentCommand) {
            finalizeCommand(currentCommand, parseErrors);
            currentCommand = null;
          }
          transcript.items.push({ type: "directive", directive });
          if (nextIsBlock) {
            index = skipInvalidBlock(
              lines2,
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
                lines2,
                blockIndex,
                parseErrors,
                `A text block cannot follow "${trimmed}" \u2014 blocks attach only to [OK] or payload-less [OK: contains]`
              );
            } else if (nextIsBlock) {
              const block = readTextBlock(lines2, blockIndex);
              if (!block) {
                parseErrors.push({
                  lineNumber: blockIndex + 1,
                  message: `Unclosed text block \u2014 expected a line reading "${BLOCK_CLOSE}" before end of file`
                });
                index = lines2.length;
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
  function skipInvalidBlock(lines2, openIndex, parseErrors, message) {
    const block = readTextBlock(lines2, openIndex);
    parseErrors.push({ lineNumber: openIndex + 1, message });
    return block ? block.closeIndex : lines2.length;
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
  function validateTranscript(transcript) {
    const errors = [];
    for (const parseError of transcript.parseErrors ?? []) {
      errors.push(`Line ${parseError.lineNumber}: ${parseError.message}`);
    }
    if (transcript.commands.length === 0) {
      errors.push("Transcript has no commands");
    }
    if (!transcript.header.story && !transcript.header.title) {
      errors.push("Transcript should have a title or story in header");
    }
    for (const cmd of transcript.commands) {
      if (!cmd.input) {
        errors.push(`Line ${cmd.lineNumber}: Empty command`);
      }
    }
    return errors;
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
    const lines2 = [];
    let current = `${key}:`;
    let indent = "";
    for (const word of words) {
      const candidate = current === indent ? `${indent}${word}` : `${current} ${word}`;
      if (candidate.length > FOLD_WIDTH && current !== indent) {
        lines2.push(current);
        indent = FOLD_INDENT;
        current = `${indent}${word}`;
      } else {
        current = candidate;
      }
    }
    lines2.push(current);
    return lines2;
  }
  function serializeHeader(transcript) {
    const lines2 = [];
    const emitted = /* @__PURE__ */ new Set();
    for (const key of HEADER_ORDER) {
      const value = transcript.header[key];
      if (value === void 0) continue;
      lines2.push(...foldHeaderField(key, value));
      emitted.add(key);
    }
    for (const key of Object.keys(transcript.header)) {
      if (emitted.has(key)) continue;
      const value = transcript.header[key];
      if (value === void 0) continue;
      lines2.push(...foldHeaderField(key, value));
    }
    return lines2;
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
    const lines2 = [serializeAssertionTag(assertion)];
    if (assertion.block !== void 0) {
      lines2.push("text", ...assertion.block, "end text");
    }
    return lines2;
  }
  function serializeCommand(command) {
    const lines2 = [`> ${command.input}`];
    for (const assertion of command.assertions) {
      lines2.push(...serializeAssertion(assertion));
    }
    lines2.push(...command.expectedOutput);
    return lines2;
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
    const lines2 = [];
    lines2.push(...serializeHeader(transcript));
    lines2.push("");
    lines2.push("---");
    lines2.push("");
    for (const assertion of transcript.opening ?? []) {
      lines2.push(...serializeAssertion(assertion));
    }
    if (transcript.opening && transcript.opening.length > 0) lines2.push("");
    const items = transcript.items ?? [];
    let pendingComments = [];
    let firstStanza = true;
    const openStanza = () => {
      if (!firstStanza) lines2.push("");
      firstStanza = false;
      lines2.push(...pendingComments);
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
        lines2.push(...serializeCommand(item.command));
      } else {
        const directive = item.directive;
        lines2.push(...serializeDirective(directive));
        if (directive.type === "goal") {
          lines2.push("");
          firstStanza = true;
        }
      }
    }
    if (pendingComments.length > 0) {
      if (!firstStanza) lines2.push("");
      lines2.push(...pendingComments);
    }
    return lines2.join("\n") + "\n";
  }

  // tools/ide/web/testing-tab/src/grammar.ts
  function parse(text, file) {
    return parseTranscript(text, file);
  }
  function serialize(transcript) {
    return serializeTranscript(transcript);
  }
  function saveOutlook(text, file) {
    let transcript;
    try {
      transcript = parse(text, file);
    } catch (error) {
      return { kind: "unsound", problems: [error instanceof Error ? error.message : String(error)] };
    }
    const problems = validateTranscript(transcript);
    if (transcript.commands.length === 0 && problems.length === 1) {
      const generated2 = serialize(transcript);
      if (generated2 === text) return { kind: "empty", generated: generated2 };
    }
    if (problems.length > 0) return { kind: "unsound", problems };
    const generated = serialize(transcript);
    if (generated === text) return { kind: "clean", generated };
    return { kind: "reformats", generated, changedLines: countChangedLines(text, generated) };
  }
  function addAssertion(text, file, commandLine, assertion, expectedInput) {
    const transcript = editable(text, file);
    const command = commandAt(transcript, file, commandLine, expectedInput);
    if (command.assertions.some((existing) => existing.type === "todo")) {
      throw new Error(
        `"${command.input}" is marked [TODO]. Remove the TODO first \u2014 the runner stops at it, so an assertion added beside it would never be checked.`
      );
    }
    command.assertions = [
      ...command.assertions.filter((existing) => existing.type !== "skip"),
      assertion
    ];
    return draftFrom(transcript, file);
  }
  function newTranscript(spec) {
    const header = { title: spec.title, story: spec.story };
    if (spec.continuesFrom) header.continues = spec.continuesFrom;
    return serialize({
      filePath: "<new>",
      header,
      commands: [],
      items: [],
      goals: [],
      comments: [],
      config: { seeds: [], channels: [], events: false, forces: [] }
    });
  }
  function reparent(text, file, parentStem) {
    const transcript = editable(text, file);
    const own = (file.split("/").pop() ?? file).replace(/\.transcript$/, "");
    if (parentStem !== null && parentStem === own) {
      throw new Error("A transcript cannot continue from itself.");
    }
    if (parentStem !== null) transcript.header.continues = parentStem;
    else delete transcript.header.continues;
    return draftFrom(transcript, file);
  }
  function assertionsByCommandLine(text, file) {
    const byLine = /* @__PURE__ */ new Map();
    let transcript;
    try {
      transcript = parse(text, file);
    } catch {
      return byLine;
    }
    for (const command of transcript.commands) {
      byLine.set(
        command.lineNumber,
        command.assertions.map((assertion, index) => ({
          index,
          tag: serializeAssertionTag(assertion),
          ...assertion.block ? { block: assertion.block } : {},
          haltsEvaluation: assertion.type === "skip" || assertion.type === "todo"
        }))
      );
    }
    return byLine;
  }
  function commandCount(text, file) {
    try {
      const transcript = parse(text, file);
      if (transcript.parseErrors?.length) return null;
      return transcript.commands.length;
    } catch {
      return null;
    }
  }
  function removeAssertion(text, file, commandLine, index) {
    const transcript = editable(text, file);
    const command = transcript.commands.find((candidate) => candidate.lineNumber === commandLine);
    if (!command) throw new Error(`No command at line ${commandLine} of ${file}`);
    if (index < 0 || index >= command.assertions.length) {
      throw new Error(`"${command.input}" has no assertion ${index + 1} to remove.`);
    }
    const kept = command.assertions.filter((_, at) => at !== index);
    command.assertions = kept.length > 0 ? kept : [{ type: "skip" }];
    return draftFrom(transcript, file);
  }
  function addCommand(text, file, input) {
    const command = input.trim();
    if (!command) throw new Error("A command needs some text.");
    const transcript = editable(text, file, true);
    const added = { lineNumber: 0, input: command, expectedOutput: [], assertions: [{ type: "skip" }] };
    transcript.commands.push(added);
    transcript.items = [...transcript.items ?? [], { type: "command", command: added }];
    return draftFrom(transcript, file);
  }
  function editCommand(text, file, commandLine, input, expectedInput) {
    const replacement = input.trim();
    if (!replacement) throw new Error("A command needs some text.");
    const transcript = editable(text, file);
    const command = commandAt(transcript, file, commandLine, expectedInput);
    command.input = replacement;
    return draftFrom(transcript, file);
  }
  function deleteCommand(text, file, commandLine, expectedInput) {
    const transcript = editable(text, file);
    const target = commandAt(transcript, file, commandLine, expectedInput);
    transcript.commands = transcript.commands.filter((candidate) => candidate !== target);
    transcript.items = (transcript.items ?? []).filter(
      (item) => !(item.type === "command" && item.command === target)
    );
    return draftFrom(transcript, file);
  }
  function commandAt(transcript, file, commandLine, expectedInput) {
    const command = transcript.commands.find((candidate) => candidate.lineNumber === commandLine);
    if (!command) throw new Error(`No command at line ${commandLine} of ${file}`);
    if (expectedInput !== void 0 && command.input !== expectedInput) {
      throw new Error(
        `Line ${commandLine} is "> ${command.input}" now, not "> ${expectedInput}" \u2014 the file has changed since this run. Run again, then edit.`
      );
    }
    return command;
  }
  var NO_COMMANDS = "Transcript has no commands";
  function editable(text, file, allowEmpty = false) {
    const outlook = saveOutlook(text, file);
    if (outlook.kind === "unsound") {
      const blocking = allowEmpty ? outlook.problems.filter((problem) => problem !== NO_COMMANDS) : outlook.problems;
      if (blocking.length > 0) throw new Error(`Cannot edit ${file}: ${blocking.join("; ")}`);
    }
    return parse(text, file);
  }
  function draftFrom(transcript, file) {
    const written = serialize(transcript);
    return { text: written, outlook: saveOutlook(written, file) };
  }
  function countChangedLines(before, after) {
    const a = before.split("\n");
    const b = after.split("\n");
    const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    const common = lcs[0][0];
    return a.length - common + (b.length - common);
  }

  // tools/ide/web/testing-tab/src/promote.ts
  function promotionFor(output, selection) {
    const span = selection.trim();
    if (!span) return null;
    if (span === output.trim()) {
      return {
        form: "exact",
        label: "[OK]",
        because: "the whole response, matched exactly",
        assertion: { type: "ok", block: lines(span) }
      };
    }
    if (span.includes("\n") || span.includes('"')) {
      return {
        form: "contains-block",
        label: "[OK: contains] + text block",
        because: span.includes('"') ? "the text contains a double quote, which an inline fragment cannot hold" : "the text spans more than one line",
        assertion: { type: "ok-contains", block: lines(span) }
      };
    }
    return {
      form: "contains-inline",
      label: `[OK: contains "${span}"]`,
      because: "a fragment of one line",
      assertion: { type: "ok-contains", value: span }
    };
  }
  function lines(span) {
    return span.replace(/\r\n/g, "\n").split("\n");
  }

  // tools/ide/web/testing-tab/src/model.ts
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
    if (event.world !== void 0) node.entryWorld = event.world;
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
      actualOutput: event.actualOutput,
      turn: event.turn,
      ending: event.ending,
      diff: event.diff,
      world: event.world
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
  var STORY_OVER_ERROR = "Engine is not running";
  function storyEnd(node) {
    const ender = node.turns.findIndex((turn) => turn.ending !== void 0);
    if (ender >= 0) return { endsAt: node.turns[ender], dead: node.turns.slice(ender + 1) };
    const first = node.turns.findIndex((turn) => turn.error === STORY_OVER_ERROR);
    if (first < 0) return null;
    return { endsAt: first > 0 ? node.turns[first - 1] : null, dead: node.turns.slice(first) };
  }
  function reparentCandidates(model2, node) {
    const excluded = /* @__PURE__ */ new Set([node]);
    const mark = (parent) => {
      for (const child of parent.children) {
        excluded.add(child);
        mark(child);
      }
    };
    mark(node);
    return [...model2.nodes.values()].filter(
      (candidate) => !excluded.has(candidate) && storyEnd(candidate) === null
    );
  }
  function worldDelta(before, after) {
    if (!before || !after) return null;
    const movedTo = after.location && before.location?.token !== after.location.token ? after.location : void 0;
    const carried = new Set(before.inventory.map((item) => item.token));
    const carriedNow = new Set(after.inventory.map((item) => item.token));
    const took = after.inventory.filter((item) => !carried.has(item.token));
    const dropped = before.inventory.filter((item) => !carriedNow.has(item.token));
    if (!movedTo && took.length === 0 && dropped.length === 0) return null;
    return { ...movedTo !== void 0 ? { movedTo } : {}, took, dropped };
  }
  function worldBefore(node, index) {
    return index > 0 ? node.turns[index - 1].world : node.entryWorld;
  }
  function recordingChanges(node) {
    return node.turns.filter((turn) => turn.passed && turn.diff !== void 0);
  }
  function dismissRecordingChanges(node) {
    for (const turn of node.turns) delete turn.diff;
  }
  function descendantCount(node) {
    return node.children.reduce((total, child) => total + 1 + descendantCount(child), 0);
  }

  // tools/ide/web/testing-tab/src/dom.ts
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

  // tools/ide/web/testing-tab/src/views.ts
  function createSurface() {
    return {
      mode: "column",
      selected: null,
      opened: null,
      face: "cards",
      source: null,
      follow: true,
      status: "",
      pending: null,
      commandDraft: "",
      commandEdit: null,
      undoDepth: 0,
      runMatchesFile: true,
      newBranchName: "",
      reparentChoice: "",
      confirmingTrash: false,
      goldens: /* @__PURE__ */ new Set(),
      confirmingRecord: false,
      editNote: "",
      story: null,
      freshClaims: /* @__PURE__ */ new Map()
    };
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
      case "skipped":
        return "skipped \u2014 no commands yet; open it and add the first one";
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
  function turnRow(node, turn, actions2, showOutput = false, claims = null, surface2 = null, terminal = null, delta = null) {
    const row = el(
      "div",
      `turn${turn.passed ? "" : " bad"}${terminal ? ` ${terminal}` : ""}${turn.passed && turn.diff ? " rerecorded" : ""}`
    );
    const line = el("button", "ln", String(turn.line));
    line.type = "button";
    line.title = `${node.file}:${turn.line}`;
    line.addEventListener("click", () => actions2.openLocation(node.file, turn.line));
    row.append(line);
    const command = el("div", "cmd");
    command.append(el("b", null, "> "));
    if (surface2?.commandEdit?.line === turn.line) {
      const field = el("input", "cmdedit");
      field.type = "text";
      field.id = "editcommand";
      field.autocomplete = "off";
      field.value = surface2.commandEdit.draft;
      field.addEventListener("input", () => {
        surface2.commandEdit = { line: turn.line, draft: field.value };
      });
      field.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          actions2.editCommand(turn.line, field.value);
        } else if (event.key === "Escape") {
          event.stopPropagation();
          actions2.cancelCommandEdit();
        }
      });
      const change = el("button", "editgo", "Change");
      change.type = "button";
      change.addEventListener("click", () => actions2.editCommand(turn.line, field.value));
      const keep = el("button", "editcancel", "Keep");
      keep.type = "button";
      keep.addEventListener("click", () => actions2.cancelCommandEdit());
      command.append(field, change, keep);
    } else {
      command.append(document.createTextNode(turn.input));
      if (surface2 && surface2.source?.outlook?.kind !== "unsound") {
        const edit = el("button", "editcmd");
        edit.type = "button";
        edit.title = `Change "${turn.input}" \u2014 what the file asserts about it stays`;
        edit.dataset.editLine = String(turn.line);
        edit.addEventListener("click", () => actions2.beginCommandEdit(turn.line, turn.input));
        command.append(edit);
      }
    }
    row.append(command);
    if (showOutput) {
      const turnNumber = el("span", "turnno", turn.turn !== void 0 ? `turn ${turn.turn}` : "");
      turnNumber.title = turn.turn !== void 0 ? "The engine turn this command executed as \u2014 meta commands share their turn with the next action" : "";
      row.append(turnNumber);
    }
    const verdict = el("div", "verdict");
    verdict.textContent = turn.skipped ? "SKIP" : turn.expectedFailure ? "XFAIL" : turn.passed ? "PASS" : "FAIL";
    row.append(verdict);
    if (showOutput) {
      const remove = el("button", "drop", "\u2715");
      remove.type = "button";
      remove.title = `Remove "${turn.input}" and everything asserted about it`;
      remove.dataset.deleteLine = String(turn.line);
      remove.addEventListener("click", () => actions2.deleteCommand(turn.line));
      row.append(remove);
    }
    const captured = turn.actualOutput !== void 0;
    if (turn.error || captured && (showOutput || !turn.passed)) {
      const detail = el("div", "detail");
      if (turn.error) detail.append(el("div", "err", turn.error));
      if (captured) {
        if (turn.actualOutput) {
          const output = el("pre", "actual", turn.actualOutput);
          output.dataset.commandLine = String(turn.line);
          detail.append(output);
        } else {
          detail.append(el("div", "silent", "The story printed nothing this turn."));
        }
      }
      row.append(detail);
    }
    if (turn.diff && (showOutput || !turn.passed)) {
      const prior = el("div", "recordedside");
      prior.append(
        el("div", "recordedlabel", turn.passed ? "Previously recorded:" : "The recording expects:")
      );
      prior.append(el("pre", "recorded", turn.diff.recorded.join("\n")));
      row.append(prior);
    }
    if (delta && surface2 && surface2.source?.outlook?.kind !== "unsound") {
      const changes = el("div", "worldrow");
      const chip = (label, title, assertTrue, expression) => {
        const button = el("button", "worldchip", label);
        button.type = "button";
        button.title = title;
        button.addEventListener(
          "click",
          () => actions2.assertWorldChange(turn.line, assertTrue, expression)
        );
        changes.append(button);
      };
      if (delta.movedTo) {
        chip(
          `\u2192 ${delta.movedTo.name}`,
          `Assert the player ends this turn in ${delta.movedTo.name}`,
          true,
          `player.location = ${delta.movedTo.token}`
        );
      }
      for (const item of delta.took) {
        chip(
          `+ ${item.name}`,
          `Assert the player is carrying ${item.name} after this turn`,
          true,
          `player.inventory contains ${item.token}`
        );
      }
      for (const item of delta.dropped) {
        chip(
          `\u2212 ${item.name}`,
          `Assert the player is no longer carrying ${item.name} after this turn`,
          false,
          `player.inventory contains ${item.token}`
        );
      }
      row.append(changes);
    }
    if (claims && claims.length) {
      const list = el("div", "claims");
      claims.forEach((claim) => list.append(claimRow(turn.line, claim, actions2)));
      row.append(list);
    }
    const fresh = surface2?.freshClaims.get(turn.input);
    if (fresh && fresh.size) {
      const shown = new Set((claims ?? []).map((claim) => claim.tag));
      const list = el("div", "claims");
      let any = false;
      fresh.forEach((tag) => {
        if (shown.has(tag)) return;
        const claim = el("div", "claim fresh");
        claim.append(el("code", "ctag", tag));
        claim.append(el("span", "cfresh", "new \u2014 not tested until the next run"));
        list.append(claim);
        any = true;
      });
      if (any) row.append(list);
    }
    if (terminal === "ends") {
      row.append(el("div", "endshere", "The story ends here."));
    } else if (terminal === "dead") {
      row.append(
        el("div", "deadnote", "The story had already ended \u2014 this command could not run.")
      );
    }
    return row;
  }
  function authoredRow(node, line, input, claims, actions2) {
    const row = el("div", "turn new");
    const ln = el("button", "ln", String(line));
    ln.type = "button";
    ln.title = `${node.file}:${line}`;
    ln.addEventListener("click", () => actions2.openLocation(node.file, line));
    row.append(ln);
    const command = el("div", "cmd");
    command.append(el("b", null, "> "));
    command.append(document.createTextNode(input));
    row.append(command);
    row.append(el("span", "verdict newbadge", "NEW"));
    const real = claims.filter((claim) => !(claim.tag === "[SKIP]" && claims.length === 1));
    if (real.length) {
      const list = el("div", "claims");
      real.forEach((claim) => {
        const item = claimRow(line, claim, actions2);
        item.classList.add("fresh");
        list.append(item);
      });
      row.append(list);
    }
    row.append(
      el(
        "div",
        "newnote",
        real.length ? "Not yet run \u2014 Run Tests to check it." : "Not yet run. Run Tests to see what the story says, then select the part that matters to turn it into an assertion."
      )
    );
    return row;
  }
  function claimRow(commandLine, claim, actions2) {
    const row = el("div", claim.haltsEvaluation ? "claim halts" : "claim");
    row.append(el("code", "ctag", claim.tag));
    if (claim.block) row.append(el("pre", "cblock", claim.block.join("\n")));
    if (claim.haltsEvaluation) {
      row.append(el("span", "chalt", "the run stops here \u2014 nothing after it is checked"));
    }
    const remove = el("button", "cdrop", "\u2715");
    remove.type = "button";
    remove.title = `Remove ${claim.tag}`;
    remove.dataset.removeAssertion = `${commandLine}:${claim.index}`;
    remove.addEventListener("click", () => actions2.removeAssertion(commandLine, claim.index));
    row.append(remove);
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
  function sourceFace(node, surface2) {
    const pane = el("div", "sourceface");
    const loaded = surface2.source;
    if (!loaded || loaded.file !== node.file) {
      pane.append(el("div", "more", "Reading the file\u2026"));
      return pane;
    }
    if (loaded.error !== null) {
      pane.append(el("div", "err", loaded.error));
      return pane;
    }
    if (loaded.text === null) {
      pane.append(el("div", "more", "Reading the file\u2026"));
      return pane;
    }
    const outlook = loaded.outlook;
    if (outlook?.kind === "unsound") {
      const note = el("div", "normnote bad");
      note.textContent = "The test run would refuse this file, so the editor will not rewrite it:";
      pane.append(note);
      const problems = el("ul", "problems");
      outlook.problems.forEach((problem) => problems.append(el("li", null, problem)));
      pane.append(problems);
    } else if (outlook?.kind === "empty") {
      pane.append(
        el(
          "div",
          "normnote",
          "No commands yet \u2014 a new transcript starts empty so the first command is yours. Add it on the Cards face; the run refuses the file until then."
        )
      );
    } else if (outlook?.kind === "reformats") {
      const n = outlook.changedLines;
      pane.append(
        el(
          "div",
          "normnote",
          `Saving would reformat this file \u2014 ${n} line${n === 1 ? "" : "s"} differ from what the serializer writes.`
        )
      );
    } else if (outlook?.kind === "clean") {
      pane.append(el("div", "normnote clean", "Saving would leave this file byte-for-byte as it is."));
    }
    pane.append(el("pre", "source", loaded.text));
    return pane;
  }
  function renderDocument(model2, surface2, actions2) {
    const view = byId("docview");
    const focused = document.activeElement?.id;
    const typing = focused === "addcommand" || focused === "editcommand" ? focused : null;
    view.replaceChildren();
    const node = surface2.opened;
    if (!node) return;
    const header = el("header");
    const back = el("button", "back", "\u2039 Back");
    back.type = "button";
    back.addEventListener("click", () => actions2.back());
    header.append(back, el("h2", null, node.stem));
    const faces = el("div", "seg faces");
    [
      ["cards", "Cards", "The run: each command with what the story said"],
      ["source", "Source", "The file on disk, and what saving would write"]
    ].forEach(([face, label, title]) => {
      const button = el("button", null, label);
      button.type = "button";
      button.title = title;
      button.dataset.face = face;
      button.setAttribute("aria-pressed", String(surface2.face === face));
      button.addEventListener("click", () => actions2.setFace(face));
      faces.append(button);
    });
    header.append(faces);
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
    if (surface2.goldens.has(node.file)) cell("Tier", "golden \u2014 the recording is the assertion", "gold");
    if (node.entryWorld) {
      const entry = node.entryWorld;
      const carrying = entry.inventory.length ? entry.inventory.map((item) => item.name).join(", ") : "nothing";
      cell(
        "Starts",
        `${entry.location ? `in ${entry.location.name}` : "in an unnamed place"} \xB7 carrying ${carrying}`,
        "entry"
      );
    }
    view.append(meta);
    if (surface2.face === "source") {
      view.append(sourceFace(node, surface2));
      return;
    }
    let authoredTail = [];
    if (surface2.source?.file === node.file && surface2.source.text !== null) {
      try {
        const transcript = parse(surface2.source.text, node.file);
        const byLine = assertionsByCommandLine(surface2.source.text, node.file);
        authoredTail = transcript.commands.slice(node.turns.length).map((command) => ({
          line: command.lineNumber,
          input: command.input,
          claims: byLine.get(command.lineNumber) ?? []
        }));
      } catch {
      }
    }
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
      if (!authoredTail.length) turns.append(el("div", "more", "No turns recorded."));
    } else {
      const claims = surface2.runMatchesFile && surface2.source?.file === node.file && surface2.source.text !== null ? assertionsByCommandLine(surface2.source.text, node.file) : null;
      const end2 = storyEnd(node);
      const firstDead = end2 ? node.turns.length - end2.dead.length : -1;
      node.turns.forEach(
        (turn, index) => turns.append(
          turnRow(
            node,
            turn,
            actions2,
            true,
            claims?.get(turn.line) ?? null,
            surface2,
            end2 === null ? null : index >= firstDead ? "dead" : index === firstDead - 1 ? "ends" : null,
            worldDelta(worldBefore(node, index), turn.world)
          )
        )
      );
    }
    if (node.status !== "unreached") {
      authoredTail.forEach(
        (command) => turns.append(authoredRow(node, command.line, command.input, command.claims, actions2))
      );
    }
    view.append(turns);
    const changed = recordingChanges(node);
    if (changed.length && surface2.goldens.has(node.file)) {
      view.append(reviewBar(changed.length, actions2));
    }
    const end = storyEnd(node);
    view.append(fileBar(model2, node, surface2, actions2));
    if (end) view.append(terminalBar(node, end));
    else view.append(commandBar(surface2, actions2));
    if (surface2.editNote) view.append(editNote(surface2, actions2));
    const slot = el("div");
    slot.id = "promoteslot";
    view.append(slot);
    renderPromoteSlot(surface2, actions2);
    if (typing) {
      const field = document.getElementById(typing);
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
    }
  }
  function fileBar(model2, node, surface2, actions2) {
    const bar = el("div", "filebar");
    const field = el("input", "branchinput");
    field.type = "text";
    field.id = "newbranch";
    field.placeholder = "Branch from this transcript\u2026";
    field.autocomplete = "off";
    field.value = surface2.newBranchName;
    if (storyEnd(node)) {
      field.disabled = true;
      field.placeholder = "The story ends in this transcript \u2014 a branch from it could never run.";
    }
    field.addEventListener("input", () => {
      surface2.newBranchName = field.value;
    });
    const branch = () => {
      const name = field.value.trim();
      if (!name) return;
      actions2.newBranch(name);
    };
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        branch();
      }
    });
    const go = el("button", "branchgo", "Branch");
    go.type = "button";
    go.disabled = field.disabled;
    go.addEventListener("click", branch);
    bar.append(field, go);
    const option = (label, value) => {
      const choice = el("option", null, label);
      choice.value = value;
      return choice;
    };
    const pick = el("select", "repick");
    const lead = option(
      node.parent ? `Continues from ${stemOf(node.parent)}\u2026` : "A root \u2014 continues from nothing\u2026",
      ""
    );
    lead.disabled = true;
    pick.append(lead);
    if (node.parent) pick.append(option("nothing \u2014 make it a root", "<root>"));
    for (const candidate of reparentCandidates(model2, node)) {
      if (candidate.file === node.parent) continue;
      pick.append(option(candidate.stem, candidate.stem));
    }
    pick.value = surface2.reparentChoice || "";
    const apply = el("button", "reparentgo", "Reparent");
    apply.type = "button";
    apply.disabled = surface2.reparentChoice === "";
    pick.addEventListener("change", () => {
      surface2.reparentChoice = pick.value;
      apply.disabled = pick.value === "";
    });
    apply.addEventListener("click", () => {
      const choice = surface2.reparentChoice;
      if (!choice) return;
      actions2.reparent(choice === "<root>" ? null : choice);
    });
    bar.append(pick, apply);
    const isGolden = surface2.goldens.has(node.file);
    if (surface2.confirmingRecord) {
      const confirm = el("button", "recordgold armed", isGolden ? "Overwrite the recording?" : "Run and record?");
      confirm.type = "button";
      confirm.addEventListener("click", () => actions2.recordGolden());
      const keep = el("button", "recordcancel", "Keep as is");
      keep.type = "button";
      keep.addEventListener("click", () => actions2.setConfirmingRecord(false));
      bar.append(confirm, keep);
    } else {
      const ask = el("button", "recordgold", isGolden ? "Re-record golden\u2026" : "Record golden\u2026");
      ask.type = "button";
      ask.disabled = model2.inFlight;
      ask.title = isGolden ? "Run the suite and overwrite this file\u2019s recording with what the story says now" : "Run the suite and record this file\u2019s output as its golden \u2014 the recording becomes the assertion, and any per-command assertions in the file stop being evaluated (ADR-294 D2)";
      ask.addEventListener("click", () => actions2.setConfirmingRecord(true));
      bar.append(ask);
    }
    if (surface2.confirmingTrash) {
      const confirm = el("button", "trash armed", "Move to Trash?");
      confirm.type = "button";
      confirm.addEventListener("click", () => actions2.trashOpenDocument());
      const cancel = el("button", "trashcancel", "Keep");
      cancel.type = "button";
      cancel.addEventListener("click", () => actions2.setConfirmingTrash(false));
      bar.append(confirm, cancel);
    } else {
      const ask = el("button", "trash", "Trash\u2026");
      ask.type = "button";
      ask.title = "Move this transcript to the Trash";
      ask.addEventListener("click", () => actions2.setConfirmingTrash(true));
      bar.append(ask);
    }
    return bar;
  }
  function editNote(surface2, actions2) {
    const note = el("div", "editnote");
    note.append(el("span", "said", surface2.editNote));
    if (surface2.undoDepth > 0) {
      const undo = el("button", "undo", surface2.undoDepth > 1 ? `Undo (${surface2.undoDepth})` : "Undo");
      undo.type = "button";
      undo.title = "Put the file back the way it was before the last edit";
      undo.addEventListener("click", () => actions2.undo());
      note.append(undo);
    }
    return note;
  }
  function reviewBar(changed, actions2) {
    const bar = el("div", "reviewbar");
    bar.append(
      el(
        "span",
        "said",
        `${changed} turn${changed === 1 ? "" : "s"} changed from the previous recording \u2014 the changed cards show both sides.`
      )
    );
    const keep = el("button", "keepnew", "Keep the new recording");
    keep.type = "button";
    keep.addEventListener("click", () => actions2.keepNewRecording());
    const restore = el("button", "restoreold", "Restore the previous recording");
    restore.type = "button";
    restore.title = "Put back the recording as it was before this re-record \u2014 the next run replays against it, and stays red until the story matches it again";
    restore.addEventListener("click", () => actions2.restorePreviousRecording());
    bar.append(keep, restore);
    return bar;
  }
  function terminalBar(node, end) {
    const bar = el("div", "terminalbar");
    const from = node.parent ? `branch a new transcript from ${stemOf(node.parent)}` : "branch a new transcript from an earlier point";
    bar.append(
      el(
        "span",
        "said",
        end.endsAt ? `The story ends at "> ${end.endsAt.input}" \u2014 a command appended here could never run. To explore another path, ${from}.` : "The story had already ended when this file began \u2014 its ancestry reaches an ending, so no command here can run."
      )
    );
    return bar;
  }
  function commandBar(surface2, actions2) {
    const bar = el("div", "addcmd");
    const field = el("input", "cmdinput");
    field.type = "text";
    field.id = "addcommand";
    field.placeholder = "Add a command\u2026";
    field.autocomplete = "off";
    field.value = surface2.commandDraft;
    field.addEventListener("input", () => {
      surface2.commandDraft = field.value;
    });
    const unsound = surface2.source?.outlook?.kind === "unsound";
    field.disabled = unsound;
    if (unsound) field.placeholder = "The test run would refuse this file \u2014 fix it in the editor first.";
    if (surface2.source?.outlook?.kind === "empty") field.placeholder = "Add the first command\u2026";
    const submit = () => {
      const input = field.value.trim();
      if (!input) return;
      field.value = "";
      surface2.commandDraft = "";
      actions2.addCommand(input);
    };
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
    const add = el("button", "addgo", "Add");
    add.type = "button";
    add.disabled = unsound;
    add.addEventListener("click", submit);
    bar.append(field, add);
    return bar;
  }
  function promoteBar(pending, surface2, actions2) {
    const bar = el("div", "promote");
    bar.append(el("span", "for", `> ${pending.input}`));
    bar.append(el("code", "tag", pending.promotion.label));
    bar.append(el("span", "why", pending.promotion.because));
    const button = el("button", "go", "Add assertion");
    button.type = "button";
    button.dataset.promote = pending.promotion.form;
    const unsound = surface2.source?.outlook?.kind === "unsound";
    button.disabled = unsound;
    if (unsound) button.title = "The test run would refuse this file \u2014 fix it in the editor first.";
    button.addEventListener("click", () => actions2.promote());
    bar.append(button);
    return bar;
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
    byId("run").toggleAttribute("disabled", model2.inFlight);
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
  function renderPromoteSlot(surface2, actions2) {
    const slot = document.getElementById("promoteslot");
    if (!slot) return;
    slot.replaceChildren();
    if (surface2.pending) slot.append(promoteBar(surface2.pending, surface2, actions2));
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
    byId("newbar").classList.toggle("on", !showing && surface2.story !== null);
    if (showing) renderDocument(model2, surface2, actions2);
    else if (surface2.mode === "column") renderColumns(model2, surface2, actions2);
    else if (surface2.mode === "list") renderList(model2, surface2, actions2);
    else renderDocuments(model2, surface2, actions2);
    if (!showing && surface2.story !== null && model2.nodes.size === 0) {
      const containers = { column: "cols", list: "list", documents: "docs" };
      byId(containers[surface2.mode]).replaceChildren(
        el(
          "div",
          "emptysuite",
          "This story has no transcripts yet. Name the first one above and press Create \u2014 it starts empty, and its first command is yours."
        )
      );
    }
    renderPathBar(model2, surface2);
  }

  // tools/ide/web/testing-tab/src/main.ts
  var model = createModel();
  var surface = createSurface();
  var framePending = false;
  var inFlightWrite = null;
  var undoStack = [];
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
      scheduleRender();
    },
    open(node) {
      surface.opened = node;
      surface.selected = node;
      loadSource(node.file);
      clearEditingState();
      scheduleRender();
    },
    back() {
      surface.opened = null;
      surface.source = null;
      surface.face = "cards";
      clearEditingState();
      scheduleRender();
    },
    setMode(mode) {
      surface.mode = mode;
      surface.opened = null;
      surface.source = null;
      surface.face = "cards";
      clearEditingState();
      host.persistMode(mode);
      scheduleRender();
    },
    setFace(face) {
      surface.face = face;
      if (face === "source" && surface.opened && surface.source?.file !== surface.opened.file) {
        loadSource(surface.opened.file);
      }
      scheduleRender();
    },
    openLocation(file, line) {
      host.openLocation(file, line);
    },
    promote() {
      const pending = surface.pending;
      if (!pending) return;
      applyEdit(
        (text, file) => addAssertion(text, file, pending.commandLine, pending.promotion.assertion, pending.input),
        pending.promotion.label,
        { freshClaim: { input: pending.input, tag: pending.promotion.label } }
      );
    },
    addCommand(input) {
      applyEdit((text, file) => addCommand(text, file, input), `> ${input}`);
    },
    deleteCommand(commandLine) {
      const turn = surface.opened?.turns.find((candidate) => candidate.line === commandLine);
      applyEdit(
        (text, file) => deleteCommand(text, file, commandLine, turn?.input),
        "the removal"
      );
    },
    beginCommandEdit(commandLine, current) {
      surface.commandEdit = { line: commandLine, draft: current };
      scheduleRender();
    },
    cancelCommandEdit() {
      surface.commandEdit = null;
      scheduleRender();
    },
    editCommand(commandLine, input) {
      const turn = surface.opened?.turns.find((candidate) => candidate.line === commandLine);
      surface.commandEdit = null;
      if (turn && input.trim() === turn.input) {
        scheduleRender();
        return;
      }
      applyEdit(
        (text, file) => editCommand(text, file, commandLine, input, turn?.input),
        `> ${input.trim()}`
      );
    },
    reparent(stem) {
      const node = surface.opened;
      if (!node) return;
      surface.reparentChoice = "";
      const below = descendantCount(node);
      const subtree = below > 0 ? `It and the ${below} transcript${below === 1 ? "" : "s"} below it now run from a different history \u2014 their turn numbers and their assertions may no longer hold.` : "It now runs from a different history \u2014 its turn numbers and its assertions may no longer hold.";
      applyEdit(
        (text, file) => reparent(text, file, stem),
        stem ? `continues: ${stem}` : "the promotion to a root",
        { warning: subtree }
      );
    },
    newBranch(name) {
      const parent = surface.opened;
      if (!parent) return;
      const text = newTranscript({
        story: byId("story").textContent ?? "",
        title: name,
        continuesFrom: parent.stem
      });
      surface.editNote = "Creating\u2026";
      host.createTranscript(name, text);
      scheduleRender();
    },
    setConfirmingTrash(confirming) {
      surface.confirmingTrash = confirming;
      scheduleRender();
    },
    trashOpenDocument() {
      const node = surface.opened;
      surface.confirmingTrash = false;
      if (!node) return;
      if (node.children.length) {
        const count = node.children.length;
        surface.editNote = `${count} transcript${count === 1 ? "" : "s"} continue from ${node.stem}. Remove ${count === 1 ? "it" : "them"} first, or reparent ${count === 1 ? "it" : "them"}.`;
        scheduleRender();
        return;
      }
      host.trashTranscript(node.file);
    },
    removeAssertion(commandLine, index) {
      applyEdit((text, file) => removeAssertion(text, file, commandLine, index), "the removal");
    },
    assertWorldChange(commandLine, assertTrue, expression) {
      const chipTurn = surface.opened?.turns.find((candidate) => candidate.line === commandLine);
      applyEdit(
        (text, file) => addAssertion(text, file, commandLine, {
          type: "state-assert",
          assertTrue,
          stateExpression: expression
        }),
        `[STATE: ${assertTrue}, ${expression}]`,
        chipTurn ? { freshClaim: { input: chipTurn.input, tag: `[STATE: ${assertTrue}, ${expression}]` } } : {}
      );
    },
    setConfirmingRecord(confirming) {
      surface.confirmingRecord = confirming;
      scheduleRender();
    },
    recordGolden() {
      const node = surface.opened;
      surface.confirmingRecord = false;
      if (!node) return;
      surface.editNote = "";
      host.recordGolden(node.file);
      scheduleRender();
    },
    keepNewRecording() {
      const node = surface.opened;
      if (!node) return;
      dismissRecordingChanges(node);
      surface.editNote = "The new recording stands \u2014 future runs replay against it.";
      scheduleRender();
    },
    restorePreviousRecording() {
      const node = surface.opened;
      if (!node) return;
      surface.editNote = "Restoring the previous recording\u2026";
      host.restoreGolden(node.file);
      scheduleRender();
    },
    undo() {
      const previous = undoStack[undoStack.length - 1];
      if (previous === void 0) return;
      applyEdit((_, file) => ({ text: previous, outlook: saveOutlook(previous, file) }), "the undo", {
        popsUndo: true
      });
    }
  };
  function applyEdit(edit, label, options = {}) {
    const loaded = surface.source;
    const node = surface.opened;
    if (!node || !loaded || loaded.text === null) return;
    try {
      const draft = edit(loaded.text, node.file);
      inFlightWrite = { file: node.file, draft, label, before: loaded.text, ...options };
      const countBefore = commandCount(loaded.text, node.file);
      const countAfter = commandCount(draft.text, node.file);
      if (countBefore !== null && countAfter !== null && countBefore !== countAfter) {
        const below = descendantCount(node);
        if (below > 0) {
          inFlightWrite.warning = `This changed the file's turn count \u2014 ${below} transcript${below === 1 ? "" : "s"} continue${below === 1 ? "s" : ""} from it, and every turn-scheduled beat in ${below === 1 ? "it" : "them"} now falls on a different command.`;
        }
      }
      surface.pending = null;
      surface.editNote = "Writing\u2026";
      host.writeTranscript(node.file, draft.text);
    } catch (error) {
      surface.pending = null;
      surface.editNote = error instanceof Error ? error.message : String(error);
    }
    scheduleRender();
  }
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
      byId("story").textContent = story;
      surface.story = story === "No story open" ? null : story;
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
    onGoldens(files) {
      surface.goldens = new Set(files);
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
    },
    onSource(file, text) {
      if (surface.source?.file !== file) return;
      surface.source = { file, text, error: null, outlook: saveOutlook(text, file) };
      scheduleRender();
    },
    onSourceFailed(file, message) {
      if (surface.source?.file !== file) return;
      surface.source = { file, text: null, error: message, outlook: null };
      scheduleRender();
    },
    onSaved(file) {
      const write = inFlightWrite;
      inFlightWrite = null;
      if (!write || write.file !== file) return;
      surface.source = { file, text: write.draft.text, error: null, outlook: write.draft.outlook };
      if (write.popsUndo) undoStack.pop();
      else undoStack.push(write.before);
      if (write.freshClaim) {
        const tags = surface.freshClaims.get(write.freshClaim.input) ?? /* @__PURE__ */ new Set();
        tags.add(write.freshClaim.tag);
        surface.freshClaims.set(write.freshClaim.input, tags);
      }
      surface.undoDepth = undoStack.length;
      surface.runMatchesFile = false;
      surface.editNote = `Wrote ${write.label} \u2014 the run below predates this edit. Run again to see it evaluated.`;
      if (write.warning) surface.editNote += ` ${write.warning}`;
      surface.commandDraft = "";
      scheduleRender();
    },
    onCreated(file) {
      surface.newBranchName = "";
      byId("newroot").value = "";
      noteCreation(`Created ${stemOf(file)}. Add its first command, then run.`);
      scheduleRender();
    },
    onCreateFailed(message) {
      noteCreation(message);
      scheduleRender();
    },
    onTrashed(file) {
      if (surface.opened?.file === file) {
        surface.opened = null;
        surface.source = null;
        clearEditingState();
      }
      surface.status = `Moved ${stemOf(file)} to the Trash.`;
      scheduleRender();
    },
    onTrashFailed(file, message) {
      surface.editNote = `${stemOf(file)} was not removed. ${message}`;
      scheduleRender();
    },
    onSaveFailed(file, message) {
      const write = inFlightWrite;
      inFlightWrite = null;
      if (!write || write.file !== file) return;
      surface.editNote = `The assertion was not written. ${message}`;
      scheduleRender();
    },
    onGoldenRestored(file) {
      const node = model.nodes.get(file);
      if (node) dismissRecordingChanges(node);
      if (surface.opened?.file === file) {
        surface.editNote = "The previous recording was restored \u2014 the next run replays against it, and stays red until the story matches it again.";
      }
      scheduleRender();
    },
    onGoldenRestoreFailed(file, message) {
      surface.editNote = `${stemOf(file)}'s previous recording was not restored. ${message}`;
      scheduleRender();
    }
  });
  function loadSource(file) {
    surface.source = { file, text: null, error: null, outlook: null };
    host.requestSource(file);
  }
  function clearEditingState() {
    surface.pending = null;
    surface.editNote = "";
    surface.commandDraft = "";
    surface.commandEdit = null;
    surface.undoDepth = 0;
    surface.runMatchesFile = true;
    surface.newBranchName = "";
    surface.reparentChoice = "";
    surface.confirmingTrash = false;
    surface.confirmingRecord = false;
    surface.freshClaims = /* @__PURE__ */ new Map();
    undoStack = [];
    inFlightWrite = null;
  }
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
  function installSelectionWatcher() {
    document.addEventListener("selectionchange", () => {
      const next = selectionPromotion();
      const same = next?.commandLine === surface.pending?.commandLine && next?.promotion.label === surface.pending?.promotion.label;
      if (same) return;
      surface.pending = next;
      renderPromoteSlot(surface, actions);
    });
  }
  function selectionPromotion() {
    if (!surface.opened || surface.face !== "cards") return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return null;
    const output = outputElementFor(range.startContainer);
    if (!output || output !== outputElementFor(range.endContainer)) return null;
    const commandLine = Number(output.dataset.commandLine);
    const turn = surface.opened.turns.find((candidate) => candidate.line === commandLine);
    if (!turn || turn.actualOutput === void 0) return null;
    const promotion = promotionFor(turn.actualOutput, range.toString());
    if (!promotion) return null;
    return { commandLine, input: turn.input, promotion };
  }
  function outputElementFor(node) {
    const start = node instanceof Element ? node : node?.parentElement ?? null;
    return start?.closest("#docview .turn .actual[data-command-line]") ?? null;
  }
  function noteCreation(message) {
    if (surface.opened) surface.editNote = message;
    else surface.status = message;
  }
  function createRootTranscript(name) {
    const text = newTranscript({
      story: surface.story ?? "",
      title: name,
      continuesFrom: null
    });
    noteCreation("Creating\u2026");
    host.createTranscript(name, text);
    scheduleRender();
  }
  function installNewTranscriptBar() {
    const field = byId("newroot");
    const create = () => {
      const name = field.value.trim();
      if (!name) return;
      createRootTranscript(name);
    };
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        create();
      }
    });
    byId("newroot-create").addEventListener("click", create);
  }
  function installToolbar() {
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => actions.setMode(button.dataset.mode));
    });
    byId("run").addEventListener("click", () => host.run());
    byId("cancel").addEventListener("click", () => host.cancel());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && surface.opened) actions.back();
    });
  }
  installToolbar();
  installNewTranscriptBar();
  installSelectionWatcher();
  render(model, surface, actions);
  host.ready();
})();
