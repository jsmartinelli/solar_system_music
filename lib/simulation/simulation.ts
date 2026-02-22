'use client';

import type { Star, Planet, Satellite, SolarSystem } from '@/types/celestial';
import type { SceneObject } from '@/lib/rendering/renderer';
import { createPhysicsEngine, addBody, removeBody, setTimeScale, setGravityStrength } from '@/lib/physics/engine';
import type { PhysicsEngine } from '@/lib/physics/engine';
import { createLoopState, saveInitialState, rewindToStart, pauseLoop, resumeLoop, applyGravity } from '@/lib/physics/loop';
import type { PhysicsLoopState, GravitySource } from '@/lib/physics/loop';
import Matter from 'matter-js';
import { createSynthManager, addSynth, triggerNote, disposeAll, getSynthCount, removeSynth } from '@/lib/audio/synthManager';
import type { SynthManager, SynthType } from '@/lib/audio/synthManager';
import { setBpm } from '@/lib/audio/context';
import { createStar } from '@/lib/entities/star';
import type { CreateStarOptions } from '@/lib/entities/star';
import { createPlanet, updatePlanet, MAX_PLANETS, setPlanetNoteSequence } from '@/lib/entities/planet';
import type { CreatePlanetOptions } from '@/lib/entities/planet';
import { createSatellite, updateSatellite, decayPulse, MAX_SATELLITES } from '@/lib/entities/satellite';
import type { CreateSatelliteOptions } from '@/lib/entities/satellite';
import { planetRadiusFromMass } from '@/lib/rendering/renderer';
import { noteDurationToSeconds } from '@/utils/audio';
import { setupCollisions } from '@/lib/physics/collisions';
import { getCurrentNote } from '@/lib/entities/planet';

export interface SimulationState {
  solarSystem: SolarSystem;
  physicsEngine: PhysicsEngine;
  loopState: PhysicsLoopState;
  synthManager: SynthManager;
  lastTimestamp: number;
  /** Per-satellite trigger pulse values (0–1), keyed by satellite id */
  triggerPulses: Map<string, number>;
}

/**
 * Creates a new, empty simulation state.
 */
export function createSimulation(): SimulationState {
  const physicsEngine = createPhysicsEngine({ gravity: 1, timeScale: 1 });
  const loopState = createLoopState();
  const synthManager = createSynthManager(MAX_PLANETS);

  setupCollisions(physicsEngine.engine);

  return {
    physicsEngine,
    loopState,
    synthManager,
    lastTimestamp: 0,
    triggerPulses: new Map(),
    solarSystem: {
      star: null,
      planets: [],
      satellites: [],
      isPlaying: false,
      timeScale: 1,
      gravityStrength: 1,
    },
  };
}

/**
 * Adds a star to the simulation. Only one star is supported.
 */
export function addStar(
  sim: SimulationState,
  options: CreateStarOptions = {}
): SimulationState {
  const prev = sim.solarSystem.star;
  if (prev?.physicsBody) {
    removeBody(sim.physicsEngine, prev.physicsBody);
  }

  const star = createStar(options);
  if (star.physicsBody) {
    addBody(sim.physicsEngine, star.physicsBody);
  }

  setBpm(star.bpm);

  return {
    ...sim,
    solarSystem: { ...sim.solarSystem, star },
  };
}

/**
 * Adds a planet to the simulation (max 20).
 */
export function addPlanet(
  sim: SimulationState,
  options: CreatePlanetOptions
): SimulationState {
  if (sim.solarSystem.planets.length >= MAX_PLANETS) {
    console.warn('Planet limit reached (20)');
    return sim;
  }

  const planet = createPlanet({
    ...options,
    star: sim.solarSystem.star ?? undefined,
    gravityStrength: sim.solarSystem.gravityStrength,
  });

  if (planet.physicsBody) {
    addBody(sim.physicsEngine, planet.physicsBody);
  }

  addSynth(sim.synthManager, planet.id, planet.synthType as SynthType);

  return {
    ...sim,
    solarSystem: {
      ...sim.solarSystem,
      planets: [...sim.solarSystem.planets, planet],
    },
  };
}

export interface PlanetUpdateOptions {
  mass?: number;
  noteSequence?: string;
  rotationSpeed?: import('@/types/celestial').NoteDuration;
  synthType?: SynthType;
  clockwise?: boolean;
}

/**
 * Updates editable properties of an existing planet in-place.
 * If synthType changes, the old Tone.js synth is disposed and a new one created.
 */
export function updatePlanetProperties(
  sim: SimulationState,
  planetId: string,
  options: PlanetUpdateOptions
): SimulationState {
  const planet = sim.solarSystem.planets.find((p) => p.id === planetId);
  if (!planet) return sim;

  const { noteSequence, synthType, ...rest } = options;

  // Swap synth if type changed
  if (synthType !== undefined && synthType !== planet.synthType) {
    removeSynth(sim.synthManager, planetId);
    addSynth(sim.synthManager, planetId, synthType as SynthType);
  }

  // Apply scalar field updates, then re-parse note sequence if provided
  let updatedPlanet: Planet = {
    ...planet,
    ...rest,
    synthType: synthType ?? planet.synthType,
  };
  if (noteSequence !== undefined) {
    updatedPlanet = setPlanetNoteSequence(updatedPlanet, noteSequence);
  }

  return {
    ...sim,
    solarSystem: {
      ...sim.solarSystem,
      planets: sim.solarSystem.planets.map((p) =>
        p.id === planetId ? updatedPlanet : p
      ),
    },
  };
}

