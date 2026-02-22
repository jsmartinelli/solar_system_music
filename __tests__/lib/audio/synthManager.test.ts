import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Tone.js mock ---
// Web Audio API is unavailable in jsdom, so we mock Tone entirely.

const mockDispose = vi.fn();
const mockTriggerAttackRelease = vi.fn();
const mockTriggerAttack = vi.fn();
const mockConnect = vi.fn();
const mockVolumeValue = { value: 0 };

function makeSynth() {
  return {
    triggerAttackRelease: mockTriggerAttackRelease,
    triggerAttack: mockTriggerAttack,
    connect: mockConnect.mockReturnThis(),
    dispose: mockDispose,
    toDestination: vi.fn().mockReturnThis(),
  };
}

const mockVolume = {
  volume: mockVolumeValue,
  toDestination: vi.fn().mockReturnThis(),
  dispose: mockDispose,
};

vi.mock('tone', () => ({
  PolySynth: vi.fn().mockImplementation(() => makeSynth()),
  Synth: vi.fn(),
  AMSynth: vi.fn(),
  FMSynth: vi.fn(),
  DuoSynth: vi.fn(),
  MonoSynth: vi.fn(),
  MembraneSynth: vi.fn().mockImplementation(() => makeSynth()),
  MetalSynth: vi.fn().mockImplementation(() => makeSynth()),
  PluckSynth: vi.fn().mockImplementation(() => makeSynth()),
  NoiseSynth: vi.fn().mockImplementation(() => makeSynth()),
  Volume: vi.fn().mockImplementation(() => ({ ...mockVolume })),
  now: vi.fn().mockReturnValue(0),
}));

import {
  createSynthManager,
  addSynth,
  removeSynth,
  triggerNote,
  setSynthVolume,
  isAtLimit,
  getSynthCount,
  disposeAll,
  isValidSynthType,
  SYNTH_TYPES,
} from '@/lib/audio/synthManager';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createSynthManager', () => {
  it('creates manager with empty instances and default limit', () => {
    const manager = createSynthManager();
    expect(manager.instances.size).toBe(0);
    expect(manager.maxInstances).toBe(20);
  });

  it('accepts custom max instances', () => {
    const manager = createSynthManager(5);
    expect(manager.maxInstances).toBe(5);
  });
});

describe('addSynth', () => {
  it('adds a synth instance for a new planet', () => {
    const manager = createSynthManager();
    const instance = addSynth(manager, 'planet-1', 'Synth');
    expect(instance).not.toBeNull();
    expect(manager.instances.has('planet-1')).toBe(true);
  });

  it('returns existing instance if planet already has a synth', () => {
    const manager = createSynthManager();
    const first = addSynth(manager, 'planet-1', 'Synth');
    const second = addSynth(manager, 'planet-1', 'FMSynth');
    expect(first).toBe(second);
    expect(manager.instances.size).toBe(1);
  });

  it('returns null when limit is reached', () => {
    const manager = createSynthManager(2);
    addSynth(manager, 'p1', 'Synth');
    addSynth(manager, 'p2', 'Synth');
    const result = addSynth(manager, 'p3', 'Synth');
    expect(result).toBeNull();
    expect(manager.instances.size).toBe(2);
  });

  it('stores the correct synthType', () => {
    const manager = createSynthManager();
    const instance = addSynth(manager, 'p1', 'AMSynth');
    expect(instance?.synthType).toBe('AMSynth');
  });

  it('can add all supported synth types without throwing', () => {
    const manager = createSynthManager(SYNTH_TYPES.length);
    for (const type of SYNTH_TYPES) {
      expect(() => addSynth(manager, `planet-${type}`, type)).not.toThrow();
    }
  });
});

describe('removeSynth', () => {
  it('removes and disposes a synth', () => {
    const manager = createSynthManager();
    addSynth(manager, 'p1', 'Synth');
    removeSynth(manager, 'p1');
    expect(manager.instances.has('p1')).toBe(false);
    expect(mockDispose).toHaveBeenCalled();
  });

  it('does nothing for a non-existent planet', () => {
    const manager = createSynthManager();
    expect(() => removeSynth(manager, 'ghost')).not.toThrow();
  });
});

describe('triggerNote', () => {
  it('does nothing for a non-existent planet', () => {
    const manager = createSynthManager();
    expect(() => triggerNote(manager, 'ghost', 'C4', 1, 1)).not.toThrow();
  });

  it('calls triggerAttackRelease on PolySynth variants', () => {
    const manager = createSynthManager();
    addSynth(manager, 'p1', 'Synth');
    triggerNote(manager, 'p1', 'C4', 0.5, 0.8);
    expect(mockTriggerAttackRelease).toHaveBeenCalledWith('C4', 0.5, 0);
  });
});

describe('setSynthVolume', () => {
  it('does nothing for non-existent planet', () => {
    const manager = createSynthManager();
    expect(() => setSynthVolume(manager, 'ghost', 0.5)).not.toThrow();
  });

  it('updates volume node value', () => {
    const manager = createSynthManager();
    addSynth(manager, 'p1', 'Synth');
    // Should not throw
    expect(() => setSynthVolume(manager, 'p1', 0.5)).not.toThrow();
  });
});

describe('isAtLimit', () => {
  it('returns false when under limit', () => {
    const manager = createSynthManager(3);
    addSynth(manager, 'p1', 'Synth');
    expect(isAtLimit(manager)).toBe(false);
  });

  it('returns true when at limit', () => {
    const manager = createSynthManager(1);
    addSynth(manager, 'p1', 'Synth');
    expect(isAtLimit(manager)).toBe(true);
  });
});

describe('getSynthCount', () => {
  it('returns 0 initially', () => {
    expect(getSynthCount(createSynthManager())).toBe(0);
  });

  it('increments as synths are added', () => {
    const manager = createSynthManager();
    addSynth(manager, 'p1', 'Synth');
    addSynth(manager, 'p2', 'Synth');
    expect(getSynthCount(manager)).toBe(2);
  });
});

describe('disposeAll', () => {
  it('disposes all instances and clears the map', () => {
    const manager = createSynthManager();
    addSynth(manager, 'p1', 'Synth');
    addSynth(manager, 'p2', 'Synth');
    disposeAll(manager);
    expect(manager.instances.size).toBe(0);
    expect(mockDispose).toHaveBeenCalled();
  });
});

describe('isValidSynthType', () => {
  it('returns true for all defined synth types', () => {
    for (const type of SYNTH_TYPES) {
      expect(isValidSynthType(type)).toBe(true);
    }
  });

  it('returns false for unknown types', () => {
    expect(isValidSynthType('SuperSynth')).toBe(false);
    expect(isValidSynthType('')).toBe(false);
  });
});

describe('SYNTH_TYPES', () => {
  it('contains 9 synth types', () => {
    expect(SYNTH_TYPES).toHaveLength(9);
  });

  it('includes Synth, AMSynth, FMSynth', () => {
    expect(SYNTH_TYPES).toContain('Synth');
    expect(SYNTH_TYPES).toContain('AMSynth');
    expect(SYNTH_TYPES).toContain('FMSynth');
  });
});
