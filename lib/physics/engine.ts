import Matter from 'matter-js';

export interface PhysicsConfig {
  gravity: number; // gravitational constant multiplier (0 = no gravity, 1 = default)
  timeScale: number; // simulation speed multiplier
}

export interface PhysicsEngine {
  engine: Matter.Engine;
  runner: Matter.Runner;
  world: Matter.World;
  config: PhysicsConfig;
}

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: 1,
  timeScale: 1,
};

/**
 * Creates and initializes a Matter.js physics engine configured for
 * the solar system simulation. Gravity is disabled at the engine level
 * because we implement custom gravitational attraction between bodies.
 */
export function createPhysicsEngine(
  config: Partial<PhysicsConfig> = {}
): PhysicsEngine {
  const mergedConfig: PhysicsConfig = { ...DEFAULT_CONFIG, ...config };

  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 0, scale: 0 }, // custom gravity via forces
    positionIterations: 10,
    velocityIterations: 8,
    constraintIterations: 4,
  });

  engine.timing.timeScale = mergedConfig.timeScale;

  const runner = Matter.Runner.create({
    delta: 1000 / 60, // 60 fps target
    isFixed: false,
  });

  return {
    engine,
    runner,
    world: engine.world,
    config: mergedConfig,
  };
}

/**
 * Updates the time scale of the physics simulation.
 * Values > 1 speed up simulation, < 1 slow it down.
 */
export function setTimeScale(
  physicsEngine: PhysicsEngine,
  timeScale: number
): void {
  const clamped = Math.max(0, Math.min(10, timeScale));
  physicsEngine.engine.timing.timeScale = clamped;
  physicsEngine.config.timeScale = clamped;
}

/**
 * Updates the gravity strength multiplier.
 * Affects all custom gravitational force calculations.
 */
export function setGravityStrength(
  physicsEngine: PhysicsEngine,
  gravity: number
): void {
  const clamped = Math.max(0, Math.min(10, gravity));
  physicsEngine.config.gravity = clamped;
}

/**
 * Adds a body to the physics world.
 */
export function addBody(
  physicsEngine: PhysicsEngine,
  body: Matter.Body
): void {
  Matter.Composite.add(physicsEngine.world, body);
}

/**
 * Removes a body from the physics world.
 */
export function removeBody(
  physicsEngine: PhysicsEngine,
  body: Matter.Body
): void {
  Matter.Composite.remove(physicsEngine.world, body);
}

/**
 * Returns all bodies currently in the world.
 */
export function getBodies(physicsEngine: PhysicsEngine): Matter.Body[] {
  return Matter.Composite.allBodies(physicsEngine.world);
}

/**
 * Clears all bodies from the world.
 */
export function clearWorld(physicsEngine: PhysicsEngine): void {
  Matter.World.clear(physicsEngine.world, false);
}

/**
 * Destroys the physics engine and frees resources.
 */
export function destroyEngine(physicsEngine: PhysicsEngine): void {
  Matter.Runner.stop(physicsEngine.runner);
  Matter.Engine.clear(physicsEngine.engine);
  clearWorld(physicsEngine);
}

/**
 * Steps the engine forward by a fixed delta (used in tests and manual stepping).
 */
export function stepEngine(
  physicsEngine: PhysicsEngine,
  delta: number = 1000 / 60
): void {
  Matter.Engine.update(physicsEngine.engine, delta);
}
