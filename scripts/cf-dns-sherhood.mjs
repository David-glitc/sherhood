#!/usr/bin/env node
/**
 * Point sherhood.xyz apex + www at Vercel via CNAME
 * (0a81ad035ecc9543.vercel-dns-017.com, per Vercel's recommended records).
 * Cloudflare flattens the apex CNAME automatically.
 * Uses IPv4 for Cloudflare API (VPS IPv6 is blocked on some tokens).
 *
 *   node scripts/cf-dns-sherhood.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ZONE = "sherhood.xyz";
const VERCEL_CNAME = "0a81ad035ecc9543.vercel-dns-017.com";
const API = "https://api.cloudflare.com/client/v4";

function loadCreds() {
  const file = process.env.CF_CREDS_FILE ?? path.join(os.homedir(), "cf.creds");
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (process.env[k] === undefined) process.env[k] = v;
  }
  const token = process.env.API_TOKEN?.trim();
  if (!token) throw new Error("API_TOKEN not set in cf.creds");
  return token;
}

/** curl -4 wrapper — CF token may reject IPv6 VPS egress */
function cf(token, method, urlPath, body) {
  const args = [
    "-4",
    "-s",
    "-X",
    method,
    "-H",
    `Authorization: Bearer ${token}`,
    "-H",
    "Content-Type: application/json",
  ];
  if (body) args.push("-d", JSON.stringify(body));
  args.push(`${API}${urlPath}`);
  const out = execFileSync("curl", args, { encoding: "utf8" });
  const json = JSON.parse(out);
  if (!json.success) throw new Error(JSON.stringify(json.errors ?? json));
  return json.result;
}

async function upsertCname(token, zid, name, target) {
  const fqdn = name === "@" ? ZONE : `${name}.${ZONE}`;
  const existing = await cf(
    token,
    "GET",
    `/zones/${zid}/dns_records?name=${encodeURIComponent(fqdn)}`
  );
  const payload = {
    type: "CNAME",
    name: fqdn,
    content: target,
    ttl: 1,
    proxied: false,
    comment: "Vercel production (sherhood web)",
  };
  const current = existing.find((r) => r.type === "CNAME" || r.type === "A");
  if (current) {
    if (current.type === "CNAME" && current.content === target) {
      console.log(`OK  ${fqdn} → ${target} (unchanged)`);
      return;
    }
    await cf(token, "PUT", `/zones/${zid}/dns_records/${current.id}`, payload);
    console.log(`UPD ${fqdn} (${current.type} ${current.content}) → CNAME ${target}`);
  } else {
    await cf(token, "POST", `/zones/${zid}/dns_records`, payload);
    console.log(`ADD ${fqdn} → CNAME ${target}`);
  }
}

async function main() {
  const token = loadCreds();
  const zones = await cf(token, "GET", `/zones?name=${ZONE}`);
  if (!zones?.length) throw new Error(`Zone ${ZONE} not found`);
  const zid = zones[0].id;
  await upsertCname(token, zid, "@", VERCEL_CNAME);
  await upsertCname(token, zid, "www", VERCEL_CNAME);
  console.log("\nDone. Vercel will verify sherhood.xyz within a few minutes.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
