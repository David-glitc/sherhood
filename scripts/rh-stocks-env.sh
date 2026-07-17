#!/usr/bin/env bash
# Emit STOCK_SYMBOLS / STOCK_ADDRESSES env lines from rh-sp500-canonical.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSON="$ROOT/contracts/config/rh-sp500-canonical.json"
python3 - "$JSON" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
tokens = data.get("tokens") or data.get("sp500_overlap") or data.get("all_official_by_volume") or []
syms = ",".join(t["symbol"] for t in tokens)
addrs = ",".join(t["address"] for t in tokens)
print(f"export STOCK_SYMBOLS={syms}")
print(f"export STOCK_ADDRESSES={addrs}")
print(f"# count={len(tokens)}")
PY
