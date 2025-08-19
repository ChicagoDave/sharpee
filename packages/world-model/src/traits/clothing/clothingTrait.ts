// packages/world-model/src/traits/clothing/clothingTrait.ts

import { ITrait } from '../trait';
import { IWearableData } from '../wearable/wearableTrait';
import { TraitType } from '../trait-types';

export interface IClothingData extends IWearableData {
  /** Material the clothing is made from */
  material?: string;
  
  /** Style or type of clothing */
  style?: string;
  
  /** Whether this clothing can get wet, dirty, torn, etc. */
  damageable?: boolean;
  
  /** Current condition of the clothing */
  condition?: 'pristine' | 'good' | 'worn' | 'torn' | 'ruined';
}

/**
 * ClothingTrait is a specialized wearable trait for clothing items.
 * Clothing items (coats, pants, dresses) can have pockets and other special properties.
 * 
 * This trait includes all WearableData properties but is a separate trait type
 * to allow for clothing-specific behaviors and queries.
 * 
 * Pockets should be created as separate container entities with SceneryTrait
 * and placed inside the clothing item.
 * 
 * @example
 * ```typescript
 * const coat = world.createEntity('Winter Coat', 'item');
 * coat.add(new ClothingTrait({ slot: 'torso', material: 'wool' }));
 * coat.add(new ContainerTrait()); // So it can contain pockets
 * 
 * const pocket = world.createEntity('inside pocket', 'container');
 * pocket.add(new ContainerTrait({ capacity: 3 }));
 * pocket.add(new SceneryTrait({ cantTakeMessage: "The pocket is sewn into the coat." }));
 * world.moveEntity(pocket.id, coat.id);
 * ```
 */
export class ClothingTrait implements ITrait, IClothingData {
  static readonly type = TraitType.CLOTHING;
  readonly type = TraitType.CLOTHING;
  
  // WearableData properties
  worn: boolean = false;
  wornBy?: string;
  slot: string;
  layer: number;
  wearMessage?: string;
  removeMessage?: string;
  wearableOver: boolean;
  blocksSlots: string[];
  weight: number;
  bulk: number;
  canRemove: boolean;
  bodyPart: string;
  
  // ClothingData properties
  material: string;
  style: string;
  damageable: boolean;
  condition: 'pristine' | 'good' | 'worn' | 'torn' | 'ruined';
  
  // Public accessor for consistency with WearableTrait
  get isWorn(): boolean {
    return this.worn;
  }

  set isWorn(value: boolean) {
    this.worn = value;
  }
  
  constructor(data: IClothingData = {}) {
    // Set wearable defaults and merge with provided data
    this.worn = data.isWorn ?? false;
    this.wornBy = data.wornBy;
    this.slot = data.slot ?? 'clothing';
    this.layer = data.layer ?? 1;
    this.wearMessage = data.wearMessage;
    this.removeMessage = data.removeMessage;
    this.wearableOver = data.wearableOver ?? true;
    this.blocksSlots = data.blocksSlots ?? [];
    this.weight = data.weight ?? 1;
    this.bulk = data.bulk ?? 1;
    this.canRemove = data.canRemove ?? true;
    this.bodyPart = data.bodyPart ?? 'torso';
    
    // Set clothing-specific defaults
    this.material = data.material ?? 'fabric';
    this.style = data.style ?? 'casual';
    this.damageable = data.damageable ?? true;
    this.condition = data.condition ?? 'good';
  }
}
