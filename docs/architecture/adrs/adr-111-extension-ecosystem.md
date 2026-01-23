# ADR-111: Extension Ecosystem

## Status: Draft

## Context

Sharpee needs an extension system that supports:
1. **Platform extensions** - Core functionality (testing, conversation)
2. **Story extensions** - One-off for specific stories
3. **Public extensions** - Shared/reusable mechanics

This ADR covers the public extension ecosystem - discovery, distribution, and verification.

### Security Context: Native Platform Risk

**Unlike traditional IF systems, Sharpee runs on native JavaScript/Node.js, which opens real attack vectors.**

| System | Runtime | Sandbox |
|--------|---------|---------|
| Inform | Z-machine/Glulx VM | Fully sandboxed bytecode |
| TADS | T3 VM | Fully sandboxed bytecode |
| Hugo | Hugo VM | Fully sandboxed bytecode |
| **Sharpee** | Node.js / Browser | **No sandbox - full runtime access** |

Traditional IF compilers produce bytecode that runs in a restricted VM interpreter. The game code can only do what the VM allows - no filesystem, no network, no system access.

Sharpee extensions are native JavaScript with access to:
- **Node.js**: filesystem, network, child processes, environment variables
- **Browser**: fetch, localStorage, service workers, Web APIs

**This means malicious extensions can:**
- Steal files from the user's system
- Exfiltrate data over the network
- Install malware or crypto miners
- Access credentials in environment variables
- Persist across sessions via service workers

**Security is not optional for Sharpee's extension ecosystem.** We must be more diligent than VM-based IF systems because we have a larger attack surface.

## Decision

### Distribution: npm + sharpee.net

- **npm** for distribution, versioning, security scanning
- **sharpee.net** for discovery, Sharpee-specific verification, catalog

### Package Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Official | `@sharpee/ext-{name}` | `@sharpee/ext-testing` |
| Community | `sharpee-ext-{name}` | `sharpee-ext-vehicles` |

### Namespace Convention

| Location | Namespace |
|----------|-----------|
| Platform extensions | `sharpee.ext.{name}.*` |
| Public extensions | `ext.{name}.*` |
| Story extensions | `{storyId}.ext.{name}.*` |

### Extension Manifest (package.json)

```json
{
  "name": "sharpee-ext-vehicles",
  "version": "1.0.0",
  "sharpee": {
    "extension": true,
    "namespace": "ext.vehicles",
    "compatibility": ">=0.9.0 <2.0.0",
    "categories": ["mechanics", "transportation"],
    "capabilities": {
      "storage": true,
      "network": false,
      "audio": true,
      "filesystem": false,
      "childProcess": false
    }
  },
  "peerDependencies": {
    "@sharpee/engine": "^0.9.0"
  }
}
```

### Verification Tiers

1. **OFFICIAL** - `@sharpee/ext-*`, made by Sharpee team
2. **REVIEWED** - Manual review passed by Sharpee team
3. **VERIFIED** - Automated checks passed
4. **UNVERIFIED** - Published but not yet verified

### Security Model

**npm provides (free):**
- Vulnerability scanning (npm audit)
- Malware detection
- Provenance/signing (Sigstore)
- 2FA enforcement
- Publisher identity

**sharpee.net adds:**
- Capability declaration verification
- Sharpee-specific static analysis
- Trust tier assignment
- Discovery/catalog

### CLI Commands

```bash
npx sharpee init-extension <name>   # Scaffold extension
npx sharpee verify                   # Run checks locally
npx sharpee login                    # Auth with sharpee.net
npx sharpee register                 # Register on catalog
npx sharpee extensions               # List installed
```

### Author Workflow

```bash
# Create
npx sharpee init-extension my-magic-system
cd sharpee-ext-magic

# Develop & test
pnpm link
# Use in test story...

# Publish to npm
npm publish

# Register on sharpee.net
npx sharpee register
```

### Consumer Workflow

```bash
# Find on sharpee.net, then:
pnpm add sharpee-ext-vehicles
```

```typescript
import { vehiclesExtension } from 'sharpee-ext-vehicles';

export const story: Story = {
  extensions: [vehiclesExtension],
};
```

## Consequences

### Positive
- Leverage npm's security infrastructure
- Standard tooling users already know
- Clear trust tiers for users
- Capability declarations provide transparency

### Negative
- Two systems to maintain (npm + sharpee.net)
- Manual review doesn't scale
- Public extensions may have quality variance

### Neutral
- Platform extensions (`packages/extensions/`) are separate from this system
- Story extensions don't need registration

## Related

- ADR-109: Playtester Annotations
- ADR-110: Debug Tools Extension
- Platform extensions live in `packages/extensions/`
