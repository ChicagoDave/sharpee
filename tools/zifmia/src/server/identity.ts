/**
 * @module @sharpee/zifmia/server/identity
 * @purpose Identity routes:
 *   - `POST /identity/register` — register a (handle, passcode) and
 *     mint a session token.
 *   - `POST /identity/login` — exchange (handle, passcode) for a
 *     session token. AC-11 demands an identical 401 body for "no such
 *     handle" and "wrong passcode."
 *   - `GET /identity/me` — auth-gated session-bootstrap endpoint used
 *     by the web client to recover identity from a stored bearer
 *     token across page loads. Returns `{id, handle, isAdmin}` or 401.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Variance from ADR-161: ADR-161 specifies server-generated
 * `(Id, Handle, passcode)` triples that the user must save. ADR-175's
 * route table shows `POST /identity/login {handle, passcode}` —
 * implying the user already knows their passcode. v1 Zifmia therefore
 * takes the simpler "user picks a passcode at registration" flow.
 * A future ADR can revisit if the auto-generated-triple UX is
 * preferred.
 */

import type { FastifyInstance } from 'fastify';

import { hashPasscode, verifyPasscode } from '../auth/passcode';
import {
  generateSessionToken,
  SESSION_TTL_MS
} from '../auth/session-token';
import type { StorageAdapter } from '../storage/adapter';
import { authMiddleware } from './auth-middleware';

export interface IdentityRouteOptions {
  adapter: StorageAdapter;
  /** Override the clock (tests pin time). */
  now?: () => number;
  /** Override the session token TTL (tests use a short value). */
  sessionTtlMs?: number;
}

interface CredentialsBody {
  handle?: unknown;
  passcode?: unknown;
}

interface LoginSuccess {
  id: string;
  handle: string;
  sessionToken: string;
}

/**
 * Wire shape of `GET /identity/me`. Subset of `Identity` — excludes
 * `passcodeHash` and `createdAt`, which the client has no use for and
 * which are not part of the wire contract.
 */
interface IdentityMeBody {
  id: string;
  handle: string;
  isAdmin: boolean;
}

const HANDLE_PATTERN = /^[A-Za-z0-9._-]{3,40}$/;
const PASSCODE_MIN_LENGTH = 8;
const PASSCODE_MAX_LENGTH = 256;

/**
 * Validate the request body once. Returns the cleaned credentials or
 * `null` if the body is unusable. Validation is intentionally identical
 * for register and login so AC-11's "same body for both failure modes"
 * isn't undermined by route-specific 400 leaks.
 */
function parseCredentials(body: unknown): {
  handle: string;
  passcode: string;
} | null {
  if (typeof body !== 'object' || body === null) return null;
  const { handle, passcode } = body as CredentialsBody;
  if (typeof handle !== 'string' || !HANDLE_PATTERN.test(handle)) return null;
  if (
    typeof passcode !== 'string' ||
    passcode.length < PASSCODE_MIN_LENGTH ||
    passcode.length > PASSCODE_MAX_LENGTH
  ) {
    return null;
  }
  return { handle, passcode };
}

export function registerIdentityRoutes(
  app: FastifyInstance,
  options: IdentityRouteOptions
): void {
  const now = options.now ?? Date.now;
  const ttlMs = options.sessionTtlMs ?? SESSION_TTL_MS;
  const auth = authMiddleware({ adapter: options.adapter, now });

  app.post('/identity/register', async (request, reply) => {
    const creds = parseCredentials(request.body);
    if (!creds) {
      return reply
        .code(400)
        .send({ error: 'invalid_body', detail: 'handle_or_passcode_malformed' });
    }

    const existing = await options.adapter.getIdentityByHandle(creds.handle);
    if (existing) {
      return reply.code(409).send({ error: 'handle_taken' });
    }

    const passcodeHash = await hashPasscode(creds.passcode);
    const identity = await options.adapter.createIdentity({
      handle: creds.handle,
      passcodeHash
    });

    const sessionToken = generateSessionToken();
    await options.adapter.createSession({
      token: sessionToken,
      identityId: identity.id,
      expiresAt: now() + ttlMs
    });

    const body: LoginSuccess = {
      id: identity.id,
      handle: identity.handle,
      sessionToken
    };
    return reply.code(201).send(body);
  });

  app.post('/identity/login', async (request, reply) => {
    const creds = parseCredentials(request.body);
    // AC-11: validation failure produces the SAME 401 body as
    // bad-credentials so wire observers cannot distinguish "no such
    // handle" from "wrong passcode" from "malformed input." This
    // costs slightly worse 400s for genuinely-broken clients but
    // matches the ADR's security-conscious default.
    if (!creds) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const identity = await options.adapter.getIdentityByHandle(creds.handle);
    if (!identity) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const verified = await verifyPasscode(creds.passcode, identity.passcodeHash);
    if (!verified) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const sessionToken = generateSessionToken();
    await options.adapter.createSession({
      token: sessionToken,
      identityId: identity.id,
      expiresAt: now() + ttlMs
    });

    const body: LoginSuccess = {
      id: identity.id,
      handle: identity.handle,
      sessionToken
    };
    return reply.send(body);
  });

  // ── GET /identity/me ───────────────────────────────────────────
  // Session-bootstrap endpoint for the web client. The auth
  // preHandler enforces a valid bearer token and populates
  // `request.identity`; the handler simply projects the identity row
  // to the wire shape.
  app.get(
    '/identity/me',
    { preHandler: auth },
    async (request) => {
      const identity = request.identity!;
      const body: IdentityMeBody = {
        id: identity.id,
        handle: identity.handle,
        isAdmin: identity.isAdmin
      };
      return body;
    }
  );
}
