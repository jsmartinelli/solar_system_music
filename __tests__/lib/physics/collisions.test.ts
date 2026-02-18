import { describe, it, expect, vi } from 'vitest';
import Matter from 'matter-js';
import {
  createCelestialBody,
  createStaticBody,
  setupCollisions,
  teardownCollisions,
} from '@/lib/physics/collisions';
import { createPhysicsEngine, addBody, stepEngine } from '@/lib/physics/engine';

describe('createCelestialBody', () => {
  it('creates a circular body at the given position', () => {
    const body = createCelestialBody(100, 200, 20, 50);
    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(200);
  });

  it('sets mass correctly', () => {
    const body = createCelestialBody(0, 0, 20, 75);
    expect(body.mass).toBeCloseTo(75);
  });

  it('sets elastic restitution (1.0)', () => {
    const body = createCelestialBody(0, 0, 20, 50);
    expect(body.restitution).toBe(1.0);
  });

  it('sets zero friction for space-like behavior', () => {
    const body = createCelestialBody(0, 0, 20, 50);
    expect(body.friction).toBe(0);
    expect(body.frictionAir).toBe(0);
  });

  it('is dynamic by default', () => {
    const body = createCelestialBody(0, 0, 20, 50);
    expect(body.isStatic).toBe(false);
  });

  it('creates static body when isStatic=true', () => {
    const body = createCelestialBody(0, 0, 20, 50, true);
    expect(body.isStatic).toBe(true);
  });
});

describe('createStaticBody', () => {
  it('creates a static body', () => {
    const body = createStaticBody(0, 0, 30, 1000);
    expect(body.isStatic).toBe(true);
  });

  it('sets mass on static body', () => {
    const body = createStaticBody(0, 0, 30, 1000);
    expect(body.mass).toBeCloseTo(1000);
  });
});

describe('setupCollisions', () => {
  it('returns a CollisionSystem', () => {
    const pe = createPhysicsEngine();
    const system = setupCollisions(pe.engine);
    expect(system.engine).toBe(pe.engine);
    expect(system.onCollision).toBeNull();
  });

  it('stores the callback', () => {
    const pe = createPhysicsEngine();
    const cb = vi.fn();
    const system = setupCollisions(pe.engine, cb);
    expect(system.onCollision).toBe(cb);
  });

  it('fires callback when two bodies collide', () => {
    const pe = createPhysicsEngine();
    const callback = vi.fn();
    setupCollisions(pe.engine, callback);

    // Place two bodies close enough to collide after a velocity push
    const bodyA = createCelestialBody(100, 100, 15, 10);
    const bodyB = createCelestialBody(130, 100, 15, 10);
    addBody(pe, bodyA);
    addBody(pe, bodyB);

    // Push them toward each other
    Matter.Body.setVelocity(bodyA, { x: 20, y: 0 });
    Matter.Body.setVelocity(bodyB, { x: -20, y: 0 });

    // Step enough times to ensure collision
    for (let i = 0; i < 10; i++) {
      stepEngine(pe, 1000 / 60);
    }

    expect(callback).toHaveBeenCalled();
  });
});

describe('teardownCollisions', () => {
  it('does not throw when removing listeners', () => {
    const pe = createPhysicsEngine();
    setupCollisions(pe.engine, vi.fn());
    expect(() => teardownCollisions(pe.engine)).not.toThrow();
  });
});
