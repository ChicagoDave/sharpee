import { ISemanticEvent } from '@sharpee/core';
import { TurnPluginContext } from './turn-plugin-context';

export interface TurnPlugin {
  id: string;
  priority: number;
  onAfterAction(context: TurnPluginContext): ISemanticEvent[];
  getState?(): unknown;
  setState?(state: unknown): void;
}
