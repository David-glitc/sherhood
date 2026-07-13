# Sherwood — Knowledge Base

**Fractional Asset Loot Protocol** on Robinhood Chain — not a casino.

## Vision

On-chain collectible finance: users contribute to investment pots that acquire real assets (stocks, ETFs, tokenized RWAs, or crypto). Every contribution mints a mystery card. Reveal determines the user's **fractional ownership** of the pot — everyone owns something; allocation size is randomized.

## Product principle

Every card is a claim on the underlying pool. Claim **size** is determined by randomized allocation. Users never "lose everything" to chance. Weighted ownership across all cards always sums to 100% of the pool.

## Core flow

Deposit → Join Pot → Pot Fills → Assets Purchased → Cards Minted → Reveal → Fractional Ownership NFT

## Pot lifecycle

1. Created — platform or community
2. Funding — contributions + progress
3. Close — deadline or target
4. Asset Purchase — treasury buys target asset
5. Card Mint — one NFT per deposit
6. Reveal — VRF assigns ownership weights + rarity
7. Ownership — NFT encodes claim rights

## Pot types

Platform · Community · Sponsored · Seasonal — many concurrent.

## Architecture targets

| Module | Role |
|--------|------|
| Pot Factory | Creates pots |
| Pot Contract | Deposits, status, goal, participants |
| Asset Manager | Acquires asset after close |
| Card Contract | ERC-721/1155: rarity, ownership %, metadata |
| Reveal Engine | Verifiable randomness → weights + rarity |
| Treasury | Fees + purchases |

## Revenue

Entry fees, pot creation fees, marketplace royalties, premium/sponsored pots, optional AUM fee.

## Non-goals (v1)

- Winner-take-all raffles as the core product
- Pure wagering where chance can wipe a deposit to zero
- Off-chain custodial ownership without on-chain claim representation

## Legacy note

Existing `RaffleManager` / `PackManager` are winner/loot prototypes. Product direction is pot + fractional claim cards. Reuse USDG, VRF, Treasury, and swap paths where possible.
