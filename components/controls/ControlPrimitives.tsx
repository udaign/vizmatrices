
import React, { useCallback, useRef } from 'react';

interface SliderControlProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    displayValue: string;
    label: string;
    color?: string;
    disabled?: boolean;
    theme: 'dark' | 'light';
}

// A single row with a draggable bar for value input
export const SliderControl: React.FC<SliderControlProps> = ({ value, min, max, step = 0.01, onChange, displayValue, label, color = '#888888', disabled = false, theme }) => {
    const barRef = useRef<HTMLDivElement>(null);

    const handleInteraction = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent | React.TouchEvent<HTMLDivElement> | TouchEvent) => {
        if (barRef.current) {
            const rect = barRef.current.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const x = clientX - rect.left;
            const width = rect.width;
            let newValue = (x / width) * (max - min) + min;
            
            if (step) {
                newValue = Math.round(newValue / step) * step;
            }

            newValue = Math.max(min, Math.min(max, newValue)); // Clamp value
            onChange(newValue);
        }
    }, [min, max, step, onChange]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) return;
        e.preventDefault(); // Prevent text selection on drag
        handleInteraction(e);
        const onMouseMove = (moveEvent: MouseEvent) => {
            handleInteraction(moveEvent);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (disabled) return;
        // Prevent default browser actions like scrolling when the user
        // starts interacting with the slider.
        e.preventDefault();
        handleInteraction(e);

        const onTouchMove = (moveEvent: TouchEvent) => {
            handleInteraction(moveEvent);
        };
        const onTouchEnd = () => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    };

    const percentage = ((value - min) / (max - min)) * 100;
    const isDark = theme === 'dark';
    
    return (
        <div
            ref={barRef}
            className={`relative w-full h-8 select-none ${disabled ? 'opacity-50' : ''} ${disabled ? 'cursor-not-allowed' : 'cursor-col-resize'}`}
            style={{ backgroundColor: isDark ? '#565656' : '#E0E0E0' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label}
        >
            {/* Background: Base layer with dark text */}
            <div className="flex items-center justify-between h-full pl-7 pr-2 whitespace-nowrap">
                <span className="text-sm font-bold uppercase tracking-wider text-black truncate">{label}</span>
                <span className="font-mono text-sm text-black">{displayValue}</span>
            </div>

            {/* Foreground: Progress fill layer with light text, clipped */}
            <div
                className="absolute top-0 left-0 w-full h-full"
                style={{ clipPath: `inset(0 ${100 - percentage}% 0 0)` }}
            >
                <div 
                    className="flex items-center justify-between h-full pl-7 pr-2 whitespace-nowrap"
                    style={{ backgroundColor: disabled ? '#888' : color }}
                >
                    <span className="text-sm font-bold uppercase tracking-wider text-white truncate">{label}</span>
                    <span className="font-mono text-sm text-white">{displayValue}</span>
                </div>
            </div>
        </div>
    );
};

interface CheckboxControlProps {
    label: string;
    checked: boolean;
    onChange: () => void;
    color?: string;
    disabled?: boolean;
}

// A custom checkbox that mimics the style
export const CheckboxControl: React.FC<CheckboxControlProps> = ({ label, checked, onChange, color = '#888888', disabled = false }) => (
    <div
        className={`flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={disabled ? undefined : onChange}
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => !disabled && e.key === 'Enter' && onChange()}
    >
         <div className="w-4 h-4 border-2 flex items-center justify-center p-0.5" style={{ borderColor: color }}>
            {checked && <div className="w-full h-full" style={{ backgroundColor: color }} />}
         </div>
         <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
    </div>
);

export const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${open ? 'transform rotate-180' : ''}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);
