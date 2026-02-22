'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { renderScene, planetRadiusFromMass } from '@/lib/rendering/renderer';
import {
  createViewport,
  zoomToward,
  applyPan,
  resetViewport,
  resizeViewport,
  screenToWorld,
  worldToScreen,
} from '@/lib/rendering/viewport';
import type { ViewportState } from '@/types/ui';
import type { Vector2D, Planet } from '@/types/celestial';
import {
  createSimulation,
  addStar,
  addPlanet,
  addSatellite,
  removePlanet,
  updatePlanetProperties,
  playSimulation,
  pauseSimulation,
  rewindSimulation,
  setSimulationTimeScale,
  setSimulationGravity,
  tickSimulation,
  simulationToSceneObjects,
  destroySimulation,
} from '@/lib/simulation/simulation';
import type { SimulationState, PlanetUpdateOptions } from '@/lib/simulation/simulation';
import { initAudioContext, isAudioReady } from '@/lib/audio/context';
import PlacementModal from './PlacementModal';
import type { PlacementConfirmOptions, StarPlacementOptions, PlanetPlacementOptions } from './PlacementModal';
import SatelliteModal from './SatelliteModal';
import type { SatelliteConfirmOptions } from './SatelliteModal';
import PlanetEditModal from './PlanetEditModal';

interface CanvasProps {
  className?: string;
  isPlaying: boolean;
  timeScale: number;
  gravityStrength: number;
  onIsPlayingChange: (playing: boolean) => void;
  onAudioReadyChange: (ready: boolean) => void;
  onCountsChange: (planetCount: number, satelliteCount: number) => void;
  /** Set to true by Toolbar when satellite tool is selected */
  satelliteToolActive: boolean;
  onSatelliteToolActiveChange: (active: boolean) => void;
  /** Incrementing value — Canvas rewinds simulation when this changes */
  rewindKey?: number;
}

// ─── Default demo scene ───────────────────────────────────────────────────────

function buildDefaultSimulation(): SimulationState {
  let sim = createSimulation();

  sim = addStar(sim, { x: 0, y: 0, bpm: 100, key: 'C', mode: 'Ionian' });

  sim = addPlanet(sim, { x: 150, y: 0, mass: 80,  rotationSpeed: 'quarter',   noteSequence: 'I4 III4 V4',     synthType: 'Synth'      });
  sim = addPlanet(sim, { x: 240, y: 0, mass: 150, rotationSpeed: 'eighth',    noteSequence: 'V3 VII3 II4',    synthType: 'AMSynth'    });
  sim = addPlanet(sim, { x: 340, y: 0, mass: 50,  rotationSpeed: 'sixteenth', noteSequence: 'I5 VI4 III5 V4', synthType: 'PluckSynth' });

  const p1 = sim.solarSystem.planets[0].id;
  const p2 = sim.solarSystem.planets[1].id;
  const p3 = sim.solarSystem.planets[2].id;

  sim = addSatellite(sim, { parentPlanetId: p1, orbitRadius: 30, startAngle: 0 });
  sim = addSatellite(sim, { parentPlanetId: p1, orbitRadius: 48, startAngle: Math.PI });
  sim = addSatellite(sim, { parentPlanetId: p2, orbitRadius: 35, startAngle: Math.PI / 2 });
  sim = addSatellite(sim, { parentPlanetId: p3, orbitRadius: 25, startAngle: Math.PI * 1.5 });

  return sim;
}

// ─── Hit-test ─────────────────────────────────────────────────────────────────

