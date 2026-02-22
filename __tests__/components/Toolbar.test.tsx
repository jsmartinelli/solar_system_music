import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from '@/components/Toolbar';
import { MAX_PLANETS } from '@/lib/entities/planet';
import { MAX_SATELLITES } from '@/lib/entities/satellite';

function renderToolbar(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
  const defaultProps = {
    planetCount: 0,
    satelliteCount: 0,
    onSatelliteToolSelect: vi.fn(),
    satelliteToolActive: false,
    ...overrides,
  };
  return { ...render(<Toolbar {...defaultProps} />), props: defaultProps };
}

describe('Toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toolbar container', () => {
    renderToolbar();
    expect(screen.getByTestId('toolbar')).toBeTruthy();
  });

  it('renders star drag item', () => {
    renderToolbar();
    expect(screen.getByTestId('toolbar-item-star')).toBeTruthy();
  });

  it('renders planet drag item', () => {
    renderToolbar();
    expect(screen.getByTestId('toolbar-item-planet')).toBeTruthy();
  });

  it('renders satellite button', () => {
    renderToolbar();
    expect(screen.getByTestId('toolbar-item-satellite')).toBeTruthy();
  });

  it('star item is draggable', () => {
    renderToolbar();
    const star = screen.getByTestId('toolbar-item-star');
    expect(star.getAttribute('draggable')).toBe('true');
  });

  it('planet item is draggable when under limit', () => {
    renderToolbar({ planetCount: 0 });
    const planet = screen.getByTestId('toolbar-item-planet');
    expect(planet.getAttribute('draggable')).toBe('true');
  });

  it('planet item is not draggable at planet limit', () => {
    renderToolbar({ planetCount: MAX_PLANETS });
    const planet = screen.getByTestId('toolbar-item-planet');
    expect(planet.getAttribute('draggable')).not.toBe('true');
  });

  it('satellite button fires onSatelliteToolSelect when clicked', () => {
    const onSatelliteToolSelect = vi.fn();
    renderToolbar({ onSatelliteToolSelect });
    const btn = screen.getByTestId('toolbar-item-satellite');
    fireEvent.click(btn);
    expect(onSatelliteToolSelect).toHaveBeenCalledOnce();
  });

  it('satellite button is disabled at satellite limit', () => {
    const onSatelliteToolSelect = vi.fn();
    renderToolbar({ satelliteCount: MAX_SATELLITES, onSatelliteToolSelect });
    const btn = screen.getByTestId('toolbar-item-satellite') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('satellite button not fired when at limit', () => {
    const onSatelliteToolSelect = vi.fn();
    renderToolbar({ satelliteCount: MAX_SATELLITES, onSatelliteToolSelect });
    const btn = screen.getByTestId('toolbar-item-satellite');
    fireEvent.click(btn);
    expect(onSatelliteToolSelect).not.toHaveBeenCalled();
  });

  it('drag start sets itemType in dataTransfer for star', () => {
    renderToolbar();
    const star = screen.getByTestId('toolbar-item-star');
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
    };
    fireEvent.dragStart(star, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('itemType', 'star');
  });

  it('drag start sets itemType in dataTransfer for planet', () => {
    renderToolbar();
    const planet = screen.getByTestId('toolbar-item-planet');
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
    };
    fireEvent.dragStart(planet, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('itemType', 'planet');
  });

  it('shows satelliteToolActive style when active', () => {
    renderToolbar({ satelliteToolActive: true });
    const btn = screen.getByTestId('toolbar-item-satellite');
    expect(btn.className).toContain('border-purple-500');
  });

  it('displays planet count', () => {
    renderToolbar({ planetCount: 5 });
    expect(screen.getByText(`5/${MAX_PLANETS}`)).toBeTruthy();
  });

  it('displays satellite count', () => {
    renderToolbar({ satelliteCount: 12 });
    expect(screen.getByText(`12/${MAX_SATELLITES}`)).toBeTruthy();
  });
});
