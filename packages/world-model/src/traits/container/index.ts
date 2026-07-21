// packages/world-model/src/traits/container/index.ts

export { ContainerTrait } from './containerTrait.js';
export { ContainerBehavior, type IWorldQuery, type IAddItemResult, type IRemoveItemResult } from './containerBehavior.js';
export { 
  canContain, 
  getContainerTrait, 
  isContainerCapable, 
  hasContainerProperties,
  type IContainerCapable 
} from './container-utils.js';
