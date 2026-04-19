/**
 * CAPTCHA verification.
 *
 * Public interface: {@link CaptchaVerifier}, {@link createCaptchaVerifier}.
 * Bounded context: HTTP layer (ADR-153 Decision 3 — open but CAPTCHA-gated
 * room creation).
 *
 * Providers: `turnstile`, `hcaptcha`, `friendly`, `none`. When `provider=none`
 * or `config.captcha.bypass=true` or the environment variable
 * `CAPTCHA_BYPASS=1` is set, any token value is accepted — this branch is
 * intended for local development and CI tests and is documented as such
 * in `sharpee-platform.yaml.example`.
 */

import type { Config } from '../../config.js';
import { HttpError } from './error-envelope.js';

export interface CaptchaVerifier {
  /** Throws HttpError(400, 'captcha_failed', …) on rejection; returns on success. */
  verify(token: string | undefined): Promise<void>;
}

type Fetcher = typeof fetch;

export interface CaptchaDeps {
  config: Config;
  /** Injectable for tests. Defaults to the global `fetch`. */
  fetch?: Fetcher;
  /** If true, skip all verification unconditionally. Mirrors CAPTCHA_BYPASS=1. */
  forceBypass?: boolean;
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  hcaptcha: 'https://hcaptcha.com/siteverify',
  friendly: 'https://api.friendlycaptcha.com/api/v1/siteverify',
};

/**
 * Build a CAPTCHA verifier bound to the given config.
 *
 * @param deps.config       operator config (captcha section)
 * @param deps.fetch        optional fetch override (for tests)
 * @param deps.forceBypass  optional unconditional pass-through (for tests)
 */
export function createCaptchaVerifier(deps: CaptchaDeps): CaptchaVerifier {
  const bypass =
    deps.forceBypass === true ||
    deps.config.captcha.bypass ||
    deps.config.captcha.provider === 'none';

  const fetcher = deps.fetch ?? fetch;
  const endpoint = PROVIDER_ENDPOINTS[deps.config.captcha.provider];
  const secret = deps.config.captcha.secretKey;

  return {
    async verify(token) {
      if (bypass) return;

      if (!token || typeof token !== 'string') {
        throw new HttpError(400, 'captcha_failed', 'CAPTCHA token missing');
      }
      if (!endpoint) {
        throw new HttpError(
          500,
          'captcha_misconfigured',
          `Unknown CAPTCHA provider: ${deps.config.captcha.provider}`
        );
      }

      const body = new URLSearchParams({ secret, response: token });
      let json: { success?: boolean; [k: string]: unknown };
      try {
        const resp = await fetcher(endpoint, { method: 'POST', body });
        json = (await resp.json()) as typeof json;
      } catch {
        throw new HttpError(400, 'captcha_failed', 'CAPTCHA provider unreachable');
      }
      if (!json.success) {
        throw new HttpError(400, 'captcha_failed', 'CAPTCHA token rejected by provider');
      }
    },
  };
}
