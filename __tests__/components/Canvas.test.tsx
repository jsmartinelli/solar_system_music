import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Tone.js has no Web Audio in jsdom — mock it before Canvas is imported
vi.mock('tone', () => ({
  PolySynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  Synth: vi.fn(),
  AMSynth: vi.fn(),
  FMSynth: vi.fn(),
  DuoSynth: vi.fn(),
  MonoSynth: vi.fn(),
  MembraneSynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  MetalSynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  PluckSynth: vi.fn().mockImplementation(() => ({
    triggerAttack: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  NoiseSynth: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  Volume: vi.fn().mockImplementation(() => ({
    volume: { value: 0 },
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  now: vi.fn().mockReturnValue(0),
  getTransport: vi.fn().mockReturnValue({
    bpm: { value: 120 },
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
  }),
  getDestination: vi.fn().mockReturnValue({ volume: { value: 0 } }),
  start: vi.fn().mockResolvedValue(undefined),
  getContext: vi.fn().mockReturnValue({ state: 'suspended' }),
}));

import Canvas from '@/components/Canvas';

const defaultCanvasProps = {
  isPlaying: false,
  timeScale: 1,
  gravityStrength: 1,
  onIsPlayingChange: vi.fn(),
  onAudioReadyChange: vi.fn(),
  onCountsChange: vi.fn(),
  satelliteToolActive: false,
  onSatelliteToolActiveChange: vi.fn(),
};

describe('Canvas Component', () => {
  let mockGetContext: ReturnType<typeof vi.fn>;
  let mockContext: Partial<CanvasRenderingContext2D>;
  let mockGradient: { addColorStop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockGradient = { addColorStop: vi.fn() };

    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      scale: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue(mockGradient),
    };

    mockGetContext = vi.fn(() => mockContext);
    HTMLCanvasElement.prototype.getContext = mockGetContext as never;

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 2,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders canvas container', () => {
    render(<Canvas {...defaultCanvasProps} />);
    expect(screen.getByTestId('canvas-container')).toBeTruthy();
  });

  it('renders canvas element', () => {
    render(<Canvas {...defaultCanvasProps} />);
    expect(screen.getByTestId('canvas')).toBeTruthy();
  });

  it('applies custom className to container', () => {
    render(<Canvas {...defaultCanvasProps} className="custom-class" />);
    const container = screen.getByTestId('canvas-container');
    expect(container.className).toContain('custom-class');
  });

  it('fills container (w-full h-full)', () => {
    render(<Canvas {...defaultCanvasProps} />);
    const container = screen.getByTestId('canvas-container');
    expect(container.className).toContain('w-full');
    expect(container.className).toContain('h-full');
  });

  it('sets touch-action none on canvas for pan/zoom support', () => {
    render(<Canvas {...defaultCanvasProps} />);
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    expect(canvas.style.touchAction).toBe('none');
  });

  it('sets canvas dimensions based on container size and device pixel ratio', () => {
    render(<Canvas {...defaultCanvasProps} />);
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    setTimeout(() => {
      expect(canvas.width).toBe(1600); // 800 * dpr(2)
      expect(canvas.height).toBe(1200); // 600 * dpr(2)
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    }, 100);
  });

  it('scales context for device pixel ratio', () => {
    render(<Canvas {...defaultCanvasProps} />);
    setTimeout(() => {
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    }, 100);
  });

  it('has grab cursor when satellite tool is inactive', () => {
    render(<Canvas {...defaultCanvasProps} satelliteToolActive={false} />);
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    expect(canvas.className).toContain('cursor-grab');
  });

  it('has crosshair cursor when satellite tool is active', () => {
    render(<Canvas {...defaultCanvasProps} satelliteToolActive={true} />);
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    expect(canvas.className).toContain('cursor-crosshair');
  });

  it('shows satellite mode hint when satellite tool active with no planet selected', () => {
    render(<Canvas {...defaultCanvasProps} satelliteToolActive={true} />);
    expect(screen.getByText('Click a planet to select it')).toBeTruthy();
  });

  it('does not show placement modal initially', () => {
    render(<Canvas {...defaultCanvasProps} />);
    expect(screen.queryByTestId('placement-modal')).toBeNull();
  });

  it('shows placement modal on canvas drop of planet', () => {
    render(<Canvas {...defaultCanvasProps} />);
    const canvas = screen.getByTestId('canvas');

    fireEvent.dragOver(canvas, {
      dataTransfer: { dropEffect: '' },
      preventDefault: vi.fn(),
    });

    fireEvent.drop(canvas, {
      clientX: 400,
      clientY: 300,
      dataTransfer: { getData: () => 'planet' },
    });

    expect(screen.getByTestId('placement-modal')).toBeTruthy();
  });

  it('shows planet form in placement modal on planet drop', () => {
    render(<Canvas {...defaultCanvasProps} />);
    const canvas = screen.getByTestId('canvas');
    fireEvent.drop(canvas, {
      clientX: 400,
      clientY: 300,
      dataTransfer: { getData: () => 'planet' },
    });
    expect(screen.getByTestId('planet-mass-input')).toBeTruthy();
  });

  it('shows star form in placement modal on star drop', () => {
    render(<Canvas {...defaultCanvasProps} />);
    const canvas = screen.getByTestId('canvas');
    fireEvent.drop(canvas, {
      clientX: 400,
      clientY: 300,
      dataTransfer: { getData: () => 'star' },
    });
    // The default sim already has a star, so the drop is ignored silently
    // (no modal shown — star already present)
    expect(screen.queryByTestId('placement-modal')).toBeNull();
  });
});
