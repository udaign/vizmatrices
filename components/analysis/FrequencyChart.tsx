import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

interface FrequencyChartProps {
  analyser: AnalyserNode | null;
  label: string;
  color: string;
  sampleRate: number;
  minFreq: number;
  maxFreq: number;
  threshold: number;
  theme: 'dark' | 'light';
}

export interface FrequencyChartHandle {
  draw: () => void;
}

const generateLogTicks = (min: number, max: number): number[] => {
    const ticks: number[] = [];
    let power = Math.pow(10, Math.floor(Math.log10(min)));
    
    while (power < max) {
        for (const multiple of [1, 2, 5]) {
            const tick = power * multiple;
            if (tick >= min && tick <= max) {
                ticks.push(tick);
            }
        }
        power *= 10;
    }
    ticks.unshift(min);
    ticks.push(max);
    return [...new Set(ticks.map(t => Math.round(t)))].sort((a,b) => a - b);
};


const FrequencyChart = forwardRef<FrequencyChartHandle, FrequencyChartProps>(({ 
    analyser, 
    label, 
    color, 
    sampleRate, 
    minFreq, 
    maxFreq,
    threshold,
    theme,
 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sampleRate) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const padding = { top: 15, right: 20, bottom: 45, left: 55 };
    const chartWidth = canvasWidth - padding.left - padding.right;
    const chartHeight = canvasHeight - padding.top - padding.bottom;

    const minDecibels = analyser ? analyser.minDecibels : -100;
    const maxDecibels = analyser ? analyser.maxDecibels : 0;
    const frequencyBinCount = analyser ? analyser.frequencyBinCount : 1024;
    const dataArray = new Float32Array(frequencyBinCount);
    
    const nyquist = sampleRate / 2;
    const getIndexForFreq = (freq: number) => Math.round(freq * frequencyBinCount / nyquist);
    const getFreqForIndex = (index: number) => index * nyquist / frequencyBinCount;

    if (analyser) {
      analyser.getFloatFrequencyData(dataArray);
    } else {
      dataArray.fill(minDecibels);
    }

    canvasCtx.fillStyle = isDark ? '#111827' : '#f9fafb';
    canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    canvasCtx.save();
    canvasCtx.translate(padding.left, padding.top);
    
    canvasCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    canvasCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    canvasCtx.font = '12px "Space Grotesk", sans-serif';
    canvasCtx.lineWidth = 1;

    canvasCtx.beginPath();
    canvasCtx.moveTo(0, 0);
    canvasCtx.lineTo(0, chartHeight);
    canvasCtx.stroke();

    canvasCtx.textAlign = 'right';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText(`${maxDecibels} dB`, -10, 0);
    canvasCtx.fillText(`${minDecibels} dB`, -10, chartHeight);

    canvasCtx.beginPath();
    canvasCtx.moveTo(0, chartHeight);
    canvasCtx.lineTo(chartWidth, chartHeight);
    canvasCtx.stroke();
    
    const logTicks = generateLogTicks(minFreq, maxFreq);
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    const logRange = maxLog - minLog;

    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';

    logTicks.forEach(freq => {
      const pos = (Math.log10(freq) - minLog) / logRange;
      const x = pos * chartWidth;
      const label = freq >= 1000 ? `${(freq / 1000).toFixed(1).replace('.0','')}k` : `${freq}`;
      canvasCtx.fillText(label, x, chartHeight + 10);
    });

    canvasCtx.fillText('Frequency (Hz) - Logarithmic Scale', chartWidth / 2, chartHeight + 25);
    canvasCtx.save();
    canvasCtx.translate(-padding.left + 15, chartHeight / 2);
    canvasCtx.rotate(-Math.PI / 2);
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'bottom';
    canvasCtx.fillText('Amplitude (dB)', 0, 0);
    canvasCtx.restore();

    canvasCtx.fillStyle = color;
    
    const startIndex = getIndexForFreq(minFreq);
    const endIndex = Math.min(getIndexForFreq(maxFreq), dataArray.length - 1);

    for (let i = startIndex; i <= endIndex; i++) {
      const db = dataArray[i];
      if (db === -Infinity) continue;

      const freq = getFreqForIndex(i);
      const nextFreq = getFreqForIndex(i + 1);

      const logPos = (Math.log10(freq) - minLog) / logRange;
      const nextLogPos = (Math.log10(nextFreq) - minLog) / logRange;
      
      const x = logPos * chartWidth;
      const nextX = nextLogPos * chartWidth;
      const barWidth = Math.max(1, nextX - x);
      
      const percent = (db - minDecibels) / (maxDecibels - minDecibels);
      const barHeight = Math.max(0, chartHeight * percent);
      
      canvasCtx.fillRect(x, chartHeight - barHeight, barWidth, barHeight);
    }

    canvasCtx.restore();

  }, [analyser, color, sampleRate, minFreq, maxFreq, threshold, isDark]);

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
        aria-label={`${label} frequency spectrum showing amplitude vs frequency`}
      ></canvas>
    </div>
  );
});

export default FrequencyChart;