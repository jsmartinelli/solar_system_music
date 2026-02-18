/**
 * Audio-related type definitions
 */

import { MusicalKey, MusicalMode, ScaleDegree } from './celestial';

/**
 * Configuration for the audio engine
 */
export interface AudioConfig {
  maxPolyphony: number; // Maximum simultaneous voices (20 planets)
  maxSatellites: number; // Maximum total satellites (100)
  volumeMin: number; // Minimum volume (1%)
  volumeMax: number; // Maximum volume (100%)
}

/**
 * Result of converting a scale degree to an actual note
 */
export interface NoteConversion {
  note: string; // e.g., "C4", "G3"
  frequency: number; // Hz
  midiNumber: number;
}

/**
 * Audio context for a specific musical key and mode
 */
export interface MusicalContext {
  key: MusicalKey;
  mode: MusicalMode;
  bpm: number;
  scale: string[]; // Array of note names in the scale
}

/**
 * Trigger event when a satellite passes the 12 o'clock position
 */
export interface NoteTriggerEvent {
  satelliteId: string;
  planetId: string;
  note: string;
  volume: number; // 0-1 based on distance
  timestamp: number;
}
