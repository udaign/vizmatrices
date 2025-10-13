import React, { useState, useRef } from 'react';
import { trackEvent } from '../../analytics';
import { SliderControl, ChevronIcon } from './ControlPrimitives';
import { ControlPanelProps } from '../ControlPanel';

type RipplePanelProps = ControlPanelProps;

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const RipplePanel: React.FC<RipplePanelProps> = ({
    settings, onSettingsChange, onResetEngine, theme
}) => {
    const isDark = theme === 'dark';
    const [isEngineSectionOpen, setEngineSectionOpen] = useState(false);
    const debounceTrackRefs = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});

    const handleDebouncedSettingChange = (key: keyof typeof settings, value: number) => {
        onSettingsChange({ ...settings, [key]: value });
        
        // FIX: Explicitly convert `key` to a string to prevent a runtime error when using it in a template literal, as `keyof` can include symbols.
        const debounceKey = `engine_${String(key)}`;
        if (debounceTrackRefs.current[debounceKey]) {
            clearTimeout(debounceTrackRefs.current[debounceKey]!);
        }
        debounceTrackRefs.current[debounceKey] = setTimeout(() => {
            // FIX: Explicitly convert `key` to a string to satisfy the `toSnakeCase` function's parameter type.
            trackEvent(`setting_change_${toSnakeCase(String(key))}`, { value });
        }, 500);
    };

    const toggleSection = () => {
        const isOpening = !isEngineSectionOpen;
        trackEvent('expand_control_section', { section_name: 'engine', state: isOpening ? 'open' : 'close' });
        setEngineSectionOpen(prev => !prev);
    };

    return (
        <>
            {/* Section 5: Engine Controls */}
            <div>
                 <div
                    onClick={toggleSection}
                    className={`flex items-center justify-between p-1.5 ${isDark ? 'text-white' : 'text-black'} cursor-pointer select-none`}
                    style={{ backgroundColor: isDark ? '#3c3c3c' : '#F5F5F5'}}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isEngineSectionOpen}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection()}
                >
                    <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#888888' }}></span>
                        Ripple Engine Controls
                    </span>
                     <div className="flex items-center gap-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                trackEvent('controls_reset', { section: 'engine' });
                                onResetEngine();
                            }}
                            className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'} transition-colors`}
                            aria-label="Reset engine controls"
                        >
                            Reset
                        </button>
                        <ChevronIcon open={isEngineSectionOpen} />
                    </div>
                </div>
                {isEngineSectionOpen && (
                    <div className="divide-y-2 divide-black" style={{ backgroundColor: isDark ? '#3c3c3c' : '#F5F5F5'}}>
                        <div className="divide-y-2 divide-black">
                            <SliderControl
                                label="Bass Pulse Size"
                                value={settings.bassRadius}
                                min={5} max={50} step={1}
                                onChange={(v) => handleDebouncedSettingChange('bassRadius', v as number)}
                                displayValue={`${settings.bassRadius.toFixed(0)}px`}
                                theme={theme}
                            />
                            <SliderControl
                                label="Highs Pulse Size"
                                value={settings.highsPulseMultiplier}
                                min={50} max={200} step={1}
                                onChange={(v) => handleDebouncedSettingChange('highsPulseMultiplier', v as number)}
                                displayValue={`${settings.highsPulseMultiplier.toFixed(0)}`}
                                theme={theme}
                            />
                            <SliderControl
                                label="Highs Pulse Position"
                                value={settings.orbitalRadius}
                                min={0} max={1} step={0.01}
                                onChange={(v) => handleDebouncedSettingChange('orbitalRadius', v)}
                                displayValue={settings.orbitalRadius.toFixed(2)}
                                theme={theme}
                            />
                            <SliderControl
                                label="Viscosity"
                                value={settings.viscosity}
                                min={0.9} max={0.999} step={0.001}
                                onChange={(v) => handleDebouncedSettingChange('viscosity', v)}
                                displayValue={settings.viscosity.toFixed(3)}
                                theme={theme}
                            />
                            <SliderControl
                                label="Drop Strength"
                                value={settings.dropStrength}
                                min={0.5} max={10} step={0.1}
                                onChange={(v) => handleDebouncedSettingChange('dropStrength', v)}
                                displayValue={settings.dropStrength.toFixed(1)}
                                theme={theme}
                            />
                            <SliderControl
                                label="Ripple Cooldown"
                                value={settings.rippleCooldown}
                                min={50} max={500} step={10}
                                onChange={(v) => handleDebouncedSettingChange('rippleCooldown', v)}
                                displayValue={`${settings.rippleCooldown.toFixed(0)}ms`}
                                theme={theme}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default RipplePanel;