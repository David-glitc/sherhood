#!/usr/bin/env bash
# Register (or append) stock tokens on an existing StockTokenRegistry.
# Safe to re-run after deploy — onlyOwner upserts / appends.
#
# Usage:
#   STOCK_REGISTRY=0x... STOCK_SYMBOLS=AVGO,NFLX STOCK_ADDRESSES=0x...,0x... \
#     ./scripts/register-stocks.sh
#
# Or rely on STOCK_* from contracts/.env.rh.example + STOCK_REGISTRY in contracts/.env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CDIR="$ROOT/contracts"

if [[ ! -f "$CDIR/.env" ]]; then
  echo "Missing contracts/.env with DEPLOYER_PRIVATE_KEY"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$CDIR/.env.rh.example"
# shellcheck disable=SC1091
source <(grep -E '^(DEPLOYER_PRIVATE_KEY|STOCK_REGISTRY)=' "$CDIR/.env" || true)
set +a

if [[ -z "${STOCK_REGISTRY:-}" ]]; then
  echo "Set STOCK_REGISTRY=0x... (deployed StockTokenRegistry)"
  exit 1
fi
if [[ -z "${STOCK_SYMBOLS:-}" || -z "${STOCK_ADDRESSES:-}" ]]; then
  echo "Set STOCK_SYMBOLS and STOCK_ADDRESSES (comma-separated, same length)"
  exit 1
fi

cd "$CDIR"
echo "Registry: $STOCK_REGISTRY"
echo "Symbols:  $STOCK_SYMBOLS"
STOCK_REGISTRY="$STOCK_REGISTRY" forge script script/RhRegisterStocks.s.sol:RhRegisterStocksScript \
  --rpc-url "$RH_RPC_URL" \
  --broadcast \
  --slow \
  -vv

echo "Done. Also add the same symbols/addresses to web/lib/basket-stocks.ts for logos + UI."