function hitTestPlanets(worldPos: Vector2D, sim: SimulationState): Planet | null {
  for (const planet of sim.solarSystem.planets) {
    const r = planetRadiusFromMass(planet.mass);
    const dx = worldPos.x - planet.position.x;
    const dy = worldPos.y - planet.position.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= r * 2) return planet;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Canvas({
  className = '',
  isPlaying,
  timeScale,
  gravityStrength,
  onIsPlayingChange,
  onAudioReadyChange,
  onCountsChange,
  satelliteToolActive,
  onSatelliteToolActiveChange,
  rewindKey,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [audioReady, setAudioReady] = useState(false);

  // Viewport and simulation in refs — mutated each frame without triggering re-renders.
  const viewportRef = useRef<ViewportState>(createViewport(0, 0));
  const simRef = useRef<SimulationState | null>(null);

  // Pan drag state
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Animation frame handle
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  // ─── Modal / satellite placement state ───────────────────────────────────

  const [placementModal, setPlacementModal] = useState<{
    entityType: 'star' | 'planet';
    worldPos: Vector2D;
  } | null>(null);

  const [satelliteModal, setSatelliteModal] = useState<{
    planet: Planet;
    clickWorldPos: Vector2D;
  } | null>(null);

  const [editModal, setEditModal] = useState<Planet | null>(null);

  // Two-stage satellite placement:
  // stage 1: satelliteToolActive=true, no planet selected yet (clicking to pick a planet)
  // stage 2: planet selected, clicking to set orbit position
  const [satellitePlanetId, setSatellitePlanetId] = useState<string | null>(null);

  // Mouse position for interactive satellite ring preview
  const mouseWorldRef = useRef<Vector2D | null>(null);

  // ─── Sync isPlaying prop → simulation ────────────────────────────────────

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ─── Sync timeScale prop → simulation ────────────────────────────────────

  useEffect(() => {
    if (!simRef.current) return;
    simRef.current = setSimulationTimeScale(simRef.current, timeScale);
  }, [timeScale]);

  // ─── Sync gravityStrength prop → simulation ───────────────────────────────

  useEffect(() => {
    if (!simRef.current) return;
    simRef.current = setSimulationGravity(simRef.current, gravityStrength);
  }, [gravityStrength]);

  // ─── Rewind key ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!rewindKey || !simRef.current) return;
    simRef.current = rewindSimulation(simRef.current);
    onIsPlayingChange(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewindKey]);

  // ─── Sync sim isPlaying → simRef ─────────────────────────────────────────

  useEffect(() => {
    if (!simRef.current) return;
    const simIsPlaying = simRef.current.solarSystem.isPlaying;
    if (isPlaying && !simIsPlaying) {
      lastTickRef.current = performance.now();
      simRef.current = playSimulation(simRef.current);
    } else if (!isPlaying && simIsPlaying) {
      simRef.current = pauseSimulation(simRef.current);
    }
  }, [isPlaying]);

  // ─── Helper: emit current counts ─────────────────────────────────────────

  const emitCounts = useCallback(() => {
    if (!simRef.current) return;
    const { planets, satellites } = simRef.current.solarSystem;
    onCountsChange(planets.length, satellites.length);
  }, [onCountsChange]);

  // ─── Initialise simulation once ──────────────────────────────────────────

  useEffect(() => {
    const sim = buildDefaultSimulation();
    simRef.current = sim;
    onCountsChange(sim.solarSystem.planets.length, sim.solarSystem.satellites.length);

    return () => {
      if (simRef.current) {
        destroySimulation(simRef.current);
        simRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Resize handling ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    viewportRef.current = resizeViewport(
      viewportRef.current,
      dimensions.width,
      dimensions.height
    );
  }, [dimensions]);

  // ─── Render + simulation loop ─────────────────────────────────────────────

  // Keep refs for satellite state so the RAF loop can read them without stale closures
  const satelliteToolActiveRef = useRef(satelliteToolActive);
  const satellitePlanetIdRef = useRef(satellitePlanetId);
  const mouseWorldForRaf = mouseWorldRef;

  useEffect(() => {
    satelliteToolActiveRef.current = satelliteToolActive;
  }, [satelliteToolActive]);

  useEffect(() => {
    satellitePlanetIdRef.current = satellitePlanetId;
  }, [satellitePlanetId]);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

      const deltaMs = Math.min(timestamp - lastTickRef.current, 50);
      lastTickRef.current = timestamp;

      if (simRef.current) {
        simRef.current = tickSimulation(simRef.current, deltaMs);
        const { objects, starPosition } = simulationToSceneObjects(simRef.current);
        renderScene(ctx, dimensions.width, dimensions.height, objects, viewportRef.current, starPosition);

        // Draw satellite placement overlay
        if (satelliteToolActiveRef.current && satellitePlanetIdRef.current && simRef.current) {
          const planet = simRef.current.solarSystem.planets.find(
            (p) => p.id === satellitePlanetIdRef.current
          );
          if (planet) {
            drawSatelliteOverlay(ctx, planet, mouseWorldForRaf.current, viewportRef.current, timestamp);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [dimensions, mouseWorldForRaf]);

  // ─── Audio initialisation on first interaction ────────────────────────────

  const handleAudioInit = useCallback(async () => {
    if (isAudioReady()) return;
    await initAudioContext();
    const ready = isAudioReady();
    setAudioReady(ready);
    onAudioReadyChange(ready);
    lastTickRef.current = performance.now();
    if (simRef.current && isPlayingRef.current) {
      simRef.current = playSimulation(simRef.current);
    }
  }, [onAudioReadyChange]);

  // ─── Escape key: cancel satellite mode ───────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onSatelliteToolActiveChange(false);
        setSatellitePlanetId(null);
        setSatelliteModal(null);
        setPlacementModal(null);
        setEditModal(null);
      }
      if (e.code === 'Space' && simRef.current && !placementModal && !satelliteModal && !editModal) {
        e.preventDefault();
        const newPlaying = !simRef.current.solarSystem.isPlaying;
        if (newPlaying) {
          lastTickRef.current = performance.now();
          simRef.current = playSimulation(simRef.current);
        } else {
          simRef.current = pauseSimulation(simRef.current);
        }
        onIsPlayingChange(newPlaying);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onIsPlayingChange, onSatelliteToolActiveChange, placementModal, satelliteModal, editModal]);

  // ─── Zoom (wheel) ─────────────────────────────────────────────────────────
  // React attaches wheel listeners as passive by default, so e.preventDefault()
  // inside a React onWheel handler is ignored and the browser still scrolls/zooms
  // the page. We attach a native non-passive listener directly to the canvas element
  // so preventDefault() actually works.

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const focal = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      // Normalise deltaY to pixels regardless of deltaMode:
      //   mode 0 = pixels (trackpad), mode 1 = lines (~16px each), mode 2 = pages
      const LINE_HEIGHT = 16;
      const PAGE_HEIGHT = rect.height || 600;
      const deltaPixels =
        e.deltaMode === 2 ? e.deltaY * PAGE_HEIGHT :
        e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT :
        e.deltaY;

      // Multiplicative factor: 300px of scroll = one doubling/halving
      const factor = Math.pow(2, -deltaPixels / 300);
      viewportRef.current = zoomToward(viewportRef.current, factor, focal);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // ─── Pan (mouse drag) ─────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start pan drag in satellite tool mode (clicks are for placement)
    if (satelliteToolActive) return;
    if (e.button === 0 || e.button === 1) {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [satelliteToolActive]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Track mouse position for satellite ring preview
    if (satelliteToolActive) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        mouseWorldRef.current = screenToWorld(screenPos, viewportRef.current);
      }
      return;
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    viewportRef.current = applyPan(viewportRef.current, { x: dx, y: dy });
  }, [satelliteToolActive]);

  const handleMouseUp = useCallback(() => { isDraggingRef.current = false; }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
    mouseWorldRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (satelliteToolActive) return;
    viewportRef.current = resetViewport(viewportRef.current);
  }, [satelliteToolActive]);

  // ─── Canvas drag-and-drop (HTML5) ─────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemType = e.dataTransfer.getData('itemType') as 'star' | 'planet' | '';
    if (!itemType || !simRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(screenPos, viewportRef.current);

    if (itemType === 'star' && simRef.current.solarSystem.star) {
      // Already has a star — could show a toast; for now silently ignore
      return;
    }

    // Pause while modal is open
    if (simRef.current.solarSystem.isPlaying) {
      simRef.current = pauseSimulation(simRef.current);
    }

    setPlacementModal({ entityType: itemType, worldPos });
  }, []);

  // ─── Canvas click (planet edit or satellite placement) ───────────────────

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!simRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(screenPos, viewportRef.current);

    if (satelliteToolActive) {
      e.stopPropagation();
      if (!satellitePlanetId) {
        // Stage 1: pick a planet
        const hit = hitTestPlanets(worldPos, simRef.current);
        if (!hit) return;
        setSatellitePlanetId(hit.id);
        const planetScreen = worldToScreen(hit.position, viewportRef.current);
        viewportRef.current = zoomToward(viewportRef.current, 1.5, planetScreen);
      } else {
        // Stage 2: place orbit at click position
        const planet = simRef.current.solarSystem.planets.find(
          (p) => p.id === satellitePlanetId
        );
        if (!planet) { setSatellitePlanetId(null); return; }
        setSatelliteModal({ planet, clickWorldPos: worldPos });
      }
      return;
    }

    // Normal mode: click a planet to edit it
    const hit = hitTestPlanets(worldPos, simRef.current);
    if (!hit) return;
    if (simRef.current.solarSystem.isPlaying) {
      simRef.current = pauseSimulation(simRef.current);
    }
    setEditModal(hit);
  }, [satelliteToolActive, satellitePlanetId]);

  // ─── Placement modal handlers ─────────────────────────────────────────────

  const handlePlacementConfirm = useCallback((options: PlacementConfirmOptions) => {
    if (!placementModal || !simRef.current) return;
    const { entityType, worldPos } = placementModal;

    if (entityType === 'star') {
      const o = options as StarPlacementOptions;
      simRef.current = addStar(simRef.current, {
        x: worldPos.x,
        y: worldPos.y,
        bpm: o.bpm,
        key: o.key,
        mode: o.mode,
      });
    } else {
      const o = options as PlanetPlacementOptions;
      simRef.current = addPlanet(simRef.current, {
        x: worldPos.x,
        y: worldPos.y,
        mass: o.mass,
        noteSequence: o.noteSequence,
        rotationSpeed: o.rotationSpeed,
        synthType: o.synthType,
        clockwise: o.clockwise,
        star: simRef.current.solarSystem.star ?? undefined,
        gravityStrength: simRef.current.solarSystem.gravityStrength,
      });
    }

    emitCounts();
    setPlacementModal(null);

    // Resume if we were playing before modal opened
    if (isPlayingRef.current && simRef.current) {
      lastTickRef.current = performance.now();
      simRef.current = playSimulation(simRef.current);
    }
  }, [placementModal, emitCounts]);

  const handlePlacementCancel = useCallback(() => {
    setPlacementModal(null);
    // Resume if we were playing before modal opened
    if (isPlayingRef.current && simRef.current && !simRef.current.solarSystem.isPlaying) {
      lastTickRef.current = performance.now();
      simRef.current = playSimulation(simRef.current);
    }
  }, []);

  // ─── Satellite modal handlers ─────────────────────────────────────────────

  const handleSatelliteConfirm = useCallback((options: SatelliteConfirmOptions) => {
    if (!satelliteModal || !simRef.current) return;
    const { planet } = satelliteModal;

    simRef.current = addSatellite(simRef.current, {
      parentPlanetId: planet.id,
      orbitRadius: options.orbitRadius,
      startAngle: options.startAngle,
    });

    emitCounts();
    setSatelliteModal(null);
    setSatellitePlanetId(null);
    onSatelliteToolActiveChange(false);
  }, [satelliteModal, emitCounts, onSatelliteToolActiveChange]);

  const handleSatelliteCancel = useCallback(() => {
    setSatelliteModal(null);
    setSatellitePlanetId(null);
    onSatelliteToolActiveChange(false);
  }, [onSatelliteToolActiveChange]);

  // ─── Planet edit handlers ─────────────────────────────────────────────────

  const handleEditConfirm = useCallback((options: PlanetUpdateOptions) => {
    if (!editModal || !simRef.current) return;
    simRef.current = updatePlanetProperties(simRef.current, editModal.id, options);
    setEditModal(null);
    if (isPlayingRef.current) {
      lastTickRef.current = performance.now();
      simRef.current = playSimulation(simRef.current);
    }
  }, [editModal]);

  const handleEditDelete = useCallback(() => {
    if (!editModal || !simRef.current) return;
    simRef.current = removePlanet(simRef.current, editModal.id);
    emitCounts();
    setEditModal(null);
    if (isPlayingRef.current) {
      lastTickRef.current = performance.now();
      simRef.current = playSimulation(simRef.current);
    }
  }, [editModal, emitCounts]);

  const handleEditCancel = useCallback(() => {
    setEditModal(null);
    if (isPlayingRef.current && simRef.current && !simRef.current.solarSystem.isPlaying) {
      lastTickRef.current = performance.now();
      simRef.current = playSimulation(simRef.current);
    }
  }, []);

  // ─── Cursor style ─────────────────────────────────────────────────────────

  const cursorClass = satelliteToolActive
    ? 'cursor-crosshair'
    : 'cursor-grab active:cursor-grabbing';

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative ${className}`}
      data-testid="canvas-container"
    >
      <canvas
        ref={canvasRef}
        className={`block ${cursorClass}`}
        data-testid="canvas"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          handleAudioInit();
          handleCanvasClick(e);
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      {/* Click-to-start overlay — shown until audio is initialised */}
      {!audioReady && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div className="bg-black/60 text-white/70 text-sm px-4 py-2 rounded-full border border-white/20">
            Click to start audio
          </div>
        </div>
      )}

      {/* Satellite mode hint */}
      {satelliteToolActive && !satellitePlanetId && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
          aria-live="polite"
        >
          <div className="bg-purple-900/80 text-purple-200 text-sm px-4 py-2 rounded-full border border-purple-700">
            Click a planet to select it
          </div>
        </div>
      )}

      {satelliteToolActive && satellitePlanetId && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
          aria-live="polite"
        >
          <div className="bg-purple-900/80 text-purple-200 text-sm px-4 py-2 rounded-full border border-purple-700">
            Click to set orbit position · Esc to cancel
          </div>
        </div>
      )}

      {/* Modals */}
      {placementModal && (
        <PlacementModal
          entityType={placementModal.entityType}
          worldPosition={placementModal.worldPos}
          onConfirm={handlePlacementConfirm}
          onCancel={handlePlacementCancel}
        />
      )}

      {satelliteModal && (
        <SatelliteModal
          parentPlanet={satelliteModal.planet}
          clickWorldPos={satelliteModal.clickWorldPos}
          onConfirm={handleSatelliteConfirm}
          onCancel={handleSatelliteCancel}
        />
      )}

      {editModal && (
        <PlanetEditModal
          planet={editModal}
          onConfirm={handleEditConfirm}
          onDelete={handleEditDelete}
          onCancel={handleEditCancel}
        />
      )}
    </div>
  );
}

// ─── Satellite placement overlay drawing ──────────────────────────────────────

function drawSatelliteOverlay(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  mouseWorld: Vector2D | null,
  viewport: ViewportState,
  timestamp: number
): void {
  const planetScreen = worldToScreen(planet.position, viewport);

  // Pulsing selection ring around the chosen planet
  const pulse = (Math.sin(timestamp * 0.004) + 1) / 2; // 0–1 oscillation
  const baseR = Math.max(3, planetRadiusFromMass(planet.mass) * viewport.zoom);
  const ringR = baseR * (1.4 + pulse * 0.3);

  ctx.save();
  ctx.beginPath();
  ctx.arc(planetScreen.x, planetScreen.y, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180, 100, 255, ${0.5 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Interactive dashed ring following mouse cursor
  if (mouseWorld) {
    const dx = mouseWorld.x - planet.position.x;
    const dy = mouseWorld.y - planet.position.y;
    const orbitRadius = Math.sqrt(dx * dx + dy * dy);
    const screenOrbitRadius = orbitRadius * viewport.zoom;

    if (screenOrbitRadius > baseR) {
      ctx.beginPath();
      ctx.arc(planetScreen.x, planetScreen.y, screenOrbitRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 120, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dot at mouse position
      const mouseScreen = worldToScreen(mouseWorld, viewport);
      ctx.beginPath();
      ctx.arc(mouseScreen.x, mouseScreen.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 120, 255, 0.8)';
      ctx.fill();
    }
  }

  ctx.restore();
}
