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
