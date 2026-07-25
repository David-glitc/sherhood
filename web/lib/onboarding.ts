/** Client-side onboarding + profile-setup flags (localStorage / session). */

export const ONBOARDING_STORAGE_KEY = "sherhood.onboarding.v1"
export const PROFILE_PROMPT_SESSION_KEY = "sherhood.profilePrompt.dismissed"
/** Session flag: dwell mint modal already shown/dismissed. */
export const DWELL_MINT_SESSION_KEY = "sherhood.dwellMint.dismissed"

export type OnboardingState = "pending" | "done" | "skipped"

export function readOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return "pending"
  try {
    const v = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (v === "done" || v === "skipped") return v
  } catch {
    /* private mode */
  }
  return "pending"
}

export function writeOnboardingState(state: "done" | "skipped") {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, state)
  } catch {
    /* ignore */
  }
}

export function isProfilePromptDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(PROFILE_PROMPT_SESSION_KEY) === "1"
  } catch {
    return false
  }
}

export function dismissProfilePromptSession() {
  try {
    sessionStorage.setItem(PROFILE_PROMPT_SESSION_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function profileLooksComplete(profile: { name?: string | null } | null | undefined): boolean {
  return Boolean(profile?.name?.trim())
}
