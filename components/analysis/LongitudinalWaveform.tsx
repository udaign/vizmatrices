
import React, { useRef, useEffect } from 'react';

interface LongitudinalWaveformProps {
  historyData: number[];
  label: string;
  color: string;
  currentTime: number;
  maxAmplitude: number;
  fftSize: number;
  sampleRate: number;
  windowDuration: number; // e.g., 2 for 2 seconds
  audioRef: React.RefObject<HTMLAudioElement>;
}

const getNiceTickInterval = (duration: number) => {
    const targetTickCount = 10;
    const roughInterval = duration / targetTickCount;
    // Predefined "nice" intervals
    const niceIntervals = [
        0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10,
    ];
    // Find the smallest "nice" interval that is greater than the rough interval
    return niceIntervals.find(interval => interval > roughInterval) || niceIntervals[niceIntervals.length - 1];
};


const LongitudinalWaveform: React.FC<LongitudinalWaveformProps> = ({
  historyData,
  label,
  color,
  currentTime,
  maxAmplitude,
  fftSize,
  sampleRate,
  windowDuration,
  audioRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audioEl = audioRef.current;
    if (!canvas || !audioEl || historyData.length === 0 || !sampleRate || !fftSize) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate static data for the current page based on the `currentTime` prop.
    // This ensures the background waveform only changes when we move to a new page.
    const pointsPerSecond = sampleRate / fftSize;
    const totalPointsInWindow = pointsPerSecond * windowDuration;
    const currentWindowIndex = Math.floor(currentTime / windowDuration);
    const windowStartTime = currentWindowIndex * windowDuration;
    const startDataIndex = Math.floor(windowStartTime * pointsPerSecond);
    const endDataIndex = startDataIndex + Math.ceil(totalPointsInWindow);
    const windowData = historyData.slice(startDataIndex, endDataIndex);

    let animationFrameId: number;

    const draw = () => {
        // Set up a continuous animation loop.
        animationFrameId = requestAnimationFrame(draw);

        // Get live time from the audio element for smooth scrubber animation.
        const liveTime = audioEl.currentTime;

        // On each frame, clear the canvas and redraw everything.
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        ctx.fillStyle = '#111827'; // Tailwind bg-gray-900
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const padding = { top: 15, right: 20, bottom: 40, left: 55 };
        const chartWidth = canvasWidth - padding.left - padding.right;
        const chartHeight = canvasHeight - padding.top - padding.bottom;
        
        ctx.save();
        ctx.translate(padding.left, padding.top);

        // --- Draw Axes and Grid (Static for this page) ---
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px "Space Grotesk", sans-serif';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, chartHeight);
        ctx.stroke();
        
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(maxAmplitude.toFixed(2), -10, 0);
        ctx.fillText('0.00', -10, chartHeight);

        ctx.beginPath();
        ctx.moveTo(0, chartHeight);
        ctx.lineTo(chartWidth, chartHeight);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const tickInterval = getNiceTickInterval(windowDuration);
        const useMilliseconds = windowDuration < 1;
        for (let i = 0; i <= windowDuration; i += tickInterval) {
            const x = (i / windowDuration) * chartWidth;
            const timeValue = windowStartTime + i;
            let labelText: string;
            if (useMilliseconds) {
                labelText = `${(timeValue * 1000).toFixed(0)}ms`;
            } else {
                labelText = `${parseFloat(timeValue.toFixed(2))}s`;
            }
            ctx.fillText(labelText, x, chartHeight + 10);
        }
        
        ctx.fillText(`Time (${useMilliseconds ? 'ms' : 's'})`, chartWidth / 2, chartHeight + 25);
        ctx.save();
        ctx.translate(-padding.left + 15, chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Peak Amplitude', 0, 0);
        ctx.restore();

        // --- Draw Waveform (Static for this page) ---
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (windowData.length > 0) {
            for (let i = 0; i < windowData.length; i++) {
                const x = (i / totalPointsInWindow) * chartWidth;
                const y = chartHeight - (windowData[i] / maxAmplitude) * chartHeight;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // --- Draw Scrubber (Dynamic part) ---
        if (liveTime >= windowStartTime && liveTime < windowStartTime + windowDuration) {
            const timeInWindow = liveTime - windowStartTime;
            const scrubberX = (timeInWindow / windowDuration) * chartWidth;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Match axes color
            ctx.lineWidth = 1; // Thinner line
            ctx.beginPath();
            ctx.moveTo(scrubberX, 0);
            ctx.lineTo(scrubberX, chartHeight);
            ctx.stroke();
        }
        
        ctx.restore();
    };
    
    draw(); // Start the animation loop

    return () => {
      // Clean up the loop when the component unmounts or dependencies change.
      cancelAnimationFrame(animationFrameId);
    };
  }, [historyData, currentTime, maxAmplitude, label, color, fftSize, sampleRate, windowDuration, audioRef]);

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 flex flex-col">
      <h3 className="text-white text-lg font-medium mb-2 text-center">{label}</h3>
      <canvas
        ref={canvasRef}
        width="1400" // Higher resolution for full width
        height="150"
        className="w-full h-36 rounded-md"
        aria-label={`${label} showing peak amplitude over a time interval`}
      ></canvas>
    </div>
  );
};

export default LongitudinalWaveform;
