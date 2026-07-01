class ContainerTrait implements ITrait {
  constructor(data?: Partial<ContainerTrait>);
  capacity?: { maxWeight?: number; maxVolume?: number; maxItems?: number };
  isTransparent: boolean;
  enterable: boolean;
}
