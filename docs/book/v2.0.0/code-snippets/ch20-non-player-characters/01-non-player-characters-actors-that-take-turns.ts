import { GameEngine } from '@sharpee/engine';
import { definePoint } from '@sharpee/core';
import { NpcTrait } from '@sharpee/world-model';
import { NpcPlugin } from '@sharpee/plugin-npc';
import {
  NpcBehavior, NpcContext, NpcAction, createPatrolBehavior,
} from '@sharpee/stdlib';
