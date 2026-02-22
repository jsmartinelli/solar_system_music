import Matter from 'matter-js';
import type { Planet, Star, NoteDuration } from '@/types/celestial';
import { createCelestialBody } from '@/lib/physics/collisions';
import { circularOrbitVelocity, orbitalAngle } from '@/utils/physics';
import { planetRadiusFromMass } from '@/lib/rendering/renderer';
import { parseNoteSequence, scaleDegreeToNote } from '@/lib/audio/scales';
import { noteDurationToSeconds } from '@/utils/audio';
import type { SynthType } from '@/lib/audio/synthManager';

export const PLANET_DEFAULT_NOTE_SEQUENCE = 'I4 III4 V4 VII4';
export const PLANET_DEFAULT_ROTATION_SPEED: NoteDuration = 'quarter';
export const PLANET_DEFAULT_SYNTH_TYPE: SynthType = 'Synth';
export const PLANET_DEFAULT_MASS = 100;
export const MAX_PLANETS = 20;

let nextPlanetId = 1;

export interface CreatePlanetOptions {
  x: number;
  y: number;
  mass?: number;
  rotationSpeed?: NoteDuration;
  noteSequence?: string; // space-separated scale degrees e.g. "I4 V3 VI4"
  synthType?: SynthType;
  /** If provided, initial velocity is auto-calculated for a circular orbit. */
  star?: Star;
  gravityStrength?: number;
  clockwise?: boolean;
}

/**
 * Creates a Planet entity with a dynamic Matter.js physics body.
 * If a star is provided, initial velocity is set for a stable circular orbit.
 */
export function createPlanet(options: CreatePlanetOptions): Planet {
  const {
    x,
    y,
    mass = PLANET_DEFAULT_MASS,
    rotationSpeed = PLANET_DEFAULT_ROTATION_SPEED,
    noteSequence = PLANET_DEFAULT_NOTE_SEQUENCE,
    synthType = PLANET_DEFAULT_SYNTH_TYPE,
    star,
    gravityStrength = 1,
    clockwise = true,
  } = options;

  const radius = planetRadiusFromMass(mass);
  const physicsBody = createCelestialBody(x, y, radius, mass);

  // Auto-calculate circular orbit velocity if a star is given
  if (star?.physicsBody) {
    const vel = circularOrbitVelocity(
      star.position,
      { x, y },
      star.mass,
      gravityStrength,
      clockwise
    );
    Matter.Body.setVelocity(physicsBody, vel);
  }

  const starPos = star?.position ?? { x: 0, y: 0 };
  const initialOrbitAngle = orbitalAngle(starPos, { x, y });

  return {
    id: `planet-${nextPlanetId++}`,
    type: 'planet',
    position: { x, y },
    velocity: { x: physicsBody.velocity.x, y: physicsBody.velocity.y },
    mass,
    rotation: 0,
    rotationSpeed,
    noteSequence: parseNoteSequence(noteSequence),
    currentNoteIndex: 0,
    synthType,
    orbitRadius: Math.sqrt((x - starPos.x) ** 2 + (y - starPos.y) ** 2),
    orbitAngle: initialOrbitAngle,
    physicsBody,
  };
}

export interface PlanetUpdateResult {
  planet: Planet;
  /** True if the planet completed a revolution this tick and advanced its note. */
  noteAdvanced: boolean;
  /** The note name to play this tick (if noteAdvanced). */
  newNote: string | null;
}

/**
 * Updates a planet's state for one simulation tick.
 *
 * - Syncs position from the physics body
 * - Advances rotation angle based on BPM and note duration
 * - Tracks orbit angle to detect completed revolutions
 * - Advances note sequence on each completed revolution
 *
 * @param planet - Current planet state
 * @param star - The star this planet orbits (for musical context)
 * @param deltaMs - Time elapsed this tick in milliseconds
 * @returns Updated planet state and whether the note advanced
 */
