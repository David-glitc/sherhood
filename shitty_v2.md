# SHERHOOD PROTOCOL — SHITTY v2 AUDIT

Found by an extra pair of eyes who hates most of the pages.

---

## CRITICAL — FIX BEFORE TOUCHING CHAIN AGAIN

### C1 — `_allocate()` overflow loop can permanently brick a pot

**File**: `contracts/src/RevealEngine.sol:167-182`
**Risk**: Permanent DoS on reveal.

The overflow correction uses a `while (overflow > 0)` loop that finds the max weight and subtracts 1 at a time. If all weights are already at floor (1) and overflow > 0, the `require(maxW > 1, "Reveal: floor")` on line 178 reverts permanently. Every participant's card in that pot is stuck unrevealed.

**Fix**: Replace the while-loop with proportional distribution in one pass:

```solidity
// In _allocate(), replace lines 167-193:
uint256 assigned;
for (uint256 i = 0; i < n; i++) {
    weights[i] = (raw[i] * OWNERSHIP_ONE) / rawSum;
    if (weights[i] == 0) weights[i] = 1;
    assigned += weights[i];
}

// Distribute remainder to largest raw contributor
if (assigned != OWNERSHIP_ONE) {
    uint256 maxIdx;
    uint256 maxRaw;
    for (uint256 i = 0; i < n; i++) {
        if (raw[i] > maxRaw) {
            maxRaw = raw[i];
            maxIdx = i;
        }
    }
    if (assigned > OWNERSHIP_ONE) {
        weights[maxIdx] -= (assigned - OWNERSHIP_ONE);
    } else {
        weights[maxIdx] += (OWNERSHIP_ONE - assigned);
    }
}
```

---

### C2 — EntryRouter permanently traps ETH

**File**: `contracts/src/EntryRouter.sol:72`
**Risk**: Any ETH sent directly to EntryRouter is stuck forever.

```solidity
receive() external payable {}
```

No `withdrawETH` function exists. ETH from contract suicide, mistaken sends, or MEV leftovers is irrecoverable.

**Fix**: Add a withdrawal function:

```solidity
function withdrawETH(address to, uint256 amount) external onlyOwner {
    payable(to).transfer(amount);
}
```

Or make `receive()` revert unless caller is the WETH contract:

```solidity
receive() external payable {
    require(msg.sender == weth, "Entry: direct ETH not accepted");
}
```

---

### C3 — `_pickTokens()` assembly truncation returns wrong array length

**File**: `contracts/src/AssetManager.sol:222-223`
**Risk**: Fewer tokens purchased than intended, silent.

```solidity
if (pickedLen < pickCount) {
    assembly {
        mstore(picked, pickedLen)
    }
}
```

When `2 × listLen` coin-flips aren't enough to pick `pickCount` unique tokens, the array is silently shortened via assembly. The caller allocated `minOut` for `pickCount` items, but execution uses fewer. Symptoms: partial purchase, accounting mismatch.

**Fix**: Remove the assembly. Track picks explicitly with a mapping and loop properly:

```solidity
function _pickTokens(address[] memory list, uint256 seed, uint256 pickCount)
    private
    pure
    returns (address[] memory picked)
{
    uint256 listLen = list.length;
    if (pickCount > listLen) pickCount = listLen;
    picked = new address[](pickCount);
    mapping(uint256 => bool) memory used;
    uint256 pickedLen;
    for (uint256 attempt = 0; pickedLen < pickCount && attempt < listLen * 3; attempt++) {
        uint256 idx = uint256(keccak256(abi.encode(seed, attempt))) % listLen;
        if (!used[idx]) {
            used[idx] = true;
            picked[pickedLen++] = list[idx];
        }
    }
    // If we still don't have enough, fill remaining sequentially
    if (pickedLen < pickCount) {
        for (uint256 i = 0; i < listLen && pickedLen < pickCount; i++) {
            if (!used[i]) {
                used[i] = true;
                picked[pickedLen++] = list[i];
            }
        }
    }
}
```

---

## MEDIUM — FIX IN SPRINT

### M1 — Marketplace TOCTOU on NFT state

**File**: `contracts/src/CardMarketplace.sol:109-131`

USDG transfers happen before the NFT transfer. If the NFT is burned/claimed between check and transfer, the tx reverts (atomic safety), but the listing references a dead token. More importantly: the `_delist()` call on line 128 mutates state before `safeTransferFrom` on line 129. If a future version splits the transfer from the delist, this breaks.

**Fix**: Check state again after transfer, or move `_delist` after `safeTransferFrom`:

```solidity
card.safeTransferFrom(L.seller, msg.sender, tokenId);
_delist(tokenId);
```

### M2 — PrevRandaoCoordinator fulfiller can influence randomness

**File**: `contracts/src/PrevRandaoCoordinator.sol:71`

