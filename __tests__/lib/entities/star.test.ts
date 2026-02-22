import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStar,
  setStarBpm,
  setStarKey,
  resetStarIdCounter,
  STAR_DEFAULT_BPM,
  STAR_DEFAULT_MASS,
  STAR_VISUAL_RADIUS,
} from '@/lib/entities/star';
import { KEY_SEMITONE, MODE_INTERVALS } from '@/lib/audio/scales';

beforeEach(() => {
  resetStarIdCounter();
});

describe('createStar', () => {
  it('creates a star with default values', () => {
    const star = createStar();
    expect(star.type).toBe('star');
    expect(star.mass).toBe(STAR_DEFAULT_MASS);
    expect(star.bpm).toBe(STAR_DEFAULT_BPM);
    expect(star.position.x).toBe(0);
    expect(star.position.y).toBe(0);
  });

  it('assigns a unique id', () => {
    const a = createStar();
    const b = createStar();
    expect(a.id).not.toBe(b.id);
  });

  it('accepts custom position', () => {
    const star = createStar({ x: 100, y: 200 });
    expect(star.position.x).toBe(100);
    expect(star.position.y).toBe(200);
  });

  it('accepts custom bpm', () => {
    const star = createStar({ bpm: 80 });
    expect(star.bpm).toBe(80);
  });

  it('accepts custom key and mode', () => {
    const star = createStar({ key: 'G', mode: 'Dorian' });
    expect(star.key).toBe('G');
    expect(star.mode).toBe('Dorian');
  });

  it('picks a valid random key when none is provided', () => {
    const validKeys = Object.keys(KEY_SEMITONE);
    for (let i = 0; i < 10; i++) {
      resetStarIdCounter();
      const star = createStar();
      expect(validKeys).toContain(star.key);
    }
  });

  it('picks a valid random mode when none is provided', () => {
    const validModes = Object.keys(MODE_INTERVALS);
    for (let i = 0; i < 10; i++) {
      resetStarIdCounter();
      const star = createStar();
      expect(validModes).toContain(star.mode);
    }
  });

  it('creates a static physics body at the star position', () => {
    const star = createStar({ x: 50, y: 75 });
    expect(star.physicsBody).not.toBeNull();
    expect(star.physicsBody!.isStatic).toBe(true);
    expect(star.physicsBody!.position.x).toBeCloseTo(50);
    expect(star.physicsBody!.position.y).toBeCloseTo(75);
  });
});

describe('setStarBpm', () => {
  it('updates bpm', () => {
    const star = createStar({ bpm: 120 });
    const updated = setStarBpm(star, 90);
    expect(updated.bpm).toBe(90);
  });

  it('clamps to minimum 1', () => {
    const star = createStar();
    expect(setStarBpm(star, 0).bpm).toBe(1);
    expect(setStarBpm(star, -10).bpm).toBe(1);
  });

  it('clamps to maximum 300', () => {
    const star = createStar();
    expect(setStarBpm(star, 999).bpm).toBe(300);
  });

  it('does not mutate original star', () => {
    const star = createStar({ bpm: 120 });
    setStarBpm(star, 90);
    expect(star.bpm).toBe(120);
  });
});

describe('setStarKey', () => {
  it('updates key and mode', () => {
    const star = createStar({ key: 'C', mode: 'Ionian' });
    const updated = setStarKey(star, 'F#', 'Dorian');
    expect(updated.key).toBe('F#');
    expect(updated.mode).toBe('Dorian');
  });

  it('does not mutate original star', () => {
    const star = createStar({ key: 'C', mode: 'Ionian' });
    setStarKey(star, 'G', 'Aeolian');
    expect(star.key).toBe('C');
  });
});

describe('STAR constants', () => {
  it('STAR_DEFAULT_BPM is 120', () => {
    expect(STAR_DEFAULT_BPM).toBe(120);
  });

  it('STAR_VISUAL_RADIUS is positive', () => {
    expect(STAR_VISUAL_RADIUS).toBeGreaterThan(0);
  });

  it('STAR_DEFAULT_MASS is large enough for orbital mechanics', () => {
    expect(STAR_DEFAULT_MASS).toBeGreaterThan(1000);
  });
});
