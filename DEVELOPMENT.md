# Sherwood — DEVELOPMENT

## 2026-07-13 07:17 UTC

- Entered repo; product direction set to **Fractional Asset Loot Protocol** (PRD).
- Added `cursor_project_rules/` (README, tech-stack, implementation-plan).
- Current code is raffle/pack prototype (`RaffleManager`, `PackManager`); pivot pending architecture decision (reuse VRF/USDG/Treasury vs greenfield Pot stack).

## 2026-07-13 08:35 UTC

- Architecture: **greenfield Pot stack** (keep legacy raffle as non-core).
- Contracts: `PotFactory`, `Pot`, `PotCard`, `RevealEngine`, `AssetManager`, `ISwapRouter`; deploy script `PotDeploy.s.sol`.
- Reveal allocation: deposit × random multiplier [0.5x–2.0x] → normalize Σ=1e18; floor ownership > 0; rarity from multiplier bands.
- Tests: `PotProtocol.t.sol` — 4/4 pass (funding/close, deadline, conservation, entry fees).
- Web: pot discovery + deposit, cards inventory, landing/nav copy → Fractional Asset Loot; ABIs + `.env.local.example` pot addresses.

## 2026-07-13 09:55 UTC

- Full business flow: deposit → close → purchase → fee sweep → VRF reveal → claim asset share.
- Fees: creation fee (community pots), entry fee, protocol bps → `Treasury.depositFeeUSDG`; `Pot.sweepFees()` once.
- Hardening: pause (factory+pot), purchasePulled, operators on AssetManager/RevealEngine, claim anti-double, access checks.
- Local anvil “devnet”: `scripts/devnet-sim.sh` → LocalStack + SimulateBusinessFlow → `SIMULATION_OK`.
- Audit battery: `PotBusiness.t.sol` (flow/attacks), `PotFuzzTest` (256), `PotInvariantTest` (256 runs / 128k calls) — **16/16 pass**.
- Checklist: `cursor_project_rules/audit-checklist.mdc`.

## 2026-07-13 10:15 UTC

- Phase 2 complete: inventory claim + list-to-market; pot app links to create/EV/market.
- Phase 3: `CardMarketplace` (2.5% royalty → Treasury) + tests; pages `/marketplace`, `/create`, `/leaderboard` (ranks + achievements).
- Phase 4: `allocation-ev.mdc`, `jurisdiction-notes.mdc`, public `/docs/allocation`.
- LocalStack/PotDeploy emit MARKETPLACE; env example updated.

## 2026-07-13 11:30 UTC

- Brand: **Sherhood** / sherhood.online UI refresh (Syne + DM Sans, ETH/WETH/USDG pay toggle).
- `EntryRouter`: ETH/WETH → USDG auto-swap, router fee on the fly → Treasury, `Pot.depositFor`.
- `StockTokenRegistry` allowlist wired into `PotFactory` (`requireRegisteredStock`).
- RH deploy: `script/RhDeploy.s.sol`, `.env.rh.example`, chain id 4663 + official RPC/explorer.
- Push prep: root `.gitignore`, monorepo commit.
