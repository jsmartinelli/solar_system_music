import type { MusicalKey, MusicalMode } from '@/types/celestial';
import type { NoteConversion, MusicalContext } from '@/types/audio';

/**
 * Semitone intervals for each mode, relative to the root.
 * Ionian (major) = 0,2,4,5,7,9,11
 */
export const MODE_INTERVALS: Record<MusicalMode, number[]> = {
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
};

/**
 * Scale degree names mapped to their 0-based index in the scale array.
 * I = 1st degree (index 0), II = 2nd (index 1), etc.
 */
export const DEGREE_TO_INDEX: Record<string, number> = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
  V: 4,
  VI: 5,
  VII: 6,
};

/**
 * Chromatic note names in order (using sharps by convention, with enharmonic aliases).
 */
export const CHROMATIC_NOTES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

/** Semitone index of each key in the chromatic scale */
export const KEY_SEMITONE: Record<MusicalKey, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

/**
 * Builds the scale (array of note names with octave) for a given key, mode, and starting octave.
 * Returns 7 notes spanning one octave starting from the given octave.
 *
 * @example buildScale('C', 'Ionian', 4) => ['C4','D4','E4','F4','G4','A4','B4']
 */
export function buildScale(
  key: MusicalKey,
  mode: MusicalMode,
  octave: number = 4
): string[] {
  const rootSemitone = KEY_SEMITONE[key];
  const intervals = MODE_INTERVALS[mode];

  return intervals.map((interval) => {
    const totalSemitone = rootSemitone + interval;
    const noteIndex = totalSemitone % 12;
    const octaveOffset = Math.floor(totalSemitone / 12);
    return `${CHROMATIC_NOTES[noteIndex]}${octave + octaveOffset}`;
  });
}

/**
 * Converts a scale degree string (e.g. "I4", "V3", "VII5") to a concrete note name.
 *
 * The format is: Roman numeral (I-VII) followed by octave number.
 * The octave in the degree string specifies which octave the root of that degree is in.
 *
 * @param scaleDegree - e.g. "I4", "V3"
 * @param key - Musical key (e.g. 'C', 'F#')
 * @param mode - Musical mode (e.g. 'Ionian', 'Dorian')
 * @returns The note name with octave (e.g. "C4", "G3")
 */
export function scaleDegreeToNote(
  scaleDegree: string,
  key: MusicalKey,
  mode: MusicalMode
): string {
  const parsed = parseScaleDegree(scaleDegree);
  if (!parsed) {
    throw new Error(`Invalid scale degree: "${scaleDegree}"`);
  }

  const { degree, octave } = parsed;
  const degreeIndex = DEGREE_TO_INDEX[degree];

  if (degreeIndex === undefined) {
    throw new Error(`Unknown degree: "${degree}"`);
  }

  const scale = buildScale(key, mode, octave);
  return scale[degreeIndex];
}

/**
 * Parses a scale degree string into its components.
 * Returns null if the string is not a valid scale degree.
 *
 * @example parseScaleDegree("VII4") => { degree: "VII", octave: 4 }
 */
export function parseScaleDegree(
  scaleDegree: string
): { degree: string; octave: number } | null {
  const match = scaleDegree.trim().match(/^(VII|VI|IV|V|III|II|I)(\d+)$/);
  if (!match) return null;
  return {
    degree: match[1],
    octave: parseInt(match[2], 10),
  };
}

/**
 * Validates a scale degree string.
 */
export function isValidScaleDegree(scaleDegree: string): boolean {
  return parseScaleDegree(scaleDegree) !== null;
}

/**
 * Parses a note sequence string (space-separated scale degrees) into an array.
 * Filters out invalid entries.
 *
 * @example parseNoteSequence("I4 V3 VI4 III3") => ["I4", "V3", "VI4", "III3"]
 */
export function parseNoteSequence(input: string): string[] {
  return input
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0 && isValidScaleDegree(s));
}

/**
 * Converts a MIDI note number to a frequency in Hz.
 * MIDI 69 = A4 = 440 Hz.
 */
export function midiToFrequency(midiNumber: number): number {
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

/**
 * Converts a note name with octave (e.g. "C4") to a MIDI number.
 * C-1 = 0, C0 = 12, C4 = 60, A4 = 69.
 */
export function noteToMidi(note: string): number {
  const match = note.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid note: "${note}"`);

  const noteName = match[1];
  const octave = parseInt(match[2], 10);

  // Find semitone within octave
  const noteMap: Record<string, number> = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
  };

  const semitone = noteMap[noteName];
  if (semitone === undefined) throw new Error(`Unknown note name: "${noteName}"`);

  return (octave + 1) * 12 + semitone;
}

/**
 * Converts a note name with octave to a NoteConversion object.
 */
export function noteToConversion(note: string): NoteConversion {
  const midiNumber = noteToMidi(note);
  return {
    note,
    frequency: midiToFrequency(midiNumber),
    midiNumber,
  };
}

/**
 * Converts a scale degree to a full NoteConversion object.
 */
export function scaleDegreeToConversion(
  scaleDegree: string,
  key: MusicalKey,
  mode: MusicalMode
): NoteConversion {
  const note = scaleDegreeToNote(scaleDegree, key, mode);
  return noteToConversion(note);
}

/**
 * Builds a full MusicalContext from key, mode, and BPM.
 */
export function buildMusicalContext(
  key: MusicalKey,
  mode: MusicalMode,
  bpm: number
): MusicalContext {
  return {
    key,
    mode,
    bpm,
    scale: buildScale(key, mode, 4),
  };
}

/**
 * Returns a random key from all 12 chromatic keys.
 */
export function randomKey(): MusicalKey {
  const keys = Object.keys(KEY_SEMITONE) as MusicalKey[];
  return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Returns a random mode from all 7 modes.
 */
export function randomMode(): MusicalMode {
  const modes = Object.keys(MODE_INTERVALS) as MusicalMode[];
  return modes[Math.floor(Math.random() * modes.length)];
}
