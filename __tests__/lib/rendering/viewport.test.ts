import { describe, it, expect } from 'vitest';
import {
  createViewport,
  worldToScreen,
  screenToWorld,
  worldScaleToScreen,
  zoomToward,
  applyPan,
  resetViewport,
  resizeViewport,
  ZOOM_MIN,
  ZOOM_MAX,
} from '@/lib/rendering/viewport';

describe('createViewport', () => {
  it('creates viewport with given dimensions', () => {
    const vp = createViewport(800, 600);
    expect(vp.width).toBe(800);
    expect(vp.height).toBe(600);
  });

  it('starts with zoom 1 and zero pan', () => {
    const vp = createViewport(800, 600);
    expect(vp.zoom).toBe(1);
    expect(vp.pan.x).toBe(0);
    expect(vp.pan.y).toBe(0);
  });
});

describe('worldToScreen', () => {
  const vp = createViewport(800, 600);

  it('maps world origin to canvas center', () => {
    const s = worldToScreen({ x: 0, y: 0 }, vp);
    expect(s.x).toBeCloseTo(400);
    expect(s.y).toBeCloseTo(300);
  });

  it('maps world offset correctly', () => {
    const s = worldToScreen({ x: 100, y: 50 }, vp);
    expect(s.x).toBeCloseTo(500);
    expect(s.y).toBeCloseTo(350);
  });

  it('accounts for zoom', () => {
    const zoomed = { ...vp, zoom: 2 };
    const s = worldToScreen({ x: 100, y: 0 }, zoomed);
    expect(s.x).toBeCloseTo(600); // center(400) + 100*2
  });

  it('accounts for pan', () => {
    const panned = { ...vp, pan: { x: 50, y: -20 } };
    const s = worldToScreen({ x: 0, y: 0 }, panned);
    expect(s.x).toBeCloseTo(450); // 400 + 50
    expect(s.y).toBeCloseTo(280); // 300 - 20
  });
});

describe('screenToWorld', () => {
  const vp = createViewport(800, 600);

  it('maps canvas center to world origin', () => {
    const w = screenToWorld({ x: 400, y: 300 }, vp);
    expect(w.x).toBeCloseTo(0);
    expect(w.y).toBeCloseTo(0);
  });

  it('is inverse of worldToScreen', () => {
    const world = { x: 123, y: -45 };
    const screen = worldToScreen(world, vp);
    const back = screenToWorld(screen, vp);
    expect(back.x).toBeCloseTo(world.x, 10);
    expect(back.y).toBeCloseTo(world.y, 10);
  });

  it('inverse holds with zoom and pan', () => {
    const vp2 = { ...vp, zoom: 1.5, pan: { x: 80, y: -30 } };
    const world = { x: 50, y: 70 };
    const screen = worldToScreen(world, vp2);
    const back = screenToWorld(screen, vp2);
    expect(back.x).toBeCloseTo(world.x, 10);
    expect(back.y).toBeCloseTo(world.y, 10);
  });
});

describe('worldScaleToScreen', () => {
  it('equals world distance at zoom 1', () => {
    const vp = createViewport(800, 600);
    expect(worldScaleToScreen(100, vp)).toBe(100);
  });

  it('scales with zoom', () => {
    const vp = { ...createViewport(800, 600), zoom: 2 };
    expect(worldScaleToScreen(100, vp)).toBe(200);
  });
});

describe('zoomToward', () => {
  const vp = createViewport(800, 600);
  const center = { x: 400, y: 300 }; // screen center = world origin

  it('increases zoom on factor > 1', () => {
    const vp2 = zoomToward(vp, 1.1, center);
    expect(vp2.zoom).toBeCloseTo(1.1);
  });

  it('decreases zoom on factor < 1', () => {
    const vp2 = zoomToward(vp, 0.8, center);
    expect(vp2.zoom).toBeCloseTo(0.8);
  });

  it('clamps zoom to ZOOM_MIN', () => {
    const vp2 = zoomToward(vp, 0.0001, center);
    expect(vp2.zoom).toBe(ZOOM_MIN);
  });

  it('clamps zoom to ZOOM_MAX', () => {
    const vp2 = zoomToward(vp, 99999, center);
    expect(vp2.zoom).toBe(ZOOM_MAX);
  });

  it('keeps the focal world point fixed when zooming toward canvas center', () => {
    // When we zoom toward center, pan stays 0 (world origin stays at center)
    const vp2 = zoomToward(vp, 1.5, center);
    const worldUnderCenter = screenToWorld(center, vp2);
    expect(worldUnderCenter.x).toBeCloseTo(0, 6);
    expect(worldUnderCenter.y).toBeCloseTo(0, 6);
  });

  it('keeps the focal world point fixed when zooming toward an off-center point', () => {
    const focal = { x: 500, y: 200 };
    const worldBefore = screenToWorld(focal, vp);
    const vp2 = zoomToward(vp, 1.3, focal);
    const worldAfter = screenToWorld(focal, vp2);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5);
  });

  it('returns same viewport when zoom is already at limit', () => {
    const atMax = { ...vp, zoom: ZOOM_MAX };
    expect(zoomToward(atMax, 2, center)).toBe(atMax);
  });
});

describe('applyPan', () => {
  it('moves pan in the direction of the delta', () => {
    const vp = createViewport(800, 600);
    const vp2 = applyPan(vp, { x: 100, y: -50 });
    expect(vp2.pan.x).toBeCloseTo(100);
    expect(vp2.pan.y).toBeCloseTo(-50);
  });

  it('scales delta by inverse zoom', () => {
    const vp = { ...createViewport(800, 600), zoom: 2 };
    const vp2 = applyPan(vp, { x: 100, y: 0 });
    expect(vp2.pan.x).toBeCloseTo(50); // 100 / zoom(2)
  });

  it('accumulates pan over multiple calls', () => {
    const vp = createViewport(800, 600);
    const vp2 = applyPan(applyPan(vp, { x: 50, y: 0 }), { x: 50, y: 0 });
    expect(vp2.pan.x).toBeCloseTo(100);
  });
});

describe('resetViewport', () => {
  it('resets zoom to 1 and pan to zero', () => {
    const vp = { ...createViewport(800, 600), zoom: 3, pan: { x: 200, y: -100 } };
    const reset = resetViewport(vp);
    expect(reset.zoom).toBe(1);
    expect(reset.pan.x).toBe(0);
    expect(reset.pan.y).toBe(0);
  });

  it('preserves width and height', () => {
    const vp = createViewport(1024, 768);
    const reset = resetViewport(vp);
    expect(reset.width).toBe(1024);
    expect(reset.height).toBe(768);
  });
});

describe('resizeViewport', () => {
  it('updates width and height', () => {
    const vp = createViewport(800, 600);
    const resized = resizeViewport(vp, 1280, 720);
    expect(resized.width).toBe(1280);
    expect(resized.height).toBe(720);
  });

  it('preserves zoom and pan', () => {
    const vp = { ...createViewport(800, 600), zoom: 2, pan: { x: 50, y: 30 } };
    const resized = resizeViewport(vp, 400, 300);
    expect(resized.zoom).toBe(2);
    expect(resized.pan.x).toBe(50);
  });
});
