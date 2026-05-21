#!/usr/bin/env node
// Pulls the spec markdown + schema + worked example receipts from
// jamjet-labs/agentboundary at a pinned ref (or from a local sibling
// checkout, whichever is appropriate).
//
// Local mode  (default): if ../agentboundary/ exists and AGENTBOUNDARY_REF
//                        is unset, copy from the sibling working tree.
//                        Optimised for fast inner-loop iteration.
// Pinned mode (production deploys): if AGENTBOUNDARY_REF is set, fetch
//                                   raw files from raw.githubusercontent.com
//                                   at that ref. Cached under .cache/spec/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const REF = process.env.AGENTBOUNDARY_REF || ""; // e.g. "v0.1.0", "main"
const LOCAL_SIBLING = resolve(repoRoot, "..", "agentboundary");

const SPEC_FILES = [
  ["docs/spec/v0.1.md", "src/content/spec/v0.1.md", { title: "AgentBoundary v0.1 Specification" }],
  ["docs/spec/v0.2-alpha.md", "src/content/spec/v0.2-alpha.md", { title: "AgentBoundary v0.2-alpha (Draft)" }],
  ["docs/spec/threat-model.md", "src/content/spec/threat-model.md", { title: "AgentBoundary Threat Model" }],
  ["docs/spec/owasp-mapping.md", "src/content/spec/owasp-mapping.md", { title: "OWASP LLM Top 10 — AgentBoundary Mapping" }],
];

// Rewrite repo-relative links that don't resolve on the microsite.
// e.g. `../schemas/action-receipt-v0.1.json` → `/schemas/action-receipt-v0.1.json`
function rewriteLinks(body) {
  return body
    .replace(/\(\.\.\/schemas\/action-receipt-v0\.1\.json\)/g, "(/schemas/action-receipt-v0.1.json)")
    .replace(/\(\.\.\/receipts\/([a-z0-9-]+)\.json\)/g, "(/receipts/$1.json)")
    .replace(/\(threat-model\.md\)/g, "(/threat-model)")
    .replace(/\(owasp-mapping\.md\)/g, "(/owasp-mapping)")
    .replace(/\(v0\.1\.md\)/g, "(/spec/v0.1)");
}
const SCHEMA_FILES = [
  ["docs/schemas/action-receipt-v0.1.json", "public/schemas/action-receipt-v0.1.json"],
  ["docs/schemas/action-receipt-v0.2-alpha.json", "public/schemas/action-receipt-v0.2-alpha.json"],
];
const RECEIPT_FILES = [
  ["docs/receipts/github-merge.json", "public/receipts/github-merge.json"],
  ["docs/receipts/spring-service-mutation.json", "public/receipts/spring-service-mutation.json"],
  ["docs/receipts/stripe-refund.json", "public/receipts/stripe-refund.json"],
];

function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}

async function fetchOne(remote, dest) {
  const url = `https://raw.githubusercontent.com/jamjet-labs/agentboundary/${REF}/${remote}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function copyOne(remote, dest) {
  const src = join(LOCAL_SIBLING, remote);
  if (!existsSync(src)) {
    throw new Error(`local sibling missing: ${src}`);
  }
  return readFileSync(src, "utf8");
}

async function sync() {
  const useLocal = !REF && existsSync(LOCAL_SIBLING);
  const mode = useLocal ? "local" : "remote";
  if (!useLocal && !REF) {
    console.error("sync-spec: neither local sibling nor AGENTBOUNDARY_REF available");
    process.exit(2);
  }
  console.log(`sync-spec: mode=${mode}${REF ? ` ref=${REF}` : ` source=${LOCAL_SIBLING}`}`);

  const all = [
    ...SPEC_FILES.map((e) => ["spec", ...e]),
    ...SCHEMA_FILES.map((e) => ["schema", ...e]),
    ...RECEIPT_FILES.map((e) => ["receipt", ...e]),
  ];
  for (const [kind, remote, dest, opts] of all) {
    const destAbs = resolve(repoRoot, dest);
    ensureDir(destAbs);
    let body = useLocal ? copyOne(remote, dest) : await fetchOne(remote, dest);
    if (kind === "spec") {
      const fm = `---\ntitle: ${JSON.stringify(opts?.title || "")}\n---\n\n`;
      body = fm + rewriteLinks(body);
    }
    writeFileSync(destAbs, body);
    console.log(`  ${remote} -> ${dest} (${body.length} bytes)`);
  }

  const meta = {
    ref: useLocal ? "local" : REF,
    source: useLocal ? LOCAL_SIBLING : `github:jamjet-labs/agentboundary@${REF}`,
    synced_at: new Date().toISOString(),
  };
  writeFileSync(resolve(repoRoot, "src/content/spec/_meta.json"), JSON.stringify(meta, null, 2));
  console.log("sync-spec: done");
}

sync().catch((err) => {
  console.error(`sync-spec: FAIL ${err.message}`);
  process.exit(1);
});
