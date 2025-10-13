import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import Waveform from './Waveform';
import FrequencyChart from './FrequencyChart';

interface AnalyserNodes {
  bass: AnalyserNode;
  mids: AnalyserNode;
  highs: AnalyserNode;
}

interface Thresholds {
  bass: number;
  mids: number;
  highs: number;
}

interface WaveformContainerProps {
  analysers: AnalyserNodes | null;
  sampleRate: number | null;
  thresholds: Thresholds;
  theme: 'dark' | 'light';
}

export interface WaveformContainerHandle {
  drawCharts: () => void;
}

const WaveformContainer = forwardRef<WaveformContainerHandle, WaveformContainerProps>(({ 
  analysers, 
  sampleRate,
  thresholds,
  theme,
}, ref) => {
  const effectiveSampleRate = sampleRate || 44100; // Use a default for placeholder view
  const nyquist = effectiveSampleRate / 2;

  const chartRefs = useRef<({ draw: () => void } | null)[]>([]);

  useImperativeHandle(ref, () => ({
    drawCharts: () => {
      chartRefs.current.forEach(chartRef => chartRef?.draw());
    }
  }));

  return (
    <div className="w-full space-y-8" role="region" aria-label="Audio Analysis Panels">
      {/* Time Domain Row */}
      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* FIX: Changed ref callback to not return a value, satisfying the Ref<T> type. */}
        <Waveform ref={el => { chartRefs.current[0] = el; }} analyser={analysers ? analysers.bass : null} label="Waveform: Bass" color="#d71921" sampleRate={effectiveSampleRate} threshold={thresholds.bass} theme={theme} />
        {/* FIX: Changed ref callback to not return a value, satisfying the Ref<T> type. */}
        <Waveform ref={el => { chartRefs.current[1] = el; }} analyser={analysers ? analysers.mids : null} label="Waveform: Mids" color={theme === 'dark' ? '#ffffff' : '#1f2937'} sampleRate={effectiveSampleRate} threshold={thresholds.mids} theme={theme} />
        {/* FIX: Changed ref callback to not return a value, satisfying the Ref<T> type. */}
        <Waveform ref={el => { chartRefs.current[2] = el; }} analyser={analysers ? analysers.highs : null} label="Waveform: Highs" color="#4a90e2" sampleRate={effectiveSampleRate} threshold={thresholds.highs} theme={theme} />
      </div>

      {/* Frequency Domain Row */}
       <div className="flex flex-col md:flex-row gap-4 w-full">
        <FrequencyChart 
          // FIX: Changed ref callback to not return a value, satisfying the Ref<T> type.
          ref={el => { chartRefs.current[3] = el; }}
          analyser={analysers ? analysers.bass : null} 
          label="Spectrum: Bass" 
          color="#d71921" 
          sampleRate={effectiveSampleRate} 
          minFreq={20} 
          maxFreq={250} 
          threshold={thresholds.bass}
          theme={theme}
        />
        <FrequencyChart 
          // FIX: Changed ref callback to not return a value, satisfying the Ref<T> type.
          ref={el => { chartRefs.current[4] = el; }}
          analyser={analysers ? analysers.mids : null}
          label="Spectrum: Mids" 
          color={theme === 'dark' ? '#ffffff' : '#1f2937'} 
          sampleRate={effectiveSampleRate} 
          minFreq={250} 
          maxFreq={4000} 
          threshold={thresholds.mids}
          theme={theme}
        />
        <FrequencyChart 
          // FIX: Changed ref callback to not return a value, satisfying the Ref<T> type.
          ref={el => { chartRefs.current[5] = el; }}
          analyser={analysers ? analysers.highs : null}
          label="Spectrum: Highs" 
          color="#4a90e2" 
          sampleRate={effectiveSampleRate} 
          minFreq={4000} 
          maxFreq={nyquist} 
          threshold={thresholds.highs}
          theme={theme}
        />
      </div>
    </div>
  );
});

export default WaveformContainer;