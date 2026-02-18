import { describe, it, expect } from 'vitest';
import type {
  Star,
  Planet,
  Satellite,
  SolarSystem,
  Vector2D,
  ScaleDegree,
  MusicalKey,
  MusicalMode,
  NoteDuration,
} from '@/types/celestial';

describe('Celestial Types', () => {
  describe('Vector2D', () => {
    it('should have x and y properties', () => {
      const vector: Vector2D = { x: 10, y: 20 };
      expect(vector.x).toBe(10);
      expect(vector.y).toBe(20);
    });
  });

  describe('ScaleDegree', () => {
    it('should accept valid scale degree strings', () => {
      const degrees: ScaleDegree[] = ['I4', 'V3', 'VII5', 'II4'];
      expect(degrees).toHaveLength(4);
      expect(degrees[0]).toBe('I4');
    });
  });

  describe('MusicalKey', () => {
    it('should include all 12 chromatic notes', () => {
      const keys: MusicalKey[] = [
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
      ];
      expect(keys).toHaveLength(12);
    });
  });

  describe('MusicalMode', () => {
    it('should include all 7 modes', () => {
      const modes: MusicalMode[] = [
        'Ionian',
        'Dorian',
        'Phrygian',
        'Lydian',
        'Mixolydian',
        'Aeolian',
        'Locrian',
      ];
      expect(modes).toHaveLength(7);
    });
  });

  describe('NoteDuration', () => {
    it('should include all standard note durations', () => {
      const durations: NoteDuration[] = [
        'whole',
        'half',
        'quarter',
        'eighth',
        'sixteenth',
      ];
      expect(durations).toHaveLength(5);
    });
  });

  describe('Star', () => {
    it('should have all required properties', () => {
      const star: Star = {
        id: 'star-1',
        type: 'star',
        position: { x: 0, y: 0 },
        mass: 1000,
        bpm: 120,
        key: 'C',
        mode: 'Ionian',
        physicsBody: null,
      };

      expect(star.id).toBe('star-1');
      expect(star.type).toBe('star');
      expect(star.position).toEqual({ x: 0, y: 0 });
      expect(star.mass).toBe(1000);
      expect(star.bpm).toBe(120);
      expect(star.key).toBe('C');
      expect(star.mode).toBe('Ionian');
      expect(star.physicsBody).toBeNull();
    });
  });

  describe('Planet', () => {
    it('should have all required properties', () => {
      const planet: Planet = {
        id: 'planet-1',
        type: 'planet',
        position: { x: 100, y: 0 },
        velocity: { x: 0, y: 5 },
        mass: 50,
        rotation: 0,
        rotationSpeed: 'quarter',
        noteSequence: ['I4', 'V3', 'VI4'],
        currentNoteIndex: 0,
        synthType: 'Synth',
        orbitRadius: 100,
        orbitAngle: 0,
        physicsBody: null,
      };

      expect(planet.id).toBe('planet-1');
      expect(planet.type).toBe('planet');
      expect(planet.position).toEqual({ x: 100, y: 0 });
      expect(planet.velocity).toEqual({ x: 0, y: 5 });
      expect(planet.mass).toBe(50);
      expect(planet.rotation).toBe(0);
      expect(planet.rotationSpeed).toBe('quarter');
      expect(planet.noteSequence).toEqual(['I4', 'V3', 'VI4']);
      expect(planet.currentNoteIndex).toBe(0);
      expect(planet.synthType).toBe('Synth');
      expect(planet.orbitRadius).toBe(100);
      expect(planet.orbitAngle).toBe(0);
      expect(planet.physicsBody).toBeNull();
    });

    it('should support looping through note sequence', () => {
      const planet: Planet = {
        id: 'planet-1',
        type: 'planet',
        position: { x: 100, y: 0 },
        velocity: { x: 0, y: 5 },
        mass: 50,
        rotation: 0,
        rotationSpeed: 'quarter',
        noteSequence: ['I4', 'V3', 'VI4'],
        currentNoteIndex: 2,
        synthType: 'Synth',
        orbitRadius: 100,
        orbitAngle: 0,
        physicsBody: null,
      };

      // Simulate advancing to next note
      const nextIndex =
        (planet.currentNoteIndex + 1) % planet.noteSequence.length;
      expect(nextIndex).toBe(0); // Should loop back to start
    });
  });

  describe('Satellite', () => {
    it('should have all required properties', () => {
      const satellite: Satellite = {
        id: 'sat-1',
        type: 'satellite',
        parentPlanetId: 'planet-1',
        position: { x: 120, y: 0 },
        orbitRadius: 20,
        orbitAngle: 0,
        orbitSpeed: 0.1,
        lastTriggerAngle: -1,
        physicsBody: null,
      };

      expect(satellite.id).toBe('sat-1');
      expect(satellite.type).toBe('satellite');
      expect(satellite.parentPlanetId).toBe('planet-1');
      expect(satellite.position).toEqual({ x: 120, y: 0 });
      expect(satellite.orbitRadius).toBe(20);
      expect(satellite.orbitAngle).toBe(0);
      expect(satellite.orbitSpeed).toBe(0.1);
      expect(satellite.lastTriggerAngle).toBe(-1);
      expect(satellite.physicsBody).toBeNull();
    });
  });

  describe('SolarSystem', () => {
    it('should have all required properties', () => {
      const solarSystem: SolarSystem = {
        star: null,
        planets: [],
        satellites: [],
        isPlaying: false,
        timeScale: 1,
        gravityStrength: 1,
      };

      expect(solarSystem.star).toBeNull();
      expect(solarSystem.planets).toEqual([]);
      expect(solarSystem.satellites).toEqual([]);
      expect(solarSystem.isPlaying).toBe(false);
      expect(solarSystem.timeScale).toBe(1);
      expect(solarSystem.gravityStrength).toBe(1);
    });

    it('should support multiple planets and satellites', () => {
      const solarSystem: SolarSystem = {
        star: {
          id: 'star-1',
          type: 'star',
          position: { x: 0, y: 0 },
          mass: 1000,
          bpm: 120,
          key: 'C',
          mode: 'Ionian',
          physicsBody: null,
        },
        planets: [
          {
            id: 'planet-1',
            type: 'planet',
            position: { x: 100, y: 0 },
            velocity: { x: 0, y: 5 },
            mass: 50,
            rotation: 0,
            rotationSpeed: 'quarter',
            noteSequence: ['I4'],
            currentNoteIndex: 0,
            synthType: 'Synth',
            orbitRadius: 100,
            orbitAngle: 0,
            physicsBody: null,
          },
        ],
        satellites: [
          {
            id: 'sat-1',
            type: 'satellite',
            parentPlanetId: 'planet-1',
            position: { x: 120, y: 0 },
            orbitRadius: 20,
            orbitAngle: 0,
            orbitSpeed: 0.1,
            lastTriggerAngle: -1,
            physicsBody: null,
          },
        ],
        isPlaying: true,
        timeScale: 1.5,
        gravityStrength: 1.2,
      };

      expect(solarSystem.planets).toHaveLength(1);
      expect(solarSystem.satellites).toHaveLength(1);
      expect(solarSystem.isPlaying).toBe(true);
      expect(solarSystem.timeScale).toBe(1.5);
      expect(solarSystem.gravityStrength).toBe(1.2);
    });
  });
});
