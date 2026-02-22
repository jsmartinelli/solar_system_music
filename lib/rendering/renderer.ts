import type { Vector2D } from '@/types/celestial';
import type { ViewportState } from '@/types/ui';
import { worldToScreen, worldScaleToScreen } from './viewport';

/** Pixels-per-AU constant. 1 AU = 150 world units (tunable). */
export const AU_WORLD_UNITS = 150;

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLOR = {
  background: '#0a0a0a',
  star: '#fffbe6',
  starGlow: '#ffcc44',
  starCorona: 'rgba(255, 200, 60, 0.08)',
  planet: '#4a9eff',
  planetStroke: '#2266cc',
  planetRotationTick: '#ffffff',
  satellite: '#cc88ff',
  satelliteStroke: '#8844cc',
  satellitePulse: 'rgba(200, 100, 255, 0.4)',
  orbitPath: 'rgba(255, 255, 255, 0.08)',
  orbitPathHover: 'rgba(255, 255, 255, 0.18)',
  auMarker: 'rgba(255, 255, 255, 0.12)',
  auLabel: 'rgba(255, 255, 255, 0.3)',
  grid: '#111111',
} as const;

// ─── Background ───────────────────────────────────────────────────────────────

/**
 * Clears and fills the canvas with the background colour.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = COLOR.background;
  ctx.fillRect(0, 0, width, height);
}

// ─── Star ─────────────────────────────────────────────────────────────────────

export interface StarRenderOptions {
  position: Vector2D;
  /** Visual radius in world units */
  radius: number;
}

/**
 * Draws the star: a layered glow + solid circle.
 */
export function drawStar(
  ctx: CanvasRenderingContext2D,
  options: StarRenderOptions,
  viewport: ViewportState
): void {
  const screen = worldToScreen(options.position, viewport);
  const r = Math.max(4, worldScaleToScreen(options.radius, viewport));

  // Outer corona / glow
  const corona = ctx.createRadialGradient(
    screen.x,
    screen.y,
    r * 0.5,
    screen.x,
    screen.y,
    r * 3
  );
  corona.addColorStop(0, 'rgba(255, 200, 60, 0.25)');
  corona.addColorStop(1, 'rgba(255, 200, 60, 0)');
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r * 3, 0, Math.PI * 2);
  ctx.fillStyle = corona;
  ctx.fill();

  // Inner glow
  const glow = ctx.createRadialGradient(
    screen.x,
    screen.y,
    0,
    screen.x,
    screen.y,
    r * 1.4
  );
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.4, COLOR.starGlow);
  glow.addColorStop(1, 'rgba(255, 200, 60, 0)');
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Solid core
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.star;
  ctx.fill();
}

// ─── Planet ───────────────────────────────────────────────────────────────────

export interface PlanetRenderOptions {
  position: Vector2D;
  /** Visual radius in world units (derived from mass) */
  radius: number;
  /** Current rotation angle in radians */
  rotation: number;
  /** If true, draws a subtle trigger-point indicator */
  showRotationIndicator: boolean;
  /** 0–1 pulse intensity when note just triggered (fades out) */
  triggerPulse?: number;
  /** Hex colour string for this planet */
  color?: string;
}

/**
 * Calculates a planet's visual radius from its mass.
 * Radius scales with the cube root of mass so larger masses don't dominate.
 */
export function planetRadiusFromMass(mass: number): number {
  return Math.max(6, Math.cbrt(mass) * 2.5);
}

/**
 * Draws a planet with a fill, border, and rotation tick.
 * A subtle outer ring pulses when a note is triggered.
 */
export function drawPlanet(
  ctx: CanvasRenderingContext2D,
  options: PlanetRenderOptions,
  viewport: ViewportState
): void {
  const screen = worldToScreen(options.position, viewport);
  const r = Math.max(3, worldScaleToScreen(options.radius, viewport));
  const color = options.color ?? COLOR.planet;

  // Trigger pulse ring
  const pulse = options.triggerPulse ?? 0;
  if (pulse > 0) {
    const pulseR = r * (1 + pulse * 0.8);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(74, 158, 255, ${pulse * 0.35})`;
    ctx.fill();
  }

  // Planet body
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = COLOR.planetStroke;
  ctx.lineWidth = Math.max(1, viewport.zoom);
  ctx.stroke();

  // Rotation indicator tick (12 o'clock = top of circle)
  if (options.showRotationIndicator && r >= 5) {
    const tickAngle = options.rotation - Math.PI / 2; // offset so 0 = top
    const innerR = r * 0.55;
    const outerR = r * 0.95;
    ctx.beginPath();
    ctx.moveTo(
      screen.x + Math.cos(tickAngle) * innerR,
      screen.y + Math.sin(tickAngle) * innerR
    );
    ctx.lineTo(
      screen.x + Math.cos(tickAngle) * outerR,
      screen.y + Math.sin(tickAngle) * outerR
    );
    ctx.strokeStyle = COLOR.planetRotationTick;
    ctx.lineWidth = Math.max(1.5, viewport.zoom * 0.8);
    ctx.stroke();
  }
}

// ─── Satellite ────────────────────────────────────────────────────────────────

export interface SatelliteRenderOptions {
  position: Vector2D;
  /** Visual radius in world units */
  radius: number;
  /** 0–1 pulse intensity when note just triggered */
  triggerPulse?: number;
}

/**
 * Draws a satellite as a small circle, with a pulse glow on trigger.
 */
export function drawSatellite(
  ctx: CanvasRenderingContext2D,
  options: SatelliteRenderOptions,
  viewport: ViewportState
): void {
  const screen = worldToScreen(options.position, viewport);
  const r = Math.max(2, worldScaleToScreen(options.radius, viewport));
  const pulse = options.triggerPulse ?? 0;

  // Pulse glow
  if (pulse > 0) {
    const pulseR = r * (1 + pulse * 1.5);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 100, 255, ${pulse * 0.5})`;
    ctx.fill();
  }

  // Satellite body
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
  ctx.fillStyle = pulse > 0.5
    ? `rgba(255, 200, 255, ${0.6 + pulse * 0.4})`
    : COLOR.satellite;
  ctx.fill();
  ctx.strokeStyle = COLOR.satelliteStroke;
  ctx.lineWidth = Math.max(0.5, viewport.zoom * 0.5);
  ctx.stroke();
}

