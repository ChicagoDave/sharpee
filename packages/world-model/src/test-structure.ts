// Test file to verify world-model package structure

import { IFEntity } from './entities/if-entity';
import { TraitType } from './traits/trait-types';
import { ContainerTrait } from './traits/container/containerTrait';

// Test creating an entity
const box = new IFEntity('box-1', 'container');

// Test adding a trait
const containerTrait = new ContainerTrait({
  capacity: {
    maxWeight: 10,
    maxItems: 10
  },
  isTransparent: true
});

box.add(containerTrait);

// Test checking for trait
console.log('Has container trait:', box.has(TraitType.CONTAINER));
console.log('Container maxWeight:', (box.get(TraitType.CONTAINER) as ContainerTrait)?.capacity?.maxWeight);

export function testWorldModel() {
  console.log('World model package is working!');
  return box;
}
