import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

// --- Types from App.tsx ---
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
}

interface RippleEngineProps {
    isPlaying: boolean;
    settings: VisualizerSettings;
    onRenderBufferChange: (buffer: Float32Array | null) => void;
    onHighSpotSizeChange: (size: number) => void;
    bassHitCount: number;
    isHighsActive: boolean;
}

export interface RippleEngineHandle {
    tick: () => void;
}

// --- Simulation parameters ---
const simResolution = 128; // Power of 2 is good but not required. 128 is a good balance.


const RippleEngine = forwardRef<RippleEngineHandle, RippleEngineProps>(({
    isPlaying,
    settings,
    onRenderBufferChange,
    onHighSpotSizeChange,
    bassHitCount,
    isHighsActive,
}, ref) => {
    // Simulation state refs
    const buffer1 = useRef<Float32Array | null>(null);
    const buffer2 = useRef<Float32Array | null>(null);
    const isBuffer1Current = useRef(true);
    const isMounted = useRef(false);

    const getIndex = (x: number, y: number) => x + y * simResolution;

    const disturb = useCallback((x: number, y: number, radius: number, strength: number) => {
        const currentBuffer = isBuffer1Current.current ? buffer1.current : buffer2.current;
        if (!currentBuffer) return;

        const intRadius = Math.round(radius);
        if (intRadius === 0) return;

        const radiusSq = radius * radius;
        const simSize = simResolution * simResolution;

        for (let i = -intRadius; i <= intRadius; i++) {
            for (let j = -intRadius; j <= intRadius; j++) {
                const distSq = i * i + j * j;
                if (distSq < radiusSq) {
                    const targetX = Math.floor(x) + i;
                    const targetY = Math.floor(y) + j;
                    const index = getIndex(targetX, targetY);

                    if (index >= 0 && index < simSize) {
                        const distance = Math.sqrt(distSq);
                        const falloff = (1 + Math.cos(distance / radius * Math.PI)) / 2;
                        currentBuffer[index] += strength * falloff;
                    }
                }
            }
        }
    }, []);
    
    // The main simulation logic, to be called on every frame by the parent.
    const runSimulationStep = useCallback(() => {
        if (!isPlaying) return;

        const [current, previous] = isBuffer1Current.current
            ? [buffer1.current, buffer2.current]
            : [buffer2.current, buffer1.current];

        if (!current || !previous) return;
        
        const absorptionBorder = 5;
        for (let i = 1; i < simResolution - 1; i++) {
            for (let j = 1; j < simResolution - 1; j++) {
                const index = getIndex(i, j);
                const neighborsSum =
                    current[getIndex(i - 1, j)] +
                    current[getIndex(i + 1, j)] +
                    current[getIndex(i, j - 1)] +
                    current[getIndex(i, j + 1)];
                
                let currentDamping = settings.viscosity;
                if (i < absorptionBorder || i > simResolution - 1 - absorptionBorder ||
                    j < absorptionBorder || j > simResolution - 1 - absorptionBorder) {
                    currentDamping = 0.75;
                }

                let newValue = (neighborsSum / 2) - previous[index];
                newValue *= currentDamping;
                previous[index] = Math.max(-2, Math.min(2, newValue));
            }
        }

        const nextRenderBuffer = isBuffer1Current.current ? previous : current;
        if (nextRenderBuffer) {
            onRenderBufferChange(new Float32Array(nextRenderBuffer));
        }

        isBuffer1Current.current = !isBuffer1Current.current;
    }, [isPlaying, settings.viscosity, onRenderBufferChange]);

    // Expose the simulation step function to the parent component.
    useImperativeHandle(ref, () => ({
        tick: runSimulationStep,
    }));

    // Effect to trigger bass ripples
    useEffect(() => {
        if (isMounted.current && bassHitCount > 0) {
            const centerSim = (simResolution / 2);
            disturb(centerSim, centerSim, settings.bassRadius, settings.dropStrength);
        }
    }, [bassHitCount, disturb, settings.bassRadius, settings.dropStrength]);

    // Effect to control highs pulses based on active state
    useEffect(() => {
        if (isMounted.current) {
            const pulseSize = isHighsActive ? settings.highsPulseMultiplier : 0;
            onHighSpotSizeChange(pulseSize);
        }
    }, [isHighsActive, onHighSpotSizeChange, settings.highsPulseMultiplier]);
    
    // Setup effect
    useEffect(() => {
        const simSize = simResolution * simResolution;
        if (!buffer1.current) buffer1.current = new Float32Array(simSize);
        if (!buffer2.current) buffer2.current = new Float32Array(simSize);
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        }
    }, []);

    return null;
});

export default RippleEngine;