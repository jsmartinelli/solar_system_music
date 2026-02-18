import Matter from 'matter-js';

export type CollisionCallback = (
  bodyA: Matter.Body,
  bodyB: Matter.Body
) => void;

export interface CollisionSystem {
  engine: Matter.Engine;
  onCollision: CollisionCallback | null;
}

/**
 * Sets up elastic collision handling for the physics engine.
 *
 * Matter.js bodies are configured with restitution = 1 for perfectly elastic
 * collisions. This function attaches a collision event listener that fires
 * the provided callback whenever two bodies collide.
 *
 * @param engine - The Matter.js engine
 * @param onCollision - Optional callback invoked on each collision pair
 * @returns A CollisionSystem handle for cleanup
 */
export function setupCollisions(
  engine: Matter.Engine,
  onCollision?: CollisionCallback
): CollisionSystem {
  const system: CollisionSystem = {
    engine,
    onCollision: onCollision ?? null,
  };

  Matter.Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;
    for (const pair of pairs) {
      system.onCollision?.(pair.bodyA, pair.bodyB);
    }
  });

  return system;
}

/**
 * Removes collision event listeners from the engine.
 */
export function teardownCollisions(engine: Matter.Engine): void {
  Matter.Events.off(engine, 'collisionStart');
}

/**
 * Creates a Matter.js body configured for elastic collision.
 * Restitution of 1 = perfectly elastic (energy conserved).
 * Friction set to 0 for space-like behavior.
 *
 * @param x - X position
 * @param y - Y position
 * @param radius - Collision radius
 * @param mass - Body mass
 * @param isStatic - If true, the body won't move (for the star)
 * @returns Configured Matter.Body
 */
export function createCelestialBody(
  x: number,
  y: number,
  radius: number,
  mass: number,
  isStatic: boolean = false
): Matter.Body {
  const body = Matter.Bodies.circle(x, y, radius, {
    restitution: 1.0, // elastic collision
    friction: 0,
    frictionAir: 0, // no air resistance in space
    frictionStatic: 0,
    isStatic,
    collisionFilter: {
      category: 0x0001,
      mask: 0x0001,
    },
  });

  Matter.Body.setMass(body, mass);

  return body;
}

/**
 * Creates a static anchor body (used for the star).
 * Static bodies participate in collisions but do not move.
 */
export function createStaticBody(
  x: number,
  y: number,
  radius: number,
  mass: number
): Matter.Body {
  return createCelestialBody(x, y, radius, mass, true);
}

/**
 * Updates the collision radius of a body.
 * Used when planet mass changes and visual size needs to update.
 * Note: Matter.js doesn't allow radius changes after creation,
 * so this returns a new body that should replace the old one.
 */
export function resizeCelestialBody(
  body: Matter.Body,
  newRadius: number
): Matter.Body {
  return createCelestialBody(
    body.position.x,
    body.position.y,
    newRadius,
    body.mass,
    body.isStatic
  );
}