/**
 * Removes a planet and all its satellites from the simulation.
 */
export function removePlanet(
  sim: SimulationState,
  planetId: string
): SimulationState {
  const planet = sim.solarSystem.planets.find((p) => p.id === planetId);
  if (!planet) return sim;

  if (planet.physicsBody) removeBody(sim.physicsEngine, planet.physicsBody);
  removeSynth(sim.synthManager, planetId);

  // Clean up pulse entries for orphaned satellites
  const removedSatelliteIds = sim.solarSystem.satellites
    .filter((s) => s.parentPlanetId === planetId)
    .map((s) => s.id);

  const newPulses = new Map(sim.triggerPulses);
  for (const id of removedSatelliteIds) newPulses.delete(id);

  return {
    ...sim,
    triggerPulses: newPulses,
    solarSystem: {
      ...sim.solarSystem,
      planets: sim.solarSystem.planets.filter((p) => p.id !== planetId),
      satellites: sim.solarSystem.satellites.filter(
        (s) => s.parentPlanetId !== planetId
      ),
    },
  };
}

/**
 * Adds a satellite to a planet (max 100 total across all planets).
 *
 * @param sim - Current simulation state
 * @param options - Satellite creation options (parentPlanetId, orbitRadius, startAngle)
 */
export function addSatellite(
  sim: SimulationState,
  options: Omit<CreateSatelliteOptions, 'parentPosition'>
): SimulationState {
  if (sim.solarSystem.satellites.length >= MAX_SATELLITES) {
    console.warn('Satellite limit reached (100)');
    return sim;
  }

  const planet = sim.solarSystem.planets.find(
    (p) => p.id === options.parentPlanetId
  );
  if (!planet) {
    console.warn(`Planet ${options.parentPlanetId} not found`);
    return sim;
  }

  const satellite = createSatellite({
    ...options,
    parentPosition: planet.position,
  });

  return {
    ...sim,
    solarSystem: {
      ...sim.solarSystem,
      satellites: [...sim.solarSystem.satellites, satellite],
    },
  };
}

/**
 * Removes a satellite from the simulation.
 */
export function removeSatellite(
  sim: SimulationState,
  satelliteId: string
): SimulationState {
  const newPulses = new Map(sim.triggerPulses);
  newPulses.delete(satelliteId);

  return {
    ...sim,
    triggerPulses: newPulses,
    solarSystem: {
      ...sim.solarSystem,
      satellites: sim.solarSystem.satellites.filter(
        (s) => s.id !== satelliteId
      ),
    },
  };
}

/**
 * Advances the simulation by one tick:
 * 1. Applies gravity forces
 * 2. Steps the physics engine
 * 3. Updates planets (revolution tracking, note advancement)
 * 4. Updates satellites (orbit position, 12 o'clock trigger detection)
 * 5. Fires audio for triggered satellites
 * 6. Decays trigger pulse values
 */
export function tickSimulation(
  sim: SimulationState,
  deltaMs: number
): SimulationState {
  if (!sim.solarSystem.isPlaying) return sim;

  const { star, planets, satellites } = sim.solarSystem;
  if (!star) return sim;

  // ── Physics ──────────────────────────────────────────────────────────────

  const gravitySources: GravitySource[] = [];
  if (star.physicsBody) {
    gravitySources.push({ body: star.physicsBody, mass: star.mass });
  }
  for (const planet of planets) {
    if (planet.physicsBody) {
      gravitySources.push({ body: planet.physicsBody, mass: planet.mass });
    }
  }

  // Use fixed sub-steps to keep orbital physics stable regardless of frame rate.
  // A variable deltaMs causes the gravity impulse to be over/under-applied
  // relative to the orbital velocity, which destabilises orbits.
  const FIXED_STEP_MS = 1000 / 60; // ~16.67 ms
  const scaledDelta = deltaMs * sim.solarSystem.timeScale;
  const steps = Math.max(1, Math.round(scaledDelta / FIXED_STEP_MS));
  const stepMs = scaledDelta / steps;

  for (let i = 0; i < steps; i++) {
    applyGravity(sim.physicsEngine, gravitySources, sim.solarSystem.gravityStrength);
    Matter.Engine.update(sim.physicsEngine.engine, stepMs);
  }

  // ── Update planets ────────────────────────────────────────────────────────

  const updatedPlanets: Planet[] = [];

  for (const planet of planets) {
    const { planet: updated, noteAdvanced, newNote } = updatePlanet(
      planet,
      star,
      deltaMs
    );

    if (noteAdvanced && newNote) {
      const durSec = noteDurationToSeconds(updated.rotationSpeed, star.bpm);
      triggerNote(sim.synthManager, planet.id, newNote, durSec, 0.7);
    }

    updatedPlanets.push(updated);
  }

  // ── Update satellites ─────────────────────────────────────────────────────

  const updatedSatellites: Satellite[] = [];
  const newPulses = new Map(sim.triggerPulses);

  for (const satellite of satellites) {
    const parentPlanet = updatedPlanets.find(
      (p) => p.id === satellite.parentPlanetId
    );

    if (!parentPlanet) {
      updatedSatellites.push(satellite);
      continue;
    }

    const { satellite: updated, triggered, triggerVolume } = updateSatellite(
      satellite,
      parentPlanet.position,
      deltaMs
    );

    if (triggered) {
      // Fire the parent planet's current note
      const note = getCurrentNote(parentPlanet, star);
      if (note) {
        const durSec = noteDurationToSeconds(parentPlanet.rotationSpeed, star.bpm);
        triggerNote(sim.synthManager, parentPlanet.id, note, durSec, triggerVolume);
      }
      // Set pulse to 1 for visual flash
      newPulses.set(updated.id, 1);
    } else {
      // Decay existing pulse
      const prev = newPulses.get(updated.id) ?? 0;
      if (prev > 0) {
        newPulses.set(updated.id, decayPulse(prev, deltaMs));
      }
    }

    updatedSatellites.push(updated);
  }

  return {
    ...sim,
    triggerPulses: newPulses,
    solarSystem: {
      ...sim.solarSystem,
      planets: updatedPlanets,
      satellites: updatedSatellites,
    },
  };
}

