'use client';

import { useRef, useEffect, useState } from 'react';

interface CanvasProps {
  className?: string;
}

/**
 * Responsive canvas component for rendering the solar system
 * Automatically resizes to fill its container
 */
export default function Canvas({ className = '' }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle responsive resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    // Initial size
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (canvasRef.current && dimensions.width > 0 && dimensions.height > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas resolution
      const dpr = window.devicePixelRatio || 1;
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      canvas.style.width = `${dimensions.width}px`;
      canvas.style.height = `${dimensions.height}px`;

      // Scale context to match device pixel ratio
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  }, [dimensions]);

  // Initial render - draw placeholder
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx && dimensions.width > 0 && dimensions.height > 0) {
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Draw placeholder text
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          'Canvas ready',
          dimensions.width / 2,
          dimensions.height / 2
        );

        // Draw grid for reference
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < dimensions.width; x += 50) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, dimensions.height);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < dimensions.height; y += 50) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(dimensions.width, y);
          ctx.stroke();
        }
      }
    }
  }, [dimensions]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative ${className}`}
      data-testid="canvas-container"
    >
      <canvas
        ref={canvasRef}
        className="block"
        data-testid="canvas"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
