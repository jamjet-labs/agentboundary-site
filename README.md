# agentboundary-site

Microsite for the **AgentBoundary** open spec. Deploys to
[`agentboundary.jamjet.dev`](https://agentboundary.jamjet.dev).

The spec lives at [`jamjet-labs/agentboundary`](https://github.com/jamjet-labs/agentboundary).
This repo only houses presentation: the landing hero, spec rendering, the
schema endpoint at `/schemas/action-receipt-v0.1.json`, OG images, and CI
that guards the schema-byte-identity contract.

## Local development

The site syncs spec markdown + the JSON Schema + worked example receipts
from the spec repo at build time. Two modes:

- **Local mode (default)** — if `../agentboundary/` exists as a sibling
  checkout and `AGENTBOUNDARY_REF` is unset, sync from the working tree.
  Fast inner-loop iteration.
- **Pinned mode (CI / production deploys)** — set
  `AGENTBOUNDARY_REF=v0.1.0` and the build fetches that tag from
  `raw.githubusercontent.com`.

```bash
pnpm install
pnpm dev
# open http://localhost:4321
```

## Build

```bash
pnpm build
# dist/ is the Cloudflare Pages output
```

## Verify locally

```bash
pnpm prebuild   # sync + schema-identity check
pnpm build
diff dist/schemas/action-receipt-v0.1.json ../agentboundary/docs/schemas/action-receipt-v0.1.json
# must produce no diff
```

## Deploy

The site lives on Cloudflare Pages. Production deploys from `main`.
Custom domain `agentboundary.jamjet.dev` is configured on the Pages
project. The schema endpoint is served at the path the spec's `$id`
declares; the build refuses to publish if those bytes drift.

## License

Apache 2.0 — see [LICENSE](LICENSE).