Fulfiller chooses when to call `fulfill()`. They can see `block.prevrandao` and `blockhash` before deciding. Seed = `keccak256(prevrandao, requestId, rb, bh, consumer)`. Fulfiller can wait for a favorable prevrandao value.

**Fix**: Use Chainlink VRF exclusively on mainnet. Document that PrevRandaoCoordinator is a fallback only and should have its own operator permissions separate from VRF. Add a max-delay window to force timely fulfillment.

### M3 — BuybackVault no stale price check

**File**: `contracts/src/BuybackVault.sol:50`

```solidity
(, int256 answer, , , ) = priceFeed.latestRoundData();
```

No `updatedAt` check. If the Chainlink feed goes stale during a market crash, users can buyback at wrong prices.

**Fix**:

```solidity
(uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
require(answer > 0, "BuybackVault: invalid price");
require(updatedAt > block.timestamp - 1 hours, "BuybackVault: stale");
require(answeredInRound >= roundId, "BuybackVault: round incomplete");
```

### M4 — Early exit can be cycled

**File**: `contracts/src/Pot.sol:269-306`

During `Funding` status, a user can deposit, early-exit (pay 5% fee), and repeat. They cycle through mystery NFTs cheaply. Combined with luck mechanics, they can mint many cards hoping for a good one, then only keep the best.

**Fix**: Add a cooldown per user per pot:

```solidity
mapping(address => uint256) public lastExitTime;
// In earlyExit:
require(block.timestamp > lastExitTime[msg.sender] + 1 hours, "Pot: cooldown");
lastExitTime[msg.sender] = block.timestamp;
```

---

## LOW — NICE TO FIX

### L1 — `PotFactory.mintCard()` silent staticcall failure

**File**: `contracts/src/PotFactory.sol:194-198`

```solidity
(bool ok, bytes memory data) = revealEngine.staticcall(...);
if (ok && data.length >= 32) { luckLocked = abi.decode(data, (bool)); }
```

If `revealEngine` is misconfigured, `luckLocked` silently defaults to `false`. Add a `require(ok, "PotFactory: luck check failed")` or at least an event.

### L2 — `participantCount` incremented before mint

**File**: `contracts/src/Pot.sol:204-207`

```solidity
participantCount += 1;
tokenId = IPotFactoryView(factory).mintCard(beneficiary, amount);
```

If mintCard reverts (e.g., OOG), the tx reverts so no harm. But if mintCard ever succeeds partially, the accounting is wrong. Move increment after mint to be safe.

### L3 — No `OwnerUpdated` events tracking

Several contracts (PrevRandaoCoordinator, AssetManager) track ownership changes. `Ownable` already emits `OwnershipTransferred`. Verify on-chain that all ownership changes are visible.

### L4 — `RevealEngine` luck unlock same-block restriction

**File**: `contracts/src/RevealEngine.sol:90`

```solidity
require(block.number > luckLockBlock[msg.sender], "Reveal: same block");
```

This requires a full block wait. If the network is fast, this is fine. But on Robinhood Chain with 2s block times, this is ~2s. Document it.

---

## OPTIMIZATION — GAS AND CLEANUP

### O1 — `_removePotTokenId()` O(n) linear scan

**File**: `contracts/src/PotCard.sol:198-209`

Linear search per burn. Fine for 40 participants, wasteful at 100+. Use a mapping.

### O2 — `_pickTokens()` duplicate check O(n²)

**File**: `contracts/src/AssetManager.sol:209-213`

Inner loop to check for duplicates. Use a temporary mapping for O(1) lookups.

### O3 — Basket detail page re-fetches same data

**File**: `web/app/basket/[slug]/page.tsx`

`useReadContract` for `potTokenIds` + `useReadContracts` for `getCard` + `ownerOf` = 3 separate queries for the same data. `potTokenIds` returns IDs, then each ID is re-fetched. Use a single multicall or restructure.

### O4 — Multiple `forceApprove(0)` / `forceApprove(amount)` patterns

Used in Pot, EntryRouter, CardMarketplace. This is the standard USDT-safe pattern, but if USDG doesn't have the USDT quirk, the extra zero-approval wastes gas. Consider documenting that USDG follows standard ERC20.

---

## TEST COVERAGE GAPS

| Area | What's Missing |
|------|----------------|
| **EntryRouter** | Swap failure recovery, fee=0 edge, minUsdgOut boundary, WETH approval race |
| **Marketplace** | Buy with burned/claimed card, cancel by owner, re-list after cancel |
| **BuybackVault** | Zero tests exist |
| **TreasuryDirect** | Zero tests exist |
| **PrevRandaoCoordinator** | >256 block delay, multiple fulfills, unknown requestId |
| **Luck mechanics** | lockLuck/unlockLuck edge cases, eligibility with token transfers |
| **AssetManager** | commitPurchase timeout, seeded purchase disabled, registry being empty |
| **Reentrancy** | No explicit reentrancy attack simulation |
| **Fuzzing** | Only 2 fuzz tests. Missing: marketplace, early exit, refund, fee sweeping |

