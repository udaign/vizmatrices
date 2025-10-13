

import React, { useEffect, useRef } from 'react';

interface VisualizerSettings {
  viscosity: number;
  blackPoint: number;
  whitePoint: number;
  dropStrength: number;
  rippleCooldown: number;
  contrast: number;
  invert: boolean;
  orbitalRadius: number;
}

interface VisualizerProps {
  renderBuffer: Float32Array | null;
  settings: VisualizerSettings;
  pulseSize: number;
  onCompositeUpdate: (imageData: ImageData | null) => void;
  size: number;
}

// --- Simulation parameters ---
const simResolution = 128; // Must match the simulation resolution in the engine
const absorptionBorder = 5; // This must match the value in the engine to correctly hide the border
const activeSimResolution = simResolution - 2 * absorptionBorder;


const Visualizer: React.FC<VisualizerProps> = ({ renderBuffer, settings, pulseSize, onCompositeUpdate, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const canvasSize = size;
    const center = canvasSize / 2;
    const vizRadius = canvasSize / 2;

    // --- RENDER FLUID SIMULATION ---
    if (!renderBuffer) {
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        onCompositeUpdate(null);
        return;
    };
    
    const imageData = ctx.createImageData(canvasSize, canvasSize);
    const pixels = imageData.data;
    const getIndex = (x: number, y: number) => x + y * simResolution;
    const sim_center = simResolution / 2;
    const canvasToSimRatio = activeSimResolution / canvasSize;

    for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
            const dx = x - center;
            const dy = y - center;
            const distSq = dx * dx + dy * dy;
            const pixelIndex = (x + y * canvasSize) * 4;
            
            if (distSq > vizRadius * vizRadius) {
                pixels[pixelIndex + 3] = 0; // Transparent outside the circle
                continue;
            }

            const sim_dx = dx * canvasToSimRatio;
            const sim_dy = dy * canvasToSimRatio;
            const simX = Math.floor(sim_dx + sim_center);
            const simY = Math.floor(sim_dy + sim_center);
            
            let fluidIntensity: number;
            if (simX < 0 || simX >= simResolution || simY < 0 || simY >= simResolution) {
                fluidIntensity = 0;
            } else {
                const height = renderBuffer[getIndex(simX, simY)];
                fluidIntensity = Math.min(1.0, Math.abs(height) / 2.0);
            }
            
            let intensity = fluidIntensity;
            intensity = (intensity - 0.5) * settings.contrast + 0.5;
            intensity = Math.max(0, Math.min(1.0, intensity));

            if (settings.invert) {
                intensity = 1.0 - intensity;
            }

            const finalLightValue = settings.blackPoint + intensity * (settings.whitePoint - settings.blackPoint);
            const brightness = Math.floor(Math.max(0, Math.min(1.0, finalLightValue)) * 255);

            pixels[pixelIndex] = brightness;
            pixels[pixelIndex + 1] = brightness;
            pixels[pixelIndex + 2] = brightness;
            pixels[pixelIndex + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);

    // --- RENDER HIGHS PULSES ON TOP ---
    if (pulseSize > 0) {
        let intensity = 1.0;
        intensity = (intensity - 0.5) * settings.contrast + 0.5;
        intensity = Math.max(0, Math.min(1.0, intensity));
        if (settings.invert) {
            intensity = 1.0 - intensity;
        }
        const finalLightValue = settings.blackPoint + intensity * (settings.whitePoint - settings.blackPoint);
        const brightness = Math.floor(Math.max(0, Math.min(1.0, finalLightValue)) * 255);
        const spotColorRgb = `${brightness}, ${brightness}, ${brightness}`;

        const radius = center * settings.orbitalRadius;
        const sqrt3 = Math.sqrt(3);
        const points = [
            { x: center, y: center + radius },
            { x: center - (radius * sqrt3) / 2, y: center - radius * 0.5 },
            { x: center + (radius * sqrt3) / 2, y: center - radius * 0.5 },
        ];
        
        ctx.globalCompositeOperation = 'lighter';

        points.forEach(point => {
            const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, pulseSize / 2);
            gradient.addColorStop(0.2, `rgba(${spotColorRgb}, 1)`);
            gradient.addColorStop(0.7, `rgba(${spotColorRgb}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pulseSize / 2, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        ctx.globalCompositeOperation = 'source-over'; // Reset
    }

    // --- PROVIDE COMPOSITE IMAGE DATA ---
    onCompositeUpdate(ctx.getImageData(0, 0, canvasSize, canvasSize));

  }, [renderBuffer, settings, pulseSize, onCompositeUpdate, size]);

  return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        aria-label="Fluid dynamics music visualizer"
        className="absolute top-0 left-0 w-full h-full"
      />
  );
};

export default Visualizer;