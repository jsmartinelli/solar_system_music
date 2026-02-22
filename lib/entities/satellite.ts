import type { Satellite, Planet } from '@/types/celestial';
import { angleFromTop } from '@/utils/physics';
import { distanceToVolume } from '@/utils/audio';
import { orbitalPeriod } from '@/utils/physics';

export const MAX_SATELLITES = 100;
export const SATELLITE_VISUAL_RADIUS = 3;

/** How quickly the trigger pulse decays each millisecond (0–1 per ms). */
const PULSE_DECAY_RATE = 0.004;

let nextSatelliteId = 1;

export interface CreateSatelliteOptions {
  parentPlanetId: string;
  /** World-space position of the parent planet at placement time */
  parentPosition: { x: number; y: number };
  /** Distance from the parent planet centre in world units */
  orbitRadius: number;
  /** Starting angle in radians (0 = right, measured counter-clockwise in standard math coords) */
  startAngle?: number;
}

/**
 * Creates a Satellite entity.
 *
 * Satellites use a kinematic (purely mathematical) circular orbit rather than
 * a physics body — they are constrained to a circle around their parent planet.
 * This guarantees stable circular orbits regardless of physics chaos happening
 * to the planet itself.
 *
 * Orbital period follows Kepler's third law via `orbitalPeriod()`, so satellites
 * placed farther from the planet orbit more slowly.
 */
export function createSatellite(options: CreateSatelliteOptions): Satellite {
  const {
    parentPlanetId,
    parentPosition,
    orbitRadius,
    startAngle = 0,
  } = options;

  // Angular velocity (radians per ms) derived from orbital period
  // Use a representative planet mass for the period calculation.
  // The actual speed is tuned so satellites at radius ~30 orbit in ~3 seconds,
  // giving musically useful trigger rates.
  const periodMs = orbitPeriodMs(orbitRadius);
  const orbitSpeed = (2 * Math.PI) / periodMs; // radians per ms

  const position = {
    x: parentPosition.x + Math.cos(startAngle) * orbitRadius,
    y: parentPosition.y + Math.sin(startAngle) * orbitRadius,
  };

  return {
    id: `satellite-${nextSatelliteId++}`,
    type: 'satellite',
    parentPlanetId,
    position,
    orbitRadius,
    orbitAngle: startAngle,
    orbitSpeed,
    lastTriggerAngle: startAngle,
    physicsBody: null, // kinematic — no physics body needed
  };
}

/**
 * Computes the orbital period in milliseconds for a satellite at a given radius.
 * Tuned so radius-30 ≈ 3 000 ms, radius-60 ≈ 8 485 ms (Kepler T ∝ r^1.5).
 */
export function orbitPeriodMs(orbitRadius: number): number {
  // T = 3000 * (r / 30) ^ 1.5  ms
  return 3000 * Math.pow(orbitRadius / 30, 1.5);
}

export interface SatelliteUpdateResult {
  satellite: Satellite;
  /** True if the satellite crossed the 12 o'clock position this tick */
  triggered: boolean;
  /** Volume to play at (0.01–1.0), based on distance from planet */
  triggerVolume: number;
}

/**
 * Updates a satellite for one simulation tick.
 *
 * - Advances the orbit angle by orbitSpeed × deltaMs
 * - Constrains position to a circle around the (current) parent planet position
 * - Detects when the satellite crosses 12 o'clock (top of orbit)
 * - Returns the trigger event and volume if triggered
 *
 * @param satellite - Current satellite state
 * @param parentPosition - Current world position of the parent planet
 * @param deltaMs - Time elapsed this tick in milliseconds
 */
export function updateSatellite(
  satellite: Satellite,
  parentPosition: { x: number; y: number },
  deltaMs: number
): SatelliteUpdateResult {
  // Advance angle
  const newAngle = satellite.orbitAngle + satellite.orbitSpeed * deltaMs;

  // Constrain to circle around current parent position
  const newPosition = {
    x: parentPosition.x + Math.cos(newAngle) * satellite.orbitRadius,
    y: parentPosition.y + Math.sin(newAngle) * satellite.orbitRadius,
  };

  // 12 o'clock detection: angle-from-top crosses zero
  // angleFromTop returns 0 when satellite is directly above the parent
  const prevTop = angleFromTop(parentPosition, satellite.position);
  const currTop = angleFromTop(parentPosition, newPosition);

  const triggered = didCrossTop(prevTop, currTop);
  const triggerVolume = distanceToVolume(satellite.orbitRadius);

  const updatedSatellite: Satellite = {
    ...satellite,
    position: newPosition,
    orbitAngle: newAngle,
    lastTriggerAngle: triggered ? newAngle : satellite.lastTriggerAngle,
  };

  return { satellite: updatedSatellite, triggered, triggerVolume };
}

/**
 * Detects whether the satellite crossed 12 o'clock (angleFromTop = 0)
 * between the previous and current tick.
 *
 * angleFromTop is in [0, 2π), going clockwise from the top.
 * A crossing happens when the value wraps from near 2π back toward 0.
 */
export function didCrossTop(prevTop: number, currTop: number): boolean {
  // Wrap-around crossing: previous was near 2π, current is near 0
  const TWO_PI = Math.PI * 2;
  // Allow a window of ±0.3 rad around top to catch crossings at any frame rate
  const WINDOW = 0.3;

  // Case 1: normal progression through top (prev < WINDOW and curr wraps around)
  if (prevTop > TWO_PI - WINDOW && currTop < WINDOW) return true;

  // Case 2: crossed while going through [2π-WINDOW, WINDOW] without wrapping
  if (prevTop > WINDOW && currTop <= WINDOW) return true;

  return false;
}

/**
 * Decays a trigger pulse value toward 0 over time.
 * Pulse starts at 1.0 on trigger and fades to 0 over ~250ms.
 *
 * @param currentPulse - Current pulse value (0–1)
 * @param deltaMs - Time elapsed in milliseconds
 */
export function decayPulse(currentPulse: number, deltaMs: number): number {
  return Math.max(0, currentPulse - PULSE_DECAY_RATE * deltaMs);
}

/**
 * Returns the volume (0.01–1.0) a satellite should play at, based on its
 * distance from its parent planet.
 */
export function satelliteVolume(orbitRadius: number): number {
  return distanceToVolume(orbitRadius);
}

/**
 * Resets the satellite ID counter (for testing).
 */
export function resetSatelliteIdCounter(): void {
  nextSatelliteId = 1;
}
