/**
 * Tests for the one tool-requirement shape (alignment-fixes Older-1).
 *
 * Pins what every tool-gated trait relies on: a requirement holds its tools
 * in declaration order, `accepts` answers exactly for those tools, an empty
 * requirement cannot be built, and each of the five tool-gated traits holds
 * the same shape through its constructor.
 *
 * Owner context: `@sharpee/world-model` — traits.
 */

import { describe, it, expect } from 'vitest';
import { toolRequirement, accepts } from '../../../src/traits/tool-requirement';
import { CuttableTrait } from '../../../src/traits/cuttable/cuttableTrait';
import { DiggableTrait } from '../../../src/traits/diggable/diggableTrait';
import { FlammableTrait } from '../../../src/traits/flammable/flammableTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { LightSourceTrait } from '../../../src/traits/light-source/lightSourceTrait';

describe('ToolRequirement', () => {
  it('holds its tools in declaration order', () => {
    expect(toolRequirement('i_crowbar', 'i_jemmy').tools).toEqual(['i_crowbar', 'i_jemmy']);
  });

  it('accepts a declared tool and refuses any other', () => {
    const requirement = toolRequirement('i_crowbar', 'i_jemmy');
    expect(accepts(requirement, 'i_jemmy')).toBe(true);
    expect(accepts(requirement, 'i_spoon')).toBe(false);
  });

  it('copies the tools, so a caller editing its array does not change the requirement', () => {
    const tools = ['i_knife'];
    const requirement = toolRequirement(...tools);
    tools.push('i_spoon');
    expect(requirement.tools).toEqual(['i_knife']);
  });

  it('refuses to build with no tools', () => {
    expect(() => toolRequirement()).toThrow('A tool requirement needs at least one tool.');
  });

  it('is the one shape all five tool-gated traits hold', () => {
    const requirement = toolRequirement('i_tool');
    const traits = [
      new CuttableTrait({ toolRequirement: requirement }),
      new DiggableTrait({ toolRequirement: requirement }),
      new FlammableTrait({ toolRequirement: requirement }),
      new OpenableTrait({ toolRequirement: requirement }),
      new LightSourceTrait({ toolRequirement: requirement })
    ];
    for (const trait of traits) {
      expect(trait.toolRequirement?.tools).toEqual(['i_tool']);
    }
  });

  it('is absent on a trait built without one — no tool needed', () => {
    expect(new CuttableTrait().toolRequirement).toBeUndefined();
    expect(new DiggableTrait().toolRequirement).toBeUndefined();
    expect(new FlammableTrait().toolRequirement).toBeUndefined();
    expect(new OpenableTrait().toolRequirement).toBeUndefined();
    expect(new LightSourceTrait().toolRequirement).toBeUndefined();
  });
});
