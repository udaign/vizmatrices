import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

interface WaveformProps {
  analyser: AnalyserNode | null;
  label: string;
  color: string;
  sampleRate: number;
  threshold: number;
  theme: 'dark' | 'light';
}

export interface WaveformHandle {
  draw: () => void;
}

const Waveform = forwardRef<WaveformHandle, WaveformProps>(({ analyser, label, color, sampleRate, threshold, theme }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sampleRate) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Fixed internal resolution for the canvas
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const padding = { top: 15, right: 20, bottom: 45, left: 55 };
    const chartWidth = canvasWidth - padding.left - padding.right;
    const chartHeight = canvasHeight - padding.top - padding.bottom;
    
    const fftSize = analyser ? analyser.fftSize : 2048;
    const dataArray = new Float32Array(fftSize);
    const durationMs = ((fftSize / sampleRate) * 1000).toFixed(1);

    if (analyser) {
      analyser.getFloatTimeDomainData(dataArray);
    } else {
      dataArray.fill(0); // For placeholder, draw a flat line
    }

    // Clear canvas with background color
    canvasCtx.fillStyle = isDark ? '#111827' : '#f9fafb';
    canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    canvasCtx.save();
    canvasCtx.translate(padding.left, padding.top);
    
    // --- Draw Axes and Labels ---
    canvasCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    canvasCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    canvasCtx.font = '12px "Space Grotesk", sans-serif';
    canvasCtx.lineWidth = 1;
    
    // Y-Axis line
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, 0);
    canvasCtx.lineTo(0, chartHeight);
    canvasCtx.stroke();

    // X-Axis line (centerline at 0.0 amplitude)
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, chartHeight / 2);
    canvasCtx.lineTo(chartWidth, chartHeight / 2);
    canvasCtx.stroke();
    
    // Y-Axis Ticks & Labels
    canvasCtx.textAlign = 'right';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText('+1.0', -10, 0);
    canvasCtx.fillText('0.0', -10, chartHeight / 2);
    canvasCtx.fillText('-1.0', -10, chartHeight);
    
    // X-Axis Ticks & Labels
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';
    canvasCtx.fillText('0 ms', 0, chartHeight + 10);
    canvasCtx.fillText(`${durationMs} ms`, chartWidth, chartHeight + 10);

    // --- Draw Axis Titles ---
    // X-Axis Title
    canvasCtx.fillText('Time (ms)', chartWidth / 2, chartHeight + 25);
    
    // Y-Axis Title (rotated)
    canvasCtx.save();
    canvasCtx.translate(-padding.left + 15, chartHeight / 2);
    canvasCtx.rotate(-Math.PI / 2);
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'bottom';
    canvasCtx.fillText('Amplitude', 0, 0);
    canvasCtx.restore();

    // --- Draw Waveform ---
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = color;
    canvasCtx.beginPath();
    
    for (let i = 0; i < dataArray.length; i++) {
      const x = (i / (dataArray.length - 1)) * chartWidth;
      // Map the -1.0 to 1.0 range to the chart's y-coordinates
      const y = (chartHeight / 2) * (1 - dataArray[i]);

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
    }
    canvasCtx.stroke();
    
    // --- Draw Threshold Lines ---
    if (threshold > 0 && threshold < 1) {
      canvasCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)';
      canvasCtx.lineWidth = 1;
      canvasCtx.setLineDash([4, 4]);

      // Positive threshold
      const yPos = (chartHeight / 2) * (1 - threshold);
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, yPos);
      canvasCtx.lineTo(chartWidth, yPos);
      canvasCtx.stroke();

      // Negative threshold
      const yNeg = (chartHeight / 2) * (1 + threshold);
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, yNeg);
      canvasCtx.lineTo(chartWidth, yNeg);
      canvasCtx.stroke();

      canvasCtx.setLineDash([]); // Reset line dash
    }
    
    canvasCtx.restore(); // Restores back to before the translate
  }, [analyser, color, sampleRate, threshold, isDark]);

  useImperativeHandle(ref, () => ({
    draw,
  }));

  return (
    <div className={`${isDark ? 'bg-gray-900/50' : 'bg-white/50'} backdrop-blur-sm rounded-lg p-3 flex-1 flex flex-col`}>
      <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg font-medium mb-2 text-center`}>{label}</h3>
      <canvas 
        ref={canvasRef} 
        width="700" 
        height="200" 
        className="w-full h-48 rounded-md"
        aria-label={`${label} waveform showing amplitude over time`}
      ></canvas>
    </div>
  );
});

export default Waveform;