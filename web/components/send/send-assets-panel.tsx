"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tip } from "@/components/ui/tip"
import { useSendAssets, type SendAssetKind } from "@/hooks/use-send-assets"
import { playSendSound } from "@/lib/sfx"
import { useMyCards } from "@/hooks/use-my-cards"
import { UserAvatar } from "@/components/profile/user-avatar"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/lib/user-profile"

type ReceiverOption = Pick<UserProfile, "address" | "name" | "avatarId"> & {
  slug?: string
}

type SendAssetsPanelProps = {
  recipient?: ReceiverOption | null
  className?: string
  id?: string
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function SendAssetsPanel({ recipient, className, id = "send" }: SendAssetsPanelProps) {
  const { address, isConnected } = useAccount()
  const { sendUsdg, sendEth, sendSherd, isPending, onRobinhood } = useSendAssets()
  const { cards } = useMyCards()

  const [receivers, setReceivers] = useState<ReceiverOption[]>([])
  const [kind, setKind] = useState<SendAssetKind>("USDG")
  const [amount, setAmount] = useState("")
  const [tokenId, setTokenId] = useState("")
  const [query, setQuery] = useState(recipient?.name ?? "")
  const [toAddress, setToAddress] = useState(recipient?.address ?? "")
  const [loadingReceivers, setLoadingReceivers] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (recipient?.address) {
      setToAddress(recipient.address)
      setQuery(recipient.name)
    }
  }, [recipient?.address, recipient?.name])

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/profiles?mode=receivers", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { receivers: [] }))
      .then((json: { receivers?: ReceiverOption[] }) => {
        setReceivers(json.receivers ?? [])
      })
      .catch(() => setReceivers([]))
      .finally(() => setLoadingReceivers(false))
    return () => controller.abort()
  }, [])

  const transferable = useMemo(() => cards.filter((c) => !c.claimed), [cards])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = receivers.filter((r) => r.address.toLowerCase() !== address?.toLowerCase())
    if (!q) return list.slice(0, 8)
    return list
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.slug ?? "").toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [receivers, query, address])

  const selected =
    receivers.find((r) => r.address.toLowerCase() === toAddress.toLowerCase()) ||
    (recipient && recipient.address.toLowerCase() === toAddress.toLowerCase()
      ? recipient
      : null)

  const pick = (r: ReceiverOption) => {
    setToAddress(r.address)
    setQuery(r.name)
    setOpen(false)
  }

  const onSubmit = async () => {
    if (!toAddress) {
      toast.error("Pick a receiver")
      return
    }
    try {
      if (kind === "USDG") {
        await sendUsdg(toAddress, amount)
        playSendSound()
        toast.success("USDG sent")
      } else if (kind === "ETH") {
        await sendEth(toAddress, amount)
        playSendSound()
        toast.success("ETH sent")
      } else {
        if (!/^\d+$/.test(tokenId)) throw new Error("Pick a Sherd")
        await sendSherd(toAddress, BigInt(tokenId))
        playSendSound()
        toast.success(`Sherd #${tokenId} sent`)
      }
      setAmount("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed")
    }
  }

  if (!isConnected) {
    return (
      <div id={id} className={cn("product-surface p-5", className)}>
        <h2 className="text-lg font-semibold">Send</h2>
        <p className="mt-2 text-sm text-muted-foreground">Connect wallet</p>
      </div>
    )
  }

  return (
    <div id={id} className={cn("product-surface p-5", className)}>
      <div className="flex items-center gap-1.5">
        <h2 className="text-lg font-semibold">Send</h2>
        <Tip text="Type a unique name. Only players with Allow receive appear." />
      </div>

      {!onRobinhood && (
        <p className="mt-2 text-xs text-amber-200/90">Switch to Robinhood Chain</p>
      )}

      <div className="relative mt-4">
        <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          To
        </label>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setToAddress("")
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={loadingReceivers ? "Loading…" : "Type a name…"}
          className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
          autoComplete="off"
        />
        {open && matches.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#333333] bg-black py-1 shadow-xl">
            {matches.map((r) => (
              <li key={r.address}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#111]"
                >
                  <UserAvatar
                    address={r.address}
                    avatarId={r.avatarId}
                    name={r.name}
                    size={32}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {r.name}
                    </span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {shortAddr(r.address)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && !loadingReceivers && query.trim() && matches.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No matching receivers</p>
        )}
      </div>

      {selected && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#333333] bg-black/40 px-3 py-2.5">
          <UserAvatar
            address={selected.address}
            avatarId={selected.avatarId}
            name={selected.name}
            size={36}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="font-mono text-[11px] text-[#ccff00]/90">{shortAddr(selected.address)}</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-1 rounded-[14px] border border-[#333333] bg-black p-1">
        {(["USDG", "ETH", "SHERD"] as SendAssetKind[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "h-10 flex-1 rounded-[10px] text-xs font-medium transition",
              kind === k ? "bg-[#ccff00] text-black" : "text-[#999999] hover:text-[#e5e7eb]"
            )}
          >
            {k === "SHERD" ? "Sherd" : k}
          </button>
        ))}
      </div>

      {kind === "SHERD" ? (
        <select
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          aria-label="Sherd"
        >
          <option value="">Sherd…</option>
          {transferable.map((c) => (
            <option key={String(c.tokenId)} value={String(c.tokenId)}>
              #{String(c.tokenId)}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={kind === "ETH" ? "0.01 ETH" : "10 USDG"}
          aria-label="Amount"
          className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
        />
      )}

      <Button
        type="button"
        className="mt-5 w-full"
        disabled={isPending || !toAddress || !onRobinhood}
        onClick={onSubmit}
      >
        {isPending ? "Confirm…" : "Send"}
      </Button>
    </div>
  )
}
