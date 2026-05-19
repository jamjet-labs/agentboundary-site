#!/usr/bin/env node
// Fail the build if the locally-served schema diverges in any byte from
// the upstream source. This contract is what `$id` resolvers depend on.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname, "..");
const served = resolve(root, "public/schemas/action-receipt-v0.1.json");
const sibling = resolve(root, "..", "agentboundary/docs/schemas/action-receipt-v0.1.json");

if (!existsSync(served)) {
  console.error(`verify-schema: ${served} missing — run sync-spec first.`);
  process.exit(2);
}

const servedBytes = readFileSync(served);
const servedSha = createHash("sha256").update(servedBytes).digest("hex");

// If a local sibling exists (i.e. we ran sync-spec in local mode), confirm byte-identity.
// In a CI build pinned to a tag, the served file IS upstream by construction; just print the hash.
if (existsSync(sibling)) {
  const upstreamBytes = readFileSync(sibling);
  const upstreamSha = createHash("sha256").update(upstreamBytes).digest("hex");
  if (servedSha !== upstreamSha) {
    console.error("verify-schema: FAIL — served schema diverges from upstream");
    console.error(`  served:   ${servedSha}`);
    console.error(`  upstream: ${upstreamSha}`);
    process.exit(1);
  }
  console.log(`verify-schema: OK (sha256=${servedSha})`);
} else {
  console.log(`verify-schema: pinned-ref build (no local sibling); sha256=${servedSha}`);
}

// Verify $id host
const schema = JSON.parse(servedBytes.toString("utf8"));
const expected = "https://agentboundary.jamjet.dev/schemas/action-receipt-v0.1.json";
if (schema.$id !== expected) {
  console.error(`verify-schema: FAIL — $id is "${schema.$id}", expected "${expected}"`);
  process.exit(1);
}
console.log(`verify-schema: $id host correct (${schema.$id})`);
