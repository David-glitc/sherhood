/** Soft UI sound effects — Web Audio, no asset files. */

export const SFX_STORAGE_KEY = "sherhood.sfx"

export function isSfxEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const v = localStorage.getItem(SFX_STORAGE_KEY)
    if (v === "0") return false
    return true
  } catch {
    return true
  }
}

export function setSfxEnabled(on: boolean) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SFX_STORAGE_KEY, on ? "1" : "0")
    window.dispatchEvent(new Event("sherhood:sfx"))
  } catch {
    /* ignore */
  }
}

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return null
      audioCtx = new AC()
    }
    if (audioCtx.state === "suspended") void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number
) {
  const ac = ctx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(gainPeak, ac.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ac.currentTime + start + duration
  )
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + duration + 0.02)
}

/** Soft rising chime — mint / fund success. */
export function playMintSound() {
  if (!isSfxEnabled()) return
  tone(523.25, 0, 0.18, "sine", 0.07)
  tone(659.25, 0.08, 0.2, "sine", 0.06)
  tone(783.99, 0.16, 0.28, "triangle", 0.05)
}

/** Soft confirm blip — send success. */
export function playSendSound() {
  if (!isSfxEnabled()) return
  tone(440, 0, 0.12, "sine", 0.055)
  tone(554.37, 0.07, 0.18, "sine", 0.045)
}

/** Pack tear → rarity sting — reveal ritual. */
export function playRevealSound(tier: "common" | "rare" | "epic" | "legendary" = "common") {
  if (!isSfxEnabled()) return
  // Tear scrape
  tone(180, 0, 0.14, "sawtooth", 0.035)
  tone(90, 0.04, 0.18, "triangle", 0.03)
  // Snap
  tone(392, 0.22, 0.1, "square", 0.04)
  // Rarity sting (higher tiers = brighter)
  const peaks: Record<typeof tier, [number, number, number]> = {
    common: [523.25, 659.25, 783.99],
    rare: [587.33, 739.99, 880],
    epic: [659.25, 830.61, 987.77],
    legendary: [783.99, 987.77, 1174.66],
  }
  const [a, b, c] = peaks[tier]
  tone(a, 0.34, 0.22, "sine", 0.07)
  tone(b, 0.42, 0.26, "sine", 0.06)
  tone(c, 0.52, 0.34, "triangle", 0.055)
}
