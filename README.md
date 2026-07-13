# Sherhood

**Fractional Asset Loot Protocol** on Robinhood Chain — [sherhood.online](https://sherhood.online)

Join investment pots → mint mystery cards → reveal fractional ownership of RH Stock Tokens. Pay with **ETH**, **WETH**, or **USDG**.

## Monorepo

| Path | Stack |
|------|--------|
| `contracts/` | Foundry / Solidity 0.8.24 |
| `web/` | Next.js App Router |
| `cursor_project_rules/` | Product + audit knowledge base |
| `scripts/devnet-sim.sh` | Local anvil full-flow sim |

## Contracts

```bash
cd contracts
forge test --match-path 'test/Pot*.t.sol' -vv
forge test --match-contract EntryRouterTest -vv

# Robinhood Chain deploy
cp .env.rh.example .env   # fill keys + SWAP_ROUTER + VRF
forge script script/RhDeploy.s.sol:RhDeployScript --rpc-url robinhood --broadcast
```

Register canonical Stock Token addresses from [RH docs](https://docs.robinhood.com/chain/contracts/) into `StockTokenRegistry` after deploy.

## Web

```bash
cd web
cp .env.local.example .env.local
npm i
npm run dev
```

## Flow

Deposit (ETH/WETH auto-swap or USDG) → pot fills → buy RH Stock Token → sweep fees → VRF reveal → claim / trade cards.
