
import React from 'react';

interface Thresholds {
  bass: number;
  mids: number;
  highs: number;
}

interface ThresholdControlProps {
  thresholds: Thresholds;
  onThresholdChange: (newThresholds: Thresholds) => void;
}

const bandInfo: Record<'bass' | 'highs', { label: string, color: string }> = {
    bass: { label: 'Bass', color: '#d71921' },
    highs: { label: 'Highs', color: '#4a90e2' },
};


const ThresholdControl: React.FC<ThresholdControlProps> = ({ thresholds, onThresholdChange }) => {
  const handleSliderChange = (band: keyof typeof bandInfo, value: string) => {
    onThresholdChange({
      ...thresholds,
      [band]: Number(value),
    });
  };

  return (
    <div className="w-full max-w-md p-4 space-y-4 text-white bg-gray-900/50 backdrop-blur-sm rounded-lg" role="group" aria-labelledby="threshold-heading">
        <h3 id="threshold-heading" className="text-lg font-medium text-center text-white/90">Amplitude Triggers</h3>
        <div className="space-y-3">
            {(Object.keys(bandInfo) as (keyof typeof bandInfo)[]).map((band) => (
                <div key={band} className="grid grid-cols-5 items-center gap-3">
                    <label htmlFor={`${band}-threshold`} className="capitalize text-sm text-gray-300 col-span-1 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bandInfo[band].color }}></span>
                        {bandInfo[band].label}
                    </label>
                    <input
                        id={`${band}-threshold`}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={thresholds[band]}
                        onChange={(e) => handleSliderChange(band, e.target.value)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer col-span-3 accent-brand-accent"
                        style={{ accentColor: bandInfo[band].color }}
                        aria-label={`${band} threshold slider`}
                    />
                    <span className="text-sm font-mono text-right text-gray-400 col-span-1">{thresholds[band].toFixed(2)}</span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ThresholdControl;
