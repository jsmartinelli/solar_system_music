'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { renderScene } from '@/lib/rendering/renderer';
import {
  createViewport,
  zoomToward,
  applyPan,
  resetViewport,
  resizeViewport,
} from '@/lib/rendering/viewport';
import type { ViewportState } from '@/types/ui';
import {
  createSimulation,
  addStar,
  addPlanet,
  playSimulation,
  pauseSimulation,
  tickSimulation,
  simulationToSceneObjects,
  destroySimulation,
} from '@/lib/simulation/simulation';
import type { SimulationState } from '@/lib/simulation/simulation';
import { initAudioContext, isAudioReady } from '@/lib/audio/context';

interface CanvasProps {
  className?: string;
}

// ─── Default demo scene ───────────────────────────────────────────────────────
// Builds an initial simulation with a star and three planets so something
// interesting appears immediately. Phase 7 will replace this with user placement.

function buildDefaultSimulation(): SimulationState {
  let sim = createSimulation();

  sim = addStar(sim, { x: 0, y: 0, bpm: 100, key: 'C', mode: 'Ionian' });

  sim = addPlanet(sim, { x: 150, y: 0, mass: 80,  rotationSpeed: 'quarter',   noteSequence: 'I4 III4 V4',     synthType: 'Synth'    });
  sim = addPlanet(sim, { x: 240, y: 0, mass: 150, rotationSpeed: 'eighth',    noteSequence: 'V3 VII3 II4',    synthType: 'AMSynth'  });
  sim = addPlanet(sim, { x: 340, y: 0, mass: 50,  rotationSpeed: 'sixteenth', noteSequence: 'I5 VI4 III5 V4', synthType: 'PluckSynth' });

  return sim;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Canvas({ className = '' }: CanvasProps) {
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

  // ─── Initialise simulation once ──────────────────────────────────────────

  useEffect(() => {
    simRef.current = buildDefaultSimulation();

    return () => {
      if (simRef.current) {
        destroySimulation(simRef.current);
        simRef.current = null;
      }
    };
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

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

      const deltaMs = Math.min(timestamp - lastTickRef.current, 50);
      lastTickRef.current = timestamp;

      // Advance simulation
      if (simRef.current) {
        simRef.current = tickSimulation(simRef.current, deltaMs);
        const { objects, starPosition } = simulationToSceneObjects(simRef.current);
        renderScene(ctx, dimensions.width, dimensions.height, objects, viewportRef.current, starPosition);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [dimensions]);

  // ─── Audio initialisation on first interaction ────────────────────────────

  const handleAudioInit = useCallback(async () => {
    if (isAudioReady()) return;
    await initAudioContext();
    setAudioReady(isAudioReady());
    // Start the simulation playing once audio is ready
    if (simRef.current) {
      simRef.current = playSimulation(simRef.current);
    }
  }, []);

  // ─── Space bar: play / pause ──────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && simRef.current) {
        e.preventDefault();
        if (simRef.current.solarSystem.isPlaying) {
          simRef.current = pauseSimulation(simRef.current);
        } else {
          simRef.current = playSimulation(simRef.current);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Zoom (wheel) ─────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const focal = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    viewportRef.current = zoomToward(viewportRef.current, -e.deltaY * 0.001, focal);
  }, []);

  // ─── Pan (mouse drag) ─────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    viewportRef.current = applyPan(viewportRef.current, { x: dx, y: dy });
  }, []);

  const handleMouseUp = useCallback(() => { isDraggingRef.current = false; }, []);

  const handleDoubleClick = useCallback(() => {
    viewportRef.current = resetViewport(viewportRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative ${className}`}
      data-testid="canvas-container"
    >
      <canvas
        ref={canvasRef}
        className="block cursor-grab active:cursor-grabbing"
        data-testid="canvas"
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={handleAudioInit}
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
    </div>
  );
}
