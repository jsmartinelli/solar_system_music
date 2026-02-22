import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSatellite,
  updateSatellite,
  didCrossTop,
  decayPulse,
  satelliteVolume,
  orbitPeriodMs,
  resetSatelliteIdCounter,
  MAX_SATELLITES,
  SATELLITE_VISUAL_RADIUS,
} from '@/lib/entities/satellite';

beforeEach(() => {
  resetSatelliteIdCounter();
});

describe('createSatellite', () => {
  it('creates a satellite with the correct parent and orbit radius', () => {
    const sat = createSatellite({
      parentPlanetId: 'planet-1',
      parentPosition: { x: 0, y: 0 },
      orbitRadius: 40,
    });
    expect(sat.type).toBe('satellite');
    expect(sat.parentPlanetId).toBe('planet-1');
    expect(sat.orbitRadius).toBe(40);
  });

  it('assigns unique ids', () => {
    const a = createSatellite({ parentPlanetId: 'p1', parentPosition: { x: 0, y: 0 }, orbitRadius: 30 });
    const b = createSatellite({ parentPlanetId: 'p1', parentPosition: { x: 0, y: 0 }, orbitRadius: 30 });
    expect(a.id).not.toBe(b.id);
  });

  it('places satellite at the correct initial position', () => {
    // startAngle=0 → right of parent
    const sat = createSatellite({
      parentPlanetId: 'p1',
      parentPosition: { x: 100, y: 100 },
      orbitRadius: 50,
      startAngle: 0,
    });
    expect(sat.position.x).toBeCloseTo(150);
    expect(sat.position.y).toBeCloseTo(100);
  });

  it('places satellite above parent when startAngle = -π/2', () => {
    const sat = createSatellite({
      parentPlanetId: 'p1',
      parentPosition: { x: 0, y: 0 },
      orbitRadius: 50,
      startAngle: -Math.PI / 2,
    });
    expect(sat.position.x).toBeCloseTo(0);
    expect(sat.position.y).toBeCloseTo(-50);
  });

  it('has no physics body (kinematic)', () => {
    const sat = createSatellite({ parentPlanetId: 'p1', parentPosition: { x: 0, y: 0 }, orbitRadius: 30 });
    expect(sat.physicsBody).toBeNull();
  });

  it('calculates positive orbit speed', () => {
    const sat = createSatellite({ parentPlanetId: 'p1', parentPosition: { x: 0, y: 0 }, orbitRadius: 30 });
    expect(sat.orbitSpeed).toBeGreaterThan(0);
  });
});

describe('orbitPeriodMs', () => {
  it('returns a positive period', () => {
    expect(orbitPeriodMs(30)).toBeGreaterThan(0);
    expect(orbitPeriodMs(60)).toBeGreaterThan(0);
  });

  it('farther satellites have longer periods (Kepler)', () => {
    expect(orbitPeriodMs(60)).toBeGreaterThan(orbitPeriodMs(30));
  });

  it('radius-30 has a period around 3000ms', () => {
    expect(orbitPeriodMs(30)).toBeCloseTo(3000, -2);
  });

  it('period scales as r^1.5', () => {
    const t1 = orbitPeriodMs(30);
    const t2 = orbitPeriodMs(60);
    // T2/T1 should ≈ (60/30)^1.5 = 2^1.5 ≈ 2.828
    expect(t2 / t1).toBeCloseTo(Math.pow(2, 1.5), 5);
  });
});

