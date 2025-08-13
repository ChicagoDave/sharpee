// packages/world-model/src/traits/container/index.ts

export { ContainerTrait } from './containerTrait';
export { ContainerBehavior, type IWorldQuery, type AddItemResult, type RemoveItemResult } from './containerBehavior';
export { 
  canContain, 
  getContainerTrait, 
  isContainerCapable, 
  hasContainerProperties,
  type ContainerCapable 
} from './container-utils';
