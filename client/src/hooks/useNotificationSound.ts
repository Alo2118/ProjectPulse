/**
 * useNotificationSound - Plays a notification sound effect.
 * Uses Web Audio API to generate a short chime sound (no external audio file needed).
 * Respects the `soundEnabled` preference from notificationStore.
 * @module hooks/useNotificationSound
 */

import { useCallback, useRef } from 'react'
import { useNotificationStore } from '@stores/notificationStore'

/**
 * Generates a short, pleasant notification chime using the Web Audio API.
 * Two overlapping sine tones create a soft "ding" effect.
 */
function playChime(): void {
  try {
    const ctx = new AudioContext()

    // First tone: E5 (659 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 659.25
    gain1.gain.setValueAtTime(0.15, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.4)

    // Second tone: G5 (784 Hz), slightly delayed
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 783.99
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.08)
    osc2.stop(ctx.currentTime + 0.5)

    // Clean up AudioContext after sounds finish
    setTimeout(() => ctx.close(), 600)
  } catch {
    // Ignore — Web Audio API not supported or autoplay blocked
  }
}

export function useNotificationSound() {
  const soundEnabled = useNotificationStore((s) => s.soundEnabled)
  const lastPlayedRef = useRef(0)

  const playSound = useCallback(() => {
    if (!soundEnabled) return

    // Throttle: don't play more than once per second
    const now = Date.now()
    if (now - lastPlayedRef.current < 1000) return
    lastPlayedRef.current = now

    playChime()
  }, [soundEnabled])

  return { playSound }
}
