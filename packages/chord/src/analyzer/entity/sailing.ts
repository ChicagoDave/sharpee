/**
 * sailing.ts — the `use sailing` lines of an expanse and an open vehicle
 *
 * Reads, after the vehicle and expanse builders: `wind:` on an expanse; the
 * `sailing … end sailing` block, `sails:` and `sails start:` on a vehicle;
 * `commands: naval`. Every word needs the use line, sits on an open vehicle
 * or an expanse, and the block and lines hold their shape: bands that cover
 * the half circle once, a calm row, every setting paced in every band. The
 * IR gains `expanse.wind`, `vehicle.sailing` and `vehicle.sails`.
 *
 * Public interface: sailingBuilder.
 * Owner context: @sharpee/chord analyzer, entity-block line builders.
 *
 * References:
 * - ADR-375 D1 — the gate: `sailing-needs-use`, `sailing-not-open`.
 * - ADR-375 D4 — wind on the expanse; `sailing-without-wind`, `sailing-and-pace`.
 * - ADR-375 D5 — the block: `sailing-gap`, `sailing-overlap`, `sailing-no-calm`.
 * - ADR-375 D7 — sails: `sails-missing-start`, `sails-unknown-setting`,
 *   `sails-without-sailing`, `sailing-row-missing-setting`.
 */

import type { CreateDecl, VehicleLine } from '../../ast.js';
import type { IRSailing, IRSailingBand } from '../../ir.js';
import { vehicleLineOf } from '../vehicles.js';
import { isExpanseDecl } from '../expanses.js';
import { windToIR } from '../sailing.js';
import type { EntityBuildContext, EntityDraft, EntityLineBuilder } from './context.js';

/** The vehicle-side sailing lines (D7). */
const SAIL_LINE_KEYS: ReadonlySet<VehicleLine['key']> = new Set(['sails', 'sails-start']);

