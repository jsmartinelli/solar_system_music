/**
 * UI-related type definitions
 */

import { Vector2D } from './celestial';

/**
 * Toolbar item that can be dragged onto the canvas
 */
export type ToolbarItemType = 'star' | 'planet' | 'satellite';

/**
 * Drag state for toolbar items
 */
export interface DragState {
  isDragging: boolean;
  itemType: ToolbarItemType | null;
  startPosition: Vector2D | null;
  currentPosition: Vector2D | null;
}

/**
 * Canvas viewport state
 */
export interface ViewportState {
  zoom: number; // 1 = 100%, 2 = 200%, etc.
  pan: Vector2D; // Offset from origin
  width: number;
  height: number;
}

/**
 * Mode for satellite placement
 */
export interface SatellitePlacementMode {
  isActive: boolean;
  targetPlanetId: string | null;
  zoomLevel: number;
}

/**
 * Modal state for editing celestial bodies
 */
export interface EditModalState {
  isOpen: boolean;
  entityType: 'star' | 'planet' | 'satellite' | null;
  entityId: string | null;
}
