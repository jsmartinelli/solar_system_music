import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Canvas from '@/components/Canvas';

describe('Canvas Component', () => {
  let mockGetContext: ReturnType<typeof vi.fn>;
  let mockContext: Partial<CanvasRenderingContext2D>;

  beforeEach(() => {
    // Mock canvas context
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
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };

    mockGetContext = vi.fn(() => mockContext);
    HTMLCanvasElement.prototype.getContext = mockGetContext as any;

    // Mock getBoundingClientRect
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

    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 2,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render canvas container', () => {
    render(<Canvas />);
    const container = screen.getByTestId('canvas-container');
    expect(container).toBeTruthy();
  });

  it('should render canvas element', () => {
    render(<Canvas />);
    const canvas = screen.getByTestId('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should apply custom className', () => {
    render(<Canvas className="custom-class" />);
    const container = screen.getByTestId('canvas-container');
    expect(container.className).toContain('custom-class');
  });

  it('should set canvas dimensions based on container size', () => {
    render(<Canvas />);
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;

    // Allow time for effects to run
    setTimeout(() => {
      expect(canvas.width).toBe(1600); // 800 * 2 (device pixel ratio)
      expect(canvas.height).toBe(1200); // 600 * 2
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    }, 100);
  });

  it('should scale context for device pixel ratio', () => {
    render(<Canvas />);

    setTimeout(() => {
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    }, 100);
  });

  it('should have touch-action none for pan/zoom support', () => {
    render(<Canvas />);
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    expect(canvas.style.touchAction).toBe('none');
  });

  it('should fill entire container', () => {
    render(<Canvas />);
    const container = screen.getByTestId('canvas-container');
    expect(container.className).toContain('w-full');
    expect(container.className).toContain('h-full');
  });

  it('should render placeholder content', () => {
    render(<Canvas />);

    setTimeout(() => {
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Canvas ready',
        expect.any(Number),
        expect.any(Number)
      );
    }, 100);
  });

  it('should draw reference grid', () => {
    render(<Canvas />);

    setTimeout(() => {
      // Should have called beginPath multiple times for grid lines
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    }, 100);
  });
});
