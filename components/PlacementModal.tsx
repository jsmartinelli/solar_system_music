'use client';

import { useState } from 'react';
import type { MusicalKey, MusicalMode, NoteDuration, Vector2D } from '@/types/celestial';
import { SYNTH_TYPES } from '@/lib/audio/synthManager';
import type { SynthType } from '@/lib/audio/synthManager';
import { parseNoteSequence } from '@/lib/audio/scales';

const MUSICAL_KEYS: MusicalKey[] = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
];

const MUSICAL_MODES: MusicalMode[] = [
  'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
];

const NOTE_DURATIONS: { value: NoteDuration; label: string }[] = [
  { value: 'whole', label: 'Whole' },
  { value: 'half', label: 'Half' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'eighth', label: 'Eighth' },
  { value: 'sixteenth', label: 'Sixteenth' },
];

// ─── Star options ──────────────────────────────────────────────────────────────

export interface StarPlacementOptions {
  bpm: number;
  key: MusicalKey;
  mode: MusicalMode;
}

// ─── Planet options ────────────────────────────────────────────────────────────

export interface PlanetPlacementOptions {
  mass: number;
  noteSequence: string;
  rotationSpeed: NoteDuration;
  synthType: SynthType;
  clockwise: boolean;
}

// ─── Combined confirm payload ──────────────────────────────────────────────────

export type PlacementConfirmOptions = StarPlacementOptions | PlanetPlacementOptions;

interface PlacementModalProps {
  entityType: 'star' | 'planet';
  worldPosition: Vector2D;
  onConfirm: (options: PlacementConfirmOptions) => void;
  onCancel: () => void;
}

// ─── Star form ─────────────────────────────────────────────────────────────────

function StarForm({ onConfirm }: { onConfirm: (o: StarPlacementOptions) => void }) {
  const [bpm, setBpm] = useState(100);
  const [key, setKey] = useState<MusicalKey>('C');
  const [mode, setMode] = useState<MusicalMode>('Ionian');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          BPM <span className="text-gray-500">(20–300)</span>
        </label>
        <input
          type="number"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(Math.min(300, Math.max(20, parseInt(e.target.value) || 20)))}
          data-testid="star-bpm-input"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Key</label>
        <select
          value={key}
          onChange={(e) => setKey(e.target.value as MusicalKey)}
          data-testid="star-key-select"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
        >
          {MUSICAL_KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as MusicalMode)}
          data-testid="star-mode-select"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
        >
          {MUSICAL_MODES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onConfirm({ bpm, key, mode })}
        data-testid="placement-confirm-button"
        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium py-2 rounded transition-colors"
      >
        Place Star
      </button>
    </div>
  );
}

// ─── Planet form ───────────────────────────────────────────────────────────────

function PlanetForm({ onConfirm }: { onConfirm: (o: PlanetPlacementOptions) => void }) {
  const [mass, setMass] = useState(100);
  const [noteSequence, setNoteSequence] = useState('I4 III4 V4');
  const [rotationSpeed, setRotationSpeed] = useState<NoteDuration>('quarter');
  const [synthType, setSynthType] = useState<SynthType>('Synth');
  const [clockwise, setClockwise] = useState(true);
  const [noteError, setNoteError] = useState<string | null>(null);

  const handleNoteSequenceChange = (value: string) => {
    setNoteSequence(value);
    const tokens = value.trim().split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length === 0) {
      setNoteError('Enter at least one scale degree (e.g. I4 III4 V4)');
      return;
    }
    const valid = parseNoteSequence(value);
    const invalid = tokens.filter((t) => !valid.includes(t));
    setNoteError(
      invalid.length > 0
        ? `Invalid token(s): ${invalid.join(', ')}. Use Roman numerals I–VII followed by octave (e.g. V4)`
        : null
    );
  };

  const isValid = noteError === null && noteSequence.trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Mass <span className="text-gray-500">(10–10000)</span>
        </label>
        <input
          type="number"
          min={10}
          max={10000}
          value={mass}
          onChange={(e) => setMass(Math.min(10000, Math.max(10, parseInt(e.target.value) || 10)))}
          data-testid="planet-mass-input"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Note Sequence <span className="text-gray-500">(e.g. I4 III4 V4)</span>
        </label>
        <input
          type="text"
          value={noteSequence}
          onChange={(e) => handleNoteSequenceChange(e.target.value)}
          data-testid="planet-note-sequence-input"
          placeholder="I4 III4 V4"
          className={[
            'w-full bg-gray-800 border rounded px-3 py-1.5 text-sm text-white focus:outline-none',
            noteError ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-blue-500',
          ].join(' ')}
        />
        {noteError && (
          <p className="text-red-400 text-xs mt-1" data-testid="note-sequence-error">
            {noteError}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Rotation Speed</label>
        <select
          value={rotationSpeed}
          onChange={(e) => setRotationSpeed(e.target.value as NoteDuration)}
          data-testid="planet-rotation-speed-select"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {NOTE_DURATIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Synth Type</label>
        <select
          value={synthType}
          onChange={(e) => setSynthType(e.target.value as SynthType)}
          data-testid="planet-synth-type-select"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {SYNTH_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="clockwise"
          checked={clockwise}
          onChange={(e) => setClockwise(e.target.checked)}
          data-testid="planet-clockwise-checkbox"
          className="accent-blue-500"
        />
        <label htmlFor="clockwise" className="text-xs text-gray-400 cursor-pointer select-none">
          Clockwise orbit
        </label>
      </div>

      <button
        onClick={() =>
          isValid &&
          onConfirm({ mass, noteSequence, rotationSpeed, synthType, clockwise })
        }
        disabled={!isValid}
        data-testid="placement-confirm-button"
        className={[
          'w-full text-white text-sm font-medium py-2 rounded transition-colors',
          isValid
            ? 'bg-blue-600 hover:bg-blue-500'
            : 'bg-gray-700 cursor-not-allowed opacity-60',
        ].join(' ')}
      >
        Place Planet
      </button>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export default function PlacementModal({
  entityType,
  worldPosition,
  onConfirm,
  onCancel,
}: PlacementModalProps) {
  const title = entityType === 'star' ? 'Configure Star' : 'Configure Planet';
  const accentColor = entityType === 'star' ? 'text-yellow-400' : 'text-blue-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="placement-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
        data-testid="placement-modal-backdrop"
      />

      {/* Panel */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-semibold ${accentColor}`}>{title}</h2>
          <span className="text-gray-600 text-xs tabular-nums">
            ({Math.round(worldPosition.x)}, {Math.round(worldPosition.y)})
          </span>
        </div>

        {entityType === 'star' ? (
          <StarForm onConfirm={(o) => onConfirm(o)} />
        ) : (
          <PlanetForm onConfirm={(o) => onConfirm(o)} />
        )}

        <button
          onClick={onCancel}
          data-testid="placement-cancel-button"
          className="mt-3 w-full text-gray-500 hover:text-gray-300 text-xs py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
