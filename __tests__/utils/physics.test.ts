import { describe, it, expect } from 'vitest';
import {
  G,
  PHYSICS_DELTA_MS,
  circularOrbitSpeed,
  circularOrbitVelocity,
  gravitationalForce,
  orbitalPeriod,
  distance,
  normalize,
  scale,
  addVectors,
  orbitalAngle,
  angleFromTop,
  clamp,
} from '@/utils/physics';

describe('circularOrbitSpeed', () => {
  it('returns zero for zero radius', () => {
    expect(circularOrbitSpeed(1000, 0)).toBe(0);
  });

  it('returns zero for zero mass', () => {
    expect(circularOrbitSpeed(0, 100)).toBe(0);
  });

  it('returns correct speed for given mass and radius', () => {
    const mass = 10000;
    const radius = 100;
    // Matter.js Verlet: Δv = force/mass * delta_ms², so orbital speed must
    // include the PHYSICS_DELTA_MS factor for the centripetal balance to hold.
    const expected = Math.sqrt((G * mass) / radius) * PHYSICS_DELTA_MS;
    expect(circularOrbitSpeed(mass, radius)).toBeCloseTo(expected, 10);
  });

  it('increases with larger mass', () => {
    expect(circularOrbitSpeed(2000, 100)).toBeGreaterThan(
      circularOrbitSpeed(1000, 100)
    );
  });

  it('decreases with larger radius', () => {
    expect(circularOrbitSpeed(1000, 50)).toBeGreaterThan(
      circularOrbitSpeed(1000, 200)
    );
  });

  it('scales with gravityStrength', () => {
    const base = circularOrbitSpeed(1000, 100, 1);
    const doubled = circularOrbitSpeed(1000, 100, 4);
    expect(doubled).toBeCloseTo(base * 2, 10);
  });
});

describe('circularOrbitVelocity', () => {
  const center = { x: 0, y: 0 };

  it('returns zero vector when orbit position equals center', () => {
    const vel = circularOrbitVelocity(center, center, 1000, 1);
    expect(vel.x).toBe(0);
    expect(vel.y).toBe(0);
  });

  it('returns velocity perpendicular to position vector (clockwise)', () => {
    // Planet at (100, 0) - right of center
    // Clockwise orbit means velocity should be (0, -speed)
    const pos = { x: 100, y: 0 };
    const vel = circularOrbitVelocity(center, pos, 1000, 1, true);
    expect(vel.x).toBeCloseTo(0, 10);
    expect(vel.y).toBeLessThan(0); // moving upward (negative y) = clockwise from right
  });

  it('returns velocity perpendicular to position vector (counter-clockwise)', () => {
    const pos = { x: 100, y: 0 };
    const vel = circularOrbitVelocity(center, pos, 1000, 1, false);
    expect(vel.x).toBeCloseTo(0, 10);
    expect(vel.y).toBeGreaterThan(0);
  });

  it('velocity magnitude equals circularOrbitSpeed', () => {
    const pos = { x: 100, y: 50 };
    const vel = circularOrbitVelocity(center, pos, 1000, 1, true);
    const r = Math.sqrt(100 * 100 + 50 * 50);
    const expectedSpeed = circularOrbitSpeed(1000, r);
    const actualSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    expect(actualSpeed).toBeCloseTo(expectedSpeed, 10);
  });

  it('velocity is perpendicular to position vector (dot product near zero)', () => {
    const pos = { x: 80, y: 60 };
    const vel = circularOrbitVelocity(center, pos, 1000, 1, true);
    const dot = pos.x * vel.x + pos.y * vel.y;
    expect(Math.abs(dot)).toBeLessThan(1e-8);
  });
});

