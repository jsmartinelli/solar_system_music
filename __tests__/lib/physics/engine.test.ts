import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import {
  createPhysicsEngine,
  setTimeScale,
  setGravityStrength,
  addBody,
  removeBody,
  getBodies,
  clearWorld,
  destroyEngine,
  stepEngine,
} from '@/lib/physics/engine';
import { createCelestialBody } from '@/lib/physics/collisions';

describe('createPhysicsEngine', () => {
  it('creates an engine with default config', () => {
    const pe = createPhysicsEngine();
    expect(pe.engine).toBeDefined();
    expect(pe.runner).toBeDefined();
    expect(pe.world).toBeDefined();
    expect(pe.config.gravity).toBe(1);
    expect(pe.config.timeScale).toBe(1);
  });

  it('accepts custom config', () => {
    const pe = createPhysicsEngine({ gravity: 2, timeScale: 0.5 });
    expect(pe.config.gravity).toBe(2);
    expect(pe.config.timeScale).toBe(0.5);
  });

  it('sets engine time scale from config', () => {
    const pe = createPhysicsEngine({ timeScale: 2 });
    expect(pe.engine.timing.timeScale).toBe(2);
  });

  it('disables built-in gravity (we use custom gravity forces)', () => {
    const pe = createPhysicsEngine();
    expect(pe.engine.gravity.scale).toBe(0);
  });
});

describe('setTimeScale', () => {
  it('updates engine timing and config', () => {
    const pe = createPhysicsEngine();
    setTimeScale(pe, 3);
    expect(pe.engine.timing.timeScale).toBe(3);
    expect(pe.config.timeScale).toBe(3);
  });

  it('clamps to 0 minimum', () => {
    const pe = createPhysicsEngine();
    setTimeScale(pe, -5);
    expect(pe.config.timeScale).toBe(0);
  });

  it('clamps to 10 maximum', () => {
    const pe = createPhysicsEngine();
    setTimeScale(pe, 100);
    expect(pe.config.timeScale).toBe(10);
  });
});

describe('setGravityStrength', () => {
  it('updates config gravity', () => {
    const pe = createPhysicsEngine();
    setGravityStrength(pe, 3.5);
    expect(pe.config.gravity).toBe(3.5);
  });

  it('clamps to 0 minimum', () => {
    const pe = createPhysicsEngine();
    setGravityStrength(pe, -1);
    expect(pe.config.gravity).toBe(0);
  });

  it('clamps to 10 maximum', () => {
    const pe = createPhysicsEngine();
    setGravityStrength(pe, 999);
    expect(pe.config.gravity).toBe(10);
  });
});

describe('body management', () => {
  let pe: ReturnType<typeof createPhysicsEngine>;

  beforeEach(() => {
    pe = createPhysicsEngine();
  });

  it('adds a body to the world', () => {
    const body = createCelestialBody(100, 100, 20, 50);
    addBody(pe, body);
    expect(getBodies(pe)).toContain(body);
  });

  it('removes a body from the world', () => {
    const body = createCelestialBody(100, 100, 20, 50);
    addBody(pe, body);
    removeBody(pe, body);
    expect(getBodies(pe)).not.toContain(body);
  });

  it('clears all bodies', () => {
    addBody(pe, createCelestialBody(50, 50, 10, 10));
    addBody(pe, createCelestialBody(150, 150, 10, 10));
    clearWorld(pe);
    expect(getBodies(pe)).toHaveLength(0);
  });

  it('getBodies returns empty array for empty world', () => {
    expect(getBodies(pe)).toHaveLength(0);
  });
});

describe('stepEngine', () => {
  it('advances the engine simulation', () => {
    const pe = createPhysicsEngine();
    const body = createCelestialBody(100, 100, 10, 10);
    addBody(pe, body);

    // Give the body a velocity so it should move after a step
    Matter.Body.setVelocity(body, { x: 1, y: 0 });
    const initialX = body.position.x;

    stepEngine(pe, 1000 / 60);

    expect(body.position.x).not.toBe(initialX);
  });
});

describe('destroyEngine', () => {
  it('clears the world without throwing', () => {
    const pe = createPhysicsEngine();
    addBody(pe, createCelestialBody(50, 50, 10, 10));
    expect(() => destroyEngine(pe)).not.toThrow();
  });
});
