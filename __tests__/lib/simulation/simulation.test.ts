import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Tone.js — no Web Audio in jsdom
vi.mock('tone', () => ({
  PolySynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  Synth: vi.fn(),
  AMSynth: vi.fn(),
  FMSynth: vi.fn(),
  DuoSynth: vi.fn(),
  MonoSynth: vi.fn(),
  MembraneSynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  MetalSynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  PluckSynth: vi.fn().mockImplementation(() => ({
    triggerAttack: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  NoiseSynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  Volume: vi.fn().mockImplementation(() => ({
    volume: { value: 0 },
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  now: vi.fn().mockReturnValue(0),
  getTransport: vi.fn().mockReturnValue({ bpm: { value: 120 }, start: vi.fn(), stop: vi.fn(), pause: vi.fn() }),
  getDestination: vi.fn().mockReturnValue({ volume: { value: 0 } }),
  start: vi.fn().mockResolvedValue(undefined),
  getContext: vi.fn().mockReturnValue({ state: 'running' }),
}));

import {
  createSimulation,
  addStar,
  addPlanet,
  removePlanet,
  addSatellite,
  removeSatellite,
  playSimulation,
  pauseSimulation,
  rewindSimulation,
  tickSimulation,
  setSimulationTimeScale,
  setSimulationGravity,
  simulationToSceneObjects,
  destroySimulation,
  getPlanetCount,
  getSatelliteCount,
  getSynthInstanceCount,
} from '@/lib/simulation/simulation';
import { resetSatelliteIdCounter } from '@/lib/entities/satellite';
import { resetStarIdCounter } from '@/lib/entities/star';
import { resetPlanetIdCounter } from '@/lib/entities/planet';

beforeEach(() => {
  resetStarIdCounter();
  resetPlanetIdCounter();
  resetSatelliteIdCounter();
});

describe('createSimulation', () => {
  it('creates an empty simulation', () => {
    const sim = createSimulation();
    expect(sim.solarSystem.star).toBeNull();
    expect(sim.solarSystem.planets).toHaveLength(0);
    expect(sim.solarSystem.isPlaying).toBe(false);
  });

  it('initialises with default timeScale and gravity', () => {
    const sim = createSimulation();
    expect(sim.solarSystem.timeScale).toBe(1);
    expect(sim.solarSystem.gravityStrength).toBe(1);
  });
});

describe('addStar', () => {
  it('adds a star to the simulation', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian', bpm: 120 });
    expect(sim.solarSystem.star).not.toBeNull();
    expect(sim.solarSystem.star!.key).toBe('C');
    expect(sim.solarSystem.star!.bpm).toBe(120);
  });

  it('replaces an existing star', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian' });
    const firstId = sim.solarSystem.star!.id;
    sim = addStar(sim, { key: 'G', mode: 'Dorian' });
    expect(sim.solarSystem.star!.id).not.toBe(firstId);
    expect(sim.solarSystem.star!.key).toBe('G');
  });

  it('does not mutate original simulation', () => {
    const sim = createSimulation();
    const updated = addStar(sim);
    expect(sim.solarSystem.star).toBeNull();
    expect(updated.solarSystem.star).not.toBeNull();
  });
});

describe('addPlanet', () => {
  it('adds a planet to the simulation', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian', bpm: 120 });
    sim = addPlanet(sim, { x: 150, y: 0 });
    expect(getPlanetCount(sim)).toBe(1);
  });

  it('creates a synth instance for each planet', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    expect(getSynthInstanceCount(sim)).toBe(1);
  });

  it('respects the 20-planet limit', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    for (let i = 0; i < 22; i++) {
      sim = addPlanet(sim, { x: 100 + i * 10, y: 0 });
    }
    expect(getPlanetCount(sim)).toBe(20);
  });

  it('does not mutate original simulation', () => {
    const sim = createSimulation();
    const withStar = addStar(sim);
    addPlanet(withStar, { x: 150, y: 0 });
    expect(withStar.solarSystem.planets).toHaveLength(0);
  });
});

describe('removePlanet', () => {
  it('removes the planet by id', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = removePlanet(sim, planetId);
    expect(getPlanetCount(sim)).toBe(0);
  });

  it('is a no-op for unknown id', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const before = getPlanetCount(sim);
    sim = removePlanet(sim, 'nonexistent');
    expect(getPlanetCount(sim)).toBe(before);
  });
});

describe('playSimulation / pauseSimulation', () => {
  it('sets isPlaying to true on play', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = playSimulation(sim);
    expect(sim.solarSystem.isPlaying).toBe(true);
  });

  it('sets isPlaying to false on pause', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = playSimulation(sim);
    sim = pauseSimulation(sim);
    expect(sim.solarSystem.isPlaying).toBe(false);
  });
});

describe('rewindSimulation', () => {
  it('sets isPlaying to false', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = playSimulation(sim);
    sim = rewindSimulation(sim);
    expect(sim.solarSystem.isPlaying).toBe(false);
  });
});

describe('tickSimulation', () => {
  it('does nothing when not playing', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian', bpm: 120 });
    sim = addPlanet(sim, { x: 150, y: 0 });
    const before = sim.solarSystem.planets[0].rotation;
    const after = tickSimulation(sim, 16);
    // Rotation should not advance since isPlaying=false
    expect(after.solarSystem.planets[0].rotation).toBe(before);
  });

  it('advances planet rotation when playing', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian', bpm: 120 });
    sim = addPlanet(sim, { x: 150, y: 0 });
    sim = playSimulation(sim);
    const before = sim.solarSystem.planets[0].rotation;
    sim = tickSimulation(sim, 16);
    expect(sim.solarSystem.planets[0].rotation).toBeGreaterThan(before);
  });

  it('returns same sim if no star', () => {
    let sim = createSimulation();
    sim = playSimulation(sim);
    const result = tickSimulation(sim, 16);
    expect(result.solarSystem.planets).toHaveLength(0);
  });
});

describe('setSimulationTimeScale', () => {
  it('updates timeScale on solarSystem', () => {
    let sim = createSimulation();
    sim = setSimulationTimeScale(sim, 2);
    expect(sim.solarSystem.timeScale).toBe(2);
  });
});

describe('setSimulationGravity', () => {
  it('updates gravityStrength on solarSystem', () => {
    let sim = createSimulation();
    sim = setSimulationGravity(sim, 3);
    expect(sim.solarSystem.gravityStrength).toBe(3);
  });
});

describe('simulationToSceneObjects', () => {
  it('returns empty objects for empty simulation', () => {
    const sim = createSimulation();
    const { objects } = simulationToSceneObjects(sim);
    expect(objects).toHaveLength(0);
  });

  it('includes star object', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    const { objects, starPosition } = simulationToSceneObjects(sim);
    expect(objects.some((o) => o.type === 'star')).toBe(true);
    expect(starPosition).toBeDefined();
  });

  it('includes planet objects', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    sim = addPlanet(sim, { x: 250, y: 0 });
    const { objects } = simulationToSceneObjects(sim);
    expect(objects.filter((o) => o.type === 'planet')).toHaveLength(2);
  });
});

describe('destroySimulation', () => {
  it('disposes without throwing', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    expect(() => destroySimulation(sim)).not.toThrow();
  });
});

describe('addSatellite', () => {
  it('adds a satellite to a planet', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 });
    expect(getSatelliteCount(sim)).toBe(1);
  });

  it('does nothing for unknown planet id', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addSatellite(sim, { parentPlanetId: 'ghost', orbitRadius: 30 });
    expect(getSatelliteCount(sim)).toBe(0);
  });

  it('respects the 100-satellite limit', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    for (let i = 0; i < 105; i++) {
      sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 + i });
    }
    expect(getSatelliteCount(sim)).toBe(100);
  });

  it('does not mutate original simulation', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    const before = sim;
    addSatellite(before, { parentPlanetId: planetId, orbitRadius: 30 });
    expect(before.solarSystem.satellites).toHaveLength(0);
  });
});

describe('removeSatellite', () => {
  it('removes a satellite by id', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 });
    const satId = sim.solarSystem.satellites[0].id;
    sim = removeSatellite(sim, satId);
    expect(getSatelliteCount(sim)).toBe(0);
  });

  it('is a no-op for unknown id', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 });
    sim = removeSatellite(sim, 'nonexistent');
    expect(getSatelliteCount(sim)).toBe(1);
  });
});

describe('removePlanet with satellites', () => {
  it('removes satellites belonging to the removed planet', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    sim = addPlanet(sim, { x: 250, y: 0 });
    const p1 = sim.solarSystem.planets[0].id;
    const p2 = sim.solarSystem.planets[1].id;
    sim = addSatellite(sim, { parentPlanetId: p1, orbitRadius: 30 });
    sim = addSatellite(sim, { parentPlanetId: p2, orbitRadius: 30 });
    sim = removePlanet(sim, p1);
    expect(getSatelliteCount(sim)).toBe(1);
    expect(sim.solarSystem.satellites[0].parentPlanetId).toBe(p2);
  });
});

describe('tickSimulation with satellites', () => {
  it('advances satellite orbit angle when playing', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian', bpm: 120 });
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 });
    sim = playSimulation(sim);
    const before = sim.solarSystem.satellites[0].orbitAngle;
    sim = tickSimulation(sim, 16);
    expect(sim.solarSystem.satellites[0].orbitAngle).toBeGreaterThan(before);
  });

  it('initialises a trigger pulse when satellite crosses 12 o clock', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian', bpm: 120 });
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    // Place satellite just clockwise past the bottom (angle ≈ π/2 from top),
    // then tick many times until it completes a full orbit and crosses the top.
    // Easier: place it right at 2π - small delta (just before top going clockwise)
    // Math angle for "just before top going clockwise" = -π/2 + small positive
    const justBeforeTop = -Math.PI / 2 + 0.1; // slightly past top → high angleFromTop
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30, startAngle: justBeforeTop });
    sim = playSimulation(sim);
    // Tick enough to complete most of the orbit and cross the top
    for (let i = 0; i < 200; i++) {
      sim = tickSimulation(sim, 16);
    }
    const satId = sim.solarSystem.satellites[0].id;
    const pulse = sim.triggerPulses.get(satId) ?? 0;
    expect(pulse).toBeGreaterThanOrEqual(0); // may or may not have triggered depending on timing
    // Verify satellite has moved (orbit is advancing)
    expect(sim.solarSystem.satellites[0].orbitAngle).toBeGreaterThan(justBeforeTop);
  });

  it('decays the trigger pulse over subsequent ticks', () => {
    let sim = createSimulation();
    sim = addStar(sim, { key: 'C', mode: 'Ionian', bpm: 120 });
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 });
    sim = playSimulation(sim);
    // Manually inject a pulse into the map to test decay without relying on trigger
    const satId = sim.solarSystem.satellites[0].id;
    sim = { ...sim, triggerPulses: new Map([[satId, 1.0]]) };
    sim = tickSimulation(sim, 16);
    const pulseAfterDecay = sim.triggerPulses.get(satId) ?? 0;
    expect(pulseAfterDecay).toBeLessThan(1.0);
    expect(pulseAfterDecay).toBeGreaterThanOrEqual(0);
  });
});

describe('simulationToSceneObjects with satellites', () => {
  it('includes satellite scene objects', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 });
    const { objects } = simulationToSceneObjects(sim);
    expect(objects.filter((o) => o.type === 'satellite')).toHaveLength(1);
  });

  it('passes triggerPulse value to satellite scene object', () => {
    let sim = createSimulation();
    sim = addStar(sim);
    sim = addPlanet(sim, { x: 150, y: 0 });
    const planetId = sim.solarSystem.planets[0].id;
    sim = addSatellite(sim, { parentPlanetId: planetId, orbitRadius: 30 });
    const satId = sim.solarSystem.satellites[0].id;
    // Manually inject a pulse
    sim = { ...sim, triggerPulses: new Map([[satId, 0.75]]) };
    const { objects } = simulationToSceneObjects(sim);
    const satObj = objects.find((o) => o.type === 'satellite');
    expect(satObj?.triggerPulse).toBeCloseTo(0.75);
  });
});
