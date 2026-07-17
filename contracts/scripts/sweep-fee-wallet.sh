#!/usr/bin/env bash
# Sweep fee wallet → ops. Requires ~0.000003 ETH on fee wallet for gas.
set -euo pipefail
cd "$(dirname "$0")/.."

RPC="${RH_RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
DEST="${SWEEP_DEST:-0x5bc2e3dd60c625dda51bac0cf5c3023d45f5e600}"
TREASURY=0xd16D96384E23073d0b8EA9c92eD50EeA0beD7E20
SHRH_OLD=0x603346C9a100060687735720066e2382872cdbAd
SHRH_AMT=1000000000000000000000000000

if [[ -f .env ]]; then set -a; source .env; set +a; fi
MNEMONIC="${FEE_WALLET_MNEMONIC:-${FEE_WALLET_PRIVATE_KEY:-}}"
if [[ -z "$MNEMONIC" || "$MNEMONIC" == 0x* ]]; then
  echo "Set FEE_WALLET_MNEMONIC in contracts/.env"
  exit 1
fi

FEE=$(cast wallet address --mnemonic "$MNEMONIC" --mnemonic-index 0)
echo "Fee wallet: $FEE"
echo "Dest:       $DEST"
echo "ETH:        $(cast balance "$FEE" --rpc-url "$RPC" --ether)"

echo "Withdrawing 1B SHRH..."
cast send "$TREASURY" \
  "withdrawToken(address,address,uint256)" \
  "$SHRH_OLD" "$DEST" "$SHRH_AMT" \
  --rpc-url "$RPC" \
  --mnemonic "$MNEMONIC" \
  --mnemonic-index 0

BAL=$(cast balance "$FEE" --rpc-url "$RPC")
BASE=$(cast base-fee --rpc-url "$RPC")
SEND=$(python3 -c "bal=int('$BAL'); gp=int('$BASE')*2; print(max(0, bal - 30000*gp))")
if [[ "$SEND" -gt 0 ]]; then
  echo "Sending remaining ETH..."
  cast send "$DEST" --value "$SEND" --gas-limit 21000 \
    --rpc-url "$RPC" --mnemonic "$MNEMONIC" --mnemonic-index 0
fi

echo "Done. Dest SHRH: $(cast call $SHRH_OLD 'balanceOf(address)(uint256)' $DEST --rpc-url $RPC)"
echo "Dest ETH:  $(cast balance $DEST --rpc-url $RPC --ether)"