---

## UX — PAGES THAT NEED WORK

### P1 — `/app` (dashboard)

- **3 micro stats** at the top (Spot/Settle/Chain) are text-white/30 — nearly invisible. They convey zero user value. Kill them or move them to footer.
- **No basket count**, no search, no filter on the pot discovery list.
- **CTAs have no hierarchy**: Create/Docs/Cards are identical buttons. Create is primary (bg-sherhood), the rest should be secondary styles.
- **Loading states**: `PotDiscovery` is a black box with no error boundary.

### P2 — `/basket/[slug]` (608-line monster)

- **Split this file.** Minimum: `FundPanel`, `RaiseMeter`, `HoldingCharts`, `DepositsTable`, `MyCards`.
- **No error boundary**: one bad contract read = blank page.
- **ETH is default** pay asset but USDG has no swap risk — bad default.
- **Deposits table shows truncated wallet addresses** — privacy leak. If the chain is public anyway, show full addresses or just the count.
- **"YOUR CARDS"** re-fetches data already available from the deposits table — duplicate queries.
- **No animation or confetti** on successful deposit/mint — feels like nothing happened.
- **Slippage control** defaults to a value but the help text says "no live ETH price yet" — confusing when price is available.

### P3 — `/inventory`

- **No sorting** by rarity, pot, deposit size, revealed status.
- **Listing price input** has no fee preview, no validation beyond `min="0"`.
- **`StockLogoStack` with `max={4}`** silently truncates with no "+N" indicator.
- **Loading state** is just text — skeleton cards would be better.
- **Nested ternary hell**: `potHoldings?.[idx]?.status === "success" ? ... : undefined` repeated.

### P4 — `/marketplace`

- **No search, no filter** (by rarity, price range, pot).
- **No sort** (price low-high, newest, rarity).
- **No pagination** — 50 cards = massive page.
- **"My listings"** section missing.
- **Royalty %** buried in description paragraph — show it on the card.
- **No last-sale or floor data** — user has no price context.

### P5 — `/leaderboard`

- **"No scored actions yet"** shown when the API returns empty OR when user isn't in top results — two different states, same message.
- **`lastDay` field** fetched but never displayed.
- **No pagination** — the API returns everything or nothing.
- **XP calculation** is a mystery without clicking through to docs.

### P6 — `/profile`

- **"Delete my account and data"** is dramatic red/danger styling for a localStorage clear. Misleading.
- **No portfolio view**, no transaction history.
- **No disconnect confirmation** beyond the native `confirm()` dialog.

---

## ARCHITECTURAL NOTES

- **No timelock** on any owner operation. Every setter fires immediately.
- **No multisig** — single EOA key controls everything.
- **No proxy pattern** — contracts are immutable post-deploy. `TreasuryDirect` is a manual replacement, not an upgrade.
- **Pausability is asymmetric**: Factory can pause deposits/claims via Pot's `whenFactoryNotPaused`, but AssetManager and RevealEngine have their own operator sets.
- **No emergency withdrawal** for BuybackVault users or EntryRouter ETH.

---

## REVIEW + IMPLEMENTATION STATUS (2026-07-17)

| ID | Verdict | Action |
|----|---------|--------|
| **C1** | Valid (gas DoS; permanent brick unlikely given `n <= 1e18`) | **Done** — single-pass overflow correction on largest raw contributor |
| **C2** | Valid | **Done** — `receive()` only accepts WETH; `withdrawETH` owner rescue |
| **C3** | Valid | **Done** — `_pickTokens` uses `used[]` + sequential fill; `require(pickedLen == pickCount)` |
| **M1** | Partially valid | **Done** — transfer before delist; `PotCard._update` allows marketplace as transfer caller while listed |
| **M2** | Valid (fallback only) | **Done** — `maxDelayBlocks` (default 64) on PrevRandaoCoordinator; deploy env `PREVRANDAO_MAX_DELAY_BLOCKS` |
| **M3** | Valid (not in SherhoodDeploy path) | **Done** — stale/oracle guards on BuybackVault |
| **M4** | Valid | **Done** — 1h early-exit cooldown per user per pot (`lastEarlyExitAt`, skip when 0) |
| **L1** | Valid | **Done** — `require(ok && data.length >= 32, "PotFactory: luck")` |
| **L2** | Valid | **Done** — `participantCount` incremented after `mintCard` |
| **L3** | Already OK | Ownable emits `OwnershipTransferred` |
| **L4** | Info | Documented in DEVELOPMENT.md |
| **O1–O4** | Backlog | Not in this sprint |
| **UX P1–P6** | Backlog | Not in this sprint |
| **Stats** | Requested | **Done** — `PotFactory.protocolStats`, `PotCard.totalMinted/totalBurned/totalSupply`, `/api/stats` |

**Tests:** 70/70 forge tests green. `PotFactory` runtime ~23.4KB (under 24KB).
