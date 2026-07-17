#!/usr/bin/env bash
# LOCAL-ONLY smoke battery — never mainnet.
# Uniswap V3 path exercised via MockWethUsdgRouter (exactInputSingle / Router02 layout).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CDIR="$ROOT/contracts"
export ANVIL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
unset DEPLOYER_PRIVATE_KEY || true

cd "$CDIR"

echo "==> [local] forge build"
forge build -q

echo "==> [local] Uniswap V3-style EntryRouter tests"
forge test --match-contract EntryRouterTest -vv

echo "==> [local] edge + overflow"
forge test --match-contract PotEdgeOverflowTest

echo "==> [local] fuzz 500"
forge test --fuzz-runs 500 --match-contract PotFuzzTest

echo "==> [local] PrevRandao"
forge test --match-contract PrevRandaoTest

echo "==> [local] anvil e2e (MockSwapRouter = V3 exactInputSingle)"
bash "$ROOT/scripts/devnet-sim.sh" 2>&1 | tee /tmp/sherhood-local-smoke.log | tail -15

grep -q SIMULATION_OK /tmp/sherhood-local-smoke.log

echo ""
echo "LOCAL_SMOKE_OK — no mainnet txs; Uniswap path covered by mocks + EntryRouterTest"
