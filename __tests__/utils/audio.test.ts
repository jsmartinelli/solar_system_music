import { describe, it, expect } from 'vitest';
import {
  distanceToVolume,
  dbToLinear,
  linearToDb,
  noteDurationToMs,
  noteDurationToSeconds,
  noteDurationToToneString,
  clampVolume,
  VOLUME_MIN,
  VOLUME_MAX,
  DURATION_BEATS,
  DURATION_TONE_STRING,
  MAX_AUDIBLE_DISTANCE,
} from '@/utils/audio';

describe('distanceToVolume', () => {
  it('returns max volume at distance 0', () => {
    expect(distanceToVolume(0)).toBe(VOLUME_MAX);
  });

  it('returns min volume at max audible distance', () => {
    expect(distanceToVolume(MAX_AUDIBLE_DISTANCE)).toBeCloseTo(VOLUME_MIN);
  });

  it('returns min volume beyond max audible distance', () => {
    expect(distanceToVolume(MAX_AUDIBLE_DISTANCE * 2)).toBeCloseTo(VOLUME_MIN);
  });

  it('volume decreases as distance increases', () => {
    const v1 = distanceToVolume(100);
    const v2 = distanceToVolume(200);
    const v3 = distanceToVolume(400);
    expect(v1).toBeGreaterThan(v2);
    expect(v2).toBeGreaterThan(v3);
  });

  it('never returns below VOLUME_MIN', () => {
    for (let d = 0; d <= 1000; d += 50) {
      expect(distanceToVolume(d)).toBeGreaterThanOrEqual(VOLUME_MIN);
    }
  });

  it('never returns above VOLUME_MAX', () => {
    expect(distanceToVolume(0)).toBeLessThanOrEqual(VOLUME_MAX);
  });

  it('accepts custom maxDistance', () => {
    expect(distanceToVolume(50, 100)).toBeCloseTo(
      distanceToVolume(100, 200),
      5
    );
  });

  it('handles zero maxDistance gracefully', () => {
    expect(distanceToVolume(100, 0)).toBe(VOLUME_MIN);
  });
});

describe('dbToLinear', () => {
  it('0 dB = 1.0', () => {
    expect(dbToLinear(0)).toBeCloseTo(1.0, 10);
  });

  it('-20 dB ≈ 0.1', () => {
    expect(dbToLinear(-20)).toBeCloseTo(0.1, 5);
  });

  it('-60 dB ≈ 0.001', () => {
    expect(dbToLinear(-60)).toBeCloseTo(0.001, 5);
  });
});

describe('linearToDb', () => {
  it('1.0 = 0 dB', () => {
    expect(linearToDb(1.0)).toBeCloseTo(0, 10);
  });

  it('0.1 ≈ -20 dB', () => {
    expect(linearToDb(0.1)).toBeCloseTo(-20, 5);
  });

  it('0 returns -60 (clamped)', () => {
    expect(linearToDb(0)).toBe(-60);
  });

  it('is inverse of dbToLinear', () => {
    expect(linearToDb(dbToLinear(-10))).toBeCloseTo(-10, 8);
    expect(dbToLinear(linearToDb(0.5))).toBeCloseTo(0.5, 8);
  });
});

describe('noteDurationToMs', () => {
  it('whole note at 60 BPM = 4000ms', () => {
    expect(noteDurationToMs('whole', 60)).toBe(4000);
  });

  it('quarter note at 60 BPM = 1000ms', () => {
    expect(noteDurationToMs('quarter', 60)).toBe(1000);
  });

  it('quarter note at 120 BPM = 500ms', () => {
    expect(noteDurationToMs('quarter', 120)).toBe(500);
  });

  it('eighth note at 120 BPM = 250ms', () => {
    expect(noteDurationToMs('eighth', 120)).toBe(250);
  });

  it('sixteenth note at 120 BPM = 125ms', () => {
    expect(noteDurationToMs('sixteenth', 120)).toBe(125);
  });

  it('returns 0 for BPM <= 0', () => {
    expect(noteDurationToMs('quarter', 0)).toBe(0);
  });

  it('whole = 4x quarter duration', () => {
    const bpm = 100;
    expect(noteDurationToMs('whole', bpm)).toBe(
      noteDurationToMs('quarter', bpm) * 4
    );
  });
});

describe('noteDurationToSeconds', () => {
  it('quarter at 60 BPM = 1 second', () => {
    expect(noteDurationToSeconds('quarter', 60)).toBe(1);
  });

  it('half at 120 BPM = 1 second', () => {
    expect(noteDurationToSeconds('half', 120)).toBe(1);
  });
});

describe('noteDurationToToneString', () => {
  it('maps all durations to Tone.js strings', () => {
    expect(noteDurationToToneString('whole')).toBe('1n');
    expect(noteDurationToToneString('half')).toBe('2n');
    expect(noteDurationToToneString('quarter')).toBe('4n');
    expect(noteDurationToToneString('eighth')).toBe('8n');
    expect(noteDurationToToneString('sixteenth')).toBe('16n');
  });
});

describe('clampVolume', () => {
  it('passes through values in range', () => {
    expect(clampVolume(0.5)).toBe(0.5);
  });

  it('clamps below VOLUME_MIN to VOLUME_MIN', () => {
    expect(clampVolume(0)).toBe(VOLUME_MIN);
    expect(clampVolume(-1)).toBe(VOLUME_MIN);
  });

  it('clamps above VOLUME_MAX to VOLUME_MAX', () => {
    expect(clampVolume(2)).toBe(VOLUME_MAX);
  });
});

describe('DURATION_BEATS', () => {
  it('whole = 4 beats', () => {
    expect(DURATION_BEATS.whole).toBe(4);
  });

  it('sixteenth = 0.25 beats', () => {
    expect(DURATION_BEATS.sixteenth).toBe(0.25);
  });

  it('durations are in descending order', () => {
    expect(DURATION_BEATS.whole).toBeGreaterThan(DURATION_BEATS.half);
    expect(DURATION_BEATS.half).toBeGreaterThan(DURATION_BEATS.quarter);
    expect(DURATION_BEATS.quarter).toBeGreaterThan(DURATION_BEATS.eighth);
    expect(DURATION_BEATS.eighth).toBeGreaterThan(DURATION_BEATS.sixteenth);
  });
});

describe('DURATION_TONE_STRING', () => {
  it('contains entries for all 5 durations', () => {
    expect(Object.keys(DURATION_TONE_STRING)).toHaveLength(5);
  });
});
