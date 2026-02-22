import { describe, it, expect } from 'vitest';
import {
  buildScale,
  scaleDegreeToNote,
  parseScaleDegree,
  isValidScaleDegree,
  parseNoteSequence,
  midiToFrequency,
  noteToMidi,
  noteToConversion,
  scaleDegreeToConversion,
  buildMusicalContext,
  randomKey,
  randomMode,
  MODE_INTERVALS,
  KEY_SEMITONE,
  DEGREE_TO_INDEX,
} from '@/lib/audio/scales';

describe('buildScale', () => {
  it('builds C Ionian (major) scale at octave 4', () => {
    const scale = buildScale('C', 'Ionian', 4);
    expect(scale).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']);
  });

  it('builds A Aeolian (natural minor) scale at octave 4', () => {
    const scale = buildScale('A', 'Aeolian', 4);
    expect(scale).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5']);
  });

  it('builds G Mixolydian scale at octave 3', () => {
    const scale = buildScale('G', 'Mixolydian', 3);
    expect(scale[0]).toBe('G3');
    expect(scale[6]).toBe('F4'); // flat 7th
  });

  it('builds D Dorian scale', () => {
    const scale = buildScale('D', 'Dorian', 4);
    expect(scale[0]).toBe('D4');
    expect(scale[2]).toBe('F4'); // minor 3rd
    expect(scale[6]).toBe('C5'); // flat 7th
  });

  it('returns 7 notes', () => {
    expect(buildScale('C', 'Ionian', 4)).toHaveLength(7);
    expect(buildScale('F#', 'Dorian', 3)).toHaveLength(7);
  });

  it('handles all 12 keys without throwing', () => {
    const keys = Object.keys(KEY_SEMITONE);
    const modes = Object.keys(MODE_INTERVALS);
    for (const key of keys) {
      for (const mode of modes) {
        expect(() =>
          buildScale(key as never, mode as never, 4)
        ).not.toThrow();
      }
    }
  });
});

describe('parseScaleDegree', () => {
  it('parses simple degree', () => {
    expect(parseScaleDegree('I4')).toEqual({ degree: 'I', octave: 4 });
  });

  it('parses multi-character degree', () => {
    expect(parseScaleDegree('VII3')).toEqual({ degree: 'VII', octave: 3 });
    expect(parseScaleDegree('VI5')).toEqual({ degree: 'VI', octave: 5 });
    expect(parseScaleDegree('IV4')).toEqual({ degree: 'IV', octave: 4 });
  });

  it('returns null for invalid input', () => {
    expect(parseScaleDegree('')).toBeNull();
    expect(parseScaleDegree('X4')).toBeNull();
    expect(parseScaleDegree('I')).toBeNull(); // no octave
    expect(parseScaleDegree('4I')).toBeNull();
    expect(parseScaleDegree('VIII4')).toBeNull(); // VIII is not a valid degree
  });

  it('handles whitespace by trimming', () => {
    expect(parseScaleDegree('  V3  ')).toEqual({ degree: 'V', octave: 3 });
  });
});

describe('isValidScaleDegree', () => {
  it('returns true for valid degrees', () => {
    expect(isValidScaleDegree('I4')).toBe(true);
    expect(isValidScaleDegree('V3')).toBe(true);
    expect(isValidScaleDegree('VII5')).toBe(true);
  });

  it('returns false for invalid degrees', () => {
    expect(isValidScaleDegree('X4')).toBe(false);
    expect(isValidScaleDegree('')).toBe(false);
    expect(isValidScaleDegree('I')).toBe(false);
  });
});

describe('parseNoteSequence', () => {
  it('parses a valid sequence string', () => {
    expect(parseNoteSequence('I4 V3 VI4 III3')).toEqual([
      'I4',
      'V3',
      'VI4',
      'III3',
    ]);
  });

  it('filters out invalid entries', () => {
    expect(parseNoteSequence('I4 X5 V3')).toEqual(['I4', 'V3']);
  });

  it('handles extra whitespace', () => {
    expect(parseNoteSequence('  I4   V3  ')).toEqual(['I4', 'V3']);
  });

  it('returns empty array for empty string', () => {
    expect(parseNoteSequence('')).toEqual([]);
  });
});

