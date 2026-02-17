# Solar System Music Sequencer - Design Decisions

## Core Direction: Option A - Realistic Physics → Generative/Experimental Music

Perfect! Option A (realistic physics → generative/experimental music) is the more ambitious and interesting choice.

## Implications of This Choice

**What This Means:**
- The music will be **emergent** and **unpredictable** - users create initial conditions, then observe what happens
- Focus shifts from precise composition to **system design** and **happy accidents**
- More like a musical physics sandbox than a traditional sequencer
- Replayability: same initial setup could evolve differently based on tiny variations

## Revised Design Recommendations

**1. Physics Engine**
- Use **Matter.js** or **Planck.js** for 2D rigid body physics with gravity
- Each body has mass, velocity, gravitational constant
- Collisions should be elastic or semi-elastic

**2. Musical Mappings (FINAL)**
- **Star**: Sets global tempo (BPM) and key/scale (all keys + modes supported)
- **Planet**:
  - **Mass**: Manually configured, affects gravitational pull on satellites and other planets
  - **Rotation speed**: Determines note duration (whole, half, quarter, eighth, sixteenth)
    - Visual rotation syncs with musical timing (1 rotation = 1 note duration cycle)
    - Subtle visual indicator shows next trigger point
  - **Revolution**: When planet completes one orbit around star, advances to next note in sequence
    - Note sequence uses scale degrees with octave (I-VII + octave number)
    - Example: "I4 V3 VI4 III3" (C4, G3, A4, E3 in key of C)
    - Loops back to beginning after last note
    - If note change happens mid-note, current note finishes, next trigger uses new note
  - **Sound**: One synth type per planet (all Tone.js synth types available)
  - **Note sequence**: Text field input (e.g., "I4 V3 VI4 III3")
- **Satellite**:
  - **Triggers sound** when it passes top of orbit (12 o'clock position)
  - **Does NOT have its own note** - plays whatever note the planet is currently on
  - **Distance from planet = volume** (closer = louder, min 1%, never silent)
  - **Orbit**: Forced circular (for v1)
  - **Orbital period**: Realistic physics - farther satellites take longer to orbit (trigger less frequently)
  - **Multiple satellites**: One planet can have many satellites, all play same note at different times
  - **Visual feedback**: Satellite highlights/pulses when triggering
  - Size = visual only (for now)

**3. Essential Controls**
- **Time scale slider**: Speed up/slow down physics (lets users hear long-period orbits quickly)
- **Gravity strength slider**: Global parameter that dramatically changes behavior
- **Freeze/Unfreeze**: Pause physics to add/remove objects
- **Rewind to start**: Reset to initial conditions

**4. User Interaction Flow (FINAL)**
1. Pause physics (or load "Mary Had a Little Lamb" preset)
2. Place star (sets gravitational center + BPM + key/scale)
3. Place planets with:
   - Initial position and velocity vector (drag to set, auto-calculate for circular orbit)
   - Mass (manual input)
   - Rotation speed (note duration: whole, half, quarter, eighth, sixteenth)
   - Note sequence (text field using scale degrees + octave: e.g., "I4 V3 VI4 III3")
   - Synth type (dropdown of Tone.js synths)
4. Place satellites in circular orbit around planets:
   - Distance from planet (determines volume, min 1%)
   - Satellites inherit planet's current note
   - Can add multiple satellites per planet
5. Play and watch/listen
   - Satellites highlight when triggering
   - Planets show rotation with subtle indicator
6. Adjust time scale or gravity if needed
7. Save/Load JSON with all positions, velocities, and initial conditions

**5. Technical Stack Recommendation**
- **Next.js** (React framework, Vercel-ready)
- **Matter.js** (2D physics)
- **Tone.js** (Web Audio wrapper with built-in synths)
- **PixiJS** or **Canvas 2D** (rendering - PixiJS better for many objects)
- **Vitest** (testing)
- **Husky + lint-staged** (pre-commit hooks)

## Final Design Specification ✅

### Core Mechanics
1. **Visual style**: Minimalist/abstract
2. **Scope**: Star + planets + satellites only (no comets in v1)
3. **Platform**: Desktop-only
4. **Physics**: Matter.js for orbital mechanics, music-driven rotation
5. **Collisions**: Elastic bounce (Option B)

### Audio System
6. **Synths**: All Tone.js synth types, one per planet
7. **Keys/Modes**: Support all keys and modes
8. **Note sequences**: Scale degrees + octave (e.g., "I4 V3 VI4 III3"), loops on revolution
9. **Octaves**: Configurable per note in sequence
10. **Volume**: Distance-based, 1-100%, never silent
11. **Object limits**: Max 20 planets, 100 satellites total

### Celestial Bodies
12. **Star defaults**: 120 BPM, random key/mode
13. **Planet mass**: Manually set, affects gravity
14. **Planet size**: Auto-scales based on mass (visual only)
15. **Planet rotation**: Visual syncs to BPM × note duration
16. **Satellite orbits**: Circular only (v1), realistic orbital periods (farther = slower)
17. **Satellite behavior**: Triggers planet's current note, controls timing + volume only
18. **Multiple satellites**: Yes, per planet, all play same note at different times

### UI/UX
19. **Canvas**: Responsive, with zoom controls and pan/drag
20. **Distance markers**: Astronomical units (AU)
21. **Placement**: Drag from toolbar → drop on canvas → config panel
22. **Editing**: Double-click object → modal appears
23. **Satellite placement**: Click planet → zoom in → click to place around planet
24. **Visual feedback**: Satellite highlights on trigger, planet rotation with indicator

### Data Management
25. **Save/Load**: JSON with positions, velocities, initial conditions
26. **Preset**: "Mary Had a Little Lamb" (implement after core features)

## Complete Design - Ready for Implementation ✅

All design decisions have been finalized. See "Final Design Specification" section above for the complete specification.

Key implementation notes:
- **Collision system**: Elastic bounce preserves all objects and creates emergent behavior
- **Mary preset**: Implement after core features are complete
- **Performance limits**: Enforced at 20 planets, 100 satellites
- **UI pattern**: Drag-to-place with double-click editing and zoom-based satellite placement
