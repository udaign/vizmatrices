
import React from 'react';

interface VisualizerSettings {
  viscosity: number;
  blackPoint: number;
  whitePoint: number;
  dropStrength: number;
  rippleCooldown: number;
  contrast: number;
  invert: boolean;
  orbitalVelocity: number;
}

interface VisualizerControlsProps {
  settings: VisualizerSettings;
  onSettingsChange: (newSettings: VisualizerSettings) => void;
}

const controlsInfo: Record<keyof Omit<VisualizerSettings, 'invert'>, { label: string, min: number, max: number, step: number, unit?: string }> = {
    viscosity: { label: 'Viscosity', min: 0.90, max: 0.999, step: 0.001 },
    blackPoint: { label: 'Black Point', min: 0, max: 1, step: 0.01 },
    whitePoint: { label: 'White Point', min: 0, max: 1, step: 0.01 },
    contrast: { label: 'Contrast', min: 0.5, max: 4, step: 0.1 },
    dropStrength: { label: 'Drop Strength', min: 0.5, max: 10, step: 0.1 },
    rippleCooldown: { label: 'Ripple Cooldown', min: 50, max: 500, step: 10, unit: 'ms' },
    orbitalVelocity: { label: 'Orbital Velocity', min: 0, max: 0.02, step: 0.001 },
};

const VisualizerControls: React.FC<VisualizerControlsProps> = ({ settings, onSettingsChange }) => {
  const handleSliderChange = (setting: keyof Omit<VisualizerSettings, 'invert'>, value: string) => {
    onSettingsChange({
      ...settings,
      [setting]: Number(value),
    });
  };

  const handleToggleChange = (setting: 'invert') => {
    onSettingsChange({
        ...settings,
        [setting]: !settings[setting],
    });
  };

  const formatValue = (key: keyof Omit<VisualizerSettings, 'invert'>) => {
    const value = settings[key];
    const info = controlsInfo[key];
    if (key === 'viscosity' || key === 'orbitalVelocity') return value.toFixed(3);
    if (key === 'blackPoint' || key === 'whitePoint' || key === 'dropStrength' || key === 'contrast') return value.toFixed(2);
    return `${value.toFixed(0)}${info.unit || ''}`;
  }

  return (
    <div className="w-full max-w-md p-4 space-y-4 text-white bg-gray-900/50 backdrop-blur-sm rounded-lg" role="group" aria-labelledby="viz-controls-heading">
        <h3 id="viz-controls-heading" className="text-lg font-medium text-center text-white/90">Visualizer Settings</h3>
        <div className="space-y-3">
            {(Object.keys(controlsInfo) as (keyof typeof controlsInfo)[]).map((key) => {
                const info = controlsInfo[key];
                return (
                    <div key={key} className="grid grid-cols-5 items-center gap-3">
                        <label htmlFor={`${key}-slider`} className="capitalize text-sm text-gray-300 col-span-2">
                            {info.label}
                        </label>
                        <input
                            id={`${key}-slider`}
                            type="range"
                            min={info.min}
                            max={info.max}
                            step={info.step}
                            value={settings[key]}
                            onChange={(e) => handleSliderChange(key, e.target.value)}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer col-span-2 accent-gray-400"
                            aria-label={`${info.label} slider`}
                        />
                        <span className="text-sm font-mono text-right text-gray-400 col-span-1">{formatValue(key)}</span>
                    </div>
                );
            })}
        </div>
        <div className="border-t border-gray-700/50 pt-3 space-y-3">
            <div className="flex items-center justify-between">
                <label htmlFor="invert-toggle" className="text-sm text-gray-300">Invert Colors</label>
                <button
                    id="invert-toggle"
                    role="switch"
                    aria-checked={settings.invert}
                    onClick={() => handleToggleChange('invert')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-accent ${settings.invert ? 'bg-brand-accent' : 'bg-gray-600'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.invert ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default VisualizerControls;
