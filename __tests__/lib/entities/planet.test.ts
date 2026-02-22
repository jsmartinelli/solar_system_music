import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPlanet,
  updatePlanet,
  getCurrentNote,
  didCrossZero,
  setPlanetNoteSequence,
  setPlanetRotationSpeed,
  resetPlanetIdCounter,
  PLANET_DEFAULT_MASS,
  MAX_PLANETS,
} from '@/lib/entities/planet';
import { createStar, resetStarIdCounter } from '@/lib/entities/star';
import type { Star } from '@/types/celestial';

// Shared test star in C Ionian at 120 BPM
let star: Star;

beforeEach(() => {
  resetPlanetIdCounter();
  resetStarIdCounter();
  star = createStar({ x: 0, y: 0, bpm: 120, key: 'C', mode: 'Ionian' });
});

describe('createPlanet', () => {
  it('creates a planet with default values', () => {
    const planet = createPlanet({ x: 100, y: 0 });
    expect(planet.type).toBe('planet');
    expect(planet.mass).toBe(PLANET_DEFAULT_MASS);
    expect(planet.currentNoteIndex).toBe(0);
    expect(planet.rotation).toBe(0);
  });

  it('assigns unique ids', () => {
    const a = createPlanet({ x: 100, y: 0 });
    const b = createPlanet({ x: 200, y: 0 });
    expect(a.id).not.toBe(b.id);
  });

  it('parses note sequence from string', () => {
    const planet = createPlanet({ x: 100, y: 0, noteSequence: 'I4 V4 III4' });
    expect(planet.noteSequence).toEqual(['I4', 'V4', 'III4']);
  });

  it('creates a dynamic physics body', () => {
    const planet = createPlanet({ x: 100, y: 0 });
    expect(planet.physicsBody).not.toBeNull();
    expect(planet.physicsBody!.isStatic).toBe(false);
  });

  it('sets circular orbit velocity when star is provided', () => {
    const planet = createPlanet({ x: 150, y: 0, star, gravityStrength: 1 });
    // Should have some velocity (non-zero y component for rightward position)
    const v = planet.physicsBody!.velocity;
    expect(Math.sqrt(v.x * v.x + v.y * v.y)).toBeGreaterThan(0);
  });

  it('calculates initial orbit radius from star', () => {
    const planet = createPlanet({ x: 150, y: 0, star });
    expect(planet.orbitRadius).toBeCloseTo(150);
  });

  it('accepts custom synth type', () => {
    const planet = createPlanet({ x: 100, y: 0, synthType: 'FMSynth' });
    expect(planet.synthType).toBe('FMSynth');
  });
});

describe('updatePlanet', () => {
  it('syncs position from physics body', () => {
    const planet = createPlanet({ x: 100, y: 0, star });
    const { planet: updated } = updatePlanet(planet, star, 16);
    // Position should match physics body
    expect(updated.position.x).toBeCloseTo(updated.physicsBody!.position.x);
    expect(updated.position.y).toBeCloseTo(updated.physicsBody!.position.y);
  });

  it('advances rotation each tick', () => {
    const planet = createPlanet({ x: 100, y: 0, rotationSpeed: 'quarter' });
    const { planet: updated } = updatePlanet(planet, star, 16);
    expect(updated.rotation).toBeGreaterThan(0);
  });

  it('rotation increases with faster note duration', () => {
    const slow = createPlanet({ x: 100, y: 0, rotationSpeed: 'whole' });
    const fast = createPlanet({ x: 100, y: 0, rotationSpeed: 'sixteenth' });
    resetPlanetIdCounter();
    const { planet: slowUpdated } = updatePlanet(slow, star, 16);
    const { planet: fastUpdated } = updatePlanet(fast, star, 16);
    expect(fastUpdated.rotation).toBeGreaterThan(slowUpdated.rotation);
  });

  it('returns noteAdvanced=false when no revolution detected', () => {
    const planet = createPlanet({ x: 100, y: 0 });
    // Single tick — not enough movement for a full revolution
    const { noteAdvanced } = updatePlanet(planet, star, 16);
    expect(noteAdvanced).toBe(false);
  });

  it('handles planet with no physics body gracefully', () => {
    const planet = createPlanet({ x: 100, y: 0 });
    const noBody = { ...planet, physicsBody: null };
    expect(() => updatePlanet(noBody, star, 16)).not.toThrow();
    const { noteAdvanced } = updatePlanet(noBody, star, 16);
    expect(noteAdvanced).toBe(false);
  });
});

describe('didCrossZero', () => {
  it('detects crossing from negative to positive angle', () => {
    // Just past zero going counter-clockwise
    expect(didCrossZero(-0.1, 0.1)).toBe(true);
  });

  it('detects crossing from positive to negative angle', () => {
    expect(didCrossZero(0.1, -0.1)).toBe(true);
  });

  it('does not detect crossing when same sign', () => {
    expect(didCrossZero(0.5, 1.0)).toBe(false);
    expect(didCrossZero(-1.0, -0.5)).toBe(false);
  });

  it('does not fire on wrap-around at π', () => {
    // Both near π but on opposite sides — large arc, not a zero crossing
    expect(didCrossZero(Math.PI - 0.1, -Math.PI + 0.1)).toBe(false);
  });
});

describe('getCurrentNote', () => {
  it('returns the current scale degree as a note name', () => {
    const planet = createPlanet({ x: 100, y: 0, noteSequence: 'I4 V4' });
    const note = getCurrentNote(planet, star);
    expect(note).toBe('C4'); // I4 in C Ionian = C4
  });

  it('returns null for empty note sequence', () => {
    const planet = createPlanet({ x: 100, y: 0, noteSequence: '' });
    expect(getCurrentNote(planet, star)).toBeNull();
  });

  it('advances after currentNoteIndex changes', () => {
    const planet = createPlanet({ x: 100, y: 0, noteSequence: 'I4 V4' });
    const advanced = { ...planet, currentNoteIndex: 1 };
    expect(getCurrentNote(advanced, star)).toBe('G4'); // V4 in C = G4
  });
});

describe('setPlanetNoteSequence', () => {
  it('updates note sequence and resets index to 0', () => {
    const planet = createPlanet({ x: 100, y: 0, noteSequence: 'I4 V4' });
    const moved = { ...planet, currentNoteIndex: 1 };
    const updated = setPlanetNoteSequence(moved, 'III4 VII4');
    expect(updated.noteSequence).toEqual(['III4', 'VII4']);
    expect(updated.currentNoteIndex).toBe(0);
  });

  it('filters invalid scale degrees', () => {
    const planet = createPlanet({ x: 100, y: 0 });
    const updated = setPlanetNoteSequence(planet, 'I4 INVALID V4');
    expect(updated.noteSequence).toEqual(['I4', 'V4']);
  });
});

describe('setPlanetRotationSpeed', () => {
  it('updates rotation speed', () => {
    const planet = createPlanet({ x: 100, y: 0, rotationSpeed: 'quarter' });
    const updated = setPlanetRotationSpeed(planet, 'eighth');
    expect(updated.rotationSpeed).toBe('eighth');
  });

  it('does not mutate original', () => {
    const planet = createPlanet({ x: 100, y: 0, rotationSpeed: 'quarter' });
    setPlanetRotationSpeed(planet, 'whole');
    expect(planet.rotationSpeed).toBe('quarter');
  });
});

describe('MAX_PLANETS', () => {
  it('is 20', () => {
    expect(MAX_PLANETS).toBe(20);
  });
});
