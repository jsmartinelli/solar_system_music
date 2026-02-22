'use client';

import type { Planet, Vector2D } from '@/types/celestial';

export interface SatelliteConfirmOptions {
  orbitRadius: number;
  startAngle: number;
}

interface SatelliteModalProps {
  parentPlanet: Planet;
  clickWorldPos: Vector2D;
  onConfirm: (options: SatelliteConfirmOptions) => void;
  onCancel: () => void;
}

function distance(a: Vector2D, b: Vector2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export default function SatelliteModal({
  parentPlanet,
  clickWorldPos,
  onConfirm,
  onCancel,
}: SatelliteModalProps) {
  const orbitRadius = Math.round(
    distance(clickWorldPos, parentPlanet.position)
  );
  const startAngle = Math.atan2(
    clickWorldPos.y - parentPlanet.position.y,
    clickWorldPos.x - parentPlanet.position.x
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="satellite-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Configure Satellite"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
        data-testid="satellite-modal-backdrop"
      />

      {/* Panel */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-72 p-6">
        <h2 className="text-base font-semibold text-purple-400 mb-4">
          Add Satellite
        </h2>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Parent planet</span>
            <span className="text-gray-200 font-mono text-xs">{parentPlanet.id}</span>
          </div>

          <div
            className="flex items-center justify-between text-sm"
            data-testid="satellite-orbit-radius-display"
          >
            <span className="text-gray-400">Orbit radius</span>
            <span className="text-gray-200 tabular-nums">{orbitRadius} units</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Start angle</span>
            <span className="text-gray-200 tabular-nums">
              {Math.round((startAngle * 180) / Math.PI)}°
            </span>
          </div>
        </div>

        <p className="text-gray-500 text-xs mb-4">
          The satellite will orbit at this radius and trigger notes when it
          passes 12 o&apos;clock.
        </p>

        <button
          onClick={() => onConfirm({ orbitRadius, startAngle })}
          data-testid="satellite-confirm-button"
          className="w-full bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium py-2 rounded transition-colors"
        >
          Place Satellite
        </button>

        <button
          onClick={onCancel}
          data-testid="satellite-cancel-button"
          className="mt-3 w-full text-gray-500 hover:text-gray-300 text-xs py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
