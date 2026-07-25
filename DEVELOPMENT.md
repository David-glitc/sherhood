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

## 2026-07-13 10:48 UTC (deploy readiness)

- **VRF:** Chainlink VRF not listed on RH mainnet → `PrevRandaoCoordinator` (delay + prevrandao seed); RhDeploy uses it when `VRF_COORDINATOR` empty. Flow: `requestReveal` → wait N blocks → `PrevRandaoCoordinator.fulfill(requestId)`.
- **Swap:** `ISwapRouter02` (no deadline) for RH SwapRouter02 `0xcaf681a66d020601342297493863e78c959e5cb2`.
- **Deployer gate:** `0x5F90bc2dC3d0aDC7EfE91cE5667d5AF00ee75AA1` still **0 ETH** on RH — fund before broadcast.
- **Revenue @ $100k primary deposit volume (defaults):** protocol 1% = **$1,000**; EntryRouter 0.5% only on ETH/WETH path ($0–$500); marketplace 2.5% on secondary (e.g. $500 if $20k trades). Typical mix ~**$1.5k–$2.6k** protocol take.

## 2026-07-13 11:45 UTC (deploy + domain)

- Domain canonical: **sherhood.xyz** (metadata/README/tech-stack updated from `.online`).
- Vercel: `sherhood.xyz` + `www.sherhood.xyz` added to project **web**; production env → RH chain 4663 + official USDG/WETH.
- Cloudflare: zone on CF (`alexandra`/`leo` NS); A records needed `@` + `www` → `76.76.21.21` — API token in `~/cf.creds` blocked (invalid + VPS IP restriction). Script: `scripts/cf-dns-sherhood.mjs`.
- VRF: no Chainlink on RH; `PrevRandaoCoordinator` ships with RhDeploy; Blockscout `0x362D…` is minimal stub bytecode, not production VRF.
- RH deploy still blocked: deployer `0x5F90…5AA1` balance **0 ETH**; fund then `forge script script/RhDeploy.s.sol --rpc-url $RH_RPC_URL --broadcast`.

## 2026-07-13 12:15 UTC (NFT card art)

- HD exotic SVG card set: `web/public/cards/` — mystery, common, rare, epic, legendary.
- `PotNftCard` component + mint celebration modal on deposit; inventory/marketplace show card art.
- `PotCard.tokenURI` + `/api/cards/[id]` OpenSea metadata; RhDeploy sets `baseURI` sherhood.xyz.

- **CF DNS via IPv4:** `sherhood.xyz` + `www` → `76.76.21.21` (grey cloud). `scripts/cf-dns-sherhood.mjs` now forces `curl -4`.
- **Deploy assurance:** `scripts/deploy-assurance.sh` → 40/40 tests, fuzz 500, invariant 256, PrevRandao, anvil e2e `SIMULATION_OK`.
- **LocalStack fix:** `StockTokenRegistry` wired (devnet-sim was failing `no registry`).
- **S&P500 scout:** `contracts/config/rh-sp500-canonical.json` — 20 canonical RH tokens (`• Robinhood Token`); top overlap NVDA, AAPL, MSFT, AMZN, META, GOOGL, AVGO, TSLA + ETFs SPY/QQQ. Many S&P names not on RH yet (JPM, V, UNH, etc.).
- **Post-deploy:** `RhRegisterStocks.s.sol` + `scripts/rh-stocks-env.sh` to batch-register allowlist.

## 2026-07-13 14:20 UTC (exotic NFT card art)

- Replaced stub SVG card faces with HD exotic art: Mystery / Common / Rare / Epic / Legendary.
- Assets: `web/public/cards/{rarity}.webp` (UI 800×1200) + `.jpg` (wallet metadata 1024×1536).
- `PotNftCard` foil sheen (Epic/Legendary) + mystery pulse; mint modal + inventory + marketplace already wired.
- Metadata API `/api/cards/[id]` points `image` at sherhood.xyz JPG faces.
- Logo + OG rebranded Sherhood; RH stock token labels updated in `use-pots.ts`.

## 2026-07-13 14:45 UTC (anvil E2E + edge/overflow battery)

- Anvil `devnet-sim.sh` → `SIMULATION_OK` (deposit → buy → reveal → claim).
- Added `test/PotEdgeOverflow.t.sol` (18 tests): min/max deposit, goal overflow, deadlines, max fee, dust, double reveal, market royalty, 40-player stress, large-deposit reveal, mul overflow panic, fuzz unequal large deposits.
- Fuzz 1000 runs + invariant 256×128k calls — all green. Full suite **58/58**.

## 2026-07-13 15:15 UTC (UI: Baskets + ore-style + wallet)

- Product noun: **Baskets** (not pots) across landing, app, create, cards, trade.
- Visual: pure black + Robinhood lime `#7cff6b` + **Poppins**; ore.com-style sparse nav (Baskets / Cards / Trade / Create) + pill Connect.
- Trade page reframed: cards mint from funding baskets; marketplace is secondary only.
- Removed public “allocation EV / mdc” surface — `/docs/allocation` redirects to `/#how`.
- Dynamic: `connect-only`, RH chain override, lime CSS, `@dynamic-labs/wagmi-connector` + wagmi v2 for real wallet connect/signing.

## 2026-07-13 15:35 UTC (local smoke only + live ETH/USD + UI)

- **No mainnet smoke.** `scripts/local-smoke.sh` = EntryRouter (Uniswap V3 exactInputSingle mock) + edge/overflow + fuzz + PrevRandao + anvil `SIMULATION_OK`.
- Live ETH/USD: `/api/prices/eth` (Coinbase→Binance fallback), header + baskets ticker, deposit USD estimate.
- Baskets UI: ore-style amount chips, big amount input, preview cards when undeployed.

## 2026-07-13 15:50 UTC (create UX + lime mark)

