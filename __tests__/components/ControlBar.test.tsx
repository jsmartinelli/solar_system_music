import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ControlBar from '@/components/ControlBar';

function renderControlBar(overrides: Partial<Parameters<typeof ControlBar>[0]> = {}) {
  const defaultProps = {
    isPlaying: false,
    timeScale: 1,
    gravityStrength: 1,
    audioReady: true,
    onPlayPause: vi.fn(),
    onRewind: vi.fn(),
    onTimeScaleChange: vi.fn(),
    onGravityChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<ControlBar {...defaultProps} />), props: defaultProps };
}

describe('ControlBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders control bar', () => {
    renderControlBar();
    expect(screen.getByTestId('control-bar')).toBeTruthy();
  });

  it('renders play button when paused', () => {
    renderControlBar({ isPlaying: false });
    const btn = screen.getByTestId('play-pause-button');
    expect(btn.getAttribute('aria-label')).toBe('Play');
  });

  it('renders pause button when playing', () => {
    renderControlBar({ isPlaying: true });
    const btn = screen.getByTestId('play-pause-button');
    expect(btn.getAttribute('aria-label')).toBe('Pause');
  });

  it('calls onPlayPause when play/pause clicked', () => {
    const onPlayPause = vi.fn();
    renderControlBar({ onPlayPause });
    fireEvent.click(screen.getByTestId('play-pause-button'));
    expect(onPlayPause).toHaveBeenCalledOnce();
  });

  it('renders rewind button', () => {
    renderControlBar();
    expect(screen.getByTestId('rewind-button')).toBeTruthy();
  });

  it('calls onRewind when rewind clicked', () => {
    const onRewind = vi.fn();
    renderControlBar({ onRewind });
    fireEvent.click(screen.getByTestId('rewind-button'));
    expect(onRewind).toHaveBeenCalledOnce();
  });

  it('renders time scale slider', () => {
    renderControlBar();
    const slider = screen.getByTestId('time-scale-slider') as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.value).toBe('1');
  });

  it('calls onTimeScaleChange when slider changes', () => {
    const onTimeScaleChange = vi.fn();
    renderControlBar({ onTimeScaleChange });
    const slider = screen.getByTestId('time-scale-slider');
    fireEvent.change(slider, { target: { value: '2.5' } });
    expect(onTimeScaleChange).toHaveBeenCalledWith(2.5);
  });

  it('renders gravity slider', () => {
    renderControlBar();
    const slider = screen.getByTestId('gravity-slider') as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.value).toBe('1');
  });

  it('calls onGravityChange when gravity slider changes', () => {
    const onGravityChange = vi.fn();
    renderControlBar({ onGravityChange });
    const slider = screen.getByTestId('gravity-slider');
    fireEvent.change(slider, { target: { value: '3.0' } });
    expect(onGravityChange).toHaveBeenCalledWith(3);
  });

  it('shows audio hint when audioReady is false', () => {
    renderControlBar({ audioReady: false });
    expect(screen.getByTestId('audio-hint')).toBeTruthy();
  });

  it('hides audio hint when audioReady is true', () => {
    renderControlBar({ audioReady: true });
    expect(screen.queryByTestId('audio-hint')).toBeNull();
  });

  it('displays current time scale value', () => {
    renderControlBar({ timeScale: 2.5 });
    expect(screen.getByText('2.5×')).toBeTruthy();
  });

  it('displays current gravity value', () => {
    renderControlBar({ gravityStrength: 3.0 });
    expect(screen.getAllByText('3.0×').length).toBeGreaterThan(0);
  });
});
