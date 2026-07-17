#!/usr/bin/env bash
# RH mainnet deploy — uses canonical addresses from .env.rh.example + DEPLOYER_PRIVATE_KEY from contracts/.env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CDIR="$ROOT/contracts"

if [[ ! -f "$CDIR/.env" ]]; then
  echo "Missing contracts/.env with DEPLOYER_PRIVATE_KEY"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source "$CDIR/.env.rh.example"
# Only pull deployer key from .env (ignore sepolia/mock vars)
export DEPLOYER_PRIVATE_KEY
source <(grep -E '^DEPLOYER_PRIVATE_KEY=' "$CDIR/.env")
set +a

cd "$CDIR"
echo "Deployer: $(cast wallet address "$DEPLOYER_PRIVATE_KEY")"
echo "Balance:  $(cast balance "$(cast wallet address "$DEPLOYER_PRIVATE_KEY")" --rpc-url "$RH_RPC_URL" | cast from-wei) ETH"
echo "USDG:     $USDG_ADDRESS"
forge script script/RhDeploy.s.sol:RhDeployScript --rpc-url "$RH_RPC_URL" --broadcast --slow -vv