/**
 * Starts the simulation (sets isPlaying, saves initial snapshot).
 */
export function playSimulation(sim: SimulationState): SimulationState {
  saveInitialState(sim.physicsEngine, sim.loopState);
  resumeLoop(sim.loopState);
  return {
    ...sim,
    solarSystem: { ...sim.solarSystem, isPlaying: true },
  };
}

/**
 * Pauses the simulation.
 */
export function pauseSimulation(sim: SimulationState): SimulationState {
  pauseLoop(sim.loopState);
  return {
    ...sim,
    solarSystem: { ...sim.solarSystem, isPlaying: false },
  };
}

/**
 * Rewinds to initial conditions and pauses.
 */
export function rewindSimulation(sim: SimulationState): SimulationState {
  rewindToStart(sim.physicsEngine, sim.loopState);
  return {
    ...sim,
    solarSystem: { ...sim.solarSystem, isPlaying: false },
  };
}

/**
 * Updates the time scale of the simulation.
 */
export function setSimulationTimeScale(
  sim: SimulationState,
  timeScale: number
): SimulationState {
  setTimeScale(sim.physicsEngine, timeScale);
  return {
    ...sim,
    solarSystem: { ...sim.solarSystem, timeScale },
  };
}

/**
 * Updates the gravity strength.
 */
export function setSimulationGravity(
  sim: SimulationState,
  gravity: number
): SimulationState {
  setGravityStrength(sim.physicsEngine, gravity);
  return {
    ...sim,
    solarSystem: { ...sim.solarSystem, gravityStrength: gravity },
  };
}

/**
 * Converts simulation state to a flat SceneObject array for the renderer.
 * Includes trigger pulse values for satellite highlight animation.
 */
export function simulationToSceneObjects(sim: SimulationState): {
  objects: SceneObject[];
  starPosition: { x: number; y: number } | undefined;
} {
  const objects: SceneObject[] = [];
  const { star, planets, satellites } = sim.solarSystem;

  if (star) {
    objects.push({
      type: 'star',
      position: star.position,
      radius: 18,
    });
  }

  for (const planet of planets) {
    objects.push({
      type: 'planet',
      position: planet.position,
      radius: planetRadiusFromMass(planet.mass),
      rotation: planet.rotation,
      orbitCenter: star?.position,
      orbitRadius: planet.orbitRadius,
    });
  }

  for (const satellite of satellites) {
    const parentPlanet = planets.find((p) => p.id === satellite.parentPlanetId);
    objects.push({
      type: 'satellite',
      position: satellite.position,
      radius: SATELLITE_VISUAL_RADIUS,
      triggerPulse: sim.triggerPulses.get(satellite.id) ?? 0,
      orbitCenter: parentPlanet?.position,
      orbitRadius: satellite.orbitRadius,
    });
  }

  return {
    objects,
    starPosition: star?.position,
  };
}

const SATELLITE_VISUAL_RADIUS = 3;

/**
 * Cleans up all resources.
 */
export function destroySimulation(sim: SimulationState): void {
  disposeAll(sim.synthManager);
  Matter.World.clear(sim.physicsEngine.world, false);
  Matter.Engine.clear(sim.physicsEngine.engine);
}

/**
 * Returns the number of active planets.
 */
export function getPlanetCount(sim: SimulationState): number {
  return sim.solarSystem.planets.length;
}

/**
 * Returns the number of active satellites.
 */
export function getSatelliteCount(sim: SimulationState): number {
  return sim.solarSystem.satellites.length;
}

/**
 * Returns the number of active synth instances.
 */
export function getSynthInstanceCount(sim: SimulationState): number {
  return getSynthCount(sim.synthManager);
}
