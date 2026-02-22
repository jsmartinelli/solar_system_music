'use client';

import * as Tone from 'tone';

export type AudioContextState = 'uninitialized' | 'running' | 'suspended';

/**
 * Initializes the Tone.js audio context in response to a user gesture.
 * Web browsers require a user interaction before audio can play.
 * Call this from a click/touch handler.
 *
 * @returns The new audio context state
 */
export async function initAudioContext(): Promise<AudioContextState> {
  await Tone.start();
  return getAudioContextState();
}

/**
 * Returns the current state of the Tone.js audio context.
 */
export function getAudioContextState(): AudioContextState {
  const ctx = Tone.getContext();
  const state = ctx.state;
  if (state === 'running') return 'running';
  if (state === 'suspended') return 'suspended';
  return 'uninitialized';
}

/**
 * Returns true if the audio context is running and ready to produce sound.
 */
export function isAudioReady(): boolean {
  return getAudioContextState() === 'running';
}

/**
 * Sets the BPM on the Tone.js Transport.
 * This is the global clock that governs note durations.
 *
 * @param bpm - Beats per minute (clamped to 1–300)
 */
export function setBpm(bpm: number): void {
  const clamped = Math.max(1, Math.min(300, bpm));
  Tone.getTransport().bpm.value = clamped;
}

/**
 * Returns the current BPM from the Tone.js Transport.
 */
export function getBpm(): number {
  return Tone.getTransport().bpm.value;
}

/**
 * Starts the Tone.js Transport clock.
 * Must be called after initAudioContext().
 */
export function startTransport(): void {
  Tone.getTransport().start();
}

/**
 * Stops the Tone.js Transport clock and resets position to 0.
 */
export function stopTransport(): void {
  Tone.getTransport().stop();
}

/**
 * Pauses the Tone.js Transport clock (can be resumed).
 */
export function pauseTransport(): void {
  Tone.getTransport().pause();
}

/**
 * Sets the master output volume.
 *
 * @param volume - Linear scalar (0.0–1.0)
 */
export function setMasterVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  Tone.getDestination().volume.value = 20 * Math.log10(clamped || 1e-6);
}
