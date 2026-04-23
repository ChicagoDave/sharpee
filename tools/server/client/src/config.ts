/**
 * Runtime client configuration — the values the server injects into
 * `index.html` at serve time so the SPA knows the public-safe bits of
 * server state (CAPTCHA provider + site key, etc.) without an extra HTTP
 * round-trip.
 *
 * Public interface: {@link SharpeeClientConfig}, {@link CaptchaProvider},
 * {@link readClientConfig}, {@link DEFAULT_CLIENT_CONFIG}.
 *
 * Bounded context: client bootstrap (ADR-153 Decision 14 —
 * `sharpee-platform.yaml` is the operator-authored source of truth; the
 * server exposes only a non-secret slice of it to the browser).
 *
 * The server writes a `<script>` tag that assigns `window.__SHARPEE_CONFIG__`
 * before any app JS runs. In dev (Vite dev server) no injection happens, so
 * the global is undefined and we fall back to {@link DEFAULT_CLIENT_CONFIG}.
 * Secrets (`captcha.secret_key` in particular) MUST NEVER appear here.
 */

export type CaptchaProvider = 'turnstile' | 'hcaptcha' | 'friendly' | 'none';

export interface SharpeeClientConfig {
  captcha: {
    provider: CaptchaProvider;
    /** Public site key for the chosen provider; empty string when `provider === 'none'`. */
    siteKey: string;
  };
}

declare global {
  interface Window {
    __SHARPEE_CONFIG__?: SharpeeClientConfig;
  }
}

export const DEFAULT_CLIENT_CONFIG: SharpeeClientConfig = {
  captcha: { provider: 'none', siteKey: '' },
};

function isCaptchaProvider(v: unknown): v is CaptchaProvider {
  return v === 'turnstile' || v === 'hcaptcha' || v === 'friendly' || v === 'none';
}

/**
 * Read the injected client config, falling back to a safe default if the
 * server skipped injection (dev mode) or if the shape is unrecognised.
 */
export function readClientConfig(): SharpeeClientConfig {
  const raw = typeof window !== 'undefined' ? window.__SHARPEE_CONFIG__ : undefined;
  if (!raw || typeof raw !== 'object') return DEFAULT_CLIENT_CONFIG;

  const c = (raw as Partial<SharpeeClientConfig>).captcha;
  const provider: CaptchaProvider = isCaptchaProvider(c?.provider) ? c.provider : 'none';
  const siteKey = typeof c?.siteKey === 'string' ? c.siteKey : '';

  return { captcha: { provider, siteKey } };
}
