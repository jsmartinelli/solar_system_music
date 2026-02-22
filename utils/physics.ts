import type { Vector2D } from '@/types/celestial';

/**
 * Gravitational constant (scaled for the simulation).
 * This is not the real G; it's tuned to produce visually interesting
 * and musically useful orbital periods at canvas scale.
 */
export const G = 6.674e-4;

/**
 * The fixed physics timestep in milliseconds.
 *
 * Matter.js uses Verlet integration where force contributes to velocity as:
 *   Δv = (force / mass) * delta_ms²
 *
 * Because of this delta² scaling, orbital velocity must be calculated as
 *   v = sqrt(G * M / r) * PHYSICS_DELTA_MS
 * so that the gravitational force provides exactly the right centripetal
 * acceleration each step. This constant must match the delta passed to
 * Matter.Engine.update() — i.e. the sub-step size used in tickSimulation.
 */
export const PHYSICS_DELTA_MS = 1000 / 60; // ~16.67 ms

/**
 * Calculates the orbital velocity needed to maintain a stable circular orbit.
 *
 * Matter.js Verlet integrates force as: Δposition = force/mass * delta_ms²
 * So the required velocity (in pixels per physics step) is:
 *   v = sqrt(G * M * gravityStrength / r) * PHYSICS_DELTA_MS
 *
 * @param centralMass - Mass of the body being orbited (e.g., the star)
 * @param orbitRadius - Distance from center of central body
 * @param gravityStrength - Global gravity multiplier (default 1)
 * @returns The scalar orbital speed in pixels per physics step
 */
export function circularOrbitSpeed(
  centralMass: number,
  orbitRadius: number,
  gravityStrength: number = 1
): number {
  if (orbitRadius <= 0 || centralMass <= 0) return 0;
  return Math.sqrt((G * centralMass * gravityStrength) / orbitRadius) * PHYSICS_DELTA_MS;
}

/**
 * Calculates the velocity vector for a circular orbit at a given angle.
 * The velocity is always perpendicular (tangent) to the position vector.
 *
 * @param centerPosition - Position of the body being orbited
 * @param orbitPosition - Position of the orbiting body
 * @param centralMass - Mass of the central body
 * @param gravityStrength - Global gravity multiplier
 * @param clockwise - If true, orbits clockwise; counter-clockwise otherwise
 * @returns Velocity vector for circular orbit
 */
export function circularOrbitVelocity(
  centerPosition: Vector2D,
  orbitPosition: Vector2D,
  centralMass: number,
  gravityStrength: number = 1,
  clockwise: boolean = true
): Vector2D {
  const dx = orbitPosition.x - centerPosition.x;
  const dy = orbitPosition.y - centerPosition.y;
  const r = Math.sqrt(dx * dx + dy * dy);

  if (r === 0) return { x: 0, y: 0 };

  const speed = circularOrbitSpeed(centralMass, r, gravityStrength);

  // Perpendicular to position vector: rotate 90 degrees
  // Clockwise: (dy, -dx) / r * speed
  // Counter-clockwise: (-dy, dx) / r * speed
  if (clockwise) {
    return {
      x: (dy / r) * speed,
      y: (-dx / r) * speed,
    };
  } else {
    return {
      x: (-dy / r) * speed,
      y: (dx / r) * speed,
    };
  }
}

/**
 * Calculates the gravitational force vector exerted on body A by body B.
 *
 * F = G * m1 * m2 / r^2, directed from A toward B
 *
 * @param posA - Position of body A (the one being attracted)
 * @param posB - Position of body B (the attractor)
 * @param massA - Mass of body A
 * @param massB - Mass of body B
 * @param gravityStrength - Global gravity multiplier
 * @returns Force vector applied to body A
 */
export function gravitationalForce(
  posA: Vector2D,
  posB: Vector2D,
  massA: number,
  massB: number,
  gravityStrength: number = 1
): Vector2D {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const distSq = dx * dx + dy * dy;

  if (distSq === 0) return { x: 0, y: 0 };

  const dist = Math.sqrt(distSq);
  const forceMag = (G * massA * massB * gravityStrength) / distSq;

  return {
    x: (dx / dist) * forceMag,
    y: (dy / dist) * forceMag,
  };
}

/**
 * Calculates the orbital period (time for one full revolution).
 *
 * From Kepler's third law: T = 2π * sqrt(r^3 / (G * M))
 *
 * @param orbitRadius - Semi-major axis (orbit radius for circular orbits)
 * @param centralMass - Mass of the central body
 * @param gravityStrength - Global gravity multiplier
 * @returns Period in simulation time units (milliseconds at 60fps)
 */
export function orbitalPeriod(
  orbitRadius: number,
  centralMass: number,
  gravityStrength: number = 1
): number {
  if (orbitRadius <= 0 || centralMass <= 0) return 0;
  return (
    2 *
    Math.PI *
    Math.sqrt(
      Math.pow(orbitRadius, 3) / (G * centralMass * gravityStrength)
    )
  );
}

/**
 * Calculates the distance between two positions.
 */
export function distance(a: Vector2D, b: Vector2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes a vector to unit length.
 */
export function normalize(v: Vector2D): Vector2D {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

/**
 * Scales a vector by a scalar.
 */
export function scale(v: Vector2D, s: number): Vector2D {
  return { x: v.x * s, y: v.y * s };
}

/**
 * Adds two vectors.
 */
export function addVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Returns the current orbital angle (in radians) of a body relative to a center,
 * measured from the positive X axis (0 = right, π/2 = down in screen coords).
 */
export function orbitalAngle(center: Vector2D, position: Vector2D): number {
  return Math.atan2(position.y - center.y, position.x - center.x);
}

/**
 * Returns the angle from 12 o'clock (top) in radians, going clockwise.
 * 0 = top, π/2 = right, π = bottom, 3π/2 = left.
 * Used for satellite trigger detection.
 */
export function angleFromTop(center: Vector2D, position: Vector2D): number {
  const angle = Math.atan2(position.x - center.x, -(position.y - center.y));
  return angle < 0 ? angle + 2 * Math.PI : angle;
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
