'use client';

import { useState, useCallback } from 'react';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import ControlBar from '@/components/ControlBar';

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [gravityStrength, setGravityStrength] = useState(1);
  const [audioReady, setAudioReady] = useState(false);
  const [planetCount, setPlanetCount] = useState(0);
  const [satelliteCount, setSatelliteCount] = useState(0);
  const [satelliteToolActive, setSatelliteToolActive] = useState(false);
  // Incrementing key signals Canvas to rewind; Canvas resets to 0 after rewinding.
  const [rewindKey, setRewindKey] = useState(0);

  const handleRewind = useCallback(() => {
    setIsPlaying(false);
    setRewindKey((k) => k + 1);
  }, []);

  const handleCountsChange = useCallback((planets: number, satellites: number) => {
    setPlanetCount(planets);
    setSatelliteCount(satellites);
  }, []);

  return (
    <main className="flex h-screen flex-col bg-[#0a0a0a]">
      <header className="bg-gray-900 px-4 py-2 border-b border-gray-800 shrink-0 flex items-center gap-3">
        <h1 className="text-lg font-bold text-white tracking-tight">
          Solar System Music Sequencer
        </h1>
      </header>

      <div className="flex flex-1 min-h-0">
        <Toolbar
          planetCount={planetCount}
          satelliteCount={satelliteCount}
          onSatelliteToolSelect={() => setSatelliteToolActive(true)}
          satelliteToolActive={satelliteToolActive}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Canvas
            className="flex-1"
            isPlaying={isPlaying}
            timeScale={timeScale}
            gravityStrength={gravityStrength}
            onIsPlayingChange={setIsPlaying}
            onAudioReadyChange={setAudioReady}
            onCountsChange={handleCountsChange}
            satelliteToolActive={satelliteToolActive}
            onSatelliteToolActiveChange={setSatelliteToolActive}
            rewindKey={rewindKey}
          />

          <ControlBar
            isPlaying={isPlaying}
            timeScale={timeScale}
            gravityStrength={gravityStrength}
            audioReady={audioReady}
            onPlayPause={() => setIsPlaying((p) => !p)}
            onRewind={handleRewind}
            onTimeScaleChange={setTimeScale}
            onGravityChange={setGravityStrength}
          />
        </div>
      </div>
    </main>
  );
}
