#!/usr/bin/env bash
# Local anvil "devnet": deploy pot stack + run full business-flow simulation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CDIR="$ROOT/contracts"
RPC="${RPC_URL:-http://127.0.0.1:8545}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
OUT="$CDIR/broadcast/local-stack.env"

cleanup() {
  if [[ -n "${ANVIL_PID:-}" ]] && kill -0 "$ANVIL_PID" 2>/dev/null; then
    kill "$ANVIL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! curl -s -X POST -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  "$RPC" >/dev/null 2>&1; then
  echo "==> starting anvil on :$ANVIL_PORT"
  anvil --port "$ANVIL_PORT" --block-time 1 >/tmp/sherwood-anvil.log 2>&1 &
  ANVIL_PID=$!
  sleep 1
else
  echo "==> reusing existing RPC $RPC"
fi

cd "$CDIR"
# Do not let contracts/.env Sepolia deployer key override anvil account #0.
export ANVIL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
unset DEPLOYER_PRIVATE_KEY || true

echo "==> deploying LocalStack"
DEPLOY_LOG="$(mktemp)"
forge script script/LocalStack.s.sol:LocalStackScript \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$ANVIL_PRIVATE_KEY" \
  -vv \
  | tee "$DEPLOY_LOG"

extract() { grep -E "^[[:space:]]*$1 " "$DEPLOY_LOG" | awk '{print $NF}' | tail -1; }

USDG=$(extract USDG)
NVDA=$(extract NVDA)
VRF=$(extract VRF)
ROUTER=$(extract ROUTER)
TREASURY=$(extract TREASURY)
POT_CARD=$(extract POT_CARD)
POT_FACTORY=$(extract POT_FACTORY)
REVEAL_ENGINE=$(extract REVEAL_ENGINE)
ASSET_MANAGER=$(extract ASSET_MANAGER)

MARKETPLACE=$(extract MARKETPLACE)

cat > "$OUT" <<EOF
USDG=$USDG
NVDA=$NVDA
VRF=$VRF
ROUTER=$ROUTER
TREASURY=$TREASURY
POT_CARD=$POT_CARD
POT_FACTORY=$POT_FACTORY
REVEAL_ENGINE=$REVEAL_ENGINE
ASSET_MANAGER=$ASSET_MANAGER
MARKETPLACE=$MARKETPLACE
EOF

echo "==> wrote $OUT"
echo "==> simulating business flow"
set -a
# shellcheck disable=SC1090
source "$OUT"
set +a

forge script script/SimulateBusinessFlow.s.sol:SimulateBusinessFlowScript \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$ANVIL_PRIVATE_KEY" \
  -vv

echo "==> done. Addresses in $OUT"
