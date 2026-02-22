import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SatelliteModal from '@/components/SatelliteModal';
import type { Planet } from '@/types/celestial';

const mockPlanet: Planet = {
  id: 'planet-1',
  type: 'planet',
  position: { x: 100, y: 100 },
  velocity: { x: 0, y: 0 },
  mass: 100,
  rotation: 0,
  rotationSpeed: 'quarter',
  noteSequence: ['I4', 'III4', 'V4'],
  currentNoteIndex: 0,
  synthType: 'Synth',
  orbitRadius: 150,
  orbitAngle: 0,
  physicsBody: null,
};

// Click 30 units to the right of the planet → orbitRadius should be ~30
const clickWorldPos = { x: 130, y: 100 };

function renderSatelliteModal(overrides: {
  onConfirm?: ReturnType<typeof vi.fn>;
  onCancel?: ReturnType<typeof vi.fn>;
} = {}) {
  const props = {
    parentPlanet: mockPlanet,
    clickWorldPos,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  return { ...render(<SatelliteModal {...props} />), props };
}

describe('SatelliteModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the modal', () => {
    renderSatelliteModal();
    expect(screen.getByTestId('satellite-modal')).toBeTruthy();
  });

  it('displays computed orbit radius', () => {
    renderSatelliteModal();
    const display = screen.getByTestId('satellite-orbit-radius-display');
    expect(display.textContent).toContain('30 units');
  });

  it('shows parent planet id', () => {
    renderSatelliteModal();
    expect(screen.getByText('planet-1')).toBeTruthy();
  });

  it('calls onConfirm with orbitRadius and startAngle when confirmed', () => {
    const onConfirm = vi.fn();
    renderSatelliteModal({ onConfirm });
    fireEvent.click(screen.getByTestId('satellite-confirm-button'));
    expect(onConfirm).toHaveBeenCalledOnce();
    const arg = onConfirm.mock.calls[0][0];
    expect(arg).toHaveProperty('orbitRadius');
    expect(arg).toHaveProperty('startAngle');
    expect(arg.orbitRadius).toBe(30);
    // startAngle for click at (130,100) relative to planet at (100,100) = atan2(0, 30) = 0
    expect(arg.startAngle).toBeCloseTo(0, 3);
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    renderSatelliteModal({ onCancel });
    fireEvent.click(screen.getByTestId('satellite-cancel-button'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when backdrop clicked', () => {
    const onCancel = vi.fn();
    renderSatelliteModal({ onCancel });
    fireEvent.click(screen.getByTestId('satellite-modal-backdrop'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('computes correct orbit radius for diagonal click', () => {
    const onConfirm = vi.fn();
    const diagClickPos = { x: 140, y: 140 }; // sqrt((40^2)+(40^2)) ≈ 57
    render(
      <SatelliteModal
        parentPlanet={mockPlanet}
        clickWorldPos={diagClickPos}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('satellite-confirm-button'));
    const arg = onConfirm.mock.calls[0][0];
    expect(arg.orbitRadius).toBe(57); // Math.round(Math.sqrt(40^2+40^2)) = 57
  });
});
