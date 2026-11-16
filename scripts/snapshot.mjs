// Takes one status snapshot of every chain and appends it to a history file.
// Run by GitHub Actions every 5 minutes (see .github/workflows/pulse.yml).
//
//   node scripts/snapshot.mjs path/to/history.json
//
// Status codes, one character per chain in CHAINS order:
//   0 LIVE, 1 SLOW, 2 STALLED, 3 no answer from any node
// Same rules as the live page. Node 20+, no dependencies.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = process.argv[2] || "history.json";
const KEEP = 2016; // 7 days of 5-minute snapshots

const CHAINS = [
  { id: "btc", kind: "btc" },
  { id: "eth", kind: "evm", target: 12, rpc: ["https://ethereum-rpc.publicnode.com", "https://1rpc.io/eth"] },
  { id: "sol", kind: "sol", rpc: ["https://solana-rpc.publicnode.com"] },
  { id: "bnb", kind: "evm", target: 0.75, rpc: ["https://bsc-rpc.publicnode.com", "https://bsc-dataseed.binance.org"] },
  { id: "avax", kind: "evm", target: 2, rpc: ["https://avalanche-c-chain-rpc.publicnode.com", "https://api.avax.network/ext/bc/C/rpc"] },
  { id: "base", kind: "evm", target: 2, rpc: ["https://base-rpc.publicnode.com", "https://mainnet.base.org", "https://1rpc.io/base"] },
  { id: "arb", kind: "evm", target: 0.25, rpc: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"] },
  { id: "op", kind: "evm", target: 2, rpc: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"] },
  { id: "pol", kind: "evm", target: 2, rpc: ["https://polygon.drpc.org", "https://1rpc.io/matic"] },
];

async function getJSON(url, opt = {}) {
  const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/json", "User-Agent": "chain-pulse-snapshot", ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}
async function rpc(urls, body) {
  for (const u of urls) {
    try {
      const j = await getJSON(u, { method: "POST", body: JSON.stringify(body) });
      if (j.error || j.result == null) throw new Error("rpc error");
      return j.result;
    } catch { /* next node */ }
  }
  throw new Error("all nodes failed");
}
const grade = (age, live, stall) => (age < live ? 0 : age < stall ? 1 : 2);

async function check(c, now) {
  try {
    if (c.kind === "btc") {
      let b;
      try { b = await getJSON("https://mempool.space/api/v1/blocks"); } catch { b = await getJSON("https://blockstream.info/api/blocks"); }
      const t = Math.max(...b.map((x) => x.timestamp));
      return grade(now - t, 3600, 7200);
    }
    if (c.kind === "sol") {
      const [s] = await rpc(c.rpc, { jsonrpc: "2.0", id: 1, method: "getRecentPerformanceSamples", params: [1] });
      const perMin = (s.numSlots * 60) / s.samplePeriodSecs;
      return perMin > 60 ? 0 : perMin > 0 ? 1 : 2;
    }
    const blk = await rpc(c.rpc, { jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] });
    return grade(now - parseInt(blk.timestamp, 16), Math.max(c.target * 3, 15), Math.max(c.target * 10, 60));
  } catch {
    return 3;
  }
}

const now = Math.floor(Date.now() / 1000);
const codes = await Promise.all(CHAINS.map((c) => check(c, now)));
let hist = { v: 1, chains: CHAINS.map((c) => c.id), every: 300, rows: [] };
if (existsSync(OUT)) {
  try { const old = JSON.parse(readFileSync(OUT, "utf8")); if (old.v === 1 && old.chains.join() === hist.chains.join()) hist = old; } catch { /* start fresh */ }
}
hist.rows.push([now, codes.join("")]);
hist.rows = hist.rows.slice(-KEEP);
hist.updated = now;
writeFileSync(OUT, JSON.stringify(hist));
console.log(new Date(now * 1000).toISOString(), hist.chains.map((id, i) => `${id}:${"LSXN"[codes[i]]}`).join(" "), `rows=${hist.rows.length}`);
