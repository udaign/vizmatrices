import React, { useEffect, useRef } from 'react';

interface VisualizerSettings {
  glowEnabled: boolean;
  glowIntensity: number;
}

interface PixelMatrixProps {
  sourceImageData: ImageData | null;
  settings: VisualizerSettings;
  size: number;
}

const diameter = 25;

const PIXEL_COORDS = (() => {
    const coords = new Set<string>();
    const center = (diameter - 1) / 2;
    const R_sq = 12.5 * 12.5; 
    for (let y = 0; y < diameter; y++) {
        for (let x = 0; x < diameter; x++) {
            const dx = x - center;
            const dy = y - center;
            if (dx * dx + dy * dy <= R_sq) {
                coords.add(`${x},${y}`);
            }
        }
    }
    return coords;
})();

const PixelMatrix: React.FC<PixelMatrixProps> = ({ sourceImageData, settings, size }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !size) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // --- High-DPI Scaling for Sharpness ---
        // Get the device pixel ratio, falling back to 1.
        const dpr = window.devicePixelRatio || 1;

        // Set the canvas backing store size to match the display size multiplied by the dpr.
        canvas.width = Math.floor(size * dpr);
        canvas.height = Math.floor(size * dpr);

        // Scale the context to ensure drawing operations are scaled up.
        // All subsequent drawing will be based on the CSS pixel size (`size`).
        ctx.scale(dpr, dpr);

        // --- Responsive Scaling Logic (based on CSS pixel size) ---
        const referenceSize = 396;
        const referenceGap = 5;
        const gap = Math.max(1, (size / referenceSize) * referenceGap);
        const padding = 24; // Corresponds to p-3 on the container
        const gridSize = size - padding;
        const pixelSize = Math.max(1, (gridSize - ((diameter - 1) * gap)) / diameter);

        // Clear canvas before drawing. Since the context is scaled, we use the CSS size.
        ctx.clearRect(0, 0, size, size);

        if (!sourceImageData) {
            return; // Don't draw if there's no data
        }

        const sourceWidth = sourceImageData.width;
        const sourceHeight = sourceImageData.height;
        const sourceData = sourceImageData.data;
        const cellWidth = sourceWidth / diameter;
        const cellHeight = sourceHeight / diameter;

        // Offset to center the grid within the padded container (using CSS pixel size)
        const totalGridWidth = (diameter * pixelSize) + ((diameter - 1) * gap);
        const offsetX = (size - totalGridWidth) / 2;
        const offsetY = (size - totalGridWidth) / 2;

        for (let y = 0; y < diameter; y++) {
            for (let x = 0; x < diameter; x++) {
                if (!PIXEL_COORDS.has(`${x},${y}`)) {
                    continue;
                }

                const startX = Math.floor(x * cellWidth);
                const endX = Math.floor((x + 1) * cellWidth);
                const startY = Math.floor(y * cellHeight);
                const endY = Math.floor((y + 1) * cellHeight);

                let totalBrightness = 0;
                let pixelCount = 0;

                for (let sy = startY; sy < endY; sy++) {
                    for (let sx = startX; sx < endX; sx++) {
                        const sourceIndex = (sy * sourceWidth + sx) * 4;
                        if (sourceData[sourceIndex + 3] > 0) { // Check alpha channel
                            totalBrightness += sourceData[sourceIndex]; // Source is grayscale
                            pixelCount++;
                        }
                    }
                }

                const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
                const brightnessValue = Math.round(avgBrightness);
                const pixelColor = `rgb(${brightnessValue}, ${brightnessValue}, ${brightnessValue})`;

                const drawX = offsetX + x * (pixelSize + gap);
                const drawY = offsetY + y * (pixelSize + gap);

                // Reset shadow from previous pixel to prevent bleed
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;

                if (settings.glowEnabled && brightnessValue > 0) {
                    const normalizedBrightness = brightnessValue / 255;
                    const glowBlur = normalizedBrightness * settings.glowIntensity * 2.5;
                    const glowSpread = normalizedBrightness * settings.glowIntensity * 0.5;
                    
                    if (glowBlur > 0.1) {
                        ctx.shadowColor = pixelColor;
                        // The shadowBlur is also affected by the context's scale,
                        // so we don't need to manually multiply it by dpr.
                        ctx.shadowBlur = glowBlur + glowSpread;
                    }
                }
                
                ctx.fillStyle = pixelColor;
                ctx.fillRect(drawX, drawY, pixelSize, pixelSize);
            }
        }
        
        // Final reset of shadow properties
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

    }, [sourceImageData, settings, size]);

    return (
        <div className="flex w-full items-center justify-center">
            {/* IMPORTANT: The pixel matrix has a visual diameter of 25px, resulting in 489 active pixels. Do not change this configuration. */}
            <div className="p-3 rounded-full shadow-lg bg-black flex items-center justify-center" style={{ width: size, height: size }}>
                <canvas
                    ref={canvasRef}
                    // The width and height attributes are now managed in useEffect to handle devicePixelRatio.
                    // We set the CSS size here to ensure it fits the container correctly.
                    style={{ width: size, height: size }}
                    aria-label="Pixel matrix visualization grid"
                />
            </div>
        </div>
    );
};

export default PixelMatrix;