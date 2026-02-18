import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Matter from 'matter-js';
import {
  createLoopState,
  captureSnapshot,
  restoreSnapshot,
  applyGravity,
  pauseLoop,
  resumeLoop,
  rewindToStart,
  saveInitialState,
  startLoop,
  stopLoop,
} from '@/lib/physics/loop';
import {
  createPhysicsEngine,
  addBody,
  stepEngine,
} from '@/lib/physics/engine';
import { createCelestialBody, createStaticBody } from '@/lib/physics/collisions';

describe('createLoopState', () => {
  it('creates initial state with all defaults', () => {
    const state = createLoopState();
    expect(state.isRunning).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.frameId).toBeNull();
    expect(state.lastTimestamp).toBeNull();
    expect(state.initialSnapshot).toEqual([]);
  });
});

describe('captureSnapshot', () => {
  it('captures position and velocity of dynamic bodies', () => {
    const pe = createPhysicsEngine();
    const body = createCelestialBody(100, 200, 10, 50);
    addBody(pe, body);
    Matter.Body.setVelocity(body, { x: 5, y: -3 });

    const snapshot = captureSnapshot(pe);
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].position.x).toBeCloseTo(100);
    expect(snapshot[0].position.y).toBeCloseTo(200);
    expect(snapshot[0].velocity.x).toBeCloseTo(5);
    expect(snapshot[0].velocity.y).toBeCloseTo(-3);
  });

  it('does not include static bodies', () => {
    const pe = createPhysicsEngine();
    addBody(pe, createStaticBody(0, 0, 30, 1000));
    const snapshot = captureSnapshot(pe);
    expect(snapshot).toHaveLength(0);
  });

  it('captures multiple bodies', () => {
    const pe = createPhysicsEngine();
    addBody(pe, createCelestialBody(10, 10, 5, 10));
    addBody(pe, createCelestialBody(50, 50, 5, 10));
    const snapshot = captureSnapshot(pe);
    expect(snapshot).toHaveLength(2);
  });
});

describe('restoreSnapshot', () => {
  it('restores body position from snapshot', () => {
    const pe = createPhysicsEngine();
    const body = createCelestialBody(100, 100, 10, 10);
    addBody(pe, body);

    const snapshot = captureSnapshot(pe);

    // Move the body
    Matter.Body.setPosition(body, { x: 300, y: 300 });
    expect(body.position.x).toBeCloseTo(300);

    restoreSnapshot(pe, snapshot);
    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(100);
  });

  it('restores velocity from snapshot', () => {
    const pe = createPhysicsEngine();
    const body = createCelestialBody(100, 100, 10, 10);
    addBody(pe, body);
    Matter.Body.setVelocity(body, { x: 7, y: 3 });

    const snapshot = captureSnapshot(pe);
    Matter.Body.setVelocity(body, { x: 0, y: 0 });

    restoreSnapshot(pe, snapshot);
    expect(body.velocity.x).toBeCloseTo(7);
    expect(body.velocity.y).toBeCloseTo(3);
  });

  it('ignores bodies not in the snapshot', () => {
    const pe = createPhysicsEngine();
    const body = createCelestialBody(50, 50, 10, 10);
    addBody(pe, body);

    // Snapshot taken before body added
    const snapshot: import('@/lib/physics/loop').BodySnapshot[] = [];

    // Should not throw when no matching body IDs
    expect(() => restoreSnapshot(pe, snapshot)).not.toThrow();
  });
});

