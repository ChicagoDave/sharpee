/**
 * Identity types — public shape returned by repository + routes.
 *
 * Public interface: {@link Identity}, {@link IdentityError}.
 * Owner: zifmia server. Identity is the entire credential per ADR-161
 * amended; there are no tokens or sessions.
 */

export interface Identity {
  readonly id: string;
  readonly handle: string;
  readonly is_admin: boolean;
  readonly created_at: number;
}

export type IdentityError =
  | 'invalid_handle'
  | 'handle_taken'
  | 'not_found';
