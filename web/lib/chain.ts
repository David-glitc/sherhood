import { defineChain } from "viem"

/** Robinhood Chain mainnet — https://docs.robinhood.com/chain/ */
export const robinhood = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 4663,
  name: "Robinhood Chain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url:
        process.env.NEXT_PUBLIC_EXPLORER_URL ||
        "https://robinhoodchain.blockscout.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
})

/** @deprecated use `robinhood` */
export const robinhoodChain = robinhood

export const ROBINHOOD_CHAIN_ID = robinhood.id
