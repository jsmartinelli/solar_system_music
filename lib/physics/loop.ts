import Matter from 'matter-js';
import type { PhysicsEngine } from './engine';
import { gravitationalForce } from '@/utils/physics';
import type { Vector2D } from '@/types/celestial';

export type GravitySource = {
  body: Matter.Body;
  mass: number;
};

export type PhysicsLoopState = {
  isRunning: boolean;
  isPaused: boolean;
  frameId: number | null;
  lastTimestamp: number | null;
  /** Snapshot of initial body states for rewind functionality */
  initialSnapshot: BodySnapshot[];
};

export type BodySnapshot = {
  bodyId: number;
  position: Vector2D;
  velocity: Vector2D;
  angle: number;
  angularVelocity: number;
};

/**
 * Creates a new physics loop state object.
 */
export function createLoopState(): PhysicsLoopState {
  return {
    isRunning: false,
    isPaused: false,
    frameId: null,
    lastTimestamp: null,
    initialSnapshot: [],
  };
}

/**
 * Captures a snapshot of all dynamic bodies in the world.
 * Used to enable rewind-to-start functionality.
 */
export function captureSnapshot(
  physicsEngine: PhysicsEngine
): BodySnapshot[] {
  const bodies = Matter.Composite.allBodies(physicsEngine.world);
  return bodies
    .filter((b) => !b.isStatic)
    .map((b) => ({
      bodyId: b.id,
      position: { x: b.position.x, y: b.position.y },
      velocity: { x: b.velocity.x, y: b.velocity.y },
      angle: b.angle,
      angularVelocity: b.angularVelocity,
    }));
}

/**
 * Restores bodies to a previously captured snapshot.
 * All bodies in the snapshot that still exist in the world are reset.
 */
export function restoreSnapshot(
  physicsEngine: PhysicsEngine,
  snapshot: BodySnapshot[]
): void {
  const bodies = Matter.Composite.allBodies(physicsEngine.world);
  const bodyMap = new Map(bodies.map((b) => [b.id, b]));

  for (const snap of snapshot) {
    const body = bodyMap.get(snap.bodyId);
    if (!body || body.isStatic) continue;

    Matter.Body.setPosition(body, snap.position);
    Matter.Body.setVelocity(body, snap.velocity);
    Matter.Body.setAngle(body, snap.angle);
    Matter.Body.setAngularVelocity(body, snap.angularVelocity);
  }
}

/**
 * Applies gravitational attraction from all gravity sources to all
 * non-static bodies in the world. Called each physics frame.
 *
 * @param physicsEngine - The physics engine
 * @param gravitySources - Bodies that exert gravity (star + planets)
 * @param gravityStrength - Global gravity multiplier
 */
export function applyGravity(
  physicsEngine: PhysicsEngine,
  gravitySources: GravitySource[],
  gravityStrength: number
): void {
  const allBodies = Matter.Composite.allBodies(physicsEngine.world);

  for (const body of allBodies) {
    if (body.isStatic) continue;

    let totalForce: Vector2D = { x: 0, y: 0 };

    for (const source of gravitySources) {
      if (source.body.id === body.id) continue;

      const force = gravitationalForce(
        body.position,
        source.body.position,
        body.mass,
        source.mass,
        gravityStrength
      );

      totalForce.x += force.x;
      totalForce.y += force.y;
    }

    Matter.Body.applyForce(body, body.position, totalForce);
  }
}

/**
 * Starts the physics animation loop using requestAnimationFrame.
 * The loop applies gravity each frame and steps the engine forward.
 *
 * @param physicsEngine - The physics engine to drive
 * @param loopState - Mutable state object for this loop
 * @param gravitySources - Bodies that exert gravitational forces
 * @param onFrame - Optional callback fired after each physics step
 */
export function startLoop(
  physicsEngine: PhysicsEngine,
  loopState: PhysicsLoopState,
  gravitySources: GravitySource[],
  onFrame?: () => void
): void {
  if (loopState.isRunning) return;

  loopState.isRunning = true;
  loopState.isPaused = false;

  const tick = (timestamp: number) => {
    if (!loopState.isRunning) return;

    if (!loopState.isPaused) {
      const delta = loopState.lastTimestamp
        ? Math.min(timestamp - loopState.lastTimestamp, 50) // cap at 50ms
        : 1000 / 60;

      applyGravity(
        physicsEngine,
        gravitySources,
        physicsEngine.config.gravity
      );

      Matter.Engine.update(
        physicsEngine.engine,
        delta * physicsEngine.config.timeScale
      );

      onFrame?.();
    }

    loopState.lastTimestamp = timestamp;
    loopState.frameId = requestAnimationFrame(tick);
  };

  loopState.frameId = requestAnimationFrame(tick);
}

/**
 * Stops the animation loop entirely.
 */
export function stopLoop(loopState: PhysicsLoopState): void {
  loopState.isRunning = false;
  loopState.isPaused = false;
  loopState.lastTimestamp = null;

  if (loopState.frameId !== null) {
    cancelAnimationFrame(loopState.frameId);
    loopState.frameId = null;
  }
}

/**
 * Pauses the physics simulation (loop keeps running but engine doesn't step).
 */
export function pauseLoop(loopState: PhysicsLoopState): void {
  loopState.isPaused = true;
}

/**
 * Resumes a paused simulation.
 */
export function resumeLoop(loopState: PhysicsLoopState): void {
  loopState.isPaused = false;
  loopState.lastTimestamp = null; // reset to avoid large delta on resume
}

/**
 * Rewinds the simulation to the stored initial snapshot.
 * Pauses the simulation after rewinding.
 */
export function rewindToStart(
  physicsEngine: PhysicsEngine,
  loopState: PhysicsLoopState
): void {
  pauseLoop(loopState);
  restoreSnapshot(physicsEngine, loopState.initialSnapshot);
}

/**
 * Saves the current world state as the initial snapshot for future rewinds.
 * Call this after placing all objects and before starting the simulation.
 */
export function saveInitialState(
  physicsEngine: PhysicsEngine,
  loopState: PhysicsLoopState
): void {
  loopState.initialSnapshot = captureSnapshot(physicsEngine);
}
