/**
 * Push Panel Action - Story-specific action for pushing wall panels
 *
 * Used for manipulating the Inside Mirror rotating/sliding box:
 * - Red/Yellow panels rotate the box
 * - Mahogany/Pine panels move the box along the groove
 *
 * This bypasses stdlib push validation which rejects scenery objects.
 *
 * Pattern: "push red panel", "push mahogany", "push yellow wall"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { PUSH_PANEL_ACTION_ID, PushPanelMessages } from './types';
import { rotateBox, moveBox } from '../../handlers/inside-mirror-handler';

type PanelType = 'red' | 'yellow' | 'mahogany' | 'pine';

const PANEL_KEYWORDS: PanelType[] = ['red', 'yellow', 'mahogany', 'pine'];

/**
 * Check if an entity is a wall panel
 */
function isPanel(entity: IFEntity): boolean {
  return (entity as any).isPanel === true;
}

/**
 * Get the panel type from an entity
 */
function getPanelType(entity: IFEntity): PanelType | undefined {
  return (entity as any).panelType as PanelType | undefined;
}

/**
 * Extract panel type from raw input
 * For literal patterns like "push red panel" that don't have slots
 */
function extractPanelTypeFromInput(rawInput: string): PanelType | undefined {
  const lowerInput = rawInput.toLowerCase();
  for (const keyword of PANEL_KEYWORDS) {
    if (lowerInput.includes(keyword)) {
      return keyword;
    }
  }
  return undefined;
}

/**
 * Find matching panel in current location by type
 */
function findPanelByType(context: ActionContext, panelType: PanelType): IFEntity | undefined {
  const { world, player } = context;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  const roomContents = world.getContents(playerLocation);

  for (const item of roomContents) {
    if (!isPanel(item)) continue;
    if (getPanelType(item) === panelType) {
      return item;
    }
  }

  return undefined;
}

/**
 * Find matching panel in current location by text
 */
function findPanelByText(context: ActionContext, targetText: string): IFEntity | undefined {
  const { world, player } = context;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  const roomContents = world.getContents(playerLocation);
  const lowerText = targetText.toLowerCase();

  for (const item of roomContents) {
    if (!isPanel(item)) continue;

    const identity = item.get(IdentityTrait);
    if (!identity) continue;

    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];

    // Check name and aliases
    if (name.includes(lowerText) || lowerText.includes(name)) {
      return item;
    }
    if (aliases.some((a: string) =>
      a.toLowerCase().includes(lowerText) || lowerText.includes(a.toLowerCase())
    )) {
      return item;
    }
  }

  return undefined;
}

/**
 * Get the direct object text from context (for slot-based patterns)
 */
function getDirectObjectText(context: ActionContext): string | undefined {
  const structure = context.command.parsed?.structure;
  return structure?.directObject?.text;
}

/**
 * Push Panel Action Definition
 */
export const pushPanelAction: Action = {
  id: PUSH_PANEL_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;

    // Check if we're in Inside Mirror
    const insideMirrorId = world.getStateValue('endgame.insideMirrorId') as string | undefined;
    const playerLocation = world.getLocation(player.id);

    if (playerLocation !== insideMirrorId) {
      return {
        valid: false,
        error: PushPanelMessages.NOT_IN_MIRROR
      };
    }

    // Try to get target from parsed structure (slot-based patterns like "push :target panel")
    const targetText = getDirectObjectText(context);

    // If no slot target, try to extract panel type from raw input
    // (for literal patterns like "push red panel")
    const rawInput = context.command.parsed?.rawInput || '';
    const extractedType = extractPanelTypeFromInput(rawInput);

    let panel: IFEntity | undefined;
    let panelType: PanelType | undefined;

    if (extractedType) {
      // Found panel type in raw input - use it directly
      panel = findPanelByType(context, extractedType);
      panelType = extractedType;
    } else if (targetText) {
      // Have slot target - find panel by text
      panel = findPanelByText(context, targetText);
      if (panel) {
        panelType = getPanelType(panel);
      }
    }

    // Must have identified a panel
    if (!panel || !panelType) {
      return {
        valid: false,
        error: PushPanelMessages.NOT_VISIBLE,
        params: { target: targetText || extractedType || 'panel' }
      };
    }

    // Store for execute phase
    context.sharedData.pushTarget = panel;
    context.sharedData.panelType = panelType;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const panelType = sharedData.panelType as PanelType;
    if (!panelType) return;

    let result: { success: boolean; message: string };

    // Red/Yellow panels rotate
    if (panelType === 'red') {
      result = rotateBox(world, true);  // Clockwise
    } else if (panelType === 'yellow') {
      result = rotateBox(world, false); // Counter-clockwise
    }
    // Mahogany/Pine panels move
    else if (panelType === 'mahogany') {
      result = moveBox(world, true);    // Forward
    } else if (panelType === 'pine') {
      result = moveBox(world, false);   // Backward
    } else {
      result = { success: false, message: PushPanelMessages.NOT_A_PANEL };
    }

    sharedData.pushResult = result;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: PUSH_PANEL_ACTION_ID,
      messageId: result.error || PushPanelMessages.NO_TARGET,
      reason: result.error,
      params: result.params
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const result = sharedData.pushResult as { success: boolean; message: string } | undefined;
    if (!result) {
      return events;
    }

    const target = sharedData.pushTarget as IFEntity;
    const panelType = sharedData.panelType as PanelType;

    if (result.success) {
      // Emit the pushed event (for handler to update feedback)
      events.push(context.event('if.event.pushed', {
        messageId: result.message,
        targetId: target?.id,
        panelType
      }));
    } else {
      // Emit blocked event with reason
      events.push(context.event('action.blocked', {
        actionId: PUSH_PANEL_ACTION_ID,
        messageId: result.message,
        reason: result.message,
        params: { target: target?.name }
      }));
    }

    return events;
  }
};
