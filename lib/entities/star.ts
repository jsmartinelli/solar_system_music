import type { Star, MusicalKey, MusicalMode } from '@/types/celestial';
import { createStaticBody } from '@/lib/physics/collisions';
import { randomKey, randomMode } from '@/lib/audio/scales';

/** Visual radius of the star in world units. */
export const STAR_VISUAL_RADIUS = 18;

/** Mass of the star — large enough to hold planets in orbit at reasonable distances. */
export const STAR_DEFAULT_MASS = 50000;

/** Default BPM for a new star. */
export const STAR_DEFAULT_BPM = 120;

let nextStarId = 1;

export interface CreateStarOptions {
  x?: number;
  y?: number;
  mass?: number;
  bpm?: number;
  key?: MusicalKey;
  mode?: MusicalMode;
}

/**
 * Creates a Star entity with a static Matter.js physics body.
 * The star is the gravitational centre of the system and sets
 * the global BPM and musical key/mode.
 *
 * If key/mode are not provided, random values are chosen (per the design spec).
 */
export function createStar(options: CreateStarOptions = {}): Star {
  const {
    x = 0,
    y = 0,
    mass = STAR_DEFAULT_MASS,
    bpm = STAR_DEFAULT_BPM,
    key = randomKey(),
    mode = randomMode(),
  } = options;

  const physicsBody = createStaticBody(x, y, STAR_VISUAL_RADIUS, mass);

  return {
    id: `star-${nextStarId++}`,
    type: 'star',
    position: { x, y },
    mass,
    bpm,
    key,
    mode,
    physicsBody,
  };
}

/**
 * Returns a star with updated BPM.
 */
export function setStarBpm(star: Star, bpm: number): Star {
  return { ...star, bpm: Math.max(1, Math.min(300, bpm)) };
}

/**
 * Returns a star with a new key and/or mode.
 */
export function setStarKey(
  star: Star,
  key: MusicalKey,
  mode: MusicalMode
): Star {
  return { ...star, key, mode };
}

/**
 * Resets the star ID counter (for testing).
 */
export function resetStarIdCounter(): void {
  nextStarId = 1;
}
