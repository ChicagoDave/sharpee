/**
 * POST /api/identities/upload — upload an existing identity to this server
 * (ADR-161).
 *
 * Public interface: {@link registerUploadIdentityRoute},
 * {@link UploadIdentityDeps}.
 * Wire types (`UploadIdentityRequest`, `UploadIdentityResponse`) live in
 * `../../wire/http-api.ts` — shared with the browser client.
 *
 * Bounded context: HTTP layer (ADR-161 Decision: Identity lifecycle / Upload).
 *
 * The body is the three-field tuple `(id, handle, passcode)` — exactly the
 * shape produced by the Identity panel's "Download CSV" affordance. The
 * route enforces the decision matrix:
 *
 *   id-row | handle-row | same row | passcode | outcome
 *   -------|------------|----------|----------|----------------------------
 *    none  |    none    |    —     |    —     | register new (201)
 *    yes   |    yes     |   yes    |   match  | accept existing (200)
 *    yes   |    yes     |   yes    | mismatch | 401 bad_passcode
 *    yes   |    no      |    —     |    —     | 409 id_mismatch
 *    yes   |    yes     |    no    |    —     | 409 id_mismatch
 *    no    |    yes     |    —     |    —     | 409 handle_taken
 *
 * Format pre-checks happen before any DB read so a malformed payload never
 * costs an argon2 cycle.
 */

import type { Hono, MiddlewareHandler } from 'hono';
import type { IdentitiesRepository } from '../../repositories/identities.js';
import type { HashService } from '../../auth/hash-service.js';
import { HttpError } from '../middleware/error-envelope.js';
import { isWellFormedId } from '../../identity/id-generator.js';
import type { UploadIdentityResponse } from '../../wire/http-api.js';

export interface UploadIdentityDeps {
  identities: IdentitiesRepository;
  hashService: HashService;
  /** Optional rate-limit middleware. Tests that don't exercise the limit omit it. */
  rateLimit?: MiddlewareHandler;
}

interface UploadIdentityBody {
  id?: unknown;
  handle?: unknown;
  passcode?: unknown;
}

const HANDLE_PATTERN = /^[A-Za-z]+$/;
const HANDLE_MIN = 3;
const HANDLE_MAX = 12;

const passthrough: MiddlewareHandler = async (_c, next) => {
  await next();
};

export function registerUploadIdentityRoute(app: Hono, deps: UploadIdentityDeps): void {
  app.post('/api/identities/upload', deps.rateLimit ?? passthrough, async (c) => {
    const body = (await c.req.json().catch(() => null)) as UploadIdentityBody | null;
    if (!body) throw new HttpError(400, 'bad_request', 'JSON body required');

    const id = typeof body.id === 'string' ? body.id : '';
    const handle = typeof body.handle === 'string' ? body.handle : '';
    const passcode = typeof body.passcode === 'string' ? body.passcode : '';
    if (!id) throw new HttpError(400, 'missing_field', 'id is required');
    if (!handle) throw new HttpError(400, 'missing_field', 'handle is required');
    if (!passcode) throw new HttpError(400, 'missing_field', 'passcode is required');

    if (!isWellFormedId(id)) {
      throw new HttpError(400, 'malformed_id', 'id must be Crockford-32 form XXXX-XXXX');
    }
    if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) {
      throw new HttpError(
        400,
        'invalid_handle',
        `handle must be ${HANDLE_MIN}–${HANDLE_MAX} characters`,
      );
    }
    if (!HANDLE_PATTERN.test(handle)) {
      throw new HttpError(
        400,
        'invalid_handle',
        'handle must be letters only (no digits, underscores, hyphens, or spaces)',
      );
    }

    const idRow = deps.identities.findById(id);
    const handleRow = deps.identities.findByHandle(handle);

    // Matrix row 6: no id-row, handle taken by a different id.
    if (!idRow && handleRow) {
      throw new HttpError(409, 'handle_taken', 'that handle is already in use');
    }

    // Matrix rows 4 + 5: id-row exists but handle does not match the same
    // row (either no handle row, or a different row owns the handle).
    if (idRow && (!handleRow || handleRow.id !== idRow.id)) {
      throw new HttpError(
        409,
        'id_mismatch',
        'that id does not match an identity with that handle',
      );
    }

    // Matrix rows 2 + 3: id-row and handle-row are the same row — verify
    // the passcode against the persisted hash.
    if (idRow && handleRow && idRow.id === handleRow.id) {
      const auth = deps.identities.findHashByHandle(handle);
      if (!auth) {
        // Vanishingly rare race: row hard-deleted between findByHandle and
        // findHashByHandle. Fail safe rather than mis-routing the request.
        throw new HttpError(500, 'internal_error', 'identity disappeared mid-request');
      }
      const ok = await deps.hashService.verify(passcode, auth.passcode_hash);
      if (!ok) {
        throw new HttpError(401, 'bad_passcode', 'incorrect passcode for that identity');
      }
      deps.identities.touchLastSeen(idRow.id);
      const response: UploadIdentityResponse = { id: idRow.id, handle: idRow.handle };
      return c.json(response, 200);
    }

    // Matrix row 1: neither id-row nor handle-row — register fresh with
    // the caller-supplied id.
    const passcode_hash = await deps.hashService.hash(passcode);
    let identity;
    try {
      identity = deps.identities.createWithId({ id, handle, passcode_hash });
    } catch (err) {
      // Race fallback: a concurrent upload or create raced us between the
      // matrix lookups above and this insert. Map the UNIQUE collision to
      // its corresponding 409 by re-querying which row pre-existed.
      if (err instanceof Error && /UNIQUE/i.test(err.message)) {
        if (deps.identities.findById(id) && !deps.identities.findByHandle(handle)) {
          throw new HttpError(
            409,
            'id_mismatch',
            'that id does not match an identity with that handle',
          );
        }
        throw new HttpError(409, 'handle_taken', 'that handle is already in use');
      }
      throw err;
    }
    deps.identities.touchLastSeen(identity.id);
    const response: UploadIdentityResponse = { id: identity.id, handle: identity.handle };
    return c.json(response, 201);
  });
}
