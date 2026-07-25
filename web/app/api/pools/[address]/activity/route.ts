import { NextResponse } from "next/server"
import { getAddress, isAddress, parseAbiItem } from "viem"
import { rhPublicClient } from "@/lib/rh-public-client"
import { fmtUsdg } from "@/hooks/use-pots"

export const dynamic = "force-dynamic"

const deposited = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 entryFeePaid, uint256 indexed tokenId)"
)
const claimed = parseAbiItem(
  "event Claimed(address indexed user, uint256 indexed tokenId, address[] tokens, uint256[] payouts)"
)
const earlyExited = parseAbiItem(
  "event EarlyExited(address indexed user, uint256 indexed tokenId, uint256 depositAmount, uint256 fee, uint256 refund)"
)
const closed = parseAbiItem("event Closed(uint256 totalDeposited, uint256 participantCount)")
const revealed = parseAbiItem("event Revealed()")
const purchased = parseAbiItem("event Purchased(address[] tokens, uint256[] amounts)")
const potCancelled = parseAbiItem(
  "event PotCancelled(uint256 totalDeposited, uint256 participantCount)"
)
const refunded = parseAbiItem(
  "event Refunded(address indexed user, uint256 indexed tokenId, uint256 amount)"
)

export type PoolActivityItem = {
  kind: string
  text: string
  txHash: string
  blockNumber: string
  amountFmt?: string
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> }
) {
  const { address: raw } = await context.params
  if (!isAddress(raw)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }
  const pot = getAddress(raw)

  try {
    const head = await rhPublicClient.getBlockNumber()
    const fromBlock = head > 800_000n ? head - 800_000n : 0n

    const [deps, claims, exits, closes, reveals, buys, cancels, refunds] =
      await Promise.all([
        rhPublicClient.getLogs({ address: pot, event: deposited, fromBlock, toBlock: head }),
        rhPublicClient.getLogs({ address: pot, event: claimed, fromBlock, toBlock: head }),
        rhPublicClient.getLogs({ address: pot, event: earlyExited, fromBlock, toBlock: head }),
        rhPublicClient.getLogs({ address: pot, event: closed, fromBlock, toBlock: head }),
        rhPublicClient.getLogs({ address: pot, event: revealed, fromBlock, toBlock: head }),
        rhPublicClient.getLogs({ address: pot, event: purchased, fromBlock, toBlock: head }),
        rhPublicClient.getLogs({ address: pot, event: potCancelled, fromBlock, toBlock: head }),
        rhPublicClient.getLogs({ address: pot, event: refunded, fromBlock, toBlock: head }),
      ])

    const items: PoolActivityItem[] = []

    for (const log of deps) {
      const user = log.args.user as string
      const amount = (log.args.amount as bigint) ?? 0n
      const tokenId = log.args.tokenId as bigint
      items.push({
        kind: "funded",
        text: `${short(user)} minted #${tokenId.toString()}`,
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
        amountFmt: fmtUsdg(amount),
      })
    }
    for (const log of claims) {
      const user = log.args.user as string
      const tokenId = log.args.tokenId as bigint
      items.push({
        kind: "claimed",
        text: `${short(user)} claimed #${tokenId.toString()}`,
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
      })
    }
    for (const log of exits) {
      const user = log.args.user as string
      const tokenId = log.args.tokenId as bigint
      const refund = (log.args.refund as bigint) ?? 0n
      items.push({
        kind: "early_exit",
        text: `${short(user)} early-exited #${tokenId.toString()}`,
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
        amountFmt: fmtUsdg(refund),
      })
    }
    for (const log of refunds) {
      const user = log.args.user as string
      const tokenId = log.args.tokenId as bigint
      const amount = (log.args.amount as bigint) ?? 0n
      items.push({
        kind: "refunded",
        text: `${short(user)} refunded #${tokenId.toString()}`,
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
        amountFmt: fmtUsdg(amount),
      })
    }
    for (const log of closes) {
      const total = (log.args.totalDeposited as bigint) ?? 0n
      items.push({
        kind: "closed",
        text: `Vault sealed · $${fmtUsdg(total)}`,
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
        amountFmt: fmtUsdg(total),
      })
    }
    for (const log of buys) {
      const tokens = (log.args.tokens as string[]) ?? []
      items.push({
        kind: "purchased",
        text: `Bought ${tokens.length} vault asset${tokens.length === 1 ? "" : "s"}`,
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
      })
    }
    for (const log of reveals) {
      items.push({
        kind: "revealed",
        text: "Sherds revealed — ownership locked",
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
      })
    }
    for (const log of cancels) {
      items.push({
        kind: "cancelled",
        text: "Pool cancelled — refunds open",
        txHash: log.transactionHash || "",
        blockNumber: (log.blockNumber ?? 0n).toString(),
      })
    }

    items.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)))

    return NextResponse.json({ items: items.slice(0, 40) })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "activity failed", items: [] },
      { status: 500 }
    )
  }
}