export function updatePlanet(
  planet: Planet,
  star: Star,
  deltaMs: number
): PlanetUpdateResult {
  if (!planet.physicsBody) {
    return { planet, noteAdvanced: false, newNote: null };
  }

  const body = planet.physicsBody;

  // Sync position from physics
  const newPosition = { x: body.position.x, y: body.position.y };
  const newVelocity = { x: body.velocity.x, y: body.velocity.y };

  // Advance rotation: one full rotation per note duration cycle
  // rotationSpeed defines how long one rotation takes
  const noteDurSec = noteDurationToSeconds(planet.rotationSpeed, star.bpm);
  const rotationDelta =
    noteDurSec > 0 ? (deltaMs / 1000 / noteDurSec) * Math.PI * 2 : 0;
  const newRotation = planet.rotation + rotationDelta;

  // Track orbit angle for revolution detection
  const prevOrbitAngle = planet.orbitAngle;
  const currentOrbitAngle = orbitalAngle(star.position, newPosition);

  // Detect crossing of angle 0 (positive X axis) — one full revolution
  // A revolution is detected when the sign of the angle crosses from negative to positive
  // going in the clockwise direction (y increases downward in screen coords).
  const crossed = didCrossZero(prevOrbitAngle, currentOrbitAngle);

  let noteAdvanced = false;
  let newNote: string | null = null;
  let newNoteIndex = planet.currentNoteIndex;

  if (crossed && planet.noteSequence.length > 0) {
    newNoteIndex = (planet.currentNoteIndex + 1) % planet.noteSequence.length;
    noteAdvanced = true;
    try {
      newNote = scaleDegreeToNote(
        planet.noteSequence[newNoteIndex],
        star.key,
        star.mode
      );
    } catch {
      newNote = null;
    }
  }

  const updatedPlanet: Planet = {
    ...planet,
    position: newPosition,
    velocity: newVelocity,
    rotation: newRotation,
    orbitAngle: currentOrbitAngle,
    currentNoteIndex: newNoteIndex,
  };

  return { planet: updatedPlanet, noteAdvanced, newNote };
}

/**
 * Returns the note name the planet is currently playing.
 */
export function getCurrentNote(planet: Planet, star: Star): string | null {
  if (planet.noteSequence.length === 0) return null;
  try {
    return scaleDegreeToNote(
      planet.noteSequence[planet.currentNoteIndex],
      star.key,
      star.mode
    );
  } catch {
    return null;
  }
}

/**
 * Detects whether an orbit angle crossed the zero line (positive X axis)
 * between the previous and current frame.
 *
 * Handles the wrap-around at ±π.
 */
export function didCrossZero(prevAngle: number, currentAngle: number): boolean {
  // Normalise both angles to [-π, π]
  const norm = (a: number) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  const p = norm(prevAngle);
  const c = norm(currentAngle);

  // Crossed zero going from negative to positive (counter-clockwise in standard coords)
  // or positive to negative (clockwise). We detect both.
  // Specifically: crossed if they're on opposite sides and the arc is small.
  if (Math.sign(p) !== Math.sign(c)) {
    // Make sure the angular step is small (not a large teleport)
    const delta = Math.abs(c - p);
    return delta < Math.PI; // normal crossing, not a wrap-around artifact
  }
  return false;
}

/**
 * Returns a planet with an updated note sequence (parsed from a string).
 */
export function setPlanetNoteSequence(planet: Planet, sequence: string): Planet {
  const parsed = parseNoteSequence(sequence);
  return {
    ...planet,
    noteSequence: parsed,
    currentNoteIndex: 0,
  };
}

/**
 * Returns a planet with updated rotation speed.
 */
export function setPlanetRotationSpeed(
  planet: Planet,
  speed: NoteDuration
): Planet {
  return { ...planet, rotationSpeed: speed };
}

/**
 * Resets the planet ID counter (for testing).
 */
export function resetPlanetIdCounter(): void {
  nextPlanetId = 1;
}
