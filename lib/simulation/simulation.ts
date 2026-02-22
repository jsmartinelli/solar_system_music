'use client';

import type { Star, Planet, SolarSystem } from '@/types/celestial';
import type { SceneObject } from '@/lib/rendering/renderer';
import { createPhysicsEngine, addBody, removeBody, setTimeScale, setGravityStrength } from '@/lib/physics/engine';
import type { PhysicsEngine } from '@/lib/physics/engine';
import { createLoopState, saveInitialState, rewindToStart, pauseLoop, resumeLoop } from '@/lib/physics/loop';
import type { PhysicsLoopState, GravitySource } from '@/lib/physics/loop';
import { applyGravity } from '@/lib/physics/loop';
import Matter from 'matter-js';
import { createSynthManager, addSynth, triggerNote, disposeAll, getSynthCount, removeSynth } from '@/lib/audio/synthManager';
import type { SynthManager, SynthType } from '@/lib/audio/synthManager';
import { setBpm } from '@/lib/audio/context';
import { createStar } from '@/lib/entities/star';
import type { CreateStarOptions } from '@/lib/entities/star';
import { createPlanet, updatePlanet, getCurrentNote, MAX_PLANETS } from '@/lib/entities/planet';
import type { CreatePlanetOptions } from '@/lib/entities/planet';
import { planetRadiusFromMass } from '@/lib/rendering/renderer';
import { noteDurationToSeconds } from '@/utils/audio';
import { setupCollisions } from '@/lib/physics/collisions';

export interface SimulationState {
  solarSystem: SolarSystem;
  physicsEngine: PhysicsEngine;
  loopState: PhysicsLoopState;
  synthManager: SynthManager;
  lastTimestamp: number;
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
 * Adds its physics body to the world and updates the BPM transport.
 */
export function addStar(
  sim: SimulationState,
  options: CreateStarOptions = {}
): SimulationState {
  // Remove previous star if one exists
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
 * Creates a synth instance for it and adds its physics body.
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

/**
 * Removes a planet from the simulation, disposing its synth and physics body.
 */
export function removePlanet(
  sim: SimulationState,
  planetId: string
): SimulationState {
  const planet = sim.solarSystem.planets.find((p) => p.id === planetId);
  if (!planet) return sim;

  if (planet.physicsBody) removeBody(sim.physicsEngine, planet.physicsBody);
  removeSynth(sim.synthManager, planetId);

  return {
    ...sim,
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
 * Advances the simulation by one tick.
 * - Applies gravity
 * - Steps the physics engine
 * - Updates all planet entities (revolution tracking, note advancement)
 * - Triggers audio for planets that completed a revolution
 *
 * Returns updated simulation state (planets array is replaced, not mutated).
 */
export function tickSimulation(
  sim: SimulationState,
  deltaMs: number
): SimulationState {
  if (!sim.solarSystem.isPlaying) return sim;

  const { star, planets } = sim.solarSystem;
  if (!star) return sim;

  // Build gravity sources: star + all planets
  const gravitySources: GravitySource[] = [];
  if (star.physicsBody) {
    gravitySources.push({ body: star.physicsBody, mass: star.mass });
  }
  for (const planet of planets) {
    if (planet.physicsBody) {
      gravitySources.push({ body: planet.physicsBody, mass: planet.mass });
    }
  }

  applyGravity(sim.physicsEngine, gravitySources, sim.solarSystem.gravityStrength);
  Matter.Engine.update(
    sim.physicsEngine.engine,
    deltaMs * sim.solarSystem.timeScale
  );

  // Update each planet and trigger audio if note advanced
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

  return {
    ...sim,
    solarSystem: {
      ...sim.solarSystem,
      planets: updatedPlanets,
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
 * Converts simulation state to a flat array of SceneObjects for rendering.
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
      radius: 3,
      orbitCenter: parentPlanet?.position,
      orbitRadius: satellite.orbitRadius,
    });
  }

  return {
    objects,
    starPosition: star?.position,
  };
}

/**
 * Cleans up all resources: disposes synths, clears physics world.
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
 * Returns the number of active synth instances.
 */
export function getSynthInstanceCount(sim: SimulationState): number {
  return getSynthCount(sim.synthManager);
}
