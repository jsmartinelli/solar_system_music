/**
 * Core type definitions for celestial bodies in the solar system music sequencer
 */

import { Body as MatterBody } from 'matter-js';

/**
 * 2D Vector representing position or velocity
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Musical scale degrees (I-VII) with octave specification
 * Examples: "I4", "V3", "VII5"
 */
export type ScaleDegree = string;

/**
 * Musical keys supported by the application
 */
export type MusicalKey =
  | 'C'
  | 'C#'
  | 'D'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'Ab'
  | 'A'
  | 'Bb'
  | 'B';

/**
 * Musical modes supported by the application
 */
export type MusicalMode =
  | 'Ionian' // Major
  | 'Dorian'
  | 'Phrygian'
  | 'Lydian'
  | 'Mixolydian'
  | 'Aeolian' // Minor
  | 'Locrian';

/**
 * Note duration options for planet rotation
 */
export type NoteDuration =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth';

/**
 * Star entity - the central gravitational body that sets the musical context
 */
export interface Star {
  id: string;
  type: 'star';
  position: Vector2D;
  mass: number;
  bpm: number; // Beats per minute
  key: MusicalKey;
  mode: MusicalMode;
  physicsBody: MatterBody | null;
}

/**
 * Planet entity - orbits the star and produces musical notes
 */
export interface Planet {
  id: string;
  type: 'planet';
  position: Vector2D;
  velocity: Vector2D;
  mass: number;
  rotation: number; // Current rotation angle in radians
  rotationSpeed: NoteDuration; // Determines how fast the planet spins (note duration)
  noteSequence: ScaleDegree[]; // Sequence of notes to play (e.g., ["I4", "V3", "VI4"])
  currentNoteIndex: number; // Index in noteSequence
  synthType: string; // Tone.js synth type
  orbitRadius: number; // Distance from star
  orbitAngle: number; // Current angle around star in radians
  physicsBody: MatterBody | null;
}

/**
 * Satellite entity - orbits a planet and triggers notes
 */
export interface Satellite {
  id: string;
  type: 'satellite';
  parentPlanetId: string; // ID of the planet this satellite orbits
  position: Vector2D;
  orbitRadius: number; // Distance from parent planet
  orbitAngle: number; // Current angle around planet in radians
  orbitSpeed: number; // Angular velocity (calculated from physics)
  lastTriggerAngle: number; // Last angle where note was triggered
  physicsBody: MatterBody | null;
}

/**
 * Complete solar system state
 */
export interface SolarSystem {
  star: Star | null;
  planets: Planet[];
  satellites: Satellite[];
  isPlaying: boolean;
  timeScale: number; // Physics time multiplier (1 = normal speed)
  gravityStrength: number; // Global gravity multiplier
}

/**
 * Serialized state for save/load functionality
 */
export interface SolarSystemState {
  version: string;
  timestamp: number;
  star: Omit<Star, 'physicsBody'> | null;
  planets: Omit<Planet, 'physicsBody'>[];
  satellites: Omit<Satellite, 'physicsBody'>[];
  timeScale: number;
  gravityStrength: number;
}
