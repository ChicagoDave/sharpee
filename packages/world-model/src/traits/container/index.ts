// packages/world-model/src/traits/container/index.ts

export { ContainerTrait } from './containerTrait';
export { ContainerBehavior, type IWorldQuery } from './containerBehavior';
export { 
  canContain, 
  getContainerTrait, 
  isContainerCapable, 
  hasContainerProperties,
  type ContainerCapable 
} from './container-utils';
