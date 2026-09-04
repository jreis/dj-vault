import type { Track } from "../types"

/**
 * BPM detection using Web Audio API
 * For YouTube videos, we estimate BPM from genre and era
 */

// Genre-based BPM ranges (average BPM for each genre)
const GENRE_BPM_RANGES: Record<string, { min: number; max: number; avg: number }> = {
  "Metal": { min: 120, max: 180, avg: 140 },
  "Grunge": { min: 80, max: 140, avg: 110 },
  "Punk": { min: 150, max: 220, avg: 180 },
  "Alternative": { min: 90, max: 140, avg: 115 },
  "Hard Rock": { min: 110, max: 160, avg: 130 },
  "Nu Metal": { min: 100, max: 150, avg: 125 },
  "Classic Rock": { min: 90, max: 140, avg: 115 },
  "Jazz": { min: 60, max: 220, avg: 140 },
  "Other": { min: 80, max: 160, avg: 120 },
}

// Known BPMs for seed tracks (to be expanded)
const KNOWN_BPMS: Record<string, number> = {
  // Metallica
  "Enter Sandman": 123,
  "Master of Puppets": 212,
  "One": 115,

  // Nirvana
  "Smells Like Teen Spirit": 116,
  "Come As You Are": 119,
  "Heart-Shaped Box": 85,

  // Rage Against the Machine
  "Killing in the Name": 103,
  "Bulls on Parade": 84,

  // Tool
  "Schism": 121,
  "Sober": 70,

  // System of a Down
  "Chop Suey!": 128,
  "Toxicity": 158,

  // Ghost
  "Square Hammer": 132,
  "Cirice": 117,
}

/**
 * Estimate BPM for a track based on known data, genre, and era
 */
export function estimateBPM(track: Track): number {
  // Check if we have a known BPM for this specific track
  const knownBPM = KNOWN_BPMS[track.title]
  if (knownBPM) return knownBPM

  // Otherwise, estimate based on genre with some randomization for variety
  const range = GENRE_BPM_RANGES[track.genre] || GENRE_BPM_RANGES["Other"]

  // Add era-based adjustment (older music tends to be slower)
  let eraModifier = 0
  if (track.era === "50s") eraModifier = -8
  if (track.era === "60s") eraModifier = -6
  if (track.era === "70s") eraModifier = -5
  if (track.era === "80s") eraModifier = -2
  if (track.era === "00s") eraModifier = 2
  if (track.era === "10s") eraModifier = 3
  if (track.era === "20s") eraModifier = 5

  // Generate a consistent "random" BPM based on track ID
  // This ensures the same track always gets the same estimated BPM
  const seed = track.id.split("_").reduce((acc, part) => {
    return acc + part.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  }, 0)

  const variance = ((seed % 20) - 10) // -10 to +10
  const estimatedBPM = Math.round(range.avg + eraModifier + variance)

  // Clamp to reasonable range
  return Math.max(60, Math.min(240, estimatedBPM))
}

/**
 * Check if two tracks have compatible BPMs for smooth mixing
 * Tracks within 10% BPM difference mix well
 */
export function areCompatibleBPMs(bpm1: number, bpm2: number): boolean {
  const difference = Math.abs(bpm1 - bpm2)
  const tolerance = Math.max(bpm1, bpm2) * 0.1
  return difference <= tolerance
}

/**
 * Get BPM compatibility rating between two tracks
 * Returns 0-100 score (100 = perfect match)
 */
export function getBPMCompatibility(bpm1: number, bpm2: number): number {
  const difference = Math.abs(bpm1 - bpm2)
  const maxBPM = Math.max(bpm1, bpm2)
  const percentDiff = (difference / maxBPM) * 100

  if (percentDiff === 0) return 100
  if (percentDiff <= 5) return 95
  if (percentDiff <= 10) return 80
  if (percentDiff <= 15) return 60
  if (percentDiff <= 20) return 40
  if (percentDiff <= 30) return 20
  return 0
}

/**
 * Calculate ideal crossfade duration based on BPMs
 * More similar BPMs can have longer, smoother fades
 */
export function getIdealCrossfadeDuration(bpm1: number, bpm2: number): number {
  const compatibility = getBPMCompatibility(bpm1, bpm2)

  // 2-8 seconds based on compatibility
  if (compatibility >= 90) return 8000 // Very compatible - long smooth fade
  if (compatibility >= 70) return 6000
  if (compatibility >= 50) return 4000
  if (compatibility >= 30) return 3000
  return 2000 // Quick fade for incompatible BPMs
}
