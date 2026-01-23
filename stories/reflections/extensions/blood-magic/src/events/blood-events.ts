/**
 * Blood Magic event definitions
 */

import { ISemanticEvent } from '@sharpee/core';

// Mirror events
export interface MirrorTouchedEvent extends ISemanticEvent {
  type: 'blood.mirror.touched';
  data: {
    mirrorId: string;
    entityId: string;
    hasBloodSilver: boolean;
  };
}

export interface MirrorConnectedEvent extends ISemanticEvent {
  type: 'blood.mirror.connected';
  data: {
    fromMirrorId: string;
    toMirrorId: string;
    connectedBy: string;
  };
}

export interface MirrorEnteredEvent extends ISemanticEvent {
  type: 'blood.mirror.entered';
  data: {
    mirrorId: string;
    entityId: string;
    destinationMirrorId?: string;
  };
}

export interface MirrorExitedEvent extends ISemanticEvent {
  type: 'blood.mirror.exited';
  data: {
    mirrorId: string;
    entityId: string;
    originMirrorId?: string;
  };
}

export interface MirrorBrokenEvent extends ISemanticEvent {
  type: 'blood.mirror.broken';
  data: {
    mirrorId: string;
    brokenBy?: string;
    connectionsLost: number;
  };
}

export interface MirrorRippleEvent extends ISemanticEvent {
  type: 'blood.mirror.ripple';
  data: {
    mirrorId: string;
    causedBy: string;
    sensedBy: string[];
  };
}

// Moon blood events
export interface MoonInvisibleEvent extends ISemanticEvent {
  type: 'blood.moon.invisible';
  data: {
    entityId: string;
    focusObject?: string;
  };
}

export interface MoonVisibleEvent extends ISemanticEvent {
  type: 'blood.moon.visible';
  data: {
    entityId: string;
    duration: number; // How long they were invisible
  };
}

// Type guard functions
export function isMirrorEvent(event: ISemanticEvent): boolean {
  return event.type.startsWith('blood.mirror.');
}

export function isMoonEvent(event: ISemanticEvent): boolean {
  return event.type.startsWith('blood.moon.');
}

// Event factory functions
export function createMirrorTouchedEvent(
  mirrorId: string,
  entityId: string,
  hasBloodSilver: boolean
): MirrorTouchedEvent {
  return {
    id: `blood.mirror.touched.${Date.now()}`,
    type: 'blood.mirror.touched',
    timestamp: Date.now(),
    entities: { actor: entityId, target: mirrorId },
    data: {
      mirrorId,
      entityId,
      hasBloodSilver
    }
  };
}

export function createMirrorConnectedEvent(
  fromMirrorId: string,
  toMirrorId: string,
  connectedBy: string
): MirrorConnectedEvent {
  return {
    id: `blood.mirror.connected.${Date.now()}`,
    type: 'blood.mirror.connected',
    timestamp: Date.now(),
    entities: { actor: connectedBy, target: fromMirrorId, instrument: toMirrorId },
    data: {
      fromMirrorId,
      toMirrorId,
      connectedBy
    }
  };
}

export function createMirrorEnteredEvent(
  mirrorId: string,
  entityId: string,
  destinationMirrorId?: string
): MirrorEnteredEvent {
  return {
    id: `blood.mirror.entered.${Date.now()}`,
    type: 'blood.mirror.entered',
    timestamp: Date.now(),
    entities: { actor: entityId, target: mirrorId, instrument: destinationMirrorId },
    data: {
      mirrorId,
      entityId,
      destinationMirrorId
    }
  };
}

export function createMirrorRippleEvent(
  mirrorId: string,
  causedBy: string,
  sensedBy: string[]
): MirrorRippleEvent {
  return {
    id: `blood.mirror.ripple.${Date.now()}`,
    type: 'blood.mirror.ripple',
    timestamp: Date.now(),
    entities: { actor: causedBy, target: mirrorId, others: sensedBy },
    data: {
      mirrorId,
      causedBy,
      sensedBy
    }
  };
}

export function createMoonInvisibleEvent(
  entityId: string,
  focusObject?: string
): MoonInvisibleEvent {
  return {
    id: `blood.moon.invisible.${Date.now()}`,
    type: 'blood.moon.invisible',
    timestamp: Date.now(),
    entities: { actor: entityId, instrument: focusObject },
    data: {
      entityId,
      focusObject
    }
  };
}

export function createMoonVisibleEvent(
  entityId: string,
  duration: number
): MoonVisibleEvent {
  return {
    id: `blood.moon.visible.${Date.now()}`,
    type: 'blood.moon.visible',
    timestamp: Date.now(),
    entities: { actor: entityId },
    data: {
      entityId,
      duration
    }
  };
}