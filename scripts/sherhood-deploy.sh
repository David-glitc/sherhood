#!/usr/bin/env bash
# Fresh Sherhood deploy + Blockscout verify on Robinhood Chain (4663).
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
source <(grep -E '^(DEPLOYER_PRIVATE_KEY|BLOCKSCOUT_API_KEY)=' "$CDIR/.env")
set +a

# Never carry a live SHRH into a fresh stack — token launches later.
unset SHRH_ADDRESS || true

cd "$CDIR"
DEPLOYER="$(cast wallet address "$DEPLOYER_PRIVATE_KEY")"
BAL="$(cast balance "$DEPLOYER" --rpc-url "$RH_RPC_URL" | cast from-wei)"
echo "Deployer: $DEPLOYER"
echo "Balance:  $BAL ETH"
echo "Need:     ~0.004 ETH for full fresh deploy + verify buffer"

NEED="0.0035"
python3 - <<PY
bal=float("$BAL")
need=float("$NEED")
if bal < need:
    raise SystemExit(f"Insufficient ETH: have {bal}, need >={need}")
print(f"Balance OK ({bal} >= {need})")
PY

echo "==> Broadcasting SherhoodDeploy"
forge script script/SherhoodDeploy.s.sol:SherhoodDeployScript \
  --rpc-url "$RH_RPC_URL" \
  --broadcast \
  --slow \
  -vv

LATEST="$(ls -t broadcast/SherhoodDeploy.s.sol/4663/run-*.json 2>/dev/null | head -1 || true)"
if [[ -z "${LATEST:-}" ]]; then
  echo "No broadcast log found — skip verify"
  exit 0
fi

# Pull deployed StockTokenRegistry from broadcast log and register whitelist.
STOCK_REGISTRY="$(python3 - "$LATEST" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
for tx in data.get("transactions", []):
    if tx.get("contractName") == "StockTokenRegistry" and tx.get("transactionType") == "CREATE":
        print(tx["contractAddress"])
        break
PY
)"
if [[ -n "$STOCK_REGISTRY" && -n "${STOCK_SYMBOLS:-}" ]]; then
  echo "==> Registering stock whitelist on $STOCK_REGISTRY"
  STOCK_REGISTRY="$STOCK_REGISTRY" forge script script/RhRegisterStocks.s.sol:RhRegisterStocksScript \
    --rpc-url "$RH_RPC_URL" \
    --broadcast \
    --slow \
    -vv
else
  echo "StockTokenRegistry address or STOCK_SYMBOLS missing — skipping stock registration"
fi

echo "==> Verifying from $LATEST"
# Prefer forge's built-in verify against Blockscout when key/url configured.
if [[ -n "${BLOCKSCOUT_API_KEY:-}" && "$BLOCKSCOUT_API_KEY" != "empty" ]]; then
  forge script script/SherhoodDeploy.s.sol:SherhoodDeployScript \
    --rpc-url "$RH_RPC_URL" \
    --verify \
    --verifier blockscout \
    --verifier-url "https://robinhoodchain.blockscout.com/api/" \
    --resume \
    -vv || echo "Verify pass incomplete — run forge verify-contract manually per address"
else
  echo "BLOCKSCOUT_API_KEY unset — skipping auto-verify."
  echo "After deploy, verify each address with:"
  echo "  forge verify-contract <ADDR> <Contract> --chain 4663 --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/"
fi
