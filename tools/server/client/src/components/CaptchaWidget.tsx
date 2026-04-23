/**
 * CaptchaWidget — renders the CAPTCHA challenge matching the server's
 * configured provider, or auto-emits a bypass token when no provider is
 * configured (`provider === 'none'`).
 *
 * Public interface: {@link CaptchaWidget} default export,
 * {@link CaptchaWidgetProps}.
 *
 * Bounded context: client UI (ADR-153 Decision 14 — server controls which
 * provider is in use; client reads `window.__SHARPEE_CONFIG__.captcha`).
 *
 * Phase 4 scope: only `provider === 'none'` is functionally wired — that is
 * the configuration `play.sharpee.net` currently runs and is the AC1 smoke
 * path. For turnstile / hcaptcha / friendly, the widget renders a visible
 * placeholder so the modal form still flows, and the user's submission
 * carries no token. The server will reject the POST in that case; wiring
 * the real widgets is a Plan 05 polish task.
 */

import { useEffect } from 'react';
import type { CaptchaProvider, SharpeeClientConfig } from '../config';
import { readClientConfig } from '../config';

export interface CaptchaWidgetProps {
  onToken: (token: string | null) => void;
  /**
   * Test override — injects a fixed config instead of reading from
   * `window.__SHARPEE_CONFIG__`. Production callers omit this.
   */
  config?: SharpeeClientConfig;
}

function providerLabel(p: CaptchaProvider): string {
  switch (p) {
    case 'turnstile':
      return 'Cloudflare Turnstile';
    case 'hcaptcha':
      return 'hCaptcha';
    case 'friendly':
      return 'Friendly Captcha';
    case 'none':
      return 'none';
  }
}

export default function CaptchaWidget({
  onToken,
  config,
}: CaptchaWidgetProps): JSX.Element | null {
  const resolved = config ?? readClientConfig();
  const provider = resolved.captcha.provider;

  useEffect(() => {
    if (provider === 'none') {
      // Bypass marker accepted by the server when captcha.bypass is enabled
      // server-side (see tools/server/src/http/middleware/captcha.ts).
      onToken('bypass');
    } else {
      onToken(null);
    }
  }, [provider, onToken]);

  if (provider === 'none') {
    // Nothing to render — the form proceeds with the bypass token.
    return null;
  }

  return (
    <div
      role="region"
      aria-label="CAPTCHA challenge"
      style={{
        padding: 'var(--sharpee-spacing-md)',
        border: '1px dashed var(--sharpee-border)',
        borderRadius: 'var(--sharpee-border-radius)',
        background: 'var(--sharpee-bg-secondary)',
        color: 'var(--sharpee-text-muted)',
        fontSize: '0.9em',
      }}
    >
      CAPTCHA widget placeholder — provider <strong>{providerLabel(provider)}</strong> is
      configured but not yet wired. Submission will be rejected until the
      real challenge lands.
    </div>
  );
}
