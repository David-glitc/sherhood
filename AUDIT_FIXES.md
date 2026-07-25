# Audit hardening — findings H-1 … L-8

Branch: `audit/harden-findings-h1-l8`. Baseline suite was 72 tests passing; after fixes the
suite is **81 passing, 0 failing** (9 new regression tests). Web `tsc --noEmit` is clean.

## Fixed in code

### H-1 · BuybackVault paid ~1e12× too much USDG (drain)  — FIXED
`calculateBuyback` normalised the payout to 18 decimals but USDG is 6 decimals, so a funded
vault would pay ~1e12× per call. Now scales to the USDG token's own decimals (cached
immutable `usdgDecimals`, read in the constructor).
- `contracts/src/BuybackVault.sol`
- Tests: `contracts/test/BuybackVault.t.sol` (correct $127.50 → 127_500_000 payout; not-overpaying; no-drain; decimals cached).

### H-2 · Reveal randomness was operator/caller-controllable  — FIXED (defence in depth)
Three layers:
1. **PrevRandaoCoordinator** (the production randomness on Robinhood Chain) mixed the
   *fulfill block's* `block.prevrandao` into the seed, letting a fulfiller preview the outcome
   and re-submit on a favourable block. Now the seed is bound to `blockhash(requestBlock +
   minDelay)` — a fixed block chosen at request time — so the seed is identical no matter when
   or by whom `fulfill` is called. `block.prevrandao` of the fulfill block is no longer used.
   - `contracts/src/PrevRandaoCoordinator.sol`
   - Test: `test_prevRandao_seedIndependentOfFulfillBlock` (fulfill at rb+3 vs rb+64 ⇒ same seed).
2. **RevealEngine.allocateWithSeed** (arbitrary operator seed) now gated by a
   `seededRevealEnabled` kill-switch (default on for testing; **production MUST disable it**).
   - `contracts/src/RevealEngine.sol`
3. **Web ops flow** (`lib/advance-pool.ts`) previously revealed via
   `allocateWithSeed(pot, keccak256(pot,"reveal",Date.now()))` through an **unauthenticated,
   frontend-auto-triggered** endpoint — i.e. any participant could grind the reveal by timing
   the call to inflate their own ownership share. Reworked to the coordinator flow:
   `requestReveal` (phase 1) → `coordinator.fulfill` once the target block passes (phase 2).
   The reveal seed is no longer caller- or time-derived.
   - `web/lib/advance-pool.ts`

### M-1 · Permissionless `close()` could strip refunds on an under-funded pot  — FIXED
After the deadline, `close()` (proceed → purchase) and `cancel()` (refund) were both open to
anyone; a third party could front-run `cancel` to force an under-funded pot forward. Now
goal-met close stays permissionless, but an **under-funded** close is restricted to
owner/creator, while `cancel()` (the refund path) remains open to anyone.
- `contracts/src/Pot.sol`
- Test: `test_revert_underfundedClose_thirdParty` + updated `test_closeOnDeadline`.

### M-2 · `RaffleManager.withdrawProtocolUSDG` had no idempotency guard  — FIXED
Repeated calls in `Resolved` drained entrants' staked USDG beyond the intended fee. Added a
one-shot `protocolFeeWithdrawn[roundId]` guard.
- `contracts/src/RaffleManager.sol`
- Test: `test_withdrawProtocolUSDG_onlyOnce`.

### M-3 · PackManager locked funds if the VRF callback reverted / never fired  — FIXED
An unresolved pack (e.g. treasury under-funded when `fulfillRandomWords` calls `distribute`)
left the buyer's USDG stuck forever. Added `refundUnresolvedPack` (records `pricePaid`, refunds
after `packClaimTimeout`, and marks the pack resolved+claimed so a late VRF callback can neither
pay out nor double-refund).
- `contracts/src/PackManager.sol`
- Tests: `test_refundUnresolvedPack_afterTimeout`, `test_refundUnresolvedPack_blocksLateVRF`.

### L-1 · `create-sponsored` didn't prove control of `creator`  — FIXED
The $SHRH gate could be satisfied by naming any holder's address. Now requires an EIP-191
signature from `creator` over the request params + a fresh `issuedAt` (10-min window) to prevent
replay.
- `web/app/api/create-sponsored/route.ts`

### L-2 · Cron ops auth was weak  — FIXED
`cron/advance-pools` (drives on-chain spends) accepted `TELEGRAM_BOT_TOKEN` as its secret and a
`?secret=` query param. Now: dedicated `CRON_SECRET`/`TELEGRAM_CRON_SECRET` only, `Authorization`
header only (no query string), bot-token fallback removed.
- `web/app/api/cron/advance-pools/route.ts`

### L-5 · RaffleManager VRF callback scanned all rounds  — FIXED
`fulfillRandomWords` looped over every round. Added `_requestToRound` for O(1) routing.
- `contracts/src/RaffleManager.sol`

### L-8 (part) · PotFactory missing SPDX identifier  — FIXED
- `contracts/src/PotFactory.sol`

## Documented / accepted (operational or low-impact — no code change)

- **M-4 · Owner centralization / no timelock / hot server key.** Every contract is single
  `Ownable`; the owner can repoint swap routers, drain the Treasury, and toggle the reveal
  kill-switch, and the server's `SPONSOR_PRIVATE_KEY` *is* the factory owner. **Recommendation:**
  move ownership to a multisig + timelock, and split the ops key from the owner key. Not changed
  in code because it is a deployment-posture decision.
- **L-3 · Luck escrow is reusable across pots and unlockable one block after locking.** Design
  choice (`RevealEngine.lockLuck`). Consider a longer unlock cooldown / per-pot binding if the
  boost should be scarcer.
- **L-4 · No swap deadline; weak per-leg min in `purchaseWithSeed`.** `ISwapRouter02` is
  SwapRouter02-style and intentionally has no `deadline`; slippage is enforced via
  `amountOutMinimum` (per-leg in the primary `purchase()` path). `purchaseWithSeed` is now a
  gated backdoor.
- **L-6 · `Pot.sweepAssetDust` needs all cards claimed.** Conservative on purpose (avoids taking
  unclaimed users' assets); a lost card locks only residual dust.
- **L-7 · `AssetManager.purchase` uses `blockhash` for token selection.** Validator-influenceable
  but only affects *which* allow-listed stocks are bought (even split), so low impact.
- **L-8 (rest) · Floating `^0.8.24` pragma** (pinned via `foundry.toml`), and **Treasury has a
  single `distributor` slot** (PackManager vs any future distributor conflict) — note for ops.

## Production deployment checklist (from these findings)

1. `RevealEngine.setSeededRevealEnabled(false)` and `AssetManager.setSeededPurchaseEnabled(false)`
   once the coordinator is wired.
2. Transfer all contract ownership to a multisig + timelock; use a separate, least-privilege ops
   key (not the owner) for `advance-pool` / cron.
3. Set `CRON_SECRET` (do not rely on the bot token).
4. Ensure the Treasury is funded for `PackManager` drop tables so `fulfillRandomWords` cannot
   revert.
5. Validate the reworked `advance-pool.ts` two-phase reveal on staging before mainnet.
