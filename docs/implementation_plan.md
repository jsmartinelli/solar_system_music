# Solar System Music Sequencer - Implementation Plan

## Phase 1: Project Foundation & Core Infrastructure
**Goal**: Set up Next.js project with all dependencies, testing, linting, and basic project structure

- Initialize Next.js project with TypeScript
- Install and configure dependencies (Matter.js, Tone.js, Vitest, Husky, lint-staged)
- Set up pre-commit hooks and linting rules
- Create basic project structure (components/, lib/, types/, utils/)
- Set up Vitest with initial test configuration
- Create type definitions for core entities (Star, Planet, Satellite, SolarSystem)
- Implement basic responsive canvas component
- Write tests for type definitions and canvas setup

## Phase 2: Physics Engine Integration
**Goal**: Integrate Matter.js and implement orbital mechanics

- Set up Matter.js physics engine wrapper
- Implement gravitational physics for circular orbits
- Create utility functions for orbital velocity calculation
- Implement elastic collision detection and response
- Create physics update loop synchronized with animation frame
- Add time scale control (speed up/slow down physics)
- Add gravity strength parameter
- Write tests for physics calculations and orbit stability
- Implement pause/play/rewind functionality

## Phase 3: Audio System Foundation
**Goal**: Integrate Tone.js and implement musical note system

- Set up Tone.js audio context and initialization
- Implement scale degree to note conversion system (I-VII with octaves)
- Create synth manager to handle multiple synth instances (max 20)
- Implement key/mode system with all keys and modes
- Create BPM-based timing clock
- Implement volume control based on distance (1-100%)
- Add audio initialization and user gesture handling
- Write tests for note conversion and timing accuracy
- Implement polyphony limits (20 planets, 100 satellites)

## Phase 4: Celestial Body Rendering & Visuals
**Goal**: Implement visual rendering for star, planets, and satellites

- Create Star component with visual representation
- Create Planet component with mass-based size scaling
- Implement planet rotation visualization synced to note duration
- Add subtle rotation indicator for next trigger point
- Create Satellite component with highlight/pulse on trigger
- Implement orbit path visualization (circular)
- Add distance markers in astronomical units (AU)
- Implement zoom and pan controls
- Add responsive canvas resizing
- Write visual regression tests

## Phase 5: Star & Planet Implementation
**Goal**: Implement star and planet entities with full musical capabilities

- Implement Star entity with BPM and key/scale configuration
- Create random key/mode generator for star defaults
- Implement Planet entity with all properties (mass, rotation, note sequence, synth type)
- Create note sequence parser (e.g., "I4 V3 VI4 III3")
- Implement revolution tracking and note sequence progression
- Handle note change timing (mid-note vs. on-trigger)
- Connect planets to synth instances
- Implement planet-to-planet gravitational interaction
- Write comprehensive tests for planet behavior and note sequences

## Phase 6: Satellite Implementation & Trigger System
**Goal**: Implement satellites with circular orbits and trigger mechanics

- Implement Satellite entity with circular orbit constraint
- Create trigger detection system (12 o'clock position)
- Implement realistic orbital period calculation based on distance
- Connect satellite triggers to planet's current note
- Implement distance-based volume calculation
- Add satellite highlight/pulse animation on trigger
- Handle multiple satellites per planet
- Write tests for trigger accuracy and timing
- Test volume scaling across different distances

## Phase 7: UI - Toolbar & Drag-to-Place
**Goal**: Build toolbar and drag-to-place interaction system

- Create toolbar component with draggable star/planet/satellite items
- Implement drag-and-drop from toolbar to canvas
- Create configuration panel/modal for new objects
- Add form inputs for all object properties
- Implement Tone.js synth type dropdown (all available synths)
- Add note sequence text input with validation
- Implement velocity vector visualization during placement
- Add auto-calculation for circular orbit velocity
- Write tests for drag-drop and form validation

## Phase 8: UI - Editing & Object Management
**Goal**: Implement double-click editing and object selection

- Implement object selection on double-click
- Create edit modal with all object properties
- Enable live editing during simulation (change note sequence, BPM, etc.)
- Implement delete functionality
- Add object limit warnings (20 planets, 100 satellites)
- Create satellite placement mode (click planet → zoom → place satellites)
- Implement zoom-in animation when entering satellite placement mode
- Write tests for editing workflows and limits

## Phase 9: Save/Load System
**Goal**: Implement JSON save/load functionality

- Design JSON schema for solar system state
- Implement serialization of all objects (positions, velocities, properties)
- Create save function (download JSON file)
- Implement load function (file upload/drag-drop)
- Add initial conditions storage
- Implement state restoration from JSON
- Add error handling for malformed JSON
- Write tests for save/load round-trip accuracy

## Phase 10: Polish, Testing & Mary Preset
**Goal**: Final polish, comprehensive testing, and optional preset

- Implement comprehensive end-to-end tests
- Achieve 80%+ code coverage
- Fix any visual or audio bugs
- Optimize rendering performance for 100 satellites
- Add keyboard shortcuts (space = pause/play, etc.)
- Implement "Mary Had a Little Lamb" preset (optional nice-to-have)
- Create user documentation/help text
- Final accessibility review
- Performance profiling and optimization
- Deploy to Vercel

---

**Each phase is scoped to be achievable within ~1 day of Claude Pro token usage**, focusing on a cohesive set of related features with tests.
