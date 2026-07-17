#!/usr/bin/env bash
# Pre-mainnet contract assurance battery for Sherhood pot stack.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CDIR="$ROOT/contracts"
export ANVIL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
unset DEPLOYER_PRIVATE_KEY || true

cd "$CDIR"
echo "==> forge build"
forge build --sizes 2>&1 | tail -20

echo "==> full test suite"
forge test --summary

echo "==> fuzz 500 runs"
forge test --fuzz-runs 500 --match-contract PotFuzzTest

echo "==> invariant suite (default 256 runs)"
forge test --match-contract PotInvariantTest

echo "==> PrevRandao path"
forge test --match-contract PrevRandaoTest

echo "==> local anvil e2e sim"
bash "$ROOT/scripts/devnet-sim.sh" 2>&1 | tail -5

echo ""
echo "ASSURANCE_OK — review audit-checklist.mdc before RH broadcast"