// ─── Orbit paths ──────────────────────────────────────────────────────────────

/**
 * Draws a circular orbit path around a center point.
 *
 * @param center - World-space center of the orbit
 * @param radius - World-space orbit radius
 * @param dashed - If true, renders as a dashed line
 */
export function drawOrbitPath(
  ctx: CanvasRenderingContext2D,
  center: Vector2D,
  radius: number,
  viewport: ViewportState,
  dashed: boolean = false
): void {
  const screen = worldToScreen(center, viewport);
  const screenR = worldScaleToScreen(radius, viewport);

  if (screenR < 2) return; // too small to draw

  ctx.beginPath();
  ctx.arc(screen.x, screen.y, screenR, 0, Math.PI * 2);
  ctx.strokeStyle = COLOR.orbitPath;
  ctx.lineWidth = 1;

  if (dashed) {
    ctx.setLineDash([4, 6]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

// ─── AU distance markers ──────────────────────────────────────────────────────

/**
 * Draws concentric AU distance rings around the star with labels.
 * Only draws rings that are visible within the current viewport.
 *
 * @param center - World-space star position
 * @param maxAu - How many AU rings to draw
 */
export function drawAuMarkers(
  ctx: CanvasRenderingContext2D,
  center: Vector2D,
  viewport: ViewportState,
  maxAu: number = 5
): void {
  const screen = worldToScreen(center, viewport);

  ctx.save();
  ctx.setLineDash([2, 8]);

  for (let au = 1; au <= maxAu; au++) {
    const worldR = au * AU_WORLD_UNITS;
    const screenR = worldScaleToScreen(worldR, viewport);

    if (screenR < 5) continue; // skip if too small

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, screenR, 0, Math.PI * 2);
    ctx.strokeStyle = COLOR.auMarker;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label at the right edge of the ring
    ctx.fillStyle = COLOR.auLabel;
    ctx.font = `${Math.max(9, 11 * viewport.zoom)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${au} AU`, screen.x + screenR + 4, screen.y);
  }

  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Full scene render ────────────────────────────────────────────────────────

export interface SceneObject {
  type: 'star' | 'planet' | 'satellite';
  position: Vector2D;
  radius: number;
  rotation?: number;
  triggerPulse?: number;
  color?: string;
  orbitCenter?: Vector2D;
  orbitRadius?: number;
}

/**
 * Renders a complete scene: background → AU markers → orbit paths → bodies.
 * Accepts a flat list of scene objects so callers don't need to import
 * individual draw functions.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  objects: SceneObject[],
  viewport: ViewportState,
  starPosition?: Vector2D
): void {
  clearCanvas(ctx, width, height);

  // AU markers around star
  if (starPosition) {
    drawAuMarkers(ctx, starPosition, viewport);
  }

  // Orbit paths (drawn before bodies so they appear underneath)
  for (const obj of objects) {
    if (obj.orbitCenter && obj.orbitRadius) {
      drawOrbitPath(ctx, obj.orbitCenter, obj.orbitRadius, viewport, obj.type === 'satellite');
    }
  }

  // Bodies
  for (const obj of objects) {
    if (obj.type === 'star') {
      drawStar(ctx, { position: obj.position, radius: obj.radius }, viewport);
    } else if (obj.type === 'planet') {
      drawPlanet(
        ctx,
        {
          position: obj.position,
          radius: obj.radius,
          rotation: obj.rotation ?? 0,
          showRotationIndicator: true,
          triggerPulse: obj.triggerPulse,
          color: obj.color,
        },
        viewport
      );
    } else if (obj.type === 'satellite') {
      drawSatellite(
        ctx,
        {
          position: obj.position,
          radius: obj.radius,
          triggerPulse: obj.triggerPulse,
        },
        viewport
      );
    }
  }
}
