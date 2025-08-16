/**
 * Blood Magic event definitions
 */

import { SemanticEvent } from '@sharpee/core';

// Mirror events
export interface MirrorTouchedEvent extends SemanticEvent {
  type: 'blood.mirror.touched';
  data: {
    mirrorId: string;
    entityId: string;
    hasBloodSilver: boolean;
  };
}

export interface MirrorConnectedEvent extends SemanticEvent {
  type: 'blood.mirror.connected';
  data: {
    fromMirrorId: string;
    toMirrorId: string;
    connectedBy: string;
  };
}

export interface MirrorEnteredEvent extends SemanticEvent {
  type: 'blood.mirror.entered';
  data: {
    mirrorId: string;
    entityId: string;
    destinationMirrorId?: string;
  };
}

export interface MirrorExitedEvent extends SemanticEvent {
  type: 'blood.mirror.exited';
  data: {
    mirrorId: string;
    entityId: string;
    originMirrorId?: string;
  };
}

export interface MirrorBrokenEvent extends SemanticEvent {
  type: 'blood.mirror.broken';
  data: {
    mirrorId: string;
    brokenBy?: string;
    connectionsLost: number;
  };
}

export interface MirrorRippleEvent extends SemanticEvent {
  type: 'blood.mirror.ripple';
  data: {
    mirrorId: string;
    causedBy: string;
    sensedBy: string[];
  };
}

// Moon blood events
export interface MoonInvisibleEvent extends SemanticEvent {
  type: 'blood.moon.invisible';
  data: {
    entityId: string;
    focusObject?: string;
  };
}

export interface MoonVisibleEvent extends SemanticEvent {
  type: 'blood.moon.visible';
  data: {
    entityId: string;
    duration: number; // How long they were invisible
  };
}

// Type guard functions
export function isMirrorEvent(event: SemanticEvent): boolean {
  return event.type.startsWith('blood.mirror.');
}

export function isMoonEvent(event: SemanticEvent): boolean {
  return event.type.startsWith('blood.moon.');
}

// Event factory functions
export function createMirrorTouchedEvent(
  mirrorId: string,
  entityId: string,
  hasBloodSilver: boolean
): MirrorTouchedEvent {
  return {
    id: `mirror-touched-${Date.now()}`,
    type: 'blood.mirror.touched',
    timestamp: Date.now(),
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
    id: `mirror-connected-${Date.now()}`,
    type: 'blood.mirror.connected',
    timestamp: Date.now(),
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
    id: `mirror-entered-${Date.now()}`,
    type: 'blood.mirror.entered',
    timestamp: Date.now(),
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
    id: `mirror-ripple-${Date.now()}`,
    type: 'blood.mirror.ripple',
    timestamp: Date.now(),
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
    id: `moon-invisible-${Date.now()}`,
    type: 'blood.moon.invisible',
    timestamp: Date.now(),
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
    id: `moon-visible-${Date.now()}`,
    type: 'blood.moon.visible',
    timestamp: Date.now(),
    data: {
      entityId,
      duration
    }
  };
}