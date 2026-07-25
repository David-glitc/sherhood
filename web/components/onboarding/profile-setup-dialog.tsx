"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useAccount, useSignMessage } from "wagmi"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useProfiles } from "@/hooks/use-profiles"
import {
  PROFILE_AVATARS,
  PROFILE_NAME_MAX,
  defaultAvatarId,
  normalizeProfileName,
  profileSignMessage,
  profileSlug,
  writeLocalProfile,
  type UserProfile,
} from "@/lib/user-profile"
import {
  dismissProfilePromptSession,
  isProfilePromptDismissed,
  profileLooksComplete,
  readOnboardingState,
} from "@/lib/onboarding"
import { cn } from "@/lib/utils"

type ProfileSetupDialogProps = {
  /** When true, wait until walkthrough is finished/skipped before showing. */
  waitForOnboarding?: boolean
  onSaved?: (profile: UserProfile) => void
}

export function ProfileSetupDialog({
  waitForOnboarding = true,
  onSaved,
}: ProfileSetupDialogProps) {
  const { address, isConnected } = useAccount()
  const { get, upsertLocal } = useProfiles(address ? [address] : [])
  const { signMessageAsync, isPending: signing } = useSignMessage()

  const profile = address ? get(address) : null
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [avatarId, setAvatarId] = useState(0)
  const [allowReceive, setAllowReceive] = useState(false)
  const [nameOk, setNameOk] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(!waitForOnboarding)

  useEffect(() => {
    if (!waitForOnboarding) {
      setReady(true)
      return
    }
    const tick = () => {
      const state = readOnboardingState()
      setReady(state !== "pending")
    }
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [waitForOnboarding])

  useEffect(() => {
    if (!isConnected || !address || !ready) {
      setOpen(false)
      return
    }
    if (profileLooksComplete(profile) || isProfilePromptDismissed()) {
      setOpen(false)
      return
    }
    setAvatarId(profile?.avatarId ?? defaultAvatarId(address))
    setName(profile?.name ?? "")
    setAllowReceive(profile?.allowReceive ?? false)
    setOpen(true)
  }, [isConnected, address, profile, ready])

  useEffect(() => {
    if (!address || !name.trim() || !open) {
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
  }, [name, address, open])

  const onLater = () => {
    dismissProfilePromptSession()
    setOpen(false)
  }

  const onSave = async () => {
    if (!address) return
    const cleaned = normalizeProfileName(name)
    if (!cleaned) {
      toast.error("Pick a valid name")
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
      if (!res.ok || !json.profile) throw new Error(json.error || "Could not save")
      writeLocalProfile(json.profile)
      upsertLocal(json.profile)
      onSaved?.(json.profile)
      setOpen(false)
      toast.success("Profile ready")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const slugPreview = profileSlug(name)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onLater()
      }}
    >
      <DialogContent
        className="border-border bg-[#080808] sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader className="text-left">
          <DialogTitle>Finish your profile</DialogTitle>
          <DialogDescription>
            Choose a unique name and hood before others can find you on People and Send.
          </DialogDescription>
        </DialogHeader>

        <label className="mt-1 block">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Unique name
          </span>
          <input
            value={name}
            maxLength={PROFILE_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Neon Archer"
            className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:border-[#ccff00]/50"
            autoFocus
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

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Hood
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
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

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#333333] px-4 py-3">
          <input
            type="checkbox"
            checked={allowReceive}
            onChange={(e) => setAllowReceive(e.target.checked)}
            className="size-4 accent-[#ccff00]"
          />
          <span className="text-sm font-medium">Allow receive from others</span>
        </label>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            disabled={saving || signing || nameOk === false || !name.trim()}
            onClick={onSave}
            className="flex-1"
          >
            {saving || signing ? "Confirm in wallet…" : "Save profile"}
          </Button>
          <Button type="button" variant="ghost" disabled={saving || signing} onClick={onLater}>
            Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