describe('applyGravity', () => {
  it('does not throw with no bodies', () => {
    const pe = createPhysicsEngine();
    expect(() => applyGravity(pe, [], 1)).not.toThrow();
  });

  it('applies a force toward the gravity source', () => {
    const pe = createPhysicsEngine();

    const star = createStaticBody(0, 0, 20, 10000);
    const planet = createCelestialBody(200, 0, 10, 50);
    addBody(pe, star);
    addBody(pe, planet);

    const initialX = planet.position.x;

    applyGravity(
      pe,
      [{ body: star, mass: 10000 }],
      1
    );
    stepEngine(pe, 1000 / 60);

    // Planet should have moved toward star (negative x direction)
    expect(planet.position.x).toBeLessThan(initialX);
  });

  it('does not apply force from a body to itself', () => {
    const pe = createPhysicsEngine();
    const planet = createCelestialBody(100, 0, 10, 50);
    addBody(pe, planet);

    const initialX = planet.position.x;
    // Planet is its own gravity source - should not move
    applyGravity(pe, [{ body: planet, mass: 50 }], 1);
    stepEngine(pe, 1000 / 60);

    expect(planet.position.x).toBeCloseTo(initialX, 3);
  });
});

describe('pauseLoop / resumeLoop', () => {
  it('sets isPaused to true', () => {
    const state = createLoopState();
    state.isRunning = true;
    pauseLoop(state);
    expect(state.isPaused).toBe(true);
  });

  it('sets isPaused to false on resume', () => {
    const state = createLoopState();
    state.isPaused = true;
    resumeLoop(state);
    expect(state.isPaused).toBe(false);
  });

  it('resets lastTimestamp on resume to avoid large delta spike', () => {
    const state = createLoopState();
    state.lastTimestamp = 99999;
    resumeLoop(state);
    expect(state.lastTimestamp).toBeNull();
  });
});

describe('saveInitialState / rewindToStart', () => {
  it('saves a snapshot as initial state', () => {
    const pe = createPhysicsEngine();
    const state = createLoopState();
    addBody(pe, createCelestialBody(100, 100, 10, 10));

    saveInitialState(pe, state);
    expect(state.initialSnapshot).toHaveLength(1);
  });

  it('rewind restores bodies to initial positions', () => {
    const pe = createPhysicsEngine();
    const state = createLoopState();

    const body = createCelestialBody(100, 100, 10, 10);
    addBody(pe, body);

    saveInitialState(pe, state);

    // Simulate movement
    Matter.Body.setPosition(body, { x: 400, y: 400 });
    Matter.Body.setVelocity(body, { x: 5, y: 5 });

    rewindToStart(pe, state);

    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(100);
    expect(body.velocity.x).toBeCloseTo(0);
  });

  it('rewind pauses the simulation', () => {
    const pe = createPhysicsEngine();
    const state = createLoopState();
    state.isRunning = true;

    saveInitialState(pe, state);
    rewindToStart(pe, state);

    expect(state.isPaused).toBe(true);
  });
});

describe('startLoop / stopLoop', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame for testing
    let id = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      id++;
      // Call immediately with a fake timestamp to test one frame
      setTimeout(() => cb(performance.now()), 0);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets isRunning to true when started', () => {
    const pe = createPhysicsEngine();
    const state = createLoopState();

    startLoop(pe, state, []);
    expect(state.isRunning).toBe(true);

    stopLoop(state);
  });

  it('does not start twice if already running', () => {
    const pe = createPhysicsEngine();
    const state = createLoopState();

    startLoop(pe, state, []);
    const frameIdAfterFirst = state.frameId;

    startLoop(pe, state, []); // should be a no-op
    expect(state.frameId).toBe(frameIdAfterFirst);

    stopLoop(state);
  });

  it('stopLoop sets isRunning to false', () => {
    const pe = createPhysicsEngine();
    const state = createLoopState();

    startLoop(pe, state, []);
    stopLoop(state);

    expect(state.isRunning).toBe(false);
    expect(state.frameId).toBeNull();
  });

  it('calls onFrame callback each tick', async () => {
    const pe = createPhysicsEngine();
    const state = createLoopState();
    const onFrame = vi.fn();

    startLoop(pe, state, [], onFrame);

    // Wait for the setTimeout in mock rAF to fire
    await new Promise((r) => setTimeout(r, 10));

    expect(onFrame).toHaveBeenCalled();
    stopLoop(state);
  });
});
