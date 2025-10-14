

import React, { useState, useRef } from 'react';
import { trackEvent } from '../analytics';
import { CheckboxControl, SliderControl, ChevronIcon } from './controls/ControlPrimitives';
import RipplePanel from './controls/RipplePanel';

// Types to match App.tsx state
interface Thresholds {
  bass: number;
  mids: number;
  highs: number;
}
interface VisualizerSettings {
  viscosity: number;
  blackPoint: number;
  whitePoint: number;
  dropStrength: number;
  rippleCooldown: number;
  contrast: number;
  invert: boolean;
  orbitalRadius: number;
  glowEnabled: boolean;
  glowIntensity: number;
  bassRadius: number;
  highsPulseMultiplier: number;
  showAngularGuides: boolean;
  showQuadrantGuides: boolean;
  showColumnGrid: boolean;
  showBaselineGrid: boolean;
}

interface FrequencyMuteState {
  bass: boolean;
  mids: boolean;
  highs: boolean;
}

interface AutoThresholdSettings {
  enabled: boolean;
  memoryBankSeconds: number;
  floor: {
    bass: number;
    highs: number;
  };
  sensitivity: {
    bass: number;
    highs: number;
  };
  smoothing: number;
}

type Engine = 'Ripple' | 'Shooter';

export interface ControlPanelProps {
  thresholds: Thresholds;
  onThresholdChange: (newThresholds: Thresholds) => void;
  settings: VisualizerSettings;
  onSettingsChange: (newSettings: VisualizerSettings) => void;
  onResetEngine: () => void;
  onResetDisplay: () => void;
  frequencyMute: FrequencyMuteState;
  onFrequencyMuteChange: (band: keyof FrequencyMuteState) => void;
  autoThresholdSettings: AutoThresholdSettings;
  onAutoThresholdSettingsChange: (newSettings: AutoThresholdSettings) => void;
  onResetAutoThresholds: () => void;
  theme: 'dark' | 'light';
  currentEngine: Engine;
  onEngineChange: (engine: Engine) => void;
  pipEnabled: boolean;
  onPipEnabledChange: (enabled: boolean) => void;
  pipSupported: boolean;
}

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// The main panel component
const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    const { 
        frequencyMute, onFrequencyMuteChange,
        theme, currentEngine, onEngineChange,
        thresholds, onThresholdChange,
        settings, onSettingsChange, onResetDisplay,
        autoThresholdSettings, onAutoThresholdSettingsChange, onResetAutoThresholds,
        pipEnabled, onPipEnabledChange, pipSupported,
    } = props;

    const isDark = theme === 'dark';
    const engines: Engine[] = ['Ripple', 'Shooter'];
    const engineDisplayNames: { [key in Engine]: string } = {
        'Ripple': 'Ripple',
        'Shooter': 'Shooter'
    };

    const [openSections, setOpenSections] = useState({
        threshold: false,
        display: false,
    });

    const debounceTrackRefs = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});
    
    const handleDebouncedValueChange = (key: string, value: number) => {
        if (debounceTrackRefs.current[key]) {
            clearTimeout(debounceTrackRefs.current[key]!);
        }
        debounceTrackRefs.current[key] = setTimeout(() => {
            trackEvent(`setting_change_${toSnakeCase(key)}`, { value });
        }, 500);
    };

    const handleFrequencyMuteToggle = (band: keyof FrequencyMuteState) => {
        const isMuting = !frequencyMute[band];
        trackEvent('frequency_mute_toggle', { band, muted: isMuting });
        onFrequencyMuteChange(band);
    };

    const toggleSection = (section: keyof typeof openSections) => {
        const isOpening = !openSections[section];
        trackEvent('expand_control_section', { section_name: section, state: isOpening ? 'open' : 'close' });
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleSettingChange = (key: keyof VisualizerSettings, value: number | boolean) => {
        onSettingsChange({ ...settings, [key]: value });
        if (typeof value === 'boolean') {
            trackEvent(`setting_toggle_${toSnakeCase(key)}`, { enabled: value });
        } else {
            handleDebouncedValueChange(key, value);
        }
    };

    const handleThresholdChange = (key: 'bass' | 'highs', value: number) => {
        onThresholdChange({ ...thresholds, [key]: value });
        handleDebouncedValueChange(`manual_${key}_threshold`, value);
    };

    const handleAutoSettingChange = (key: keyof Omit<AutoThresholdSettings, 'floor' | 'sensitivity'>, value: number | boolean) => {
        onAutoThresholdSettingsChange({ ...autoThresholdSettings, [key]: value as any });
        if (typeof value === 'boolean') {
            trackEvent(`setting_toggle_${toSnakeCase(key)}`, { enabled: value });
        } else {
            handleDebouncedValueChange(key, value);
        }
    };
    
    const handleFloorChange = (band: 'bass' | 'highs', value: number) => {
        onAutoThresholdSettingsChange({
            ...autoThresholdSettings,
            floor: {
                ...autoThresholdSettings.floor,
                [band]: value
            }
        });
        handleDebouncedValueChange(`auto_${band}_floor`, value);
    };
  
    const handleSensitivityChange = (band: 'bass' | 'highs', value: number) => {
        onAutoThresholdSettingsChange({
            ...autoThresholdSettings,
            sensitivity: {
                ...autoThresholdSettings.sensitivity,
                [band]: value
            }
        });
        handleDebouncedValueChange(`auto_${band}_sensitivity`, value);
    };


    return (
        <div className="w-full font-sans">
            <div className="divide-y-2 divide-black">
                {/* PiP Toggle */}
                <div>
                    <div className={`flex items-center justify-between py-1.5 pr-2 pl-7 ${isDark ? 'text-white' : 'text-black'}`} style={{ backgroundColor: isDark ? '#565656' : '#E0E0E0'}}>
                        <CheckboxControl
                            label="PiP"
                            checked={pipEnabled}
                            onChange={() => {
                                trackEvent('pip_toggle', { enabled: !pipEnabled, method: 'ui_toggle' });
                                onPipEnabledChange(!pipEnabled);
                            }}
                            disabled={!pipSupported}
                        />
                    </div>
                </div>

                {/* Section 1: Mute Toggles (Always Open) */}
                <div>
                    <div className={`flex items-center justify-around p-1.5 ${isDark ? 'text-white' : 'text-black'}`} style={{ backgroundColor: isDark ? '#565656' : '#E0E0E0'}}>
                        <CheckboxControl
                            label="BASS"
                            checked={frequencyMute.bass}
                            onChange={() => handleFrequencyMuteToggle('bass')}
                            color="#d71921"
                        />
                        <CheckboxControl
                            label="MIDS"
                            checked={frequencyMute.mids}
                            onChange={() => handleFrequencyMuteToggle('mids')}
                            color={isDark ? '#ffffff' : '#1f2937'}
                        />
                        <CheckboxControl
                            label="HIGHS"
                            checked={frequencyMute.highs}
                            onChange={() => handleFrequencyMuteToggle('highs')}
                            color="#4a90e2"
                        />
                    </div>
                </div>

                {/* Section 2: Threshold Controls (Auto + Manual) */}
                <div>
                    <div
                        onClick={() => toggleSection('threshold')}
                        className={`flex items-center justify-between p-1.5 ${isDark ? 'text-white' : 'text-black'} cursor-pointer select-none`}
                        style={{ backgroundColor: isDark ? '#3c3c3c' : '#F5F5F5'}}
                        role="button"
                        tabIndex={0}
                        aria-expanded={openSections.threshold}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection('threshold')}
                    >
                        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F5BA0A' }}></span>
                            Threshold Controls
                        </span>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    trackEvent('controls_reset', { section: 'auto_thresholds' });
                                    onResetAutoThresholds();
                                }}
                                className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'} disabled:text-gray-600 transition-colors`}
                                aria-label="Reset auto-threshold controls"
                            >
                                Reset
                            </button>
                            <ChevronIcon open={openSections.threshold} />
                        </div>
                    </div>
                    {openSections.threshold && (
                        <div className="divide-y-2 divide-black" style={{ backgroundColor: isDark ? '#3c3c3c' : '#F5F5F5'}}>
                            <div className="divide-y-2 divide-black">
                                <div className={`flex items-center justify-between py-1.5 pr-2 pl-7 ${isDark ? 'text-white' : 'text-black'}`} style={{ backgroundColor: isDark ? '#565656' : '#E0E0E0'}}>
                                    <CheckboxControl
                                        label="Auto Threshold"
                                        checked={autoThresholdSettings.enabled}
                                        onChange={() => handleAutoSettingChange('enabled', !autoThresholdSettings.enabled)}
                                        color="#F5BA0A"
                                    />
                                </div>

                                {autoThresholdSettings.enabled ? (
                                    <>
                                        <SliderControl
                                            label="Memory Bank"
                                            value={autoThresholdSettings.memoryBankSeconds}
                                            min={2} max={12} step={0.1}
                                            onChange={(v) => handleAutoSettingChange('memoryBankSeconds', v)}
                                            displayValue={`${autoThresholdSettings.memoryBankSeconds.toFixed(1)}s`}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                        <SliderControl
                                            label="Bass Amp Allowance"
                                            value={autoThresholdSettings.sensitivity.bass}
                                            min={0.5} max={1.0} step={0.01}
                                            onChange={(v) => handleSensitivityChange('bass', v)}
                                            displayValue={autoThresholdSettings.sensitivity.bass.toFixed(2)}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                        <SliderControl
                                            label="Highs Amp Allowance"
                                            value={autoThresholdSettings.sensitivity.highs}
                                            min={0.5} max={1.0} step={0.01}
                                            onChange={(v) => handleSensitivityChange('highs', v)}
                                            displayValue={autoThresholdSettings.sensitivity.highs.toFixed(2)}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                        <SliderControl
                                            label="Bass Floor"
                                            value={autoThresholdSettings.floor.bass}
                                            min={0} max={0.5} step={0.01}
                                            onChange={(v) => handleFloorChange('bass', v)}
                                            displayValue={autoThresholdSettings.floor.bass.toFixed(2)}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                        <SliderControl
                                            label="Highs Floor"
                                            value={autoThresholdSettings.floor.highs}
                                            min={0} max={0.5} step={0.01}
                                            onChange={(v) => handleFloorChange('highs', v)}
                                            displayValue={autoThresholdSettings.floor.highs.toFixed(2)}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                        <SliderControl
                                            label="Smoothing"
                                            value={autoThresholdSettings.smoothing}
                                            min={0} max={0.99} step={0.01}
                                            onChange={(v) => handleAutoSettingChange('smoothing', v)}
                                            displayValue={autoThresholdSettings.smoothing.toFixed(2)}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <SliderControl
                                            label="Bass Threshold"
                                            value={thresholds.bass}
                                            min={0} max={1}
                                            onChange={(v) => handleThresholdChange('bass', v)}
                                            displayValue={thresholds.bass.toFixed(2)}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                        <SliderControl
                                            label="Highs Threshold"
                                            value={thresholds.highs}
                                            min={0} max={1}
                                            onChange={(v) => handleThresholdChange('highs', v)}
                                            displayValue={thresholds.highs.toFixed(2)}
                                            color="#F5BA0A"
                                            theme={theme}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 3: Display Controls */}
                <div>
                    <div
                        onClick={() => toggleSection('display')}
                        className={`flex items-center justify-between p-1.5 ${isDark ? 'text-white' : 'text-black'} cursor-pointer select-none`}
                        style={{ backgroundColor: isDark ? '#3c3c3c' : '#F5F5F5'}}
                        role="button"
                        tabIndex={0}
                        aria-expanded={openSections.display}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection('display')}
                    >
                        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                            <span className={`w-3 h-3 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></span>
                            Display Controls
                        </span>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    trackEvent('controls_reset', { section: 'display' });
                                    onResetDisplay();
                                }}
                                className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'} transition-colors`}
                                aria-label="Reset display controls"
                            >
                                Reset
                            </button>
                            <ChevronIcon open={openSections.display} />
                        </div>
                    </div>
                    {openSections.display && (
                        <div className="divide-y-2 divide-black" style={{ backgroundColor: isDark ? '#3c3c3c' : '#F5F5F5'}}>
                            <div className="divide-y-2 divide-black">
                                <div className={`flex items-center justify-between py-1.5 pr-2 pl-7 ${isDark ? 'text-white' : 'text-black'}`} style={{ backgroundColor: isDark ? '#565656' : '#E0E0E0'}}>
                                    <CheckboxControl
                                        label="Pixel Glow"
                                        checked={settings.glowEnabled}
                                        onChange={() => handleSettingChange('glowEnabled', !settings.glowEnabled)}
                                    />
                                </div>
                                <SliderControl
                                    label="Glow Intensity"
                                    value={settings.glowIntensity}
                                    min={0} max={5} step={0.1}
                                    onChange={(v) => handleSettingChange('glowIntensity', v)}
                                    displayValue={settings.glowIntensity.toFixed(1)}
                                    theme={theme}
                                />
                                <SliderControl
                                    label="Contrast"
                                    value={settings.contrast}
                                    min={0.5} max={4} step={0.01}
                                    onChange={(v) => handleSettingChange('contrast', v)}
                                    displayValue={settings.contrast.toFixed(2)}
                                    theme={theme}
                                />
                                <SliderControl
                                    label="White Point"
                                    value={settings.whitePoint}
                                    min={0} max={1} step={0.01}
                                    onChange={(v) => handleSettingChange('whitePoint', v)}
                                    displayValue={settings.whitePoint.toFixed(2)}
                                    theme={theme}
                                />
                                <SliderControl
                                    label="Black Point"
                                    value={settings.blackPoint}
                                    min={0} max={1} step={0.01}
                                    onChange={(v) => handleSettingChange('blackPoint', v)}
                                    displayValue={settings.blackPoint.toFixed(2)}
                                    theme={theme}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 divide-y-2 divide-black">
                {/* Engine Selector */}
                <div>
                    <div className={`${isDark ? 'text-white' : 'text-black'}`} style={{ backgroundColor: isDark ? '#3c3c3c' : '#F5F5F5'}}>
                        <div className="grid grid-cols-2">
                            {engines.map(engine => (
                                <button
                                    key={engine}
                                    onClick={() => onEngineChange(engine)}
                                    className={`h-8 flex items-center justify-center text-sm font-bold uppercase tracking-wider transition-colors duration-200`}
                                    style={{
                                        backgroundColor: currentEngine === engine ? (isDark ? '#565656' : '#E0E0E0') : 'transparent',
                                        color: currentEngine === engine ? (isDark ? 'white' : 'black') : (isDark ? '#a0a0a0' : '#666')
                                    }}
                                    aria-pressed={currentEngine === engine}
                                >
                                    {engineDisplayNames[engine]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Engine-specific controls */}
                {currentEngine === 'Ripple' && (
                    <RipplePanel {...props} />
                )}
            </div>
        </div>
    );
};

export default ControlPanel;