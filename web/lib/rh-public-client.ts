import { createPublicClient, http } from "viem"
import { robinhood } from "@/lib/chain"

export const rhPublicClient = createPublicClient({
  chain: robinhood,
  transport: http(robinhood.rpcUrls.default.http[0]),
})
