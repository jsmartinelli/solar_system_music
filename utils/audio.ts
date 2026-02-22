import type { NoteDuration } from '@/types/celestial';

/**
 * Minimum volume (1%) - satellites are never completely silent.
 */
export const VOLUME_MIN = 0.01;

/**
 * Maximum volume (100%).
 */
export const VOLUME_MAX = 1.0;

/**
 * Maximum distance at which a satellite is at minimum volume.
 * Beyond this distance, volume is clamped to VOLUME_MIN.
 */
export const MAX_AUDIBLE_DISTANCE = 600;

/**
 * Maps satellite distance from its parent planet to a volume scalar (0.01–1.0).
 *
 * Volume falls off linearly with distance:
 *   - distance = 0 → volume = 1.0 (max)
 *   - distance = MAX_AUDIBLE_DISTANCE → volume = 0.01 (min)
 *   - distance > MAX_AUDIBLE_DISTANCE → volume = 0.01 (clamped)
 *
 * Volume is never zero (satellites are always at least 1% volume).
 *
 * @param distance - Pixel distance from satellite to parent planet center
 * @param maxDistance - Distance at which volume reaches minimum (default 600)
 * @returns Volume scalar in range [0.01, 1.0]
 */
export function distanceToVolume(
  distance: number,
  maxDistance: number = MAX_AUDIBLE_DISTANCE
): number {
  if (distance <= 0) return VOLUME_MAX;
  if (maxDistance <= 0) return VOLUME_MIN;

  const normalized = Math.min(distance / maxDistance, 1);
  // Linear interpolation from VOLUME_MAX to VOLUME_MIN
  const volume = VOLUME_MAX - normalized * (VOLUME_MAX - VOLUME_MIN);
  return Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, volume));
}

/**
 * Converts a Tone.js-compatible volume in decibels to a linear scalar.
 * 0 dB = 1.0, -20 dB ≈ 0.1, -60 dB ≈ 0.001
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Converts a linear volume scalar (0–1) to decibels.
 * Clamps to -60 dB minimum to avoid -Infinity for zero.
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -60;
  return 20 * Math.log10(linear);
}

/**
 * Note duration names to their beat multiplier relative to a quarter note.
 * A whole note = 4 beats, sixteenth = 0.25 beats.
 */
export const DURATION_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

/**
 * Tone.js note duration string for each NoteDuration.
 * These match Tone.js Transport time notation.
 */
export const DURATION_TONE_STRING: Record<NoteDuration, string> = {
  whole: '1n',
  half: '2n',
  quarter: '4n',
  eighth: '8n',
  sixteenth: '16n',
};

/**
 * Converts a NoteDuration and BPM to a duration in milliseconds.
 *
 * @param duration - Note duration type
 * @param bpm - Beats per minute
 * @returns Duration in milliseconds
 */
export function noteDurationToMs(duration: NoteDuration, bpm: number): number {
  if (bpm <= 0) return 0;
  const beats = DURATION_BEATS[duration];
  const msPerBeat = 60000 / bpm;
  return beats * msPerBeat;
}

/**
 * Converts a NoteDuration and BPM to a duration in seconds.
 */
export function noteDurationToSeconds(
  duration: NoteDuration,
  bpm: number
): number {
  return noteDurationToMs(duration, bpm) / 1000;
}

/**
 * Returns the Tone.js transport time string for a given note duration.
 * e.g. noteDurationToToneString('quarter') => '4n'
 */
export function noteDurationToToneString(duration: NoteDuration): string {
  return DURATION_TONE_STRING[duration];
}

/**
 * Clamps volume to the valid range [VOLUME_MIN, VOLUME_MAX].
 */
export function clampVolume(volume: number): number {
  return Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, volume));
}
