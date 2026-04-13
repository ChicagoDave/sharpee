/**
 * @sharpee/queries — Fluent entity query API (ADR-150).
 *
 * Provides EntityQuery, a LINQ-style chainable wrapper over IFEntity[].
 * Importing this package activates the WorldModel augmentation, adding
 * entry points like w.rooms, w.entities, w.contents(), etc.
 *
 * Public interface: EntityQuery, IWorldModel augmentation
 * Owner context: @sharpee/queries
 */

export { EntityQuery } from './entity-query';

// Side-effect import: patches WorldModel.prototype with query entry points
import './augmentation';