describe('scaleDegreeToNote', () => {
  it('converts I4 in C Ionian to C4', () => {
    expect(scaleDegreeToNote('I4', 'C', 'Ionian')).toBe('C4');
  });

  it('converts V4 in C Ionian to G4', () => {
    expect(scaleDegreeToNote('V4', 'C', 'Ionian')).toBe('G4');
  });

  it('converts III3 in C Ionian to E3', () => {
    expect(scaleDegreeToNote('III3', 'C', 'Ionian')).toBe('E3');
  });

  it('converts I4 in G Ionian to G4', () => {
    expect(scaleDegreeToNote('I4', 'G', 'Ionian')).toBe('G4');
  });

  it('converts VII4 in C Ionian to B4', () => {
    expect(scaleDegreeToNote('VII4', 'C', 'Ionian')).toBe('B4');
  });

  it('throws for invalid scale degree', () => {
    expect(() => scaleDegreeToNote('X4', 'C', 'Ionian')).toThrow();
  });
});

describe('midiToFrequency', () => {
  it('A4 (MIDI 69) = 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5);
  });

  it('C4 (MIDI 60) ≈ 261.63 Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });

  it('A5 = 880 Hz (one octave above A4)', () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 5);
  });

  it('each semitone up multiplies frequency by 2^(1/12)', () => {
    const ratio = midiToFrequency(70) / midiToFrequency(69);
    expect(ratio).toBeCloseTo(Math.pow(2, 1 / 12), 10);
  });
});

describe('noteToMidi', () => {
  it('C4 = MIDI 60', () => {
    expect(noteToMidi('C4')).toBe(60);
  });

  it('A4 = MIDI 69', () => {
    expect(noteToMidi('A4')).toBe(69);
  });

  it('C5 = MIDI 72', () => {
    expect(noteToMidi('C5')).toBe(72);
  });

  it('handles flat notes (Eb4)', () => {
    expect(noteToMidi('Eb4')).toBe(63);
  });

  it('handles sharp notes (F#4)', () => {
    expect(noteToMidi('F#4')).toBe(66);
  });

  it('throws for invalid note', () => {
    expect(() => noteToMidi('X4')).toThrow();
  });
});

describe('noteToConversion', () => {
  it('returns correct note, frequency, and midi for C4', () => {
    const result = noteToConversion('C4');
    expect(result.note).toBe('C4');
    expect(result.midiNumber).toBe(60);
    expect(result.frequency).toBeCloseTo(261.63, 1);
  });
});

describe('scaleDegreeToConversion', () => {
  it('converts I4 in C Ionian to a full NoteConversion', () => {
    const result = scaleDegreeToConversion('I4', 'C', 'Ionian');
    expect(result.note).toBe('C4');
    expect(result.midiNumber).toBe(60);
    expect(result.frequency).toBeCloseTo(261.63, 1);
  });
});

describe('buildMusicalContext', () => {
  it('builds context with correct key, mode, bpm, and scale', () => {
    const ctx = buildMusicalContext('C', 'Ionian', 120);
    expect(ctx.key).toBe('C');
    expect(ctx.mode).toBe('Ionian');
    expect(ctx.bpm).toBe(120);
    expect(ctx.scale).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']);
  });
});

describe('randomKey / randomMode', () => {
  it('randomKey returns a valid MusicalKey', () => {
    const validKeys = Object.keys(KEY_SEMITONE);
    for (let i = 0; i < 20; i++) {
      expect(validKeys).toContain(randomKey());
    }
  });

  it('randomMode returns a valid MusicalMode', () => {
    const validModes = Object.keys(MODE_INTERVALS);
    for (let i = 0; i < 20; i++) {
      expect(validModes).toContain(randomMode());
    }
  });
});

describe('MODE_INTERVALS', () => {
  it('all modes have exactly 7 intervals', () => {
    for (const [, intervals] of Object.entries(MODE_INTERVALS)) {
      expect(intervals).toHaveLength(7);
    }
  });

  it('all modes start at 0', () => {
    for (const [, intervals] of Object.entries(MODE_INTERVALS)) {
      expect(intervals[0]).toBe(0);
    }
  });
});

describe('DEGREE_TO_INDEX', () => {
  it('maps all 7 degrees', () => {
    expect(Object.keys(DEGREE_TO_INDEX)).toHaveLength(7);
    expect(DEGREE_TO_INDEX['I']).toBe(0);
    expect(DEGREE_TO_INDEX['VII']).toBe(6);
  });
});
