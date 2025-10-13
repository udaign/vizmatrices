
import React from 'react';
import LongitudinalWaveform from './LongitudinalWaveform';

interface AnalyserNodes {
  bass: AnalyserNode;
  mids: AnalyserNode;
  highs: AnalyserNode;
}

interface LongitudinalWaveformContainerProps {
    bassHistory: number[];
    midsHistory: number[];
    highsHistory: number[];
    currentTime: number;
    bassMaxAmplitude: number;
    midsMaxAmplitude: number;
    highsMaxAmplitude: number;
    analysers: AnalyserNodes | null;
    sampleRate: number | null;
    windowSize: number;
    onWindowSizeChange: (newSize: number) => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

const ZOOM_LEVELS = [20, 10, 5, 2, 1, 0.5, 0.2, 0.1]; // In seconds

const LongitudinalWaveformContainer: React.FC<LongitudinalWaveformContainerProps> = ({
    bassHistory,
    midsHistory,
    highsHistory,
    currentTime,
    bassMaxAmplitude,
    midsMaxAmplitude,
    highsMaxAmplitude,
    analysers,
    sampleRate,
    windowSize,
    onWindowSizeChange,
    audioRef
}) => {
    if (!analysers || !sampleRate || bassHistory.length === 0) {
        return null; // Don't render if no data has been collected yet
    }
    
    const fftSize = analysers.bass.fftSize;

    const handleZoom = (direction: 'in' | 'out') => {
        const currentIndex = ZOOM_LEVELS.indexOf(windowSize);
        if (direction === 'in') {
            const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
            onWindowSizeChange(ZOOM_LEVELS[nextIndex]);
        } else { // 'out'
            const nextIndex = Math.max(currentIndex - 1, 0);
            onWindowSizeChange(ZOOM_LEVELS[nextIndex]);
        }
    };

    const currentZoomIndex = ZOOM_LEVELS.indexOf(windowSize);

    return (
        <div className="w-full space-y-4 text-white" role="region" aria-label="Longitudinal Waveform Analysis">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <h2 className="text-xl font-bold text-white">Full Track Analysis</h2>
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Time Window: {windowSize < 1 ? `${windowSize * 1000}ms` : `${windowSize}s`}</span>
                    <button 
                        onClick={() => handleZoom('out')} 
                        disabled={currentZoomIndex === 0}
                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Zoom out"
                    >
                        Zoom Out (-)
                    </button>
                    <button 
                        onClick={() => handleZoom('in')}
                        disabled={currentZoomIndex === ZOOM_LEVELS.length - 1}
                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Zoom in"
                    >
                       Zoom In (+)
                    </button>
                 </div>
            </div>

            <LongitudinalWaveform
                historyData={bassHistory}
                label="Longitudinal: Bass"
                color="#d71921"
                currentTime={currentTime}
                maxAmplitude={bassMaxAmplitude}
                fftSize={fftSize}
                sampleRate={sampleRate}
                windowDuration={windowSize}
                audioRef={audioRef}
            />
            <LongitudinalWaveform
                historyData={midsHistory}
                label="Longitudinal: Mids"
                color="#ffffff"
                currentTime={currentTime}
                maxAmplitude={midsMaxAmplitude}
                fftSize={fftSize}
                sampleRate={sampleRate}
                windowDuration={windowSize}
                audioRef={audioRef}
            />
            <LongitudinalWaveform
                historyData={highsHistory}
                label="Longitudinal: Highs"
                color="#4a90e2"
                currentTime={currentTime}
                maxAmplitude={highsMaxAmplitude}
                fftSize={fftSize}
                sampleRate={sampleRate}
                windowDuration={windowSize}
                audioRef={audioRef}
            />
        </div>
    );
};

export default LongitudinalWaveformContainer;
