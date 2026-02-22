import type { Vector2D } from '@/types/celestial';
import type { ViewportState } from '@/types/ui';

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 10;
export const ZOOM_STEP = 0.1;

/**
 * Creates a default viewport centered at the canvas origin.
 */
export function createViewport(width: number, height: number): ViewportState {
  return {
    zoom: 1,
    pan: { x: 0, y: 0 },
    width,
    height,
  };
}

/**
 * Converts a world-space position to screen-space pixel coordinates.
 *
 * screen = (world + pan) * zoom + center
 */
export function worldToScreen(
  worldPos: Vector2D,
  viewport: ViewportState
): Vector2D {
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  return {
    x: (worldPos.x + viewport.pan.x) * viewport.zoom + cx,
    y: (worldPos.y + viewport.pan.y) * viewport.zoom + cy,
  };
}

/**
 * Converts a screen-space pixel position to world-space coordinates.
 *
 * world = (screen - center) / zoom - pan
 */
export function screenToWorld(
  screenPos: Vector2D,
  viewport: ViewportState
): Vector2D {
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  return {
    x: (screenPos.x - cx) / viewport.zoom - viewport.pan.x,
    y: (screenPos.y - cy) / viewport.zoom - viewport.pan.y,
  };
}

/**
 * Scales a world-space distance/radius to screen pixels.
 */
export function worldScaleToScreen(
  worldDistance: number,
  viewport: ViewportState
): number {
  return worldDistance * viewport.zoom;
}

/**
 * Zooms the viewport toward a screen-space focal point (e.g. mouse position).
 * The world point under the cursor stays fixed after zooming.
 *
 * @param viewport - Current viewport state
 * @param delta - Positive = zoom in, negative = zoom out
 * @param focalScreen - Screen-space point to zoom toward
 * @returns New viewport state
 */
export function zoomToward(
  viewport: ViewportState,
  delta: number,
  focalScreen: Vector2D
): ViewportState {
  const newZoom = Math.max(
    ZOOM_MIN,
    Math.min(ZOOM_MAX, viewport.zoom + delta)
  );

  if (newZoom === viewport.zoom) return viewport;

  // World point currently under the focal screen position
  const worldUnderFocal = screenToWorld(focalScreen, viewport);

  // After zooming, recalculate pan so the same world point is still under focal
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const newPan: Vector2D = {
    x: (focalScreen.x - cx) / newZoom - worldUnderFocal.x,
    y: (focalScreen.y - cy) / newZoom - worldUnderFocal.y,
  };

  return { ...viewport, zoom: newZoom, pan: newPan };
}

/**
 * Applies a pan delta (in screen pixels) to the viewport.
 *
 * @param viewport - Current viewport state
 * @param screenDelta - How many screen pixels to pan
 * @returns New viewport state
 */
export function applyPan(
  viewport: ViewportState,
  screenDelta: Vector2D
): ViewportState {
  return {
    ...viewport,
    pan: {
      x: viewport.pan.x + screenDelta.x / viewport.zoom,
      y: viewport.pan.y + screenDelta.y / viewport.zoom,
    },
  };
}

/**
 * Resets the viewport to default zoom and pan.
 */
export function resetViewport(viewport: ViewportState): ViewportState {
  return { ...viewport, zoom: 1, pan: { x: 0, y: 0 } };
}

/**
 * Updates viewport dimensions (called on canvas resize).
 */
export function resizeViewport(
  viewport: ViewportState,
  width: number,
  height: number
): ViewportState {
  return { ...viewport, width, height };
}
