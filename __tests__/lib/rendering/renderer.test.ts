import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearCanvas,
  drawStar,
  drawPlanet,
  drawSatellite,
  drawOrbitPath,
  drawAuMarkers,
  renderScene,
  planetRadiusFromMass,
  AU_WORLD_UNITS,
} from '@/lib/rendering/renderer';
import { createViewport } from '@/lib/rendering/viewport';

// ─── Mock canvas context ──────────────────────────────────────────────────────

function makeCtx() {
  const gradient = {
    addColorStop: vi.fn(),
  };
  return {
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    strokeStyle: '' as string | CanvasGradient | CanvasPattern,
    lineWidth: 0,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue(gradient),
    setLineDash: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const VP = createViewport(800, 600);

describe('planetRadiusFromMass', () => {
  it('returns at least 6 for any mass', () => {
    expect(planetRadiusFromMass(0)).toBeGreaterThanOrEqual(6);
    expect(planetRadiusFromMass(1)).toBeGreaterThanOrEqual(6);
  });

  it('larger mass gives larger radius', () => {
    expect(planetRadiusFromMass(1000)).toBeGreaterThan(planetRadiusFromMass(100));
  });

  it('scales as cube root of mass * 2.5', () => {
    expect(planetRadiusFromMass(1000)).toBeCloseTo(Math.cbrt(1000) * 2.5, 5);
  });
});

describe('clearCanvas', () => {
  it('calls fillRect with full dimensions', () => {
    const ctx = makeCtx();
    clearCanvas(ctx, 800, 600);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });
});

describe('drawStar', () => {
  it('calls arc to draw the star body', () => {
    const ctx = makeCtx();
    drawStar(ctx, { position: { x: 0, y: 0 }, radius: 18 }, VP);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('creates radial gradients for glow', () => {
    const ctx = makeCtx();
    drawStar(ctx, { position: { x: 0, y: 0 }, radius: 18 }, VP);
    expect(ctx.createRadialGradient).toHaveBeenCalled();
  });
});

describe('drawPlanet', () => {
  it('draws the planet body with arc', () => {
    const ctx = makeCtx();
    drawPlanet(
      ctx,
      { position: { x: 100, y: 0 }, radius: 10, rotation: 0, showRotationIndicator: false },
      VP
    );
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('draws rotation indicator when enabled', () => {
    const ctx = makeCtx();
    drawPlanet(
      ctx,
      { position: { x: 100, y: 0 }, radius: 15, rotation: 0, showRotationIndicator: true },
      VP
    );
    // moveTo + lineTo for the tick line
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('does not draw rotation indicator when disabled', () => {
    const ctx = makeCtx();
    drawPlanet(
      ctx,
      { position: { x: 100, y: 0 }, radius: 15, rotation: 0, showRotationIndicator: false },
      VP
    );
    expect(ctx.moveTo).not.toHaveBeenCalled();
  });

  it('draws trigger pulse ring when pulse > 0', () => {
    const ctx = makeCtx();
    const arcCallsBefore = 0;
    drawPlanet(
      ctx,
      {
        position: { x: 100, y: 0 },
        radius: 15,
        rotation: 0,
        showRotationIndicator: false,
        triggerPulse: 0.8,
      },
      VP
    );
    // Pulse ring + body = at least 2 arc calls
    expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('skips pulse ring when pulse is 0', () => {
    const ctx = makeCtx();
    drawPlanet(
      ctx,
      {
        position: { x: 100, y: 0 },
        radius: 15,
        rotation: 0,
        showRotationIndicator: false,
        triggerPulse: 0,
      },
      VP
    );
    // Only body arc, no pulse
    expect(ctx.arc).toHaveBeenCalledTimes(1);
  });
});

describe('drawSatellite', () => {
  it('draws the satellite body', () => {
    const ctx = makeCtx();
    drawSatellite(ctx, { position: { x: 50, y: 50 }, radius: 3 }, VP);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('draws pulse glow when triggerPulse > 0', () => {
    const ctx = makeCtx();
    drawSatellite(
      ctx,
      { position: { x: 50, y: 50 }, radius: 3, triggerPulse: 0.9 },
      VP
    );
    // Glow + body = 2 arc calls
    expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('drawOrbitPath', () => {
  it('draws a circle arc for the orbit', () => {
    const ctx = makeCtx();
    drawOrbitPath(ctx, { x: 0, y: 0 }, 100, VP);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('skips drawing when screen radius is too small', () => {
    const ctx = makeCtx();
    // Zoom out so 1 world unit = tiny screen pixels
    const tinyVP = { ...VP, zoom: 0.001 };
    drawOrbitPath(ctx, { x: 0, y: 0 }, 1, tinyVP);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('sets dashed line when dashed=true', () => {
    const ctx = makeCtx();
    drawOrbitPath(ctx, { x: 0, y: 0 }, 100, VP, true);
    // setLineDash called with non-empty array, then reset to []
    expect(ctx.setLineDash).toHaveBeenCalledWith([4, 6]);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('solid line when dashed=false', () => {
    const ctx = makeCtx();
    drawOrbitPath(ctx, { x: 0, y: 0 }, 100, VP, false);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });
});

describe('drawAuMarkers', () => {
  it('draws multiple rings without throwing', () => {
    const ctx = makeCtx();
    expect(() => drawAuMarkers(ctx, { x: 0, y: 0 }, VP, 3)).not.toThrow();
  });

  it('calls save and restore for context isolation', () => {
    const ctx = makeCtx();
    drawAuMarkers(ctx, { x: 0, y: 0 }, VP, 3);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('skips rings that are too small to render', () => {
    const ctx = makeCtx();
    // At very low zoom, all rings may be below threshold
    const tinyVP = { ...VP, zoom: 0.0001 };
    drawAuMarkers(ctx, { x: 0, y: 0 }, tinyVP, 5);
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});

describe('renderScene', () => {
  it('renders without throwing for an empty scene', () => {
    const ctx = makeCtx();
    expect(() => renderScene(ctx, 800, 600, [], VP)).not.toThrow();
  });

  it('clears the canvas', () => {
    const ctx = makeCtx();
    renderScene(ctx, 800, 600, [], VP);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('draws AU markers when starPosition is provided', () => {
    const ctx = makeCtx();
    renderScene(ctx, 800, 600, [], VP, { x: 0, y: 0 });
    // save/restore called for AU markers
    expect(ctx.save).toHaveBeenCalled();
  });

  it('draws all object types in a mixed scene', () => {
    const ctx = makeCtx();
    renderScene(
      ctx,
      800,
      600,
      [
        { type: 'star', position: { x: 0, y: 0 }, radius: 18 },
        {
          type: 'planet',
          position: { x: 100, y: 0 },
          radius: 10,
          rotation: 0,
          orbitCenter: { x: 0, y: 0 },
          orbitRadius: 100,
        },
        {
          type: 'satellite',
          position: { x: 130, y: 0 },
          radius: 3,
          orbitCenter: { x: 100, y: 0 },
          orbitRadius: 30,
        },
      ],
      VP,
      { x: 0, y: 0 }
    );
    // Many arc calls expected (star glow, planet, satellite, orbit paths, AU rings)
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(4);
  });
});

describe('AU_WORLD_UNITS', () => {
  it('is a positive number', () => {
    expect(AU_WORLD_UNITS).toBeGreaterThan(0);
  });
});
