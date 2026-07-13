"use client"

import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { Button } from "@/components/ui/button"
import { shortenAddress } from "@/lib/utils"

export function WalletButton() {
  const { setShowAuthFlow, primaryWallet, handleLogOut, sdkHasLoaded } =
    useDynamicContext()

  if (!sdkHasLoaded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-zinc-700 text-xs text-zinc-500"
        disabled
      >
        Loading...
      </Button>
    )
  }

  if (primaryWallet?.address) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-zinc-700 text-xs text-zinc-300"
        onClick={() => handleLogOut()}
      >
        {shortenAddress(primaryWallet.address)}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-zinc-700 text-xs text-zinc-300"
      onClick={() => setShowAuthFlow(true)}
    >
      Connect Wallet
    </Button>
  )
}