describe('updateSatellite', () => {
  it('advances the orbit angle each tick', () => {
    const sat = createSatellite({
      parentPlanetId: 'p1',
      parentPosition: { x: 0, y: 0 },
      orbitRadius: 30,
      startAngle: 0,
    });
    const { satellite: updated } = updateSatellite(sat, { x: 0, y: 0 }, 16);
    expect(updated.orbitAngle).toBeGreaterThan(sat.orbitAngle);
  });

  it('constrains position to orbit radius from parent', () => {
    const sat = createSatellite({
      parentPlanetId: 'p1',
      parentPosition: { x: 50, y: 50 },
      orbitRadius: 40,
    });
    const parent = { x: 50, y: 50 };
    const { satellite: updated } = updateSatellite(sat, parent, 100);
    const dx = updated.position.x - parent.x;
    const dy = updated.position.y - parent.y;
    expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(40, 5);
  });

  it('follows the parent planet when it moves', () => {
    const sat = createSatellite({
      parentPlanetId: 'p1',
      parentPosition: { x: 0, y: 0 },
      orbitRadius: 30,
    });
    // Move parent to new position
    const newParent = { x: 200, y: 100 };
    const { satellite: updated } = updateSatellite(sat, newParent, 16);
    const dx = updated.position.x - newParent.x;
    const dy = updated.position.y - newParent.y;
    expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(30, 5);
  });

  it('returns triggerVolume in valid range', () => {
    const sat = createSatellite({
      parentPlanetId: 'p1',
      parentPosition: { x: 0, y: 0 },
      orbitRadius: 30,
    });
    const { triggerVolume } = updateSatellite(sat, { x: 0, y: 0 }, 16);
    expect(triggerVolume).toBeGreaterThanOrEqual(0.01);
    expect(triggerVolume).toBeLessThanOrEqual(1.0);
  });

  it('closer satellites have higher volume', () => {
    const near = createSatellite({ parentPlanetId: 'p1', parentPosition: { x: 0, y: 0 }, orbitRadius: 20 });
    const far  = createSatellite({ parentPlanetId: 'p1', parentPosition: { x: 0, y: 0 }, orbitRadius: 200 });
    const { triggerVolume: vNear } = updateSatellite(near, { x: 0, y: 0 }, 16);
    const { triggerVolume: vFar }  = updateSatellite(far,  { x: 0, y: 0 }, 16);
    expect(vNear).toBeGreaterThan(vFar);
  });
});

describe('didCrossTop', () => {
  const TWO_PI = Math.PI * 2;

  it('detects wrap-around crossing (near 2π → near 0)', () => {
    expect(didCrossTop(TWO_PI - 0.05, 0.05)).toBe(true);
  });

  it('detects crossing through top without wrap', () => {
    expect(didCrossTop(0.5, 0.05)).toBe(true);
  });

  it('does not trigger mid-orbit', () => {
    expect(didCrossTop(Math.PI, Math.PI + 0.1)).toBe(false);
    expect(didCrossTop(Math.PI / 2, Math.PI / 2 + 0.1)).toBe(false);
  });

  it('does not trigger going backward through top', () => {
    // Both well away from top
    expect(didCrossTop(2.0, 1.5)).toBe(false);
  });
});

describe('decayPulse', () => {
  it('reduces pulse over time', () => {
    expect(decayPulse(1.0, 16)).toBeLessThan(1.0);
  });

  it('never goes below 0', () => {
    expect(decayPulse(0.001, 1000)).toBe(0);
    expect(decayPulse(0, 100)).toBe(0);
  });

  it('decays to 0 within ~250ms', () => {
    expect(decayPulse(1.0, 250)).toBe(0);
  });

  it('larger delta decays more', () => {
    const fast = decayPulse(1.0, 100);
    const slow = decayPulse(1.0, 16);
    expect(slow).toBeGreaterThan(fast);
  });
});

describe('satelliteVolume', () => {
  it('returns max volume at radius 0', () => {
    expect(satelliteVolume(0)).toBe(1.0);
  });

  it('returns min volume (0.01) at very large radius', () => {
    expect(satelliteVolume(10000)).toBeCloseTo(0.01);
  });

  it('decreases with distance', () => {
    expect(satelliteVolume(30)).toBeGreaterThan(satelliteVolume(300));
  });

  it('never returns below 0.01', () => {
    for (let r = 0; r <= 1000; r += 50) {
      expect(satelliteVolume(r)).toBeGreaterThanOrEqual(0.01);
    }
  });
});

describe('constants', () => {
  it('MAX_SATELLITES is 100', () => {
    expect(MAX_SATELLITES).toBe(100);
  });

  it('SATELLITE_VISUAL_RADIUS is positive', () => {
    expect(SATELLITE_VISUAL_RADIUS).toBeGreaterThan(0);
  });
});
