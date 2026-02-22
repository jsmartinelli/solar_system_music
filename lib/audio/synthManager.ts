'use client';

import * as Tone from 'tone';
import { linearToDb } from '@/utils/audio';

/**
 * All supported Tone.js synth type names.
 * Used to populate the planet synth type dropdown.
 */
export const SYNTH_TYPES = [
  'Synth',
  'AMSynth',
  'FMSynth',
  'DuoSynth',
  'MonoSynth',
  'MembraneSynth',
  'MetalSynth',
  'PluckSynth',
  'NoiseSynth',
] as const;

export type SynthType = (typeof SYNTH_TYPES)[number];

/**
 * Union of all usable polyphonic synth instances.
 * NoiseSynth and MembraneSynth/MetalSynth don't support note names directly,
 * so they're wrapped in PolySynth where applicable.
 */
export type AnySynth =
  | Tone.PolySynth
  | Tone.PluckSynth
  | Tone.NoiseSynth
  | Tone.MembraneSynth
  | Tone.MetalSynth;

export interface SynthInstance {
  id: string; // planet ID
  synth: AnySynth;
  synthType: SynthType;
  volume: Tone.Volume;
}

export interface SynthManager {
  instances: Map<string, SynthInstance>;
  maxInstances: number;
}

/**
 * Creates a new SynthManager that tracks up to maxInstances synths.
 */
export function createSynthManager(maxInstances: number = 20): SynthManager {
  return {
    instances: new Map(),
    maxInstances,
  };
}

/**
 * Creates a Tone.js synth of the given type, connected to a Volume node
 * which is connected to the master output.
 *
 * @param synthType - The type of synth to create
 * @param volumeLinear - Initial volume scalar (0–1)
 */
function createSynth(
  synthType: SynthType,
  volumeLinear: number = 1
): { synth: AnySynth; volume: Tone.Volume } {
  const volumeNode = new Tone.Volume(linearToDb(volumeLinear)).toDestination();

  let synth: AnySynth;

  switch (synthType) {
    case 'AMSynth':
      synth = new Tone.PolySynth(Tone.AMSynth).connect(volumeNode);
      break;
    case 'FMSynth':
      synth = new Tone.PolySynth(Tone.FMSynth).connect(volumeNode);
      break;
    case 'DuoSynth':
      synth = new Tone.PolySynth(Tone.DuoSynth).connect(volumeNode);
      break;
    case 'MonoSynth':
      synth = new Tone.PolySynth(Tone.MonoSynth).connect(volumeNode);
      break;
    case 'MembraneSynth':
      synth = new Tone.MembraneSynth().connect(volumeNode);
      break;
    case 'MetalSynth':
      synth = new Tone.MetalSynth().connect(volumeNode);
      break;
    case 'PluckSynth':
      synth = new Tone.PluckSynth().connect(volumeNode);
      break;
    case 'NoiseSynth':
      synth = new Tone.NoiseSynth().connect(volumeNode);
      break;
    case 'Synth':
    default:
      synth = new Tone.PolySynth(Tone.Synth).connect(volumeNode);
      break;
  }

  return { synth, volume: volumeNode };
}

/**
 * Adds a synth instance for a planet. Does nothing if the planet already
 * has a synth or if the limit has been reached.
 *
 * @param manager - The SynthManager
 * @param planetId - Unique planet ID
 * @param synthType - Synth type name
 * @param volumeLinear - Initial volume (0–1)
 * @returns The created SynthInstance, or null if limit reached
 */
export function addSynth(
  manager: SynthManager,
  planetId: string,
  synthType: SynthType,
  volumeLinear: number = 1
): SynthInstance | null {
  if (manager.instances.has(planetId)) {
    return manager.instances.get(planetId)!;
  }

  if (manager.instances.size >= manager.maxInstances) {
    return null;
  }

  const { synth, volume } = createSynth(synthType, volumeLinear);
  const instance: SynthInstance = {
    id: planetId,
    synth,
    synthType,
    volume,
  };

  manager.instances.set(planetId, instance);
  return instance;
}

/**
 * Removes and disposes a synth instance for a planet.
 */
export function removeSynth(manager: SynthManager, planetId: string): void {
  const instance = manager.instances.get(planetId);
  if (!instance) return;

  instance.synth.dispose();
  instance.volume.dispose();
  manager.instances.delete(planetId);
}

/**
 * Triggers a note on a planet's synth.
 *
 * @param manager - The SynthManager
 * @param planetId - The planet whose synth should play
 * @param note - Note name with octave, e.g. "C4"
 * @param durationSeconds - How long to hold the note
 * @param volumeLinear - Volume at which to play (0–1), overrides the channel volume
 */
export function triggerNote(
  manager: SynthManager,
  planetId: string,
  note: string,
  durationSeconds: number,
  volumeLinear: number = 1
): void {
  const instance = manager.instances.get(planetId);
  if (!instance) return;

  // Update the volume node
  instance.volume.volume.value = linearToDb(Math.max(0.01, volumeLinear));

  const synth = instance.synth;
  const now = Tone.now();

  // NoiseSynth and MetalSynth don't accept note names
  if (synth instanceof Tone.NoiseSynth || synth instanceof Tone.MetalSynth) {
    synth.triggerAttackRelease(durationSeconds, now);
  } else if (synth instanceof Tone.MembraneSynth) {
    synth.triggerAttackRelease(note, durationSeconds, now);
  } else if (synth instanceof Tone.PluckSynth) {
    synth.triggerAttack(note, now);
  } else {
    // PolySynth variants
    (synth as Tone.PolySynth).triggerAttackRelease(note, durationSeconds, now);
  }
}

/**
 * Updates the volume of an existing synth instance.
 */
export function setSynthVolume(
  manager: SynthManager,
  planetId: string,
  volumeLinear: number
): void {
  const instance = manager.instances.get(planetId);
  if (!instance) return;
  instance.volume.volume.value = linearToDb(Math.max(0.01, volumeLinear));
}

/**
 * Returns true if the manager has reached its synth limit.
 */
export function isAtLimit(manager: SynthManager): boolean {
  return manager.instances.size >= manager.maxInstances;
}

/**
 * Returns the number of active synth instances.
 */
export function getSynthCount(manager: SynthManager): number {
  return manager.instances.size;
}

/**
 * Disposes all synth instances and clears the manager.
 */
export function disposeAll(manager: SynthManager): void {
  for (const instance of manager.instances.values()) {
    instance.synth.dispose();
    instance.volume.dispose();
  }
  manager.instances.clear();
}

/**
 * Returns whether a given string is a valid SynthType.
 */
export function isValidSynthType(value: string): value is SynthType {
  return (SYNTH_TYPES as readonly string[]).includes(value);
}
