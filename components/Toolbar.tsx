'use client';

import { MAX_PLANETS } from '@/lib/entities/planet';
import { MAX_SATELLITES } from '@/lib/entities/satellite';

interface ToolbarProps {
  planetCount: number;
  satelliteCount: number;
  onSatelliteToolSelect: () => void;
  satelliteToolActive: boolean;
}

interface DragItem {
  type: 'star' | 'planet';
  label: string;
  icon: string;
  tooltip: string;
  color: string;
}

const DRAG_ITEMS: DragItem[] = [
  {
    type: 'star',
    label: 'Star',
    icon: '★',
    tooltip: 'Drag onto the canvas to place a star (only one allowed)',
    color: '#ffcc44',
  },
  {
    type: 'planet',
    label: 'Planet',
    icon: '●',
    tooltip: 'Drag onto the canvas to place a planet',
    color: '#4a9eff',
  },
];

export default function Toolbar({
  planetCount,
  satelliteCount,
  onSatelliteToolSelect,
  satelliteToolActive,
}: ToolbarProps) {
  const planetsAtLimit = planetCount >= MAX_PLANETS;
  const satellitesAtLimit = satelliteCount >= MAX_SATELLITES;

  const handleDragStart = (e: React.DragEvent, itemType: 'star' | 'planet') => {
    e.dataTransfer.setData('itemType', itemType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside
      className="w-20 flex flex-col items-center gap-3 py-4 bg-gray-950 border-r border-gray-800 shrink-0"
      data-testid="toolbar"
    >
      <span className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
        Tools
      </span>

      {DRAG_ITEMS.map((item) => {
        const disabled = item.type === 'planet' && planetsAtLimit;
        return (
          <div key={item.type} className="relative group w-14">
            <div
              draggable={!disabled}
              onDragStart={disabled ? undefined : (e) => handleDragStart(e, item.type)}
              data-testid={`toolbar-item-${item.type}`}
              className={[
                'flex flex-col items-center gap-1 p-2 rounded-lg border select-none',
                'transition-colors duration-150',
                disabled
                  ? 'border-gray-800 opacity-40 cursor-not-allowed'
                  : 'border-gray-700 hover:border-gray-500 cursor-grab active:cursor-grabbing hover:bg-gray-800',
              ].join(' ')}
              title={item.tooltip}
              aria-label={item.label}
              aria-disabled={disabled}
            >
              <span style={{ color: item.color }} className="text-xl leading-none">
                {item.icon}
              </span>
              <span className="text-gray-400 text-xs">{item.label}</span>
            </div>

            {/* Tooltip */}
            <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
              <div className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap border border-gray-700 shadow-lg">
                {disabled ? `Limit reached (${MAX_PLANETS})` : item.tooltip}
              </div>
            </div>
          </div>
        );
      })}

      {/* Satellite tool — click-driven, not draggable */}
      <div className="relative group w-14">
        <button
          onClick={satellitesAtLimit ? undefined : onSatelliteToolSelect}
          data-testid="toolbar-item-satellite"
          className={[
            'w-full flex flex-col items-center gap-1 p-2 rounded-lg border select-none',
            'transition-colors duration-150',
            satellitesAtLimit
              ? 'border-gray-800 opacity-40 cursor-not-allowed'
              : satelliteToolActive
              ? 'border-purple-500 bg-purple-900/40 cursor-crosshair'
              : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800 cursor-pointer',
          ].join(' ')}
          title={
            satellitesAtLimit
              ? `Satellite limit reached (${MAX_SATELLITES})`
              : 'Click to activate satellite placement mode, then click a planet'
          }
          aria-label="Satellite"
          aria-pressed={satelliteToolActive}
          disabled={satellitesAtLimit}
        >
          <span style={{ color: '#cc88ff' }} className="text-xl leading-none">
            ◉
          </span>
          <span className="text-gray-400 text-xs">Satellite</span>
        </button>

        {/* Tooltip */}
        <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
          <div className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap border border-gray-700 shadow-lg">
            {satellitesAtLimit
              ? `Limit reached (${MAX_SATELLITES})`
              : satelliteToolActive
              ? 'Active — click a planet on the canvas'
              : 'Click to place a satellite on a planet'}
          </div>
        </div>
      </div>

      {/* Counts */}
      <div className="mt-auto text-center">
        <div className="text-gray-600 text-xs">
          <div>{planetCount}/{MAX_PLANETS}</div>
          <div className="text-gray-700 text-xs">planets</div>
        </div>
        <div className="text-gray-600 text-xs mt-1">
          <div>{satelliteCount}/{MAX_SATELLITES}</div>
          <div className="text-gray-700 text-xs">sats</div>
        </div>
      </div>
    </aside>
  );
}
