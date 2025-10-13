import React, { useState, useRef, useEffect, useCallback } from 'react';
import { trackEvent } from '../analytics';

// --- Re-define constants from App.tsx ---
const PIP_CANVAS_DIAMETER = 25;
const PIP_PIXEL_COORDS = (() => {
    const coords = new Set<string>();
    const center = (PIP_CANVAS_DIAMETER - 1) / 2;
    const R_sq = 12.5 * 12.5; 
    for (let y = 0; y < PIP_CANVAS_DIAMETER; y++) {
        for (let x = 0; x < PIP_CANVAS_DIAMETER; x++) {
            const dx = x - center;
            const dy = y - center;
            if (dx * dx + dy * dy <= R_sq) {
                coords.add(`${x},${y}`);
            }
        }
    }
    return coords;
})();

interface VisualizerSettings {
    glowEnabled: boolean;
    glowIntensity: number;
}

interface PipRendererProps {
    compositeImageData: ImageData | null;
    settings: VisualizerSettings;
    theme: 'dark' | 'light';
    pipEnabled: boolean;
    isPlaying: boolean;
    hasPlaylist: boolean;
    onPipEnabledChange: (enabled: boolean) => void;
    audioStream: MediaStream | null;
}

const PipRenderer: React.FC<PipRendererProps> = ({
    compositeImageData,
    settings,
    theme,
    pipEnabled,
    isPlaying,
    hasPlaylist,
    onPipEnabledChange,
    audioStream,
}) => {
    const pipCanvasRef = useRef<HTMLCanvasElement>(null);
    const pipVideoRef = useRef<HTMLVideoElement>(null);
    const [isPipSupported, setIsPipSupported] = useState(false);

    useEffect(() => {
        const supported = !!(
            document.pictureInPictureEnabled &&
            HTMLCanvasElement.prototype.captureStream &&
            HTMLVideoElement.prototype.requestPictureInPicture
        );
        setIsPipSupported(supported);
    }, []);

    const exitPip = useCallback(async () => {
        if (document.pictureInPictureElement) {
            try {
                await document.exitPictureInPicture();
            } catch (error) {
                console.error("Exit PiP Error:", error);
            }
        }
    }, []);

    const enterPip = useCallback(async () => {
        if (!pipVideoRef.current || !pipCanvasRef.current || !isPipSupported) return;
        if (document.pictureInPictureElement) return;

        try {
            // @ts-ignore
            const stream = pipCanvasRef.current.captureStream();
            
            if (audioStream) {
                const audioTracks = audioStream.getAudioTracks();
                if (audioTracks.length > 0) {
                    const existingAudioTracks = stream.getAudioTracks();
                    if (existingAudioTracks.length === 0) {
                        stream.addTrack(audioTracks[0]);
                    }
                }
            }

            pipVideoRef.current.srcObject = stream;
            await pipVideoRef.current.play();
            await pipVideoRef.current.requestPictureInPicture();
        } catch (error) {
            console.error("PiP Error:", error);
            // If entering fails, the leavepictureinpicture event will fire,
            // which will trigger the state change.
        }
    }, [isPipSupported, audioStream]);

    // Effect to draw on the PiP canvas whenever the visualizer data changes
    useEffect(() => {
        const canvas = pipCanvasRef.current;
        if (!canvas || !compositeImageData) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        
        // 1. Fill the entire canvas with a theme-appropriate background color.
        // This creates the border area outside the main visualization.
        ctx.fillStyle = theme === 'dark' ? '#000000' : '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // 2. Define padding and draw the smaller, always-black circle that will contain the pixels.
        const canvasPadding = width * 0.04; // 4% padding around the circle
        const circleRadius = (width / 2) - canvasPadding;
        const centerX = width / 2;
        const centerY = height / 2;
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
        ctx.fill();

        // 3. Draw pixel matrix inside the black circle, replicating PixelMatrix.tsx sizing logic
        const diameter = PIP_CANVAS_DIAMETER;
        const containerDiameter = circleRadius * 2;
        
        const referenceSize = 396; // From PixelMatrix.tsx
        const referenceGap = 5;    // From PixelMatrix.tsx
        
        // Calculate gap and pixel sizes proportionally to the new containerDiameter
        const gap = Math.max(1, (containerDiameter / referenceSize) * referenceGap);
        const matrixInternalPaddingProportion = 12 / referenceSize; // Corresponds to p-3 on the reference size
        const matrixInternalPadding = matrixInternalPaddingProportion * containerDiameter;
        
        const gridSize = containerDiameter - (matrixInternalPadding * 2);
        const pixelSize = (gridSize - ((diameter - 1) * gap)) / diameter;
        
        // The grid needs to be offset to be in the center of the black circle.
        const gridOffsetX = canvasPadding + matrixInternalPadding;
        const gridOffsetY = canvasPadding + matrixInternalPadding;


        const sourceWidth = compositeImageData.width;
        const sourceHeight = compositeImageData.height;
        const sourceData = compositeImageData.data;
        const cellWidth = sourceWidth / diameter;
        const cellHeight = sourceHeight / diameter;

        for (let y = 0; y < diameter; y++) {
            for (let x = 0; x < diameter; x++) {
                if (!PIP_PIXEL_COORDS.has(`${x},${y}`)) continue;

                const startX = Math.floor(x * cellWidth);
                const endX = Math.floor((x + 1) * cellWidth);
                const startY = Math.floor(y * cellHeight);
                const endY = Math.floor((y + 1) * cellHeight);

                let totalBrightness = 0, pixelCount = 0;
                for (let sy = startY; sy < endY; sy++) {
                    for (let sx = startX; sx < endX; sx++) {
                        const sourceIndex = (sy * sourceWidth + sx) * 4;
                        if (sourceData[sourceIndex + 3] > 0) {
                            totalBrightness += sourceData[sourceIndex];
                            pixelCount++;
                        }
                    }
                }
                
                const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
                const brightnessValue = Math.round(avgBrightness);
                const pixelColor = `rgb(${brightnessValue}, ${brightnessValue}, ${brightnessValue})`;

                const drawX = gridOffsetX + x * (pixelSize + gap);
                const drawY = gridOffsetY + y * (pixelSize + gap);

                if (settings.glowEnabled && brightnessValue > 0) {
                    const normalizedBrightness = brightnessValue / 255;
                    const scaledGlowBlur = normalizedBrightness * settings.glowIntensity * (pixelSize / 10);
                    if (scaledGlowBlur > 0.1) {
                        ctx.shadowColor = pixelColor;
                        ctx.shadowBlur = scaledGlowBlur;
                    }
                }
                
                ctx.fillStyle = pixelColor;
                ctx.fillRect(drawX, drawY, pixelSize, pixelSize);
                
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }
        }
    }, [compositeImageData, settings.glowEnabled, settings.glowIntensity, theme]);

    // Effect to manage PiP window based on the pipEnabled toggle
    useEffect(() => {
        const canEnterPip = isPipSupported && hasPlaylist;

        if (pipEnabled && canEnterPip) {
            enterPip();
        } else {
            exitPip();
        }
        
        // Edge case: If the user toggles PiP ON but conditions are not met,
        // we should toggle it back off to keep UI in sync.
        if (pipEnabled && !canEnterPip) {
            onPipEnabledChange(false);
        }
    }, [pipEnabled, hasPlaylist, isPipSupported, enterPip, exitPip, onPipEnabledChange]);
    
    // Effect to handle user closing PiP window, which should update the toggle state
    useEffect(() => {
        const video = pipVideoRef.current;
        if (!video) return;
        const handleLeavePip = () => {
            // User closed PiP manually, so update the toggle state.
            trackEvent('pip_toggle', { enabled: false, method: 'manual_close' });
            onPipEnabledChange(false);
        };
        video.addEventListener('leavepictureinpicture', handleLeavePip);
        return () => video.removeEventListener('leavepictureinpicture', handleLeavePip);
    }, [onPipEnabledChange]);

    return (
        <>
            <canvas ref={pipCanvasRef} width="512" height="512" className="hidden" aria-hidden="true"></canvas>
            <video
                ref={pipVideoRef}
                className="hidden"
                muted
                playsInline
                aria-hidden="true"
            ></video>
        </>
    );
};

export default PipRenderer;
