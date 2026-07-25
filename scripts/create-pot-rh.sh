#!/usr/bin/env bash
# Create a PotFactory basket with Robinhood USDG 6-decimal units.
# NEVER use cast's ether units / 1e18 for fundingGoal / minDeposit / entryFee.
#
# Usage:
#   ./scripts/create-pot-rh.sh [goalUsd] [minUsd] [days] [entryUsd]
# Example:
#   ./scripts/create-pot-rh.sh 5 0.5 3 0

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
set -a && source "$ROOT/contracts/.env" 2>/dev/null || true; set +a

RPC="${RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
FACT="${POT_FACTORY:-${NEXT_PUBLIC_POT_FACTORY_ADDRESS:-0x6a03aE2e1A5E5521d044Ed2cdFe24947E0CD92a1}}"

GOAL_USD="${1:-5}"
MIN_USD="${2:-0.5}"
DAYS="${3:-3}"
ENTRY_USD="${4:-0}"

to_usdg6() {
  python3 -c "print(int(round(float('$1') * 1_000_000)))"
}

GOAL=$(to_usdg6 "$GOAL_USD")
MIN=$(to_usdg6 "$MIN_USD")
ENTRY=$(to_usdg6 "$ENTRY_USD")
DUR=$((DAYS * 86400))

# Reject accidental 18-dec
if (( GOAL >= 1000000000000000 )); then
  echo "Refusing goal=$GOAL — looks like 18-decimal wei. Pass dollar amounts to this script." >&2
  exit 1
fi

echo "createPot goal=$GOAL_USD ($GOAL) min=$MIN_USD ($MIN) entry=$ENTRY_USD ($ENTRY) days=$DAYS"
cast send "$FACT" "createPot(uint256,uint256,uint256,uint256,uint256)" \
  "$GOAL" "$DUR" "$MIN" "$ENTRY" 0 \
  --private-key "$DEPLOYER_PRIVATE_KEY" --rpc-url "$RPC"
cast call "$FACT" "getPots()(address[])" --rpc-url "$RPC"
