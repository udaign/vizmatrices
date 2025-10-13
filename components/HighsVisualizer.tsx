
import React from 'react';

interface VisualizerSettings {
  blackPoint: number;
  whitePoint: number;
  contrast: number;
  invert: boolean;
  orbitalRadius: number;
}

interface HighsVisualizerProps {
  pulseSize: number;
  settings: VisualizerSettings;
  containerSize: number;
}

// This component's logic has been merged into Visualizer.tsx
// to create a single composite image source. It now renders nothing.
const HighsVisualizer: React.FC<HighsVisualizerProps> = () => {
  return null;
};

export default HighsVisualizer;