describe('gravitationalForce', () => {
  it('returns zero when bodies are at same position', () => {
    const pos = { x: 0, y: 0 };
    const force = gravitationalForce(pos, pos, 100, 200);
    expect(force.x).toBe(0);
    expect(force.y).toBe(0);
  });

  it('force is directed from A toward B', () => {
    const posA = { x: 0, y: 0 };
    const posB = { x: 100, y: 0 };
    const force = gravitationalForce(posA, posB, 100, 200);
    expect(force.x).toBeGreaterThan(0); // B is to the right of A
    expect(force.y).toBeCloseTo(0, 10);
  });

  it('force magnitude = G * m1 * m2 / r^2', () => {
    const posA = { x: 0, y: 0 };
    const posB = { x: 100, y: 0 };
    const m1 = 100;
    const m2 = 200;
    const force = gravitationalForce(posA, posB, m1, m2);
    const expected = (G * m1 * m2) / (100 * 100);
    expect(Math.sqrt(force.x * force.x + force.y * force.y)).toBeCloseTo(
      expected,
      10
    );
  });

  it('scales with gravityStrength', () => {
    const posA = { x: 0, y: 0 };
    const posB = { x: 100, y: 0 };
    const f1 = gravitationalForce(posA, posB, 100, 200, 1);
    const f2 = gravitationalForce(posA, posB, 100, 200, 2);
    expect(f2.x).toBeCloseTo(f1.x * 2, 10);
  });

  it('is symmetric in magnitude (Newton third law)', () => {
    const posA = { x: 0, y: 0 };
    const posB = { x: 100, y: 50 };
    const forceOnA = gravitationalForce(posA, posB, 50, 100);
    const forceOnB = gravitationalForce(posB, posA, 100, 50);
    const magA = Math.sqrt(forceOnA.x ** 2 + forceOnA.y ** 2);
    const magB = Math.sqrt(forceOnB.x ** 2 + forceOnB.y ** 2);
    expect(magA).toBeCloseTo(magB, 10);
  });
});

describe('orbitalPeriod', () => {
  it('returns zero for zero radius', () => {
    expect(orbitalPeriod(0, 1000)).toBe(0);
  });

  it('returns zero for zero mass', () => {
    expect(orbitalPeriod(100, 0)).toBe(0);
  });

  it('follows Keplers third law: T^2 proportional to r^3', () => {
    const mass = 10000;
    const r1 = 100;
    const r2 = 200;
    const t1 = orbitalPeriod(r1, mass);
    const t2 = orbitalPeriod(r2, mass);
    // T^2 / r^3 should be constant
    expect(t1 * t1 / (r1 ** 3)).toBeCloseTo(t2 * t2 / (r2 ** 3), 10);
  });

  it('farther orbits have longer periods', () => {
    const mass = 10000;
    expect(orbitalPeriod(200, mass)).toBeGreaterThan(orbitalPeriod(100, mass));
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('returns correct distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('is symmetric', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 4, y: 6 };
    expect(distance(a, b)).toBeCloseTo(distance(b, a));
  });
});

describe('normalize', () => {
  it('returns zero vector for zero input', () => {
    const n = normalize({ x: 0, y: 0 });
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
  });

  it('returns unit vector', () => {
    const n = normalize({ x: 3, y: 4 });
    const mag = Math.sqrt(n.x * n.x + n.y * n.y);
    expect(mag).toBeCloseTo(1, 10);
  });
});

describe('scale', () => {
  it('scales vector components', () => {
    const v = scale({ x: 2, y: 3 }, 4);
    expect(v.x).toBe(8);
    expect(v.y).toBe(12);
  });
});

describe('addVectors', () => {
  it('adds components', () => {
    const v = addVectors({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(v.x).toBe(4);
    expect(v.y).toBe(6);
  });
});

describe('orbitalAngle', () => {
  it('returns 0 for body directly to the right', () => {
    expect(orbitalAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
  });

  it('returns π/2 for body directly below (screen coords)', () => {
    expect(
      orbitalAngle({ x: 0, y: 0 }, { x: 0, y: 10 })
    ).toBeCloseTo(Math.PI / 2);
  });
});

describe('angleFromTop', () => {
  it('returns 0 for body directly above center', () => {
    // In screen coords, "above" means smaller y
    expect(
      angleFromTop({ x: 0, y: 0 }, { x: 0, y: -10 })
    ).toBeCloseTo(0);
  });

  it('returns π/2 for body directly to the right', () => {
    expect(
      angleFromTop({ x: 0, y: 0 }, { x: 10, y: 0 })
    ).toBeCloseTo(Math.PI / 2);
  });

  it('returns π for body directly below', () => {
    expect(
      angleFromTop({ x: 0, y: 0 }, { x: 0, y: 10 })
    ).toBeCloseTo(Math.PI);
  });

  it('returns 3π/2 for body directly to the left', () => {
    expect(
      angleFromTop({ x: 0, y: 0 }, { x: -10, y: 0 })
    ).toBeCloseTo((3 * Math.PI) / 2);
  });
});

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
