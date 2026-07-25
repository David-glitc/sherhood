"use client"

import { AppWalkthrough } from "@/components/onboarding/app-walkthrough"
import { DwellMintModal } from "@/components/onboarding/dwell-mint-modal"
import { ProfileSetupDialog } from "@/components/onboarding/profile-setup-dialog"

/** Global first-visit walkthrough + incomplete-profile prompt + dwell mint funnel. */
export function OnboardingHost() {
  return (
    <>
      <AppWalkthrough />
      <ProfileSetupDialog />
      <DwellMintModal />
    </>
  )
}
