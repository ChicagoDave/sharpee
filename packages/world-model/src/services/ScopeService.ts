// Stub for ScopeService
import { IFEntity } from '../entities/if-entity';

export class ScopeService {
  constructor(private world: any) {}
  
  canSee(viewer: IFEntity, target: IFEntity): boolean {
    // TODO: Implement visibility logic
    return true;
  }
  
  canReach(actor: IFEntity, target: IFEntity): boolean {
    // TODO: Implement reachability logic
    return true;
  }
}
