import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlacementModal from '@/components/PlacementModal';

const worldPosition = { x: 100, y: 200 };

function renderStarModal(overrides: { onConfirm?: ReturnType<typeof vi.fn>; onCancel?: ReturnType<typeof vi.fn> } = {}) {
  const props = {
    entityType: 'star' as const,
    worldPosition,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  return { ...render(<PlacementModal {...props} />), props };
}

function renderPlanetModal(overrides: { onConfirm?: ReturnType<typeof vi.fn>; onCancel?: ReturnType<typeof vi.fn> } = {}) {
  const props = {
    entityType: 'planet' as const,
    worldPosition,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  return { ...render(<PlacementModal {...props} />), props };
}

describe('PlacementModal — Star', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the modal', () => {
    renderStarModal();
    expect(screen.getByTestId('placement-modal')).toBeTruthy();
  });

  it('shows star-specific fields', () => {
    renderStarModal();
    expect(screen.getByTestId('star-bpm-input')).toBeTruthy();
    expect(screen.getByTestId('star-key-select')).toBeTruthy();
    expect(screen.getByTestId('star-mode-select')).toBeTruthy();
  });

  it('does not show planet fields', () => {
    renderStarModal();
    expect(screen.queryByTestId('planet-mass-input')).toBeNull();
  });

  it('calls onConfirm with star options when Place Star clicked', () => {
    const onConfirm = vi.fn();
    renderStarModal({ onConfirm });
    fireEvent.click(screen.getByTestId('placement-confirm-button'));
    expect(onConfirm).toHaveBeenCalledOnce();
    const arg = onConfirm.mock.calls[0][0];
    expect(arg).toHaveProperty('bpm');
    expect(arg).toHaveProperty('key');
    expect(arg).toHaveProperty('mode');
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    renderStarModal({ onCancel });
    fireEvent.click(screen.getByTestId('placement-cancel-button'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when backdrop clicked', () => {
    const onCancel = vi.fn();
    renderStarModal({ onCancel });
    fireEvent.click(screen.getByTestId('placement-modal-backdrop'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('updates BPM input', () => {
    renderStarModal();
    const input = screen.getByTestId('star-bpm-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '140' } });
    expect(input.value).toBe('140');
  });
});

describe('PlacementModal — Planet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the modal', () => {
    renderPlanetModal();
    expect(screen.getByTestId('placement-modal')).toBeTruthy();
  });

  it('shows planet-specific fields', () => {
    renderPlanetModal();
    expect(screen.getByTestId('planet-mass-input')).toBeTruthy();
    expect(screen.getByTestId('planet-note-sequence-input')).toBeTruthy();
    expect(screen.getByTestId('planet-rotation-speed-select')).toBeTruthy();
    expect(screen.getByTestId('planet-synth-type-select')).toBeTruthy();
    expect(screen.getByTestId('planet-clockwise-checkbox')).toBeTruthy();
  });

  it('does not show star fields', () => {
    renderPlanetModal();
    expect(screen.queryByTestId('star-bpm-input')).toBeNull();
  });

  it('calls onConfirm with planet options when Place Planet clicked', () => {
    const onConfirm = vi.fn();
    renderPlanetModal({ onConfirm });
    fireEvent.click(screen.getByTestId('placement-confirm-button'));
    expect(onConfirm).toHaveBeenCalledOnce();
    const arg = onConfirm.mock.calls[0][0];
    expect(arg).toHaveProperty('mass');
    expect(arg).toHaveProperty('noteSequence');
    expect(arg).toHaveProperty('rotationSpeed');
    expect(arg).toHaveProperty('synthType');
    expect(arg).toHaveProperty('clockwise');
  });

  it('shows validation error for invalid note sequence', () => {
    renderPlanetModal();
    const input = screen.getByTestId('planet-note-sequence-input');
    fireEvent.change(input, { target: { value: 'BADTOKEN X9' } });
    expect(screen.getByTestId('note-sequence-error')).toBeTruthy();
  });

  it('clears validation error for valid note sequence', () => {
    renderPlanetModal();
    const input = screen.getByTestId('planet-note-sequence-input');
    // First set invalid
    fireEvent.change(input, { target: { value: 'BADTOKEN' } });
    expect(screen.getByTestId('note-sequence-error')).toBeTruthy();
    // Then fix it
    fireEvent.change(input, { target: { value: 'I4 V4' } });
    expect(screen.queryByTestId('note-sequence-error')).toBeNull();
  });

  it('disables confirm button when note sequence is invalid', () => {
    renderPlanetModal();
    const input = screen.getByTestId('planet-note-sequence-input');
    fireEvent.change(input, { target: { value: 'BADTOKEN' } });
    const btn = screen.getByTestId('placement-confirm-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    renderPlanetModal({ onCancel });
    fireEvent.click(screen.getByTestId('placement-cancel-button'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
