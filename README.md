# chain-pulse

**Is your bank down? Check if the chains are.**

Live block production for Bitcoin, Ethereum, Solana and Base, from public nodes, refreshed every few seconds.

**Open it: [morbiuslabs.github.io/chain-pulse](https://morbiuslabs.github.io/chain-pulse/)**

[![chain-pulse live page](assets/screenshot.png)](https://morbiuslabs.github.io/chain-pulse/)

One HTML file. No build step, no backend, no tracking. Your browser talks straight to the public nodes listed below and nothing else.

## What each card shows

| Chain | Data | Source |
|---|---|---|
| Bitcoin | latest block, time since it, average block time over the last 15 blocks, tx count | `mempool.space/api/v1/blocks` |
| Ethereum | latest block, time since it, average block time while the page is open, tx count | `eth_getBlockByNumber` on `ethereum-rpc.publicnode.com` |
| Solana | current slot, slot time, transactions per second, slots per minute | `getRecentPerformanceSamples` and `getSlot` on `solana-rpc.publicnode.com` |
| Base | same as Ethereum | `eth_getBlockByNumber` on `base-rpc.publicnode.com` |

## Status rules

- **LIVE**: the newest block is younger than 3x the chain's normal block time. Bitcoin uses 60 minutes, because its gaps vary a lot.
- **SLOW**: older than that.
- **STALLED**: older than 10x the normal block time (Bitcoin: 2 hours).

Solana is LIVE when it produced more than 60 slots in the last sampled minute.

If a node can't be reached the card says "node unreachable". That is a problem with the node, not proof the chain is down.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Why

On Nov 16, 2026, Chase, Bank of America, Wells Fargo and U.S. Bank customers reported problems at the same time. Between noon and 3 p.m. ET, Bitcoin added 26 blocks. The full check is in [MorbiusLabs/receipts](https://github.com/MorbiusLabs/receipts).

Made by [@MorbiusLabs](https://x.com/MorbiusLabs). MIT licensed.
