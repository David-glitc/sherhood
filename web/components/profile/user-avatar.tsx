"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { avatarSrc, defaultAvatarId } from "@/lib/user-profile"

type UserAvatarProps = {
  address?: string | null
  avatarId?: number | null
  name?: string | null
  size?: number
  className?: string
}

export function UserAvatar({
  address,
  avatarId,
  name,
  size = 32,
  className,
}: UserAvatarProps) {
  const id =
    typeof avatarId === "number"
      ? avatarId
      : address
        ? defaultAvatarId(address)
        : 0
  const label = name || (address ? `${address.slice(0, 6)}…` : "User")

  return (
    <Image
      src={avatarSrc(id)}
      alt={label}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full border border-[#333333] bg-black", className)}
      unoptimized
    />
  )
}
