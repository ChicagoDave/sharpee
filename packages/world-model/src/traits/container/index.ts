// packages/world-model/src/traits/container/index.ts

export { ContainerTrait } from './containerTrait';
export { ContainerBehavior, type IWorldQuery, type IAddItemResult, type IRemoveItemResult } from './containerBehavior';
export { 
  canContain, 
  getContainerTrait, 
  isContainerCapable, 
  hasContainerProperties,
  type IContainerCapable 
} from './container-utils';
