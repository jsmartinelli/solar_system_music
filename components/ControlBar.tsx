'use client';

interface ControlBarProps {
  isPlaying: boolean;
  timeScale: number;
  gravityStrength: number;
  audioReady: boolean;
  onPlayPause: () => void;
  onRewind: () => void;
  onTimeScaleChange: (value: number) => void;
  onGravityChange: (value: number) => void;
}

export default function ControlBar({
  isPlaying,
  timeScale,
  gravityStrength,
  audioReady,
  onPlayPause,
  onRewind,
  onTimeScaleChange,
  onGravityChange,
}: ControlBarProps) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-2 bg-gray-950 border-t border-gray-800 shrink-0"
      data-testid="control-bar"
    >
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        data-testid="play-pause-button"
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors text-white text-base"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Rewind */}
      <button
        onClick={onRewind}
        data-testid="rewind-button"
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors text-white text-base"
        aria-label="Rewind"
        title="Rewind to start"
      >
        ⏮
      </button>

      <div className="w-px h-6 bg-gray-700 mx-1" />

      {/* Time Scale */}
      <label className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
        <span className="shrink-0">Speed</span>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={timeScale}
          onChange={(e) => onTimeScaleChange(parseFloat(e.target.value))}
          data-testid="time-scale-slider"
          className="w-24 accent-blue-500"
          aria-label="Time scale"
          title={`Time scale: ${timeScale.toFixed(1)}×`}
        />
        <span className="shrink-0 w-8 text-gray-300 tabular-nums">
          {timeScale.toFixed(1)}×
        </span>
      </label>

      {/* Gravity */}
      <label className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
        <span className="shrink-0">Gravity</span>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={gravityStrength}
          onChange={(e) => onGravityChange(parseFloat(e.target.value))}
          data-testid="gravity-slider"
          className="w-24 accent-blue-500"
          aria-label="Gravity strength"
          title={`Gravity: ${gravityStrength.toFixed(1)}×`}
        />
        <span className="shrink-0 w-8 text-gray-300 tabular-nums">
          {gravityStrength.toFixed(1)}×
        </span>
      </label>

      {/* Audio hint */}
      {!audioReady && (
        <span
          className="ml-auto text-xs text-gray-500 italic"
          data-testid="audio-hint"
        >
          Click canvas to start audio
        </span>
      )}
    </div>
  );
}
