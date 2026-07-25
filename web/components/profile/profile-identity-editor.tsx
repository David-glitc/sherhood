"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { useAccount, useSignMessage } from "wagmi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ShareButton } from "@/components/share/share-button"
import { Tip } from "@/components/ui/tip"
import { UserAvatar } from "@/components/profile/user-avatar"
import {
  PROFILE_AVATARS,
  PROFILE_NAME_MAX,
  normalizeProfileName,
  profileSignMessage,
  readLocalProfile,
  writeLocalProfile,
  defaultAvatarId,
  profilePath,
  profileSlug,
  type UserProfile,
} from "@/lib/user-profile"
import { cn } from "@/lib/utils"

type ProfileIdentityEditorProps = {
  onSaved?: (profile: UserProfile) => void
  className?: string
  /** XP / streak / Sherd chips shown in the single hero. */
  stats?: { xp?: number | string; streak?: string; sherds?: number | string }
  /** Right-side chrome (wallet, people, etc.). */
  actions?: ReactNode
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function ProfileIdentityEditor({
  onSaved,
  className,
  stats,
  actions,
}: ProfileIdentityEditorProps) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync, isPending: signing } = useSignMessage()

  const initial = useMemo(() => {
    if (!address) return { name: "", avatarId: 0, allowReceive: false }
    const local = readLocalProfile(address)
    return {
      name: local?.name ?? "",
      avatarId: local?.avatarId ?? defaultAvatarId(address),
      allowReceive: local?.allowReceive ?? false,
    }
  }, [address])

  const [name, setName] = useState(initial.name)
  const [avatarId, setAvatarId] = useState(initial.avatarId)
  const [allowReceive, setAllowReceive] = useState(initial.allowReceive)
  const [saving, setSaving] = useState(false)
  const [nameOk, setNameOk] = useState<boolean | null>(null)
  const [editing, setEditing] = useState(!initial.name)

  useEffect(() => {
    setName(initial.name)
    setAvatarId(initial.avatarId)
    setAllowReceive(initial.allowReceive)
    setEditing(!initial.name)
  }, [initial.name, initial.avatarId, initial.allowReceive])

  const slugPreview = profileSlug(name)
  const savedPath = initial.name ? profilePath(initial.name) : null

  useEffect(() => {
    if (!address || !name.trim() || !editing) {
      setNameOk(null)
      return
    }
    const cleaned = normalizeProfileName(name)
    if (!cleaned) {
      setNameOk(false)
      return
    }
    const controller = new AbortController()
    const t = window.setTimeout(() => {
      fetch(
        `/api/profiles?mode=check-name&name=${encodeURIComponent(cleaned)}&address=${address}`,
        { signal: controller.signal }
      )
        .then((r) => r.json())
        .then((json: { available?: boolean }) => setNameOk(Boolean(json.available)))
        .catch(() => setNameOk(null))
    }, 280)
    return () => {
      controller.abort()
      window.clearTimeout(t)
    }
  }, [name, address, editing])

  if (!isConnected || !address) {
    return (
      <div className={cn("product-surface p-5", className)}>
        <p className="text-sm text-muted-foreground">Connect to set your name.</p>
      </div>
    )
  }

  const onSave = async () => {
    const cleaned = normalizeProfileName(name)
    if (!cleaned) {
      toast.error("Invalid name")
      return
    }
    if (nameOk === false) {
      toast.error("Name taken")
      return
    }

    setSaving(true)
    try {
      const updatedAt = Date.now()
      const message = profileSignMessage({
        address,
        name: cleaned,
        avatarId,
        allowReceive,
        updatedAt,
      })
      const signature = await signMessageAsync({ message })
      const res = await fetch("/api/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          name: cleaned,
          avatarId,
          allowReceive,
          updatedAt,
          signature,
        }),
      })
      const json = (await res.json()) as { profile?: UserProfile; error?: string }
      if (!res.ok || !json.profile) {
        throw new Error(json.error || "Could not save")
      }
      writeLocalProfile(json.profile)
      onSaved?.(json.profile)
      setEditing(false)
      toast.success("Saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const onCancel = () => {
    setName(initial.name)
    setAvatarId(initial.avatarId)
    setAllowReceive(initial.allowReceive)
    setEditing(false)
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070707]",
        !initial.name && "border-[#ccff00]/25",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(204,255,0,0.14),transparent_55%)]"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit avatar"
            className="relative shrink-0 rounded-full transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50"
          >
            <UserAvatar
              address={address}
              avatarId={editing ? avatarId : initial.avatarId}
              name={initial.name || name}
              size={88}
              className="size-[72px] sm:size-[88px] ring-2 ring-[#ccff00]/25"
            />
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex size-7 items-center justify-center rounded-full border border-white/15 bg-[#111] text-[#ccff00] shadow-lg">
              <Pencil className="size-3" />
            </span>
          </button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ccff00]/80">
              Account
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {initial.name || "Set your name"}
              </h1>
              <button
                type="button"
                aria-label="Edit name"
                onClick={() => setEditing(true)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:border-[#ccff00]/50 hover:text-[#ccff00]"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 font-mono text-xs text-white/40">{shortAddr(address)}</p>
            {savedPath ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link href={savedPath} className="text-xs text-[#ccff00] hover:underline">
                  @{profileSlug(initial.name)}
                </Link>
                <ShareButton
                  path={savedPath}
                  title={`${initial.name} on Sherhood`}
                  text={`Check out ${initial.name} on Sherhood`}
                  label="Share"
                  size="sm"
                  compact
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/45">
                Set a unique name so others can find you.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {stats?.xp != null && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/70">
                  {stats.xp} XP
                </span>
              )}
              {stats?.streak != null && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/70">
                  {stats.streak}
                </span>
              )}
              {stats?.sherds != null && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/70">
                  {stats.sherds} Sherds
                </span>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/55 transition hover:border-[#ccff00]/40 hover:text-[#ccff00]"
              >
                Receive {initial.allowReceive ? "On" : "Off"}
                <Pencil className="size-2.5" />
              </button>
            </div>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {editing && (
        <div className="relative border-t border-white/[0.08] bg-black/30 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Edit identity</h2>
              <Tip text="Unique public name used in your profile URL. Opt in to receive assets from others." />
            </div>
            <Image
              src={PROFILE_AVATARS[avatarId]?.src ?? PROFILE_AVATARS[0].src}
              alt=""
              width={40}
              height={40}
              className="rounded-full border border-[#333333]"
              unoptimized
            />
          </div>

          <label className="mt-4 block max-w-md">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Unique name
              <Tip text="2–24 characters. Letters, numbers, spaces, _ . - Becomes your /u/ link." />
            </span>
            <input
              value={name}
              maxLength={PROFILE_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="Neon Archer"
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
            />
            <p
              className={cn(
                "mt-1.5 text-xs",
                nameOk === false ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {slugPreview ? `@${slugPreview}` : "—"}
              {nameOk === false ? " · taken" : nameOk === true ? " · available" : ""}
            </p>
          </label>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Avatar
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
              {PROFILE_AVATARS.map((av) => {
                const selected = av.id === avatarId
                return (
                  <button
                    key={av.id}
                    type="button"
                    aria-label={av.label}
                    aria-pressed={selected}
                    onClick={() => setAvatarId(av.id)}
                    className={cn(
                      "rounded-full border p-0.5 transition",
                      selected
                        ? "border-[#ccff00] ring-2 ring-[#ccff00]/35"
                        : "border-[#333333] hover:border-[#666666]"
                    )}
                  >
                    <Image
                      src={av.src}
                      alt=""
                      width={44}
                      height={44}
                      className="rounded-full"
                      unoptimized
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <label
            className="mt-5 flex max-w-md cursor-pointer items-center gap-3 rounded-xl border border-[#333333] px-4 py-3"
            title="Show your wallet so others can send you Sherds, USDG, or ETH"
          >
            <input
              type="checkbox"
              checked={allowReceive}
              onChange={(e) => setAllowReceive(e.target.checked)}
              className="size-4 accent-[#ccff00]"
            />
            <span className="flex items-center gap-1.5 text-sm font-medium">
              Allow receive
              <Tip text="Shows your wallet for sends. Off = name only." />
            </span>
          </label>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saving || signing || nameOk === false}
              onClick={onSave}
            >
              {saving || signing ? "Confirm…" : "Save"}
            </Button>
            {initial.name ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving || signing}
                onClick={onCancel}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
