/** Minimal ABI for TreasuryDirect (live) + legacy Treasury counters. */
export const treasuryRevenueAbi = [
  {
    type: "function",
    name: "feesForwardedUSDG",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feesCollectedUSDG",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeRecipient",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const