export const sailingBuilder: EntityLineBuilder = {
  name: 'sailing',
  requires: ['vehicle', 'expanse'],
  build(decl, entity, context) {
    const name = decl.name.words.join(' ');
    const windLine = vehicleLineOf(decl, 'wind');
    const sailLines = decl.vehicleLines.filter((l) => SAIL_LINE_KEYS.has(l.key));
    const commandsLine = vehicleLineOf(decl, 'commands');
    const naval = commandsLine?.sets.find((s) => s.word === 'naval');
    const block = decl.sailingBlock;
    const offending = windLine?.span ?? block?.span ?? sailLines[0]?.span ?? naval?.span;
    if (!offending) return;

    // D1: the gate — every word needs the use line; reported once per block.
    if (!context.usedExtensions.has('sailing')) {
      context.diagnostics.error(
        'analysis.sailing-needs-use',
        `\`${name}\` writes \`use sailing\` vocabulary — add \`use sailing\` to the story header.`,
        offending,
      );
      return;
    }

    // D4: wind is the expanse's line.
    if (windLine) {
      if (isExpanseDecl(decl) && entity.expanse) {
        entity.expanse.wind = windToIR(windLine.wind);
      } else {
        context.diagnostics.error(
          'analysis.sailing-not-open',
          `\`wind:\` is an expanse's line — \`${name}\` is not \`an expanse\`. A sea where the wind matters is an expanse (ADR-375 D1).`,
          windLine.span,
        );
      }
    }

    // D5, D7: the block and the sail lines are a sailing vehicle's — `movement: open`.
    const vehicle = context.vehicles.get(entity.id);
    const open = vehicle?.movement === 'open';
    if (block || sailLines.length > 0) {
      if (!open) {
        const where = block?.span ?? sailLines[0]!.span;
        context.diagnostics.error(
          'analysis.sailing-not-open',
          `A \`sailing\` block and \`sails:\` belong to a sailing vehicle, and sailing is \`movement: open\` — \`${name}\` is ${vehicle ? (vehicle.movement ? `\`movement: ${vehicle.movement}\`` : 'a vehicle with no movement type') : 'not a vehicle'}.`,
          where,
        );
        return;
      }
      buildSailing(decl, entity, context, name);
    }
  },
};

/** The sailing block (D4, D5) and the sails (D7) of an open vehicle, lowered. */
function buildSailing(decl: CreateDecl, entity: EntityDraft, context: EntityBuildContext, name: string): void {
  const vehicle = entity.vehicle;
  if (!vehicle) return;
  const block = decl.sailingBlock;
  const paceLine = vehicleLineOf(decl, 'pace');
  const sailsLine = vehicleLineOf(decl, 'sails');
  const startLine = vehicleLineOf(decl, 'sails-start');

  // D7: the settings, least to most canvas, and the starting one.
  let settings: string[] | null = null;
  if (sailsLine) {
    if (!block) {
      context.diagnostics.error(
        'analysis.sails-without-sailing',
        `\`sails:\` sets the pace within each band of a \`sailing\` block — \`${name}\` has none.`,
        sailsLine.span,
      );
    }
    settings = [];
    for (const s of sailsLine.settings) {
      if (settings.includes(s.word)) {
        context.diagnostics.error('analysis.sails-unknown-setting', `\`${s.word}\` is named twice in \`sails:\` — each setting once, least to most canvas.`, s.span);
        continue;
      }
      settings.push(s.word);
    }
    if (!startLine) {
      context.diagnostics.error(
        'analysis.sails-missing-start',
        `\`${name}\` declares sails and says nothing about where they start — add \`sails start: <setting>\`.`,
        sailsLine.span,
      );
    } else if (!settings.includes(startLine.setting.word)) {
      context.diagnostics.error(
        'analysis.sails-unknown-setting',
        `\`${startLine.setting.word}\` is not a setting of \`${name}\` — one of ${settings.map((s) => `\`${s}\``).join(', ')}.`,
        startLine.setting.span,
      );
    }
    if (block && settings.length > 0) {
      vehicle.sails = { settings, start: startLine && settings.includes(startLine.setting.word) ? startLine.setting.word : settings[0] };
    }
  } else if (startLine) {
    context.diagnostics.error(
      'analysis.sails-without-sailing',
      `\`sails start:\` names a setting of \`sails:\` — \`${name}\` declares none.`,
      startLine.span,
    );
  }

  if (!block) return;

  // D4: a sailing block stands in for `pace:`.
  if (paceLine) {
    context.diagnostics.error(
      'analysis.sailing-and-pace',
      `\`${name}\` writes both \`pace:\` and a \`sailing\` block — the block sets the pace by the wind; remove one.`,
      paceLine.span,
    );
  }

  // D5: the bands cover 0 to 180 once each, and the calm row is present.
  const bands: IRSailingBand[] = [];
  const sorted = [...block.rows].sort((a, b) => a.from - b.from);
  let covered = -1;
  for (const row of sorted) {
    if (row.from <= covered) {
      context.diagnostics.error(
        'analysis.sailing-overlap',
        `The band \`${row.from} to ${row.to} degrees\` overlaps an earlier band of \`${name}\` — each angle off the wind belongs to one row.`,
        row.span,
      );
    } else if (row.from > covered + 1) {
      context.diagnostics.error(
        'analysis.sailing-gap',
        `No band of \`${name}\` covers ${covered + 1}${row.from - 1 > covered + 1 ? ` to ${row.from - 1}` : ''} degrees off the wind — the bands cover 0 to 180.`,
        row.span,
      );
    }
    covered = Math.max(covered, row.to);

    // D7: with sails, every setting once; without, one cell.
    const paces: IRSailingBand['paces'] = [];
    if (settings) {
      for (const setting of settings) {
        const cell = row.paces.find((p) => p.setting === setting);
        if (!cell) {
          context.diagnostics.error(
            'analysis.sailing-row-missing-setting',
            `The band \`${row.from} to ${row.to} degrees\` of \`${name}\` names no pace for \`${setting}\` — every setting once: \`${settings.map((s) => `${s} <n> turns`).join(', ')}\`.`,
            row.span,
          );
          continue;
        }
        paces.push({ setting, pace: cell.pace });
      }
      for (const cell of row.paces) {
        if (cell.setting === null || !settings.includes(cell.setting)) {
          context.diagnostics.error(
            'analysis.sailing-row-missing-setting',
            cell.setting === null
              ? `The band \`${row.from} to ${row.to} degrees\` of \`${name}\` has a pace with no setting — with sails, every cell names its setting.`
              : `\`${cell.setting}\` is not a setting of \`${name}\` — one of ${settings.map((s) => `\`${s}\``).join(', ')}.`,
            cell.span,
          );
        }
      }
    } else {
      if (row.paces.length !== 1 || row.paces[0]!.setting !== null) {
        context.diagnostics.error(
          'analysis.sailing-row-missing-setting',
          `The band \`${row.from} to ${row.to} degrees\` of \`${name}\` names settings, but \`${name}\` declares no \`sails:\` — one pace per row, or add \`sails:\`.`,
          row.span,
        );
      }
      paces.push({ setting: null, pace: row.paces[0]?.pace ?? 'stopped' });
    }
    bands.push({ from: row.from, to: row.to, paces });
  }
  if (sorted.length > 0 && covered < 180) {
    context.diagnostics.error(
      'analysis.sailing-gap',
      `No band of \`${name}\` covers ${covered + 1} to 180 degrees off the wind — the bands cover 0 to 180.`,
      block.span,
    );
  } else if (sorted.length === 0) {
    context.diagnostics.error('analysis.sailing-gap', `The \`sailing\` block of \`${name}\` has no bands — the bands cover 0 to 180 degrees off the wind.`, block.span);
  }
  if (block.calm === null) {
    context.diagnostics.error(
      'analysis.sailing-no-calm',
      `The \`sailing\` block of \`${name}\` says nothing about a calm — add \`calm: <n> turns\` or \`calm: stopped\`.`,
      block.span,
    );
  }

  // D4: a sailing vehicle starts in an expanse that carries a wind.
  const placed = decl.placement ? context.resolveEntityIdSilent(decl.placement.place) : null;
  const expanse = placed !== null ? context.expanses.get(placed) : undefined;
  if (expanse && !expanse.hasWind) {
    context.diagnostics.error(
      'analysis.sailing-without-wind',
      `\`${name}\` sails by the wind, and \`${expanse.name}\` has none — add \`wind: from <direction>\` or \`wind: calm\` to the expanse.`,
      block.span,
    );
  }

  const sailing: IRSailing = { bands, calm: block.calm ?? 'stopped' };
  vehicle.sailing = sailing;
  delete vehicle.pace;
}