- Create form: stock picker only + funding goal + min deposit + duration **hours**. No user fee knobs (protocol defaults).
- Create fee shown + paid in USDG (factory `creationFee`).
- Brand: lime `#7CFF6B` mark + SHER/**HOOD** wordmark in header / favicon / OG.

## 2026-07-14 10:26 UTC (stock logos, multi-stock UX, $SHRH)

- **Stock logos:** bundled 20 RH tickers in `web/public/stocks/*.png`; `StockLogo` local-first with parqet/FMP CDN fallbacks; `StockRegistryGrid` on `/create`.
- **Multi-stock baskets:** UI aligned with contracts — no stock at creation; `AssetManager` picks 2–5 at close; create form + basket cards show registry preview / holdings stack.
- **$SHRH luck bringer:** `SherhoodToken` minted to treasury on `RhDeploy`; `RevealEngine` +25% reveal multiplier at 1k SHRH; `ShrhLuckPill` with mark icon across landing/app/create/inventory.
- `npm run build` green.

## 2026-07-14 10:00 UTC (create fee $5 + deployer exempt)

- `PotFactory.createCommunityPot`: **5 USDG** create fee (`5e18`); **factory owner (deployer) pays nothing**.
- `RhDeploy` / `.env.rh.example` default `CREATION_FEE=5e18`.
- `/create` UI: shows **$5 USDG** for community; **Free · deployer** when connected wallet is factory `owner()`.

## 2026-07-14 10:05 UTC (logo refresh)

- New **Cloak Card** mark: lime tile, hood silhouette, mystery card + fraction bars, $SHRH luck spark.
- Updated `mark.svg`, `favicon.svg`, `logo.svg`, `og-image.svg` (hood + multi-stock + SHRH tagline).

## 2026-07-14 10:12 UTC (RainbowKit + logo v2)

- Wallet: **RainbowKit + wagmi + viem** (replaced Dynamic); `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- Chains: RH (4663) default + mainnet/base/arbitrum.
- Logo v2: minimal **reveal ring** mark (lime tile, arc + dot) — less busy than cloak card.
- PNG exports regenerated; `ConnectButton` in header.

## 2026-07-14 10:18 UTC (brand lockup + electric lime)

- **Chosen logo:** Robin Hood silhouette + arrow lockup (option 2); ring lockup saved as `brand-lockup-ring.png` alt.
- **Brand lime:** `#C5F70A` (sampled from user assets) replaces `#7CFF6B` app-wide.
- Assets: `logo.png`, `og-image.png`, `brand-lockup-hood.png`, header mark from hood icon crop.

## 2026-07-14 10:42 UTC (RH mainnet live)

**Deployed** chain 4663 — deployer `0x5F90…5AA1`
| Contract | Address |
|----------|---------|
| PotFactory | `0xB7654fFBC0E6b1125cfA6ab3461966d24A8b7306` |
| PotCard | `0xe131943A9069faC24588c2aa0393c766c94b60F6` |
| EntryRouter | `0x192D7bD2e525C490F43BEE8d5b0F364F08D9D552` |
| Marketplace | `0x3acCC43383047e560E95BFacFbb7A5F22f507d62` |
| StockRegistry | `0x3B306501679fcBF761b68B2271609d745B21077B` |
| $SHRH | `0x603346C9a100060687735720066e2382872cdbAd` |
| Treasury | `0xd16D96384E23073d0b8EA9c92eD50EeA0beD7E20` |

- 20 RH stock tokens registered on StockRegistry.
- **Live basket** `0xd6C2EEEE2E29ABD24359d8AeDe17D644F9BB033E` — **100 USDG** goal, **1 USDG** min deposit, **5 days**.
- Vercel production env updated + redeploy → sherhood.xyz.

## 2026-07-14 11:00 UTC (charts, USDG logo, treasury wallet, brand polish)

- **Stock price charts:** `/api/stocks/[symbol]` (Yahoo 5d) + `StockPriceChart` sparklines on `/app`, basket holdings, create registry grid.
- **USDG logo:** `/tokens/usdg.png` + `UsdgLogo` in settle ticker, deposits, marketplace, create fee.
- **Brand assets:** rounded-corner lockup (`brand-lockup-hood.png`, `og-image.png`, favicon `logo-mark-192.png`).
- **Treasury:** on-chain fees still land in Treasury contract `0xd16D…7E20`; ownership transferred to fee wallet `0xc24f7118f55d0643a82a1594cbcbb7484011a251` (tx `0x8f1dc7c61cff990a4773f1933b89f3741b0e0522c3327695c4b8da6688528999`). Withdraw via `Treasury.withdrawUSDG` as owner.
- Env: `NEXT_PUBLIC_TREASURY_FEE_WALLET=0xc24f7118f55d0643a82a1594cbcbb7484011a251`.

## 2026-07-14 11:05 UTC (treasury upgrade, landing activity, Telegram)

- **Treasury upgrade:** deployed `TreasuryDirect` `0xdfa1c90107faf1a19e53e6eed9ee4aa6ad414085` — fees forward straight to `0xc24f7118…`. PotFactory / EntryRouter / Marketplace **addresses unchanged**; `setTreasury` pointed at new sink.
- **Landing:** live running baskets section + scrolling activity stripe (`/api/pots`, `/api/activity`) — e.g. `0xabc…def funded 2× on Basket 0xd6C2…33E`.
- **Telegram:** [@sherhoodhub](https://t.me/sherhoodhub) in header, hero, footer, `/telegram` hub page.

## 2026-07-14 11:15 UTC (USDG logo, RH-only chain, header, fund UX)

- **USDG logo:** official Global Dollar mark from Blockscout (`GDN_USDG_Token_200x200.png`) → `/tokens/usdg.png`.
- **Wallet:** wagmi/RainbowKit **Robinhood Chain only** (removed mainnet/base/arbitrum); auto `switchChain` before txs; fund button shows “Switch to Robinhood Chain”.
- **Header:** wrapped nav grid — no horizontal scroll on mobile.
- **Note:** RH USDG is **6 decimals**; pots store amounts in 18-decimal protocol units — if USDG deposits still fail, redeploy baskets with `1e6`-scaled goals/mins or add decimal adapter in contracts.

## 2026-07-15 12:45 UTC (docs site + layout polish)

- **Docs:** MDX via `next-mdx-remote/rsc` + `remark-gfm` + `gray-matter`; SSG routes `/docs/[slug]` (`getting-started`, `protocol`, `allocation`, `fees`); content in `web/content/docs/*.mdx`.
- Docs shell: sidebar nav, pager, footer; nav **Docs** + landing how-it-works link; `robots.ts` sitemap → `sherhood.xyz`.
- Copy aligned to live protocol: stocks luck-picked **at close** (2–5), no ticker at create; `$SHRH` reveal boost; multi-holding claims.
- Layout: lighter docs header (no duplicate H1), create page header centered; removed unused root `mdx-components.tsx`.

## 2026-07-15 12:50 UTC (RH faucet design system + exotic hero)

- Applied faucet.testnet.chain.robinhood.com tokens: accent `#ccff00`, surfaces `#0f0f0f`/`#191919`/`#333333`, text `#e5e7eb`/`#999999`, button radius 10–14px (not pills).
- Landing: removed lockup image from hero; new animated SVG acre (`HeroAcreSvg`) as center focus with orbiting stock nodes.
- Updated `Button` variants, header active states, CTA section to faucet button sizes/padding.
- Kept Poppins (project type); RH patterns for color/radius/spacing only.

## 2026-07-15 13:05 UTC (production deploy)

- Vercel prod deploy of `web` → aliased to **sherhood.xyz** / www (docs MDX + RH faucet hero/tokens).
- Inspect: `BmW6AKCvJyvH1kKi9dP1FYU39mAK`.

## 2026-07-15 14:40 UTC (legal + profile + remove SHRH banner)

- Removed Flap/`$SHRH` header banner.
- Sitewide footer: experimental AS-IS exclusion + links to Terms, Privacy, Profile.
- Pages: `/legal/terms`, `/legal/privacy` (full liability exclusion), `/profile` with **Delete my account and data** (disconnect + clear local interface storage; on-chain data cannot be erased).
- Profile added to nav; sitemap updated.

## 2026-07-15 14:50 UTC (prod deploy — legal + profile)

- Vercel prod → **sherhood.xyz** (terms, privacy, profile delete, banner removed, footer disclaimer).
- Inspect: `7TfDRgxacb6vtxXaxQizi8gKCokq`.

## 2026-07-15 16:10 UTC (basket detail + early exit 5%)

- **Contracts:** `Pot.earlyExit` / `previewEarlyExit` (`EARLY_EXIT_FEE_BPS = 500`); `PotCard.burnForEarlyExit` removes from pot index. Forge `PotEarlyExitTest` 5/5.
- **Web:** `/basket/[slug]` detail (contract, stats, deposits, fund, withdraw 5%, claim); discovery + live baskets link to detail; ABIs exported; fees/getting-started docs updated.
- **Note:** Existing RH baskets use prior Pot bytecode — early exit only on **new** pots after redeploying factory-created Pot code.

## 2026-07-15 16:28 UTC (pause RH redeploy; hide early exit UI)

- Redeploy paused (deployer still underfunded for ~0.00345 ETH sim).
- Removed early-exit withdraw UI, redeploy/version alerts, and `use-early-exit` hook from the app; `/basket/[slug]` remains details + deposit + claim.
- Docs no longer mention early exit. Contract `earlyExit` left in source for a later RH cut.

## 2026-07-15 16:35 UTC (basket alerts cleared + prod)

- Removed PotFactory “not registered” banner from `/basket/[slug]`.
- Prod deploy for UI test → **sherhood.xyz** (inspect `6v9SrtSPTPo29bAjeNXJ8zfQjhaz`).

## 2026-07-15 16:50 UTC (basket page redesign)

- Rebuilt `/basket/[slug]`: asymmetric raise+fund layout, hero raised figure, no meta card grid, ledger-style deposits, sticky fund panel (RH faucet language).
- Dropped ops noise (purchasePulled / treasury tiles).

## 2026-07-15 21:40 UTC (basket page — orbit SVG + token charts + rounded)

- Added `BasketOrbitSvg` (progress ring + orbiting stock chips) and `TokenChartCard` (filled 5-day sparks).
- Softened basket UI: 14–22px radii on fund panel, pills, charts, tables; live registry chart grid.

## 2026-07-15 21:45 UTC (mobile basket + prod)

- Basket: fund panel first on mobile; stacked orbit; smaller type; scrollable deposits; 44px touch targets.
- Header lockup shrinks on small screens. Prod → sherhood.xyz.

## 2026-07-15 21:15 UTC (prod deploy — basket redesign)

- Vercel prod → **sherhood.xyz** (redesigned `/basket/[slug]`).
- Inspect: `6QoTtz1UYo6GRtXDt9QKTVoPFMe4`.

## 2026-07-16 20:10 UTC (Vercel cleanup + DNS fix)

- Deleted empty duplicate Vercel project `sherhood.xyz` (0 deployments); real app is project `web`.
- Cloudflare DNS: apex + www moved from A 76.76.21.21 to Vercel-recommended CNAME `0a81ad035ecc9543.vercel-dns-017.com` via `scripts/cf-dns-sherhood.mjs` (script updated to CNAME upserts).

## 2026-07-16 23:45 UTC (fresh deploy branch + dual luck + XP)

- **Min vs full:** RhUpgrade (~0.0022 ETH) only swaps changed contracts onto old stack; SherhoodDeploy (~0.004 ETH) is a clean branded slate (preferred).
- Branch `contracts/sherhood-v2-fresh`. New `script/SherhoodDeploy.s.sol` + `scripts/sherhood-deploy.sh` (broadcast + Blockscout verify). No $SHRH deploy/hardcode — `setLuckToken` after launch.
- Dual luck: `PotCard.luckLocked` at deposit via `RevealEngine.isLuckEligible`; boost only if locked + eligible at reveal. Target hold ≈ 0.055 ETH of $SHRH (amount set later).
- NFT brand: "Sherhood Card" / `SHRCARD`. Docs cleaned of protocol folder/internals; new `/docs/xp`.
- XP: `/api/xp` indexes deposits/creates/claims/exits/trades; streaks (+10%/day capped +50%); leaderboard page rebuilt.
- Deployer `0x5F90…5AA1` still ~0.000001 ETH on RH — needs ~0.004 ETH before broadcast.

## 2026-07-16 23:25 UTC ($SHRH env-driven + minimal upgrade script)

- RhDeploy no longer hard-mints SherhoodToken: reuses `SHRH_ADDRESS` from env (only mints fresh when unset). Luck threshold/boost also env-driven (`SHRH_LUCK_THRESHOLD`, `SHRH_LUCK_BOOST_BPS`).
- New `script/RhUpgrade.s.sol`: minimal redeploy (PotCard+PotFactory+RevealEngine+Marketplace only), reuses treasury/assetManager/coordinator (auto-discovered from old factory), EntryRouter repointed, registry + $SHRH reused; sets baseURI/contractURI/2981 royalty in-run; optional SEED_POT.
- `.env.rh.example`: SHRH_ADDRESS + OLD_FACTORY/ENTRY_ROUTER/STOCK_REGISTRY for upgrades.
- Sims: RhUpgrade ~0.0022 ETH (~$4.1); RhDeploy (reusing SHRH) ~0.0038 ETH (~$7.1). Deployer still needs funding (~0.0025+ ETH for minimal).

## 2026-07-16 23:15 UTC (redeploy cost + responsive/glass pass)

- RhDeploy sim: **~0.0039 ETH** needed (was blocked: PotFactory 24,823 > 24,576 limit; fixed by optimizer_runs 10000 → 200, factory now 21,212). Full forge suite green after change.
- Deployer 0x5F90…5AA1 balance ~0.0000013 ETH — still needs ~0.005 ETH funded before broadcast.
- CTA section: added missing rounded-[28px] (design.md rounded edges).
- StockPriceChart: fluid width (viewBox scale), fixed-height skeleton, tabular-nums — no more overflow/layout jump in registry chips; registry grid 1-col on tiny screens + glass chips.
- Glass panels applied to create, profile, marketplace, inventory cards/empty states.
- Landing mobile: halved floater count on <sm, tighter hero plate padding, full-width CTAs, section paddings py-16 sm:py-24/28.

## 2026-07-16 22:20 UTC (Direction v2 tranche 1 — OpenSea / pricing / docs)

- Spec locked as Phase 6 in implementation-plan.mdc (rollout: Trade+derived → exits → OpenSea → pre-reveal exit → VRF).
- Contracts: PotCard EIP-2981 (2.5%) + contractURI; Pot.derivedShare; CardMarketplace rejects claimed shells on list/buy. ABIs exported. Marketplace tests 5/5.
- API: `/api/cards/[id]` metadata v2 (State/Rarity/Ownership/Constituents, freeze cache post-reveal); `/api/collection` for contractURI.
- Docs: early-exit, secondary-market, pricing, opensea; allocation + fees amended; nav updated.
- UI: CardStateBadge + fair-share/ownership on Inventory + Trade; OpenSea nav → docs until NEXT_PUBLIC_OPENSEA_URL set.
- Still needs RH redeploy for on-chain royalty/URI/derivedShare; OpenSea collection submit after that. Post-close/pre-reveal exit held.

## 2026-07-16 21:55 UTC (phase-two cinematic landing + glass wallet)

- Replaced RainbowKit default chip with custom glass `WalletButton` (`ConnectButton.Custom`): conic avatar, truncated address/ENS, chain pill, specular edge.
- New `CinematicHero`: full-viewport stock-logo field with mouse + scroll parallax, glass content plate, lime ray atmosphere, Enter baskets CTA, scroll cue.
- Header is fixed/transparent on landing (subtle until scroll), glass blur when solid; mobile hamburger.
- Glass system in globals: `.glass-panel`, `.glass-ray`; applied to value props, FAQ, CTA.
- Landing marked `data-landing` so main has no top offset under the full-bleed hero.

## 2026-07-16 20:45 UTC (landing rework — logos in SVGs, hero row, new sections)

- `HeroAcreSvg`: orbiting ticker chips replaced with real stock logo nodes (two orbits, counter-rotated so logos stay upright), tick field, orbit tracks.
- `BasketOrbitSvg`: ticker chips → upright circular stock logos.
- Hero: desktop `lg:flex-row` (copy left, SVG right), mobile `flex-col-reverse`; simpler copy; removed "$SHRH on Flap" CTA → "$SHRH coming soon on Orynth" pill; deleted unused `FlapLaunchBanner`.
- New landing sections: `ValuePropsSection` (Why Sherhood), `StocksMarqueeSection` (20-token pool marquee), `FaqSection` (6 questions).
- Copy pass with plain grammar on how-it-works + CTA; legal pages now name Orynth instead of Flap.
- `lib/protocol.ts`: added `ORYNTH_URL`, `SHRH_LAUNCHED=false`; Flap URL kept as legacy.

## 2026-07-16 23:58 (UTC+1) — Per-token constituent breakdown on cards

- `/api/cards/[id]`: revealed cards now list the exact stock amounts the card redeems (weight × basket holdings) — new `"<SYMBOL> Share"` traits plus "redeems X NVDA, Y AAPL…" in the description. Unrevealed cards stay hidden.
- Inventory: revealed, unclaimed cards show a per-stock amount table under Deposit/Ownership (same math as `previewClaim`).
- Built and deployed to production.

## 2026-07-17 00:05 (UTC+1) — Aggressive edge-case audit prep

- Reviewed Pot stack against Aggressive Test Surfaces checklist (sections 1–9).
- Findings canvas: `~/.cursor/projects/home-david/canvases/sherhood-contract-audit.canvas.tsx`
- Updated `cursor_project_rules/audit-checklist.mdc` with ship blockers C-01 / H-01–H-08.
- Top issues: grindable `purchaseWithSeed`, PrevRandao fulfill bias, multi-leg slippage=0, soft listing lock, flash-loanable $SHRH dual check, no unmet-goal cancel, empty-pot close brick, immutable metadata freeze vs claim.
- Strong areas: exact-goal close, overshoot revert, Σ weights==1e18 enforce, double-reveal block, claimed-shell buy reject, immutable pot params.

## 2026-07-17 01:10 (UTC+1) — Audit remediations + comment strip

Security remediations (C-01 / H-01–H-08):
- AssetManager: commitPurchase + purchase (blockhash seed); per-leg minOut; seeded path disabled on prod deploy
- PrevRandaoCoordinator: fulfiller ACL (not permissionless)
- PotCard + CardMarketplace: on-chain listing lock (transfer/claim/burn blocked while listed)
- Pot: Cancelled status + cancel/refund/sweepCancelledFees for unmet-goal / emptied pots
- RevealEngine: luckEscrow lockLuck/unlockLuck (same-block unlock banned) — stops same-tx flash boost
- Metadata API: immutable Cache-Control only after claimed
- Docs early-exit aligned to live windows

Bytecode hygiene:
- Stripped NatSpec/comments from core contracts; shortened require strings
- foundry.toml: bytecode_hash=none, cbor_metadata=false
- PotFactory runtime ~22.7KB (under 24KB)

Tests: Pot* / CardMarketplace / PrevRandao / EntryRouter green; listing-lock test added.

## 2026-07-17 01:45 (UTC+1) — Deploy wiring: Blockscout key + stock whitelist

- Blockscout API key stored in gitignored `contracts/.env`; `scripts/sherhood-deploy.sh` now sources it alongside the deployer key so auto-verify runs after broadcast.
- Whitelist finalized to the 25 RH stock tokens with live addresses (AAPL, AMD, AMZN, BABA, BE, COIN, CRCL, CRWV, GOOGL, INTC, META, MSFT, MU, NVDA, ORCL, PLTR, QQQ, SGOV, SLV, SNDK, SPCX, SPY, TSLA, USAR, USO) — symbols without a token_address in the provided CSV are excluded until they exist on chain 4663.
- `contracts/.env.rh.example`: added `STOCK_SYMBOLS` / `STOCK_ADDRESSES` / `STOCK_DEFAULT_POOL_FEE=500`.
- `scripts/sherhood-deploy.sh`: after broadcast it parses the deployed `StockTokenRegistry` address from the broadcast log and runs `RhRegisterStocks.s.sol` automatically — no manual registration step.
- `web/lib/basket-stocks.ts`: `BASKET_STOCKS` rewritten to the same 25 tokens (removed stale/incorrect AVGO, NFLX, XOM, COST, LLY, INTU, QCOM entries with unverified addresses). Web type-check green.

## 2026-07-17 01:50 (UTC+1) — Post-deploy stock registration is appendable

- `StockTokenRegistry` is Ownable: deployer can call `setToken` / `setTokens` anytime after init — no redeploy needed.
- Added `scripts/register-stocks.sh` to re-run `RhRegisterStocks.s.sol` against an existing `STOCK_REGISTRY` (upserts allowed + appends new addresses to `tokenList`).
- When a missing symbol later gets a live address: set `STOCK_REGISTRY` + the new `STOCK_SYMBOLS`/`STOCK_ADDRESSES` (can be just the new rows), run the script, then add the same entry to `web/lib/basket-stocks.ts`.

## 2026-07-17 02:15 (UTC+1) — Burn on claim, slippage UI, duration picker UX

Contracts (pre-deploy, no migration needed):
- `PotCard.markClaimed` → `burnForClaim`: claiming now burns the NFT (same as early exit). Redeemed shells vanish from OpenSea and can never be traded anywhere. Double-claim reverts with `ERC721NonexistentToken`.
- `Pot.claim` calls `burnForClaim` after paying out constituents.
- Tests updated (`test_doubleClaim_reverts`, `test_claimedCardIsBurned_cannotList`, stranger auth); full suite green — 40/40 across 7 suites.

Royalties (OpenSea reality):
- ERC-2981 (2.5% → fee wallet) + `contractURI` `seller_fee_basis_points` both already wired in `SherhoodDeploy` — this is the maximum signaling OpenSea reads. On-chain enforcement only exists on our own Trade marketplace; external venues apply their own creator-fee policy. Docs (`opensea.mdx`, `secondary-market.mdx`) updated to say so honestly and to reflect burn-on-claim.

Web:
- `/api/cards/[id]`: burned cards (pot == 0x0) now 404 with short cache.
- New `components/pots/slippage-control.tsx`: 0.5/1/3% presets + custom (max 50%), high-tolerance warning, computes `minUsdgOut` (6-dec USDG) from the live ETH/USD estimate. Wired into both deposit surfaces (pot-discovery card + basket/[slug] page) for ETH and WETH — previously minUsdgOut was hardcoded 0 (unprotected swaps).
- Create page: duration input replaced with a funding-window grid (24h/3d/7d/14d/30d presets + custom hours/days toggle) and a live "Funding closes …" preview line.
- Type-check and production build green.

## 2026-07-17 09:30 (UTC+1) — shitty_v2 audit review + remediations

Reviewed `shitty_v2.md` against live code; implemented pre-deploy fixes:

**Critical**
- RevealEngine: replaced O(overflow) while-loop with single-pass correction on max raw contributor
- EntryRouter: WETH-only `receive()` + owner `withdrawETH`
- AssetManager: `_pickTokens` no silent assembly truncation; deterministic fill + revert if short

**Medium / Low**
- CardMarketplace: NFT transfer before delist; PotCard allows marketplace caller through listing lock
- Pot: 1h early-exit cooldown (`lastEarlyExitAt == 0` skips first exit); participantCount after mint
- PotFactory: hard fail on luck staticcall miss
- PrevRandaoCoordinator: `maxDelayBlocks` (64 default) — fulfiller cannot wait forever
- BuybackVault: stale price + round completeness checks

**Protocol stats (factory dashboard)**
- On-chain: `protocolStats()` (pools, deposit volume, deposit count, unique depositors), `PotCard.totalMinted/totalBurned/totalSupply`
- Off-chain: `/api/stats` — live/processing/ended/cancelled buckets + funding TVL (USDG in Funding pots)

**Tests:** 70/70 green. PotFactory ~23.4KB.

## 2026-07-17 09:50 (UTC+1) — Responsive product UI pass

- Added shared fluid containers for 320px mobile through wide desktop, semantic product surfaces, consistent gutters/radii, 44px touch targets, visible focus rings, horizontal overflow handling, and global reduced-motion protection.
- Reworked `/app`, `/create`, `/inventory`, `/marketplace`, and `/leaderboard` with stronger hierarchy, fluid grids, actionable empty states, layout-matched skeletons, recoverable error states, accessible field labels, inline validation, and mobile-safe data rows.
- Refined profile, docs navigation, Telegram, header, and footer for keyboard access, active-page semantics, mobile scrolling, readable legal content, and responsive action layouts.
- Stabilized stock chart effects and memoization; switched the cinematic hero to Framer Motion's reduced-motion signal.
- Verification: ESLint clean, TypeScript clean, Next.js production build clean (30 static/dynamic routes generated).

## 2026-07-17 11:20 (UTC+1) — Editorial landing + user docs rewrite

- Rebuilt the landing page around the supplied black/lime editorial direction: asymmetric hero, animated sealed-card prism, stock-logo motion, live basket states, a border-led three-step flow, revealed ownership preview, flat FAQ rows, updated stock marquee, and high-contrast final CTA.
- Rewrote all nine MDX pages as task-focused user guides. Removed formulas, contract APIs, deployment language, protocol architecture, and unexplained implementation terms; updated docs navigation to match the new user-facing titles.
- Verification: ESLint clean, TypeScript clean, Next.js production build clean with all nine docs statically generated.

## 2026-07-17 12:55 (UTC+1) — Profile dashboard

- New `/api/profile/[address]`: per-wallet on-chain history (deposits, claims, exits, creates, buys, sells, lists, delists), XP total with streak scoring, and a portfolio timeline of net USDG principal after deposits/exits/claims.
- New `hooks/use-my-cards.ts`: shared hook for owned cards plus per-pot status, totals, and holdings.
- Rebuilt `/profile` as a dashboard: stat tiles (deposited, cards, XP, streak), portfolio-over-time SVG area chart, aggregated claimable asset holdings, active pool list, horizontal card rail, active Trade listings with cancel, XP-tagged activity feed, and the existing wallet/legal/clear-data sections.
- Deployed prior landing/docs work to production before starting (commit e8ad05f, sherhood.xyz verified).
- Verification: ESLint clean, TypeScript clean, production build clean (31 routes).

## 2026-07-17 14:15 (UTC+1) — Max funding window 30 days

- `PotFactory.maxDuration` default: 365 days → **30 days** (owner can still retune via `setDurationBounds`).
- Create UI + `useCreateCommunityPot`: reject windows over 720 hours; custom input clamped to 30 days; copy updated.

## 2026-07-17 15:05 (UTC+1) — Participant cap + pre-deploy contract review

- Pre-deploy review: confirmed only intended contract diffs (30d max window). Found and closed one gap: no cap on cards per basket while RevealEngine allocates all cards in one tx — spam dust deposits could brick reveal via block gas.
- `PotFactory.maxParticipants = 250` (owner-tunable via `setMaxParticipants`); `Pot._deposit` reverts `Pot: full` at the cap; early exits free slots.
- Tests: 72/72 (added `test_revert_maxParticipants_full`, `test_earlyExit_frees_participant_slot`). ABIs regenerated (PotFactory, CardMarketplace). Web TS clean.

## 2026-07-17 15:35 (UTC+1) — Fresh RH mainnet deploy + verify + web sync

- Deployed fresh Sherhood stack to Robinhood Chain 4663 via `sherhood-deploy.sh` (gas ~0.0032 ETH), 25-stock whitelist registered, **all 9 contracts Blockscout-verified**.
- Addresses: FACTORY `0x6a03aE2e1A5E5521d044Ed2cdFe24947E0CD92a1`, CARD `0x646F4Dcb5f863bC9650C743556C478d8eD640773`, ENTRY `0xd9150AD48bB7199e0BcE1949f1F9E07962971469`, MARKET `0x92D31fcE7b6365Ec27cF75Bc4A0CFCF458F5f343`, TREASURY `0x62cbf96cE2eDbc9218135385B009bF596F51325C`, REGISTRY `0xDB8e527E47228CDbfbC45ee70ec460E21F41383f`, REVEAL `0xDeb6E3536DEA5D628C0d7540e8EF979eaB8925EE`, ASSETS `0x9313589D663A48D018360C2A62083B6e30194E80`, PREVRANDAO `0x95B73c5780437Ce92258f8074878287dFC8ed314`.
- On-chain limits confirmed: minDuration 1h, maxDuration 30d, maxParticipants 250, minFundingGoal 1 USDG, creationFee 5 USDG.
- Web: `.env.local` + Vercel prod env synced to new addresses; fixed `use-pots.ts` ("use client" removed — pure helpers now server-safe, `/api/stats` had 500ed); prod deploy verified on sherhood.xyz (stats API + /app render fresh stack).
- Post-launch TODO: `RevealEngine.setLuckToken` once $SHRH launches.

## 2026-07-17 15:55 (UTC+1) — 3 launch baskets + API cache fix

- Created 3 owner baskets on new factory (no USDG fee via `createPot`): $500 goal / $5 min / 3d (`0xe9936388BE59E5a48CFba62a6238f442E1CDEBdD`), $750 / $10 / 7d (`0x24298D352bCB704249ADF97D79fE8f9D93d3c427`), $1,000 / $10 / 14d (`0x6108B46315a43DeA37493524A0C5f0cA66A87962`).
- Fixed stale on-chain APIs: `revalidate` prerendered `/api/pots`, `/api/stats`, `/api/activity` with build-time chain state and Vercel kept serving STALE. Switched all three to `force-dynamic` (CDN caching stays via Cache-Control headers).
- Added multicall3 address to the viem chain config (`lib/chain.ts`) — `/api/pots` multicall was failing without it on the fresh stack.
- Verified live: /app renders 3 Funding baskets, stats show 3 live pools.

## 2026-07-17 16:20 (UTC+1) — UX pass: basket names, recharts, entry fee, layout fixes

- **Basket naming**: new `web/lib/basket-name.ts` — deterministic Sherwood-themed names derived from the pot address (adjective + noun, e.g. "Ember Vault", "Amber Longbow", "Golden Fletcher"). Applied on /app cards, basket/[slug] hero, profile pools, inventory card labels, `/api/pots` (`name` field), `/api/activity` labels, and OpenSea card metadata (`Basket` trait now the name, address moved to `Basket Address`).
- **Admin fee from users**: `PROTOCOL_DEFAULTS.entryFeeUsdg` set to `0.5` — new baskets created via the UI charge a $0.50 USDG card fee per deposit (flows to treasury, funds purchase/reveal automation gas). Create page shows a "Card fee per deposit" row; deposit panels show the fee note (USDG: added on top; ETH/WETH: taken from swap output). The 3 live baskets predate this and keep fee = 0 (immutable per pot).
- **Recharts**: replaced hand-rolled SVG paths with recharts AreaCharts in `stock-price-chart.tsx` (sparklines), `token-chart-card.tsx` (basket 5-day tiles, now with hover tooltip), and `profile/portfolio-chart.tsx` (tooltip + gradient).
- **Create layout**: wider column split, roomier form padding, 3-col duration tiles with min-height and larger labels, registry grid forced to 2 columns in the aside so prices/sparklines aren't cramped.
- **basket/[slug] fixes**: orbit ring now renders initials under each node as fallback so missing logos degrade gracefully; downloaded 12 missing logos to `public/stocks/` (BABA, BE, CRWV, INTC, MU, SGOV, SLV, SNDK, SPCX, USAR, USO — CRCL falls back to initials); hero title is the basket name, holdings label moved to subtitle; orbit sizing/alignment tightened.
- Typecheck + lint + build clean; deployed to production and verified names, charts, and layout live on sherhood.xyz.

## 2026-07-18 09:28 (UTC+1) — Ory site verification file

- Added `web/public/.well-known/ory-verify.txt` with `ory-verify=orynth-f821cfaad0ad495b98db4713a02d20df` so Orynth can verify domain ownership via `https://sherhood.xyz/.well-known/ory-verify.txt`.
- Redeployed web to production; confirmed the URL returns the expected token.

## 2026-07-18 22:20 (UTC+1) — Bridge + roadmap + create fee UX

- **Bridge (`/bridge`)**: Relay Kit UI (`@relayprotocol/relay-kit-ui` SwapWidget) wrapped in `RelayKitProvider`. Presets for ETH↔Base and SOL→Base. Copy notes RH is not a Relay destination yet — bridge first, then fund on Robinhood Chain. Nav + mobile sheet include Bridge.
- **Roadmap (`/roadmap`)**: Now / Next / Later — Pokémon generative cards, index redeem, Elite coins ($500 DD), product deck, full profile, sponsored createFor, $SHRH live swap.
- **Create fee UX**: CTA is just "Create basket" (no Pay $5 on the button). Subtle protocol fee row with USDG|ETH toggle, live balance chips, ETH→WETH→USDG swap then create. $SHRH $500 waiver gate + `ShrhBuyWidget` shell (Orynth until token live).
- **Mobile nav**: Primary order Baskets → Create → Bridge → Cards → Trade → Profile → Roadmap → Docs.

## 2026-07-18 22:55 (UTC+1) — Profile, deck, sponsored create, full-chain Relay → RH

- **Bridge**: Relay widget supports all Relay chains (dynamic `useRelayChains`). Destination defaults to Robinhood Chain (4663 is on Relay). ETH/Base/Solana are promoted source chips only. Page-aligned sherhood chrome.
- **Profile**: Mark/PnL tile (sealed at deposit cost; revealed holdings marked with live `/api/stocks` prices) alongside deposits, cards, XP, streak, listings, pools, activity.
- **Product deck**: `/deck` — 9 slides, glowing lines, keyboard nav, CTAs.
- **Sponsored create**: `PotFactory.createFor(creator,…)` added; `/api/create-sponsored` uses `DEPLOYER_PRIVATE_KEY`/`SPONSOR_PRIVATE_KEY` after $SHRH ≥ $500 check. Create page routes waiver holders through sponsored path. **Requires factory redeploy** for createFor to exist on-chain.
- **$SHRH buy widget**: Relay SwapWidget locked to $SHRH on RH when `SHRH_LAUNCHED`; Orynth until then.

## 2026-07-19 09:35 (UTC+1) — \$5 mainnet mint-test basket

- Deployer `createPot`: goal \$5 / min \$0.50 / entry \$0 / 3d — pot `0x1C9D462cd7401140436f2b2B0C9F630dc8208A02` (tx `0x5cc6de2128865b081ccf76121aca03f7d6d9e418117b69a7fbebe858dbbc241a`).
- ETH deposits swap via EntryRouter → Uniswap V3 SwapRouter02 (WETH→USDG); 0.5% router fee to treasury. USDG deposits skip the swap.

## 2026-07-19 09:40 (UTC+1) — Fund amount shows wallet balance

- `useFundBalances` reads ETH / WETH / USDG. Basket detail + pot cards show Balance + Max above the amount input (ETH Max leaves a small gas buffer).

## 2026-07-19 10:20 (UTC+1) — ETH fund gas/`--` fee root cause (USDG decimals)

- OKX showed Network Fee `--` / Confirm disabled because `eth_estimateGas` reverted: EntryRouter swap succeeds in **6-dec USDG**, then `depositAmount >= minDeposit` fails when pots were created with **18-dec** (`parseEther`) mins.
- Factory `minFundingGoal` set to `1e6` ($1); `creationFee` set to `5e6` ($5). Web create/deposit/fmt now use 6-dec USDG. Legacy Silent Arrow (`0x1C9D…`) remains unfundable via ETH until replaced.
- Need deployer top-up (~0.001 ETH) to `createPot` a correct $5 / $0.50-min basket, then mint test works.

## 2026-07-19 10:35 (UTC+1) — Correct \$5 pot + never create with 18-dec USDG again

- **New mint-test basket (6-dec):** `0x91AA13F1f6e19930fD60F1a87211B0c6D7f3914B` (Crimson Talon) — goal \$5 / min \$0.50 / entry \$0 / 3d. `depositWithETH` estimateGas ~713k for 0.0004 ETH. Silent Arrow (`0x1C9D…`) remains legacy/unfundable via ETH.
- **Create hardening:** all web create paths (`useCreateCommunityPot`, `/api/create-sponsored`) use `usdgAmountFromDollars` + assert against ≥1e15 (parseEther-scale). Create form preflight validates the same. `scripts/create-pot-rh.sh` converts dollar args → 6-dec and refuses wei-looking goals. Deploy seeds (`RhDeploy`/`RhUpgrade`) default to `100e6`/`1e6`.
- **UX:** USDG wallet balances + creation fee use 6 decimals; legacy pots disable ETH/WETH and force USDG with amber warning on basket detail + discovery cards.
- Live on sherhood.xyz.

## 2026-07-19 10:45 (UTC+1) — Hide Silent Arrow from listings

- Added `web/lib/hidden-pots.ts`; Silent Arrow (`0x1C9D…8A02`) filtered from pot discovery + `/api/pots` (landing live baskets). Direct basket URL still works.

## 2026-07-19 10:50 (UTC+1) — Quiet ETH disable on legacy baskets

- Removed amber legacy-warning copy on basket detail + discovery. ETH/WETH stay disabled when min is 18-dec scale; USDG only.

## 2026-07-19 11:05 (UTC+1) — Vault TVL + Trade minted cards

- Stats `fundingTvl` now includes Closed pots (USDG still in vault pre-purchase); app label → **Vault TVL**.
- Trade page shows **Recently minted** cards (not only listings).
- Crimson Talon is Closed with \$5 deposited; purchase/reveal blocked until USDG↔stock Uniswap pools exist for registry picks (swap router hit non-contract pool).

## 2026-07-19 11:45 (UTC+1) — Multi-hop purchase + Sherds + OpenSea link

- Deployed `MultiHopSwapAdapter` `0xdF00…539d`: USDG→WETH→stock when direct USDG pool is empty; AssetManager swapRouter pointed at it. EntryRouter WETH/USDG fee set to **100**.
- Liquid pick universe (2 stocks for small pots): TSLA + USO registry `0x6051…8856`; default pick count **2**.
- **Crimson Talon purchased + revealed**: holdings USO+TSLA; Sherd #1 ownership 100% Common; claim unlocked. Purchase tx `0x0526…14b1`, reveal `0xfc01…772f`.
- Product noun **Sherds** in nav/inventory/basket copy. OpenSea nav → `opensea.io/assets/robinhood/0x646F…0773`.

## 2026-07-19 12:05 (UTC+1) — Reveal confirmed, rarity=share, nav/profile, TradingView, Solana porting

- Crimson Talon is **Revealed** (status 3) with USO+TSLA; Sherd #1 is 100% ownership (claimable).
- Rarity now follows ownership share (UI+metadata+RevealEngine source): ≥40% Legendary. 100% solo shows Legendary (was Common from luck-mult bands).
- Desktop nav: primary links + More menu. Profile reordered: Snapshot → Portfolio/Holdings → Sherds → Baskets/Listings → Activity → Account.
- Stock tiles link to TradingView. Added `porting.md` for Solana port.

## 2026-07-19 13:40 (UTC+1) — Dynamic SEO, share cards, banner OG

- Brand banner at `web/public/brand/sherhood-banner.jpg`; layered OG images for site, `/basket/[slug]`, `/sherd/[id]`.
- Dynamic `generateMetadata` + JSON-LD (Organization/WebSite/Product/Breadcrumb); sitemap includes open pots; `app/manifest.ts`.
- Share basket / Share Sherd buttons (native share, copy, X, Telegram); inventory links to `/sherd/[id]`; card metadata `external_url` → Sherd page.
- Landing hero full-bleed banner with layered brand copy.

## 2026-07-19 14:40 (UTC+1) — Profiles (name/avatar) + onchain rarity for OpenSea

- Metadata + UI prefer on-chain Sherd rarity (RevealEngine share bands); ownership math only as legacy fallback — OpenSea traits match chain.
- Profile identity: display name + 10 hood SVG avatars (`web/public/avatars/hood-01..10.svg`); SIWE save via `/api/profiles`; localStorage cache.
- Name/avatar shown on profile, leaderboard, basket deposits/creator, Trade sellers/owners.

## 2026-07-19 14:55 (UTC+1) — People discovery, allow-receive sends, nav, OpenSea

- Nav: **People** + **Leaderboard** on primary (landing + app header); footer links; Bridge moved under More.
- Public profiles `/u/[address]`, directory `/people`, Allow receive opt-in — address only shown for send when enabled.
- Send panel: Sherds / USDG / ETH to opted-in receivers. OpenSea collection metadata → Sherds + banner + share-based rarity copy.

## 2026-07-19 15:00 (UTC+1) — Unique names, share profile, tighter UI

- Profiles use unique names → `/u/neon-archer` (slug); taken names rejected. Address fallback still resolves.
- Share on profile editor, public profile, People list (compact). Copy moved into tips/tooltips; send lists names only.

## 2026-07-19 15:15 (UTC+1) — Cards UX, deck, prices/PnL, deploy

- Inventory: staggered card motion, 3D hover on PotNftCard; claimable rows show amount · spot · USD value + TradingView mini.
- Deck: full-viewport back-only chrome; banner + stock logos; responsive.
- Profile Mark/PnL uses `usdgToDollars` (6/18-dec) + batch Yahoo quotes; holdings show price/value.
- `/api/stocks/batch` for quote fan-in. Prod deploy via Vercel `web`.

## 2026-07-19 16:00 (UTC+1) — Leaderboard, profile balances, send typeahead, wallet NFTs, hero

- Leaderboard: always show wallet (name+truncated addr); People + Send actions; XP API uses block-time estimates so events are not dropped; seeds self from /api/profile when board empty.
- People Send: type unique name → pfp + name + truncated wallet; select to send.
- Profile: view-first identity (pencil/edit); Balances card (ETH/WETH/USDG price+value + Sherd NAV + total); Add Sherds to wallet on profile + inventory.
- TradingView minis forced dark/transparent on Sherhood surfaces; landing hero restored to HeroPrism + orbiting stock logos.

## 2026-07-19 16:20 (UTC+1) — Sherd pools rename, nav icons, Orynth #1

- User-facing “baskets” → **Sherd pools** (nav: Pools). URLs `/basket/...` unchanged.
- Header mobile + desktop nav icons (lucide).
- Created **Orynth #1** on RH: `0x80D61011E00247c988C73B07fC5cDed54f075910` — $100 goal, $2 min, 5 days, $0.50 entry; named via `FEATURED_POOLS` + `NEXT_PUBLIC_ORYNTH_POOL_1`.

## 2026-07-19 16:30 (UTC+1) — MongoDB profiles + perf + deploy

- Profiles moved from ephemeral JSON file → **MongoDB Atlas** (`sherhood.profiles`) via `MONGODB_URI`.
- Perf: lazy Relay kit (bridge/create/deck only), dynamic landing sections, fewer font weights, `optimizePackageImports`, long-cache for avatars/cards.
- Prod deploy with Mongo env on Vercel project `web`.

## 2026-07-19 16:45 (UTC+1) — Hero restore, Mongo XP/account, legal

- Landing hero restored to Own-the-pool + sealed card + orbiting logos (reference layout).
- MongoDB: profiles + wallet_scores + profile_stats + xp_events; leaderboard/profile APIs cache to DB.
- Profile → **Delete my account** (signed) wipes off-chain Mongo data + browser.
- Terms + Privacy rewritten for profiles, XP, MongoDB, deletion limits.

## 2026-07-19 16:50 (UTC+1) — Detailed hood pfps

- Rebuilt all 10 profile SVGs with gradients, eye glow, hood folds, unique marks (Archer/Star/Mask/Spade/Horns/Quiver/Owl/Rogue/Crown/Fox). Cache-bust `?v=2`.

## 2026-07-19 16:55 (UTC+1) — Fix ETH deposit Pot: beneficiary

- `estimateContractGas` for `depositWithETH` used `account: undefined` → router passed address(0) → `Pot: beneficiary`.
- Now passes connected wallet; clearer toast for beneficiary/router errors.

## 2026-07-19 17:00 (UTC+1) — Telegram on-chain activity bot

- Cron `/api/cron/tg-broadcast` every minute (vercel.json).
- Broadcasts: pool create, fund, claim, exit, close, reveal, stock buy, cancel, list/delist/sale, Sherd reveal + transfer.
- Cursor in Mongo `tg_cursor`. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CRON_SECRET`.
- Test: `POST /api/tg/test` with Bearer CRON_SECRET.

## 2026-07-19 22:30 (UTC+1) — TG poll like Chessonchain + nav cleanup

- Dropped Vercel cron + public CRON_SECRET chat-finder UI on `/telegram`.
- Chessonchain pattern: Telegram **webhook** (`/api/telegram/webhook`) for `/start` `/help` `/whereami`; long-poll worker `pnpm tg:poll` → `/api/tg/broadcast` (Bearer bot token).
- `/telegram` is community links only (hub + X + OpenSea).
- Navbar: primary Pools/Create/Sherds/Trade/People; More for the rest; icon external links for X `@sherhood_xyz`, Telegram, OpenSea.

## 2026-07-19 22:40 (UTC+1) — Bot live + TVL includes unclaimed

- Registered Telegram webhook → `/api/telegram/webhook`; `/whoami` alias; flushed pending replies.
- Vault TVL now includes book value of unclaimed Purchased/Revealed pots (was live-only → \$5 / \$10).
- Set `TELEGRAM_CHAT_ID` on Vercel production.

## 2026-07-19 22:45 (UTC+1) — Chat ID, Gacha Cards, nav/wallet, bot UX

- `TELEGRAM_CHAT_ID=-1003534603443` (prod + local).
- Pokémon → **Gacha Cards** copy app-wide (tagline, OG, roadmap, deck).
- Desktop nav: 3 links (Pools/Create/Sherds) + 2-col More; closes on outside click/blur/Esc.
- Wallet chip: profile avatar + name; removed chain chip; ETH ticker last on the right.
- TG bot: inline menus, /stats live TVL, callback buttons, cleaner /start.

## 2026-07-19 22:55 (UTC+1) — Dynamic pools UI, profile hero, onboarding

- Pool cards: stagger motion, live pulse status, animated progress, glow hover, cleaner fund panel.
- Profile: hero banner with large hood avatar + XP/streak chips.
- First-visit skippable walkthrough (`sherhood.onboarding.v1`) + incomplete-profile dialog after connect.

## 2026-07-19 23:05 (UTC+1) — Public profile inventory + buy/offer

- `/u/[slug]` shows Listed / Sealed / Revealed Sherds via `useOwnerCards` + wallet from profile API.
- Send panel only when viewer is connected; else Connect + Get your own profile.
- Buy listed Sherds; Make offer (Mongo `card_offers`) on listed or unlisted.

## 2026-07-19 23:20 (UTC+1) — Card CLS, TV dark multi-symbol, Sherd owner

- PotNftCard: fixed 2:3 aspect + compact widths (no page-tall stretch).
- Inventory: side-by-side compact tile; listings/claim stay in panel.
- Ownership % displays as 100% not 100.0000%.
- TradingView: forced dark, fixed height; tabs for all holdings.
- /sherd/[id]: owner (profile or explorer wallet), asset share rows + charts.

## 2026-07-19 23:30 (UTC+1) — $SHRH docs, OG/Twitter contrast

- Docs: /docs/shrh (hold-only copy, no threshold amounts); allocation + fees updated.
- Luck pill + buy widget: hold language only (no ETH/$500 amounts in UI).
- OgFrame: heavy scrim + black copy plate + lime badges; Twitter site/creator @sherhood_xyz.
- twitter-image re-exports for /basket and /sherd.

## 2026-07-19 23:45 (UTC+1) — Twitter OG fix + hold-only docs polish

- Fixed twitter-image build (no route-config re-export); shared `og-basket` / `og-sherd` renderers.
- OgFrame: solid black plate + lime title/white subtitle for X contrast; seo maps twitter → `/twitter-image`.
- Scrubbed threshold/amount mentions from $SHRH docs, allocation, roadmap sponsored-create copy.

## 2026-07-19 23:50 (UTC+1) — V2 docs + distribution

- Added /docs/v2: full product track + expanded distribution features (holders, XP seasons, referrals, creators, LP, bridge, social, packs, Elite).
- Docs nav + $SHRH + roadmap link; knowledge mirror in cursor_project_rules/v2.md.

## 2026-07-19 23:55 (UTC+1) — Form V2 docs

- Restructured /docs/v2 into Form → Product → Distribution (A–H tables) → Ship order → Out of scope.
- Synced cursor_project_rules/v2.md mirror.

## 2026-07-20 00:05 (UTC+1) — Profile balances, charts, PnL share

- Dynamic balances: allocation bar + asset tiles; denser profile grid.
- Mark PnL: live quotes (30s), lime/red by profit/loss, day move on holdings, Mark vs Cost chart.
- Charts: principal (fixed USDG decimals), allocation donut, holdings + TV.
- Share PnL card: /share/pnl + /api/og/pnl high-contrast Twitter OG.

## 2026-07-20 04:20 (UTC+1) — WebSpeed / landing UX

- LCP: mystery-hero.webp (~90KB), preload + fetchPriority; hero SSR copy, CSS floats (no framer on LCP).
- TTI: defer wagmi/RainbowKit on marketing routes until idle/interact; Connect stub boots wallet.
- CLS: reserved ETH ticker width; font display optional for mono; fewer Poppins weights.
- A11y: docs/footer link underline + lime contrast; longer cache for /cards /brand.

## 2026-07-20 04:15 (UTC+1) — WebSpeed / CWV pass

- LCP: compressed mystery-hero-lcp.webp (43KB), explicit dims, preload; orbit logos deferred.
- TTI/JS: RainbowKit split via wallet-button-live dynamic; header dropped framer-motion; EthUsdTicker deferred; MotionConfig removed from boot path.
- CLS: Poppins display optional; hero aspect reserved; wallet/ETH placeholders sized.
- Skipped prod source maps (report noise — does not fix LCP).

## 2026-07-20 16:35 (UTC+1) — Lifetime protocol fees

- Stats API + /app ProtocolStats + TG /stats show lifetime USDG fees from TreasuryDirect.feesForwardedUSDG.
- Fees docs: full schedule + fee wallet destination.
- Live: treasury 0x62cb…325C → fee wallet 0xC24F…a251; lifetime ~$0.03 so far.

## 2026-07-20 16:50 (UTC+1) — Fix Lifetime fees render

- SSR loadProtocolStats into /app so Lifetime fees paints without client-only fetch.
- Fee format keeps 4 decimals under \$1 (e.g. \$0.0259); no truncate on value.

## 2026-07-20 17:00 (UTC+1) — Public profile denser layout

- Compacted /u/[slug] hero + card grids; OpenSea collection button beside Share.
- ProfileCardTile: denser padding + OpenSeaLink under View; buy/offer/send unchanged.

## 2026-07-20 17:00 (UTC+1) — Profile tightness + OpenSea Sherds showcase

- OpenSea collection default → https://opensea.io/collection/sherds; per-token openseaTokenUrl helper + OpenSeaLink CTA.
- /inventory: OpenSea-style filter showcase + detail rail with OpenSea CTA.
- Profile + /u/[slug]: denser grids; OpenSea on every Sherd tile; collection button in chrome.
- Docs /docs/opensea updated to collection/sherds.

## 2026-07-20 18:12 (UTC+1) — Inventory cards, profile links, footer

- Inventory Sherds: card-fitted `fill` tiles (aspect 2/3), link to `/sherd/[id]`; hover peeks detail rail.
- UserChip auto-links usernames to `/u/[slug]`; wallet chip name → profile; marketplace/basket/profile tiles link Sherds.
- SiteFooter rebuilt: logo, product/community/legal columns, X/TG/OpenSea; risk copy demoted to fine print.

## 2026-07-20 18:30 (UTC+1) — Card depth, profile hero, footer

- PotNftCard: mouse-follow 3D tilt + specular glare + depth shadow.
- Sherd grids (inventory/profile/u): card-first tiles, badges overlaid — no boxed meta stacks.
- Profile: single hero with pencil edit handlers (merged duplicate banners).
- Footer: compact logo + link row + icon socials, lime top edge.

## 2026-07-20 21:00 (UTC+1) — Card motion, sfx, Buy $SHRH, account packaging

- Cards: soft idle float + light shimmer (reduced-motion safe); 3D tilt unchanged.
- SFX on mint/send via Web Audio; header mute toggle (localStorage).
- Profile ↔ Collection AccountSubnav; Profile primary nav; Buy $SHRH dialog (Coming soon if CA not live) on pools/trade/profile/u.
- /u hero: stacked Sherd fan + mark / today portfolio delta from batch quotes.
- ETH ticker: 24h % + flash on price tick.

## 2026-07-20 22:35 (UTC+1) — $SHERD live

- On-chain token live: SHERD / Sherhood at 0xe429dbb6b55532685C7eAE41DbF052934449aCc1 (18 dec).
- SHRH_SYMBOL → SHERD; SHRH_LAUNCHED default true; Buy dialog swaps via Relay.
- Vercel env + docs updated to official CA.

## 2026-07-20 22:50 (UTC+1) — Swap fix, less copy, fund with $SHERD

- Buy $SHERD: Flap + Uniswap only (Relay embed removed); compact CA/Add.
- Fund tabs: ETH / WETH / USDG / $SHERD — SHERD uses live Dexscreener mark → ETH deposit (Uniswap sell assist if ETH short).
- Cut pool/basket/create/app copy; luck pill is `$SHERD luck` tooltip.

## 2026-07-21 11:16 (UTC+1) — Vercel cleanup

- Deleted mistaken `sherwood` Vercel project (sherwood-delta.vercel.app).
- Prod stays on `web` → sherhood.xyz; deploy from `web/` only.

- Buy buttons now open an in-app `/buy-shrd` swap screen (Relay SwapWidget under the hood).
- Pool end behavior remains on-chain: Close = partial purchase + later claim; Cancelled = refund.

## 2026-07-21 23:10 (UTC+1) — Pool rank, XP soundness, OpenSea, SEO

- Pools on /app + /api/pots ranked by activity/volume (funding first, then deposited + people).
- Positions docs + protocol claim rules: hold indefinitely, mark growth, tight interaction table.
- XP/streak: UTC expiry, full-pot index, reveal XP, no self-trade XP, profile no longer pollutes leaderboard.
- Profiles: leaderboard rank + pools created (private + /u).
- Landing: OpenSea Sherds banner section (not hero); robots + sitemap hardened for public routes only.

## 2026-07-22 02:25 (UTC+1) — Profile UX, Share PnL, dwell mint

- OpenSea kept on landing/header/footer/profile/inventory (in-app Sherds primary).
- Explicit Sign out on wallet chip menu + profile identity/wallet actions; unnamed name → /profile.
- Portfolio: rename (drop Mix), multi-token RH stocks + $SHERD list with Show empty; Mark PnL larger type + 2-col/xl-5 stats.
- Share PnL modal: All vs one Sherd, OG preview, share/download/copy; OG scope/tokenId.
- ETH ticker always visible + popover (24h, refresh, bridge); dwell mint modal ~50s after onboarding.
- Phase 2 Onboarding pool (~$100k / ~$0.10 min): design only — needs operator create + NEXT_PUBLIC_ONBOARDING_POT; no gas sponsorship / fake reveal this ship.

## 2026-07-22 10:40 (UTC+1) — OG dynamics + allocation/ETH UX polish

- OG pool cards now include live funding progress + deadline, with top holdings in footer.
- OG Sherd cards now include owner label and dynamic asset snippets when revealed.
- Profile allocation now includes wallet $SHERD exposure for full-portfolio breakdown.
- ETH ticker popover/flash behavior retained with compact always-visible header button.

## 2026-07-22 12:55 (UTC+1) — Pack-rip Sherd reveal (shippable)

- Added WebGL2 foil-tear shader (`FoilTearGl`) + CSS fallback for reduced-motion / no-WebGL.
- `<SherdReveal>` ritual: sealed → tear → rarity burst/rays → ownership stats → Share/Download/Replay.
- Wired on `/sherd/[id]` (auto-open once per session) and inventory detail (`Rip pack`).
- Reveal SFX by rarity tier; V2 compositor/DNA deferred — uses existing card art.

## 2026-07-23 07:20 (UTC+1) — Nav / Market / Sherds / rip ownership

- Footer anchored via min-h-dvh flex shell in root layout.
- Primary nav: Pools · Sherds · Market · Create; My collection under More.
- New `/sherds` catalog (live cards + listing prices); Market = listings only with sort/filters.
- OpenSea vs Market clarified in inventory CTA + docs (in-app list ≠ OpenSea Seaport).
- Rip: owner full ritual (auto-open); viewer preview mode; larger desktop CTA on `/sherd/[id]`.
- Sherd detail: for-sale banner + buy, activity strip, sticky card rail with Rip.

## 2026-07-23 07:35 (UTC+1) — Drag tear, rich activity, OpenSea Seaport

- Pack rip: drag-up gesture to tear foil (tap still works); viewers auto-play, owners drag-first.
- `/api/sherds/[id]/activity` — Transfer + Market Listed/Sold/Cancelled + deposit context; wired on Sherd page.
- OpenSea Seaport listing via `@opensea/sdk` (`useOpenSeaList`); needs `NEXT_PUBLIC_OPENSEA_API_KEY`, else opens OpenSea item. Inventory has USDG Market + ETH OpenSea list panels.

## 2026-07-23 08:00 (UTC+1) — XP deterministic + Mark PnL text

- Root cause: profile re-index `Promise.all` over all pots failed → API returned xp/streak 0 and cached wipes.
- XP now merges chain pull into persisted `xp_events` (id-keyed), scores deterministically, falls back to events/board/stale — never zero-wipes known XP.
- Reveal XP attributed at reveal block owner (not current owner). Leaderboard/profile serve stale on RPC failure.
- Mark PnL: removed truncate/overflow clipping; stacked Mark/Cost lines; wrapping StatTiles.
- Repaired Mongo profile_stats rows that were wiped to 0 while wallet_scores still had XP.

## 2026-07-23 15:40 (UTC+1) — Pool page layout

- `/basket/[slug]`: registry charts + owner under fund rail; funders card raised under Raised with list rows.

## 2026-07-24 16:30 (UTC+1) — Sherds / pools / reveal polish

- Soft footer only at extra-low scroll; main min 100dvh.
- Mobile reveal: non-passive pointer listeners + body scroll lock.
- `/sherds` + `/sherds/[id]` merged routes; inspect modal = 360 spin, shimmer, vault mark $, mint deposit, charts.
- Cards use “N-asset vault” labels (no ticker billboard); Market empty = faded card collage.
- `/pools/:slug` rename (basket redirect); pool ops panel; “{pool} · Sherds” holders + thin scrollbar.

## 2026-07-24 15:50 UTC — Pool close flow + details + footer

- Pool owner/anyone: Seal vault (`close`) + cancel/refunds; auto-kick `/api/ops/advance-pool` (close→seeded purchase→allocateWithSeed).
- Cron `/api/cron/advance-pools` (hourly when Pro + `CRON_SECRET` + ops key).
- Pool page: holdings mark/PnL, pulse tx history, reveal share band ~0.5×–2× for sealed Sherds.
- Copy: DROP IN / Mint Sherd; `/sherds/[id]` nav → pool + Open pool CTA.
- Footer: `--footer-clearance` padding on `.site-main` so bottom details are not clipped by soft footer.

## 2026-07-24 16:05 UTC — End pool + Orynth closed + Vercel ops keys

- UI: mint only while accepting deposits; after deadline → **End pool** (no Fund input). Discovery + inventory copy scrubbed.
- Vercel: `DEPLOYER_PRIVATE_KEY`, `OPS_PRIVATE_KEY`, `SPONSOR_PRIVATE_KEY`, `CRON_SECRET` synced from local.
- Orynth #1 `0x80D6…5910`: `close` → purchase → reveal (status Revealed).

## 2026-07-24 16:20 UTC — Pool tabs, claim flow, cautious footer, 3-stock picks

- Soft footer more cautious (flush bottom only + larger clearance) + legal caution line.
- Pool page tabs: Overview · Sherds · Claim (claim burns Sherd, sends stock share).
- AssetManager min/default pick → 3; advance-pool buys 3 legs. Orynth #1 already locked at USO+TSLA (2).
- Dividends coming soon footnotes on pool raise + holdings.

## 2026-07-24 17:25 UTC — Fee sweep confirm, scrub pools, create review, chart UI

- Orynth fees already at fee wallet (~$4.26 total; prior $0.23 dust + ~$3.98 pot fees). Advance flow auto-sweeps after buy/reveal.
- Hidden all non-Orynth legacy pots from discovery; empty ongoing drafts scrubbed.
- Leaderboard filters deployer/ops wallets (API + client).
- Create already has name + review/confirm modal (kept/polished).
- Discovery cards chart-first; mint panel leaner; pool copy trimmed.

## 2026-07-24 18:45 UTC — Vault-plate NFT art, mint risk, UI polish, demo pack, V2 review

### NFT art
- Replaced AI photo faces in-app with procedural **SherdFace** vault plates (seeded by tokenId, rarity accents). OpenSea metadata JPGs still legacy until V2 art pipeline ships.

### Mint risk
- Confirm dialog before mint: “This action can result in loss of funds…”

### Roadmap / onboarding language
- Roadmap rewritten (Live / Building / Exploring). Walkthrough drops “gacha/hood” slang.

### Profile / inventory
- Profile lists use `scroll-mask-y` (thin lime thumbs).
- Inventory: multi-select ✓ + action bar (Claim N / Open) + detail rail actions.

### Demo share pack
- https://sherhood.xyz/demo/demo-pools.png
- https://sherhood.xyz/demo/demo-sherd-cards.png
- https://sherhood.xyz/demo/demo-inventory.png

### Demo video run (record ~90s)
1. Open /app → Orynth #1 vault charts → Open vault
2. Overview / Sherds / Claim tabs; holdings mark
3. /sherds/[id] geometric card + Claim stocks
4. /inventory select + claim bar
5. /create Name → Review → Confirm
6. /roadmap Live/Building/Exploring
7. End on / with tagline + risk footer

### V2 review (prep)
**Keep:** pool lifecycle, Seaport list path, XP persistence, chart-first discovery, claim/burn clarity.
**Fix next:** regenerate OpenSea metadata art to match vault plates; post-fee book in mark UI; empty-pool cancel before deadline (product); walkthrough less modal-blocking.
**V2 build:** crafted generative art system (not stock AI), in-app Seaport fulfill, NAV redeem, 3+ stock default (done on AM), dividends routing.

## 2026-07-24 19:20 UTC — Live browser demos; keep last-mint NFT art

- Deleted AI-generated demo PNGs from `/public/demo`.
- Reverted in-app cards to last-mint rarity WebPs (`/cards/*.webp`) via `next/image` — no vault-plate `SherdFace`. Full art + metadata refresh stays V2.
- Captured live screenshots from the Cursor browser (not generative fills): `demo-pools.jpg`, `demo-vault.jpg`, `demo-sherds-tab.jpg`, `demo-sherd-card.jpg`, `demo-inventory.jpg`, `demo-roadmap.jpg`, `demo-landing.jpg`.
- Roadmap Building item now: crafted art + metadata in V2; keep current mint set until then.

## 2026-07-24 19:40 UTC — Footer, live vault after claims, create fee toggle, pool polling

- Footer: SoftSiteFooter is in-flow again (always visible); removed fixed hide-on-short-pages behavior and huge clearance padding.
- Claims: Pot.getHoldings() does not shrink after burn — UI now reads live ERC20 balanceOf(pot) for purchased/revealed vaults (`useVaultTokenBalances`), shows claimCount, labels remaining mark.
- Create: USDG/ETH fee toggle no longer auto-flips away from USDG after click; respect manual choice; show balance hint.
- Pool data: refetchInterval ~12s on factory list, pot views, vault detail, token ids/cards.

## 2026-07-25 10:35 UTC — Revealed pools, public board, offers, pool visuals

- Discovery now merges current-factory pools with verified live pools from earlier factories. Orynth #1 and revealed Crimson Talon are both read from their pot contracts and shown.
- Leaderboard responses remove protocol wallets and zero-XP rows before caching reaches the UI; the deployer remains excluded in the client as a second guard.
- Unlisted Sherds expose `Make offer` from the public catalog. Offers require a buyer wallet signature and current on-chain owner verification before storage.
- Global new-pool toasts remain mounted in the wallet shell. Create uses the stock registry logo/chart rail; pool detail uses the orbiting stock logos plus per-stock and vault USD charts.

## 2026-07-25 11:50 UTC — Orbit logos, second vault, Stock Gacha, random names

- Pool orbit: HTML `StockLogo` nodes (spinning) instead of SVG `<image>` so USO/TSLA (and registry) PNGs paint on `/pools/[slug]`.
- Discovery forces checksummed featured pots (Orynth #1 + Crimson Talon + Stock Gacha) via `allVisiblePots`.
- Created live pool **Stock Gacha** `0xcD5efcCf00E9Fd9839919a9AD478621649FFceD4` ($100 / $2 / 5d / $0.50 entry); named in Mongo + FEATURED_POOLS.
- `/create` Name field: **Random name** button (`randomBasketName`).
- Production redeployed to sherhood.xyz.

## 2026-07-25 12:55 UTC — Pause factory upgrade; V2 disclosure; UI to master

- **No RH factory redeploy.** Pot / PrevRandao / Reveal hardenings remain on `audit/harden-findings-h1-l8` for V2.
- Disclosure: roadmap banner + `/docs/v2` + footer “V2 coming soon”.
- Web UI tree copied to `master` for production; contract changes stay on audit only.
