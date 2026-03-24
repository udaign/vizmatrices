
import React, { useState, useRef, useEffect, useCallback } from 'react';
import AudioPlayer from './components/AudioPlayer';
import WaveformContainer from './components/analysis/WaveformContainer';
import ControlPanel from './components/ControlPanel';
import { trackEvent } from './analytics';
import { parseBlob } from 'music-metadata';
import RippleEngine from './components/engines/RippleEngine';
import ShooterEngine from './components/engines/ShooterEngine';
import PixelMatrix from './components/PixelMatrix';
import Visualizer from './components/Visualizer';
import AngularGuides from './components/AngularGuides';
import QuadrantGuides from './components/QuadrantGuides';
import PipRenderer from './components/PipRenderer';
import SleepTimer from './components/SleepTimer';
import Queue from './components/Queue';
import ColumnGrid from './components/ColumnGrid';
import BaselineGrid from './components/BaselineGrid';
import { SupportModal } from './components/SupportModal';



interface AnalyserNodes {
  bass: AnalyserNode;
  mids: AnalyserNode;
  highs: AnalyserNode;
}

interface FrequencyMuteState {
  bass: boolean;
  mids: boolean;
  highs: boolean;
}

export interface PlaylistItem {
    url: string;
    name: string;
    title?: string;
    albumArtUrl?: string;
    artist?: string;
    album?: string;
}

export interface SleepTimerState {
  mode: 'off' | 'timer' | 'songs' | 'repetitions' | 'end_of_playlist';
  isActive: boolean;
  count: number; 
  endTime: number | null; 
  playedCount: number;
}

const defaultSleepTimerState: SleepTimerState = {
  mode: 'off',
  isActive: false,
  count: 0,
  endTime: null,
  playedCount: 0,
};

type Theme = 'dark' | 'light';
type Engine = 'Ripple' | 'Shooter';

const getInitialTheme = (): Theme => {
  const savedTheme = localStorage.getItem('theme') as Theme;
  return savedTheme || 'light'; // Default to light mode
};

// --- Default States ---
const defaultAutoThresholdSettings = {
    enabled: true,
    memoryBankSeconds: 4.8,
    floor: { bass: 0.28, highs: 0.2 },
    sensitivity: { bass: 0.8, highs: 0.96 }, // aka 'allowance'
    smoothing: 0.64, // 0 is instant, approaches 1 for very slow
};

const defaultThresholds = { 
    bass: defaultAutoThresholdSettings.floor.bass, 
    mids: 0.97, // Mids is not auto-adjusted, so it can keep a default
    highs: defaultAutoThresholdSettings.floor.highs 
};

const defaultVisualizerSettings = {
    viscosity: 0.964,
    blackPoint: 0.0,
    whitePoint: 1.0,
    dropStrength: 7.0,
    rippleCooldown: 200,
    contrast: 2.24,
    invert: false,
    orbitalRadius: 0.96,
    glowEnabled: false,
    glowIntensity: 3.2,
    bassRadius: 20,
    highsPulseMultiplier: 120,
    showAngularGuides: false,
    showQuadrantGuides: false,
    showColumnGrid: false,
    showBaselineGrid: false,
};


const App: React.FC = () => {
  const [analysers, setAnalysers] = useState<AnalyserNodes | null>(null);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [visualizerSettings, setVisualizerSettings] = useState(defaultVisualizerSettings);
  const [autoThresholdSettings, setAutoThresholdSettings] = useState(defaultAutoThresholdSettings);
  const [frequencyMute, setFrequencyMute] = useState<FrequencyMuteState>({
    bass: true,
    mids: true,
    highs: true,
  });
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [currentEngine, setCurrentEngine] = useState<Engine>('Ripple');
  const [pipEnabled, setPipEnabled] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  // State lifted up from engines for shared visualizers
  const [renderBuffer, setRenderBuffer] = useState<Float32Array | null>(null);
  const [highSpotSize, setHighSpotSize] = useState(0);
  const [isHighsActive, setIsHighsActive] = useState(false);
  const [compositeImageData, setCompositeImageData] = useState<ImageData | null>(null);

  // Hit counters to trigger engine effects
  const [bassHitCount, setBassHitCount] = useState(0);

  // Playlist and playback state
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [originalPlaylist, setOriginalPlaylist] = useState<PlaylistItem[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('all');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Sleep Timer state
  const [sleepTimer, setSleepTimer] = useState<SleepTimerState>(defaultSleepTimerState);
  const [isSleepTimerMenuOpen, setIsSleepTimerMenuOpen] = useState(false);
  const [isCurrentTrackListened, setIsCurrentTrackListened] = useState(false);
  
  // Queue state
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const lastSelectedTrackUrlRef = useRef<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<{ bass: GainNode; mids: GainNode; highs: GainNode; } | null>(null);

  // Refs for audio analysis
  const lastTriggerTime = useRef({ bass: 0 });
  const dataArrays = useRef<{ [key: string]: Float32Array }>({});
  const bassPeakHistoryRef = useRef<{ peak: number; timestamp: number }[]>([]);
  const highsPeakHistoryRef = useRef<{ peak: number; timestamp: number }[]>([]);
  
  // Highs visualization state refs
  const highsActivationTimeRef = useRef<number>(0);
  const highsContinuousOnStartTimeRef = useRef<number>(0);
  const isHighsActiveRef = useRef(false);
  
  // Ref and state for responsive visualizers
  const visualizerContainerRef = useRef<HTMLDivElement>(null);
  const [visualizerSize, setVisualizerSize] = useState(356);

  // Refs for imperative handles on animating components
  const rippleEngineRef = useRef<{ tick: () => void }>(null);
  const waveformContainerRef = useRef<{ drawCharts: () => void }>(null);
  
  // Ref for debouncing analytics tracking on slider seek
  const seekDebounceTrack = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs for tracking song listen time for sleep timer
  const listenTimeAccumulatorRef = useRef(0);
  const lastPlayTimestampRef = useRef(0);

  useEffect(() => {
    const container = visualizerContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Cap the size at 356px to prevent it from getting too large on wide screens.
        const newSize = Math.floor(Math.min(width, 356));
        if (newSize > 0) {
          setVisualizerSize(newSize);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const isSupported = !!(
      document.pictureInPictureEnabled &&
      HTMLCanvasElement.prototype.captureStream &&
      HTMLVideoElement.prototype.requestPictureInPicture
    );
    setPipSupported(isSupported);
    if (!isSupported) {
      setPipEnabled(false);
    }
  }, []);
  
  // Sync state to a ref for use inside the RAF loop to avoid stale closures.
  useEffect(() => {
    isHighsActiveRef.current = isHighsActive;
  }, [isHighsActive]);

  const hasPlaylist = playlist.length > 0;
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    trackEvent('theme_toggle', { selected_theme: newTheme });
    setTheme(newTheme);
  };

  const handleShowSupportModal = () => {
    trackEvent('show_support_modal');
    setShowSupportModal(true);
  };

  // Apply theme to body and save to localStorage
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Resets adaptive thresholds and history for a new song.
  const resetThresholdsForNewTrack = () => {
    setThresholds(prev => ({ 
        ...prev, 
        bass: autoThresholdSettings.floor.bass, 
        highs: autoThresholdSettings.floor.highs 
    }));
    bassPeakHistoryRef.current = [];
    highsPeakHistoryRef.current = [];
  };

  useEffect(() => {
    if (gainNodesRef.current && audioContextRef.current) {
      const { bass, mids, highs } = gainNodesRef.current;
      const { currentTime } = audioContextRef.current;
      bass.gain.setTargetAtTime(frequencyMute.bass ? 1 : 0, currentTime, 0.01);
      mids.gain.setTargetAtTime(frequencyMute.mids ? 1 : 0, currentTime, 0.01);
      highs.gain.setTargetAtTime(frequencyMute.highs ? 1 : 0, currentTime, 0.01);
    }
  }, [frequencyMute]);

  const resumeContext = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Centralized, high-performance animation loop.
  useEffect(() => {
    if (!isPlaying || !analysers) return;

    // Ensure data arrays are initialized
    Object.keys(analysers).forEach(key => {
        const band = key as keyof AnalyserNodes;
        if (analysers[band] && !dataArrays.current[band]) {
            dataArrays.current[band] = new Float32Array(analysers[band].fftSize);
        }
    });

    let frameId: number;
    const loop = () => {
        // --- 1. Audio Analysis ---
        const now = performance.now();
        let newBassThreshold = thresholds.bass;
        let newHighsThreshold = thresholds.highs;

        const bassAnalyser = analysers['bass'];
        const bassDataArray = dataArrays.current['bass'];
        if (bassAnalyser && bassDataArray) {
            bassAnalyser.getFloatTimeDomainData(bassDataArray);
            const peakAmplitude = bassDataArray.reduce((max, val) => Math.max(max, Math.abs(val)), 0);
            
            if (autoThresholdSettings.enabled) {
                bassPeakHistoryRef.current.push({ peak: peakAmplitude, timestamp: now });
                bassPeakHistoryRef.current = bassPeakHistoryRef.current.filter(entry => now - entry.timestamp < autoThresholdSettings.memoryBankSeconds * 1000);

                if (bassPeakHistoryRef.current.length > 5) {
                    const peaks = bassPeakHistoryRef.current.map(e => e.peak).sort((a, b) => a - b);
                    const percentileIndex = Math.floor(peaks.length * 0.90);
                    const representativePeak = peaks[percentileIndex];
                    let targetThreshold = representativePeak * autoThresholdSettings.sensitivity.bass;
                    targetThreshold = Math.max(targetThreshold, autoThresholdSettings.floor.bass);
                    newBassThreshold = thresholds.bass * autoThresholdSettings.smoothing + targetThreshold * (1 - autoThresholdSettings.smoothing);
                }
            }

            if (peakAmplitude > thresholds.bass && now - lastTriggerTime.current.bass > visualizerSettings.rippleCooldown) {
                lastTriggerTime.current.bass = now;
                setBassHitCount(c => c + 1);
            }
        }
        
        const highsAnalyser = analysers['highs'];
        const highsDataArray = dataArrays.current['highs'];
        if (highsAnalyser && highsDataArray) {
            highsAnalyser.getFloatTimeDomainData(highsDataArray);
            const peakAmplitude = highsDataArray.reduce((max, val) => Math.max(max, Math.abs(val)), 0);

            if (autoThresholdSettings.enabled) {
                highsPeakHistoryRef.current.push({ peak: peakAmplitude, timestamp: now });
                highsPeakHistoryRef.current = highsPeakHistoryRef.current.filter(entry => now - entry.timestamp < autoThresholdSettings.memoryBankSeconds * 1000);
                
                if (highsPeakHistoryRef.current.length > 5) {
                    const peaks = highsPeakHistoryRef.current.map(e => e.peak).sort((a, b) => a - b);
                    const percentileIndex = Math.floor(peaks.length * 0.90);
                    const representativePeak = peaks[percentileIndex];
                    let targetThreshold = representativePeak * autoThresholdSettings.sensitivity.highs;
                    targetThreshold = Math.max(targetThreshold, autoThresholdSettings.floor.highs);
                    newHighsThreshold = thresholds.highs * autoThresholdSettings.smoothing + targetThreshold * (1 - autoThresholdSettings.smoothing);
                }
            }

            const isTriggered = peakAmplitude > thresholds.highs;
            if (isTriggered) highsActivationTimeRef.current = now;
            const rawShouldBeActive = isTriggered || (now - highsActivationTimeRef.current < 80);

            if (rawShouldBeActive && !isHighsActiveRef.current) {
                highsContinuousOnStartTimeRef.current = now;
            } else if (!rawShouldBeActive) {
                highsContinuousOnStartTimeRef.current = 0;
            }

            let finalIsHighsActive = rawShouldBeActive;
            if (highsContinuousOnStartTimeRef.current > 0) {
                const continuousOnDuration = now - highsContinuousOnStartTimeRef.current;
                if (continuousOnDuration > 105) {
                    finalIsHighsActive = false;
                    highsContinuousOnStartTimeRef.current = 0;
                }
            }
            setIsHighsActive(finalIsHighsActive);
        }

        if (autoThresholdSettings.enabled) {
            setThresholds(currentThresholds => ({ ...currentThresholds, bass: newBassThreshold, highs: newHighsThreshold }));
        }

        // --- 2. Run Simulations & Visual Updates ---
        // These calls are now cheap as they don't trigger re-renders.
        rippleEngineRef.current?.tick();
        waveformContainerRef.current?.drawCharts();

        // --- 3. Schedule next frame ---
        frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, analysers, autoThresholdSettings, thresholds, visualizerSettings.rippleCooldown]);

  const setupAudioContext = () => {
    if (audioContextRef.current || !audioRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    setSampleRate(audioContext.sampleRate);

    const source = audioContext.createMediaElementSource(audioRef.current);
    const streamDestination = audioContext.createMediaStreamDestination();
    setAudioStream(streamDestination.stream);

    const configureAnalyser = (analyser: AnalyserNode) => {
        analyser.fftSize = 2048;
        analyser.minDecibels = -100;
        analyser.maxDecibels = 0;
    };

    const bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 250;
    const bassAnalyser = audioContext.createAnalyser();
    configureAnalyser(bassAnalyser);

    const midFilter = audioContext.createBiquadFilter();
    midFilter.type = 'bandpass';
    midFilter.frequency.value = (250 + 4000) / 2;
    midFilter.Q.value = 0.7;
    const midAnalyser = audioContext.createAnalyser();
    configureAnalyser(midAnalyser);

    const highFilter = audioContext.createBiquadFilter();
    highFilter.type = 'highpass';
    highFilter.frequency.value = 4000;
    const highAnalyser = audioContext.createAnalyser();
    configureAnalyser(highAnalyser);
    
    const bassGain = audioContext.createGain();
    const midsGain = audioContext.createGain();
    const highsGain = audioContext.createGain();
    gainNodesRef.current = { bass: bassGain, mids: midsGain, highs: highsGain };

    bassGain.gain.value = frequencyMute.bass ? 1 : 0;
    midsGain.gain.value = frequencyMute.mids ? 1 : 0;
    highsGain.gain.value = frequencyMute.highs ? 1 : 0;

    // Connect source to filters
    source.connect(bassFilter);
    source.connect(midFilter);
    source.connect(highFilter);

    // Connect filters to gain nodes
    bassFilter.connect(bassGain);
    midFilter.connect(midsGain);
    highFilter.connect(highsGain);

    // Connect gain nodes to BOTH analysers (for visualization) and destination (for audio output)
    bassGain.connect(bassAnalyser);
    bassGain.connect(audioContext.destination);
    midsGain.connect(midAnalyser);
    midsGain.connect(audioContext.destination);
    highsGain.connect(highAnalyser);
    highsGain.connect(audioContext.destination);

    // Connect gain nodes to the stream destination for PiP
    bassGain.connect(streamDestination);
    midsGain.connect(streamDestination);
    highsGain.connect(streamDestination);

    // Add a silent, always-on oscillator to the PiP stream to keep it active
    // even when the main audio source is paused. This prevents browsers from
    // closing the PiP window automatically.
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0; // Completely silent
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = 20; // Inaudible low frequency
    oscillator.connect(silentGain);
    silentGain.connect(streamDestination);
    oscillator.start();


    setAnalysers({
      bass: bassAnalyser,
      mids: midAnalyser,
      highs: highAnalyser,
    });
  };

  const handleFilesSelect = (files: FileList, method: 'file_select' | 'folder_select') => {
    // Revoke previous object URLs to prevent memory leaks
    playlist.forEach(track => {
      URL.revokeObjectURL(track.url);
      if (track.albumArtUrl) {
          URL.revokeObjectURL(track.albumArtUrl);
      }
    });

    let audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length === 0) return;
    
    if (method === 'folder_select') {
        audioFiles.sort((a, b) => {
            const dateDiff = b.lastModified - a.lastModified;
            if (dateDiff !== 0) return dateDiff;
            return a.name.localeCompare(b.name);
        });
    }

    trackEvent('load_music', { method: method, track_count: audioFiles.length });

    // Create playlist immediately for fast UI response
    const newPlaylistWithoutArt: PlaylistItem[] = audioFiles.map(file => ({
        url: URL.createObjectURL(file),
        name: file.name,
    }));

    setOriginalPlaylist(newPlaylistWithoutArt);

    let initialPlaylist = newPlaylistWithoutArt;
    if (shuffle) {
      const shuffled = [...newPlaylistWithoutArt];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      initialPlaylist = shuffled;
      setPlaylist(shuffled);
    } else {
        setPlaylist(newPlaylistWithoutArt);
    }
    
    setCurrentTrackIndex(0);
    setThresholds(defaultThresholds);

    // Start playing immediately
    setTimeout(() => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (!audioContextRef.current) {
        setupAudioContext();
      }
      setIsPlaying(true);
    }, 0);

    // Prioritize loading metadata for the order it will be played
    const itemsToProcess = initialPlaylist.map(track => {
        const originalIndex = newPlaylistWithoutArt.findIndex(t => t.url === track.url);
        return { file: audioFiles[originalIndex], url: track.url };
    });

    // Asynchronously load metadata batched to avoid blocking the main thread
    const processMetadataQueue = async (queueItems: { file: File, url: string }[]) => {
        let updateBatch: Record<string, Partial<PlaylistItem>> = {};
        let batchCount = 0;
        let totalProcessed = 0;

        const flushBatch = () => {
            if (Object.keys(updateBatch).length === 0) return;
            
            const batchToFlush = { ...updateBatch };
            updateBatch = {};
            batchCount = 0;

            const applyUpdates = (track: PlaylistItem) => {
                const updates = batchToFlush[track.url];
                if (updates) {
                    return { ...track, ...updates };
                }
                return track;
            };

            setPlaylist(current => current.map(applyUpdates));
            setOriginalPlaylist(current => current.map(applyUpdates));
        };

        for (const item of queueItems) {
            try {
                const metadata = await parseBlob(item.file);
                const { title, artist, album, picture } = metadata.common;

                let albumArtUrl: string | undefined = undefined;
                if (picture && picture.length > 0) {
                    const pic = picture[0];
                    const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
                    albumArtUrl = URL.createObjectURL(blob);
                }

                updateBatch[item.url] = { title: title || undefined, albumArtUrl, artist, album };
                batchCount++;
                totalProcessed++;

                // Flush immediately for the first 3 items (fast UI for currently playing), then batch every 15 items
                if (totalProcessed <= 3 || batchCount >= 15) {
                    flushBatch();
                }
            } catch (error) {
                console.log(`Could not read metadata for ${item.file.name}:`, error);
            }
            // Yield to the main thread after processing each file to keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // Final flush for any remaining items
        flushBatch();
    };

    processMetadataQueue(itemsToProcess);
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    const audioSrc = playlist[currentTrackIndex]?.url;

    // Only update the audio source if it has actually changed to prevent reloads on shuffle.
    if (audioSrc && audio && audio.src !== audioSrc) {
      audio.src = audioSrc;
      audio.load();
      resetThresholdsForNewTrack();
      // Reset listening time trackers for the new song
      listenTimeAccumulatorRef.current = 0;
      lastPlayTimestampRef.current = 0;
      setIsCurrentTrackListened(false);
      audio.play().then(() => {
         setIsPlaying(true);
      }).catch(e => {
          console.log("Autoplay blocked, user must click play.", e);
          trackEvent('error_autoplay_blocked');
          setIsPlaying(false);
      });
    }
  }, [currentTrackIndex, playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(error => console.error("Error playing audio:", error));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const handlePlayNext = useCallback((method: 'ui_button' | 'keyboard' | 'autoplay' = 'ui_button') => {
    if (playlist.length === 0) return;
    
    if (method !== 'autoplay') {
      if (sleepTimer.isActive && sleepTimer.mode === 'songs' && isCurrentTrackListened) {
        const newPlayedCount = sleepTimer.playedCount + 1;
        if (newPlayedCount >= sleepTimer.count) {
            setIsPlaying(false);
            setSleepTimer(defaultSleepTimerState);
            return;
        } else {
            setSleepTimer(prev => ({ ...prev, playedCount: newPlayedCount }));
        }
      }
      trackEvent('track_skip_next', { method });
    }
  
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex >= playlist.length) {
      if (repeat === 'all') {
        setCurrentTrackIndex(0);
      } else {
        setIsPlaying(false); // Stop at the end of the playlist
      }
    } else {
      setCurrentTrackIndex(nextIndex);
    }
  }, [playlist.length, currentTrackIndex, repeat, isCurrentTrackListened, sleepTimer]);

  const handlePlayPrevious = useCallback((method: 'ui_button' | 'keyboard' = 'ui_button') => {
      if (playlist.length === 0) return;

      if (sleepTimer.isActive && sleepTimer.mode === 'songs' && isCurrentTrackListened) {
        const newPlayedCount = sleepTimer.playedCount + 1;
        if (newPlayedCount >= sleepTimer.count) {
            setIsPlaying(false);
            setSleepTimer(defaultSleepTimerState);
            return;
        } else {
            setSleepTimer(prev => ({ ...prev, playedCount: newPlayedCount }));
        }
      }

      trackEvent('track_skip_previous', { method });
      const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      setCurrentTrackIndex(prevIndex);
  }, [playlist.length, currentTrackIndex, isCurrentTrackListened, sleepTimer]);

  const isSingleSong = playlist.length <= 1;

  const handleSongEnd = () => {
    if (sleepTimer.isActive && sleepTimer.mode === 'songs' && isCurrentTrackListened) {
        const newPlayedCount = sleepTimer.playedCount + 1;
        if (newPlayedCount >= sleepTimer.count) {
            setIsPlaying(false);
            setSleepTimer(defaultSleepTimerState);
            return; // Stop playback
        } else {
            setSleepTimer(prev => ({ ...prev, playedCount: newPlayedCount }));
        }
    }
    
    // Handle 'repetitions' sleep timer mode.
    if (sleepTimer.isActive && sleepTimer.mode === 'repetitions' && (isSingleSong || repeat === 'one')) {
        const newPlayedCount = sleepTimer.playedCount + 1;
        if (newPlayedCount >= sleepTimer.count) {
            setIsPlaying(false);
            setSleepTimer(defaultSleepTimerState);
            return; // Stop playback
        } else {
            setSleepTimer(prev => ({ ...prev, playedCount: newPlayedCount }));
        }
    }

    if (repeat === 'one' && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
    } else {
        const isLastTrack = currentTrackIndex >= playlist.length - 1;
        if (sleepTimer.isActive && sleepTimer.mode === 'end_of_playlist' && isLastTrack) {
            setIsPlaying(false);
            setSleepTimer(defaultSleepTimerState);
            return;
        }
        handlePlayNext('autoplay');
    }
  };

  const handleShuffleToggle = useCallback((method: 'ui_button' | 'keyboard' = 'ui_button') => {
    const newShuffleState = !shuffle;
    trackEvent('shuffle_toggle', { enabled: newShuffleState, method });
    setShuffle(newShuffleState);

    const currentTrack = playlist[currentTrackIndex];

    if (newShuffleState) {
        const shuffled = [...originalPlaylist];
        // Fisher-Yates shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Move current track to the front to avoid interruption
        if (currentTrack) {
            const currentIndexInShuffled = shuffled.findIndex(t => t.url === currentTrack.url);
            if (currentIndexInShuffled > -1) {
                const [item] = shuffled.splice(currentIndexInShuffled, 1);
                shuffled.unshift(item);
            }
        }

        setPlaylist(shuffled);
        setCurrentTrackIndex(0);
    } else {
        if (currentTrack) {
            const originalIndex = originalPlaylist.findIndex(t => t.url === currentTrack.url);
            setPlaylist(originalPlaylist);
            setCurrentTrackIndex(originalIndex > -1 ? originalIndex : 0);
        } else {
            setPlaylist(originalPlaylist);
            setCurrentTrackIndex(0);
        }
    }
  }, [shuffle, playlist, currentTrackIndex, originalPlaylist]);

  const handleRepeatToggle = useCallback((method: 'ui_button' | 'keyboard' = 'ui_button') => {
    const nextState = (() => {
        if (repeat === 'off') return 'all';
        if (repeat === 'all') return 'one';
        return 'off';
    })();
    trackEvent('repeat_mode_cycle', { mode: nextState, method });
    setRepeat(nextState);
  }, [repeat]);

  const togglePlayPause = useCallback((method: 'ui_button' | 'keyboard' = 'ui_button') => {
    if (!hasPlaylist || !audioRef.current) return;
    if (audioRef.current.paused) {
      resumeContext();
    }
    const action = isPlaying ? 'pause' : 'play';
    trackEvent(`track_${action}`, { method });
    setIsPlaying(!isPlaying);
  }, [hasPlaylist, isPlaying, setIsPlaying]);
  const handleToggleQueue = useCallback(() => {
      trackEvent('toggle_queue', { opened: !isQueueOpen });
      setIsQueueOpen(prev => !prev);
  }, [isQueueOpen]);

  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // Don't interfere if user is typing in a text field
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Handle Ctrl key combinations first
      if (event.ctrlKey) {
        if (event.key === 's' || event.code === 'KeyS') {
          event.preventDefault();
          handleShuffleToggle('keyboard');
        }
        if (event.key === 'r' || event.code === 'KeyR') {
          event.preventDefault();
          handleRepeatToggle('keyboard');
        }
        if (event.key === 'ArrowRight' || event.code === 'ArrowRight') {
            event.preventDefault();
            handlePlayNext('keyboard');
        }
        if (event.key === 'ArrowLeft' || event.code === 'ArrowLeft') {
            event.preventDefault();
            handlePlayPrevious('keyboard');
        }
        return; // Don't process other shortcuts if Ctrl is pressed
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault(); // Prevent default action (like scrolling or activating a focused button)
        togglePlayPause('keyboard');
      }
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        handleToggleQueue();
      }
      if (event.key.toLowerCase() === 'i') {
        event.preventDefault();
        if (pipSupported) {
          setPipEnabled(prev => !prev);
        }
      }
      if (event.key === '0' || event.code === 'Numpad0') {
        event.preventDefault();
        if (audioRef.current) {
          trackEvent('track_seek', { method: 'keyboard_numeric', seek_to_time: 0, seek_to_percent: 0 });
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
        }
      }
       // Numeric keys 1-9 for seeking
      const keyNum = parseInt(event.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9 && duration > 0) {
        event.preventDefault();
        if (audioRef.current) {
            const seekPercent = keyNum * 10;
            const newTime = (seekPercent / 100) * duration;
            trackEvent('track_seek', { method: 'keyboard_numeric', seek_to_percent: seekPercent, seek_to_time: newTime });
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
      }

      if (event.key === 'ArrowLeft' || event.code === 'ArrowLeft') {
        event.preventDefault();
        if (audioRef.current) {
          const newTime = Math.max(0, audioRef.current.currentTime - 5);
          trackEvent('track_seek', { method: 'keyboard_arrow', direction: 'backward', amount_seconds: 5 });
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
      if (event.key === 'ArrowRight' || event.code === 'ArrowRight') {
        event.preventDefault();
        if (audioRef.current) {
          const newTime = Math.min(duration, audioRef.current.currentTime + 5);
          trackEvent('track_seek', { method: 'keyboard_arrow', direction: 'forward', amount_seconds: 5 });
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [togglePlayPause, duration, handleShuffleToggle, handleRepeatToggle, handlePlayNext, handlePlayPrevious, handleToggleQueue, pipSupported]);
  
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = Number(event.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);

      // Debounced tracking for slider seek
      if (seekDebounceTrack.current) {
          clearTimeout(seekDebounceTrack.current);
      }
      seekDebounceTrack.current = setTimeout(() => {
          if (duration > 0) {
              trackEvent('track_seek', {
                  method: 'slider',
                  seek_to_time: newTime,
                  seek_to_percent: (newTime / duration) * 100
              });
          }
      }, 500); // Send event 500ms after the last change
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleFrequencyMuteChange = (band: keyof FrequencyMuteState) => {
    setFrequencyMute(prev => ({
      ...prev,
      [band]: !prev[band],
    }));
  };

  const handleResetEngineSettings = () => {
    setVisualizerSettings(prev => ({
        ...prev,
        bassRadius: defaultVisualizerSettings.bassRadius,
        highsPulseMultiplier: defaultVisualizerSettings.highsPulseMultiplier,
        orbitalRadius: defaultVisualizerSettings.orbitalRadius,
        viscosity: defaultVisualizerSettings.viscosity,
        dropStrength: defaultVisualizerSettings.dropStrength,
        rippleCooldown: defaultVisualizerSettings.rippleCooldown,
    }));
  };

  const handleResetDisplaySettings = () => {
    setVisualizerSettings(prev => ({
        ...prev,
        contrast: defaultVisualizerSettings.contrast,
        blackPoint: defaultVisualizerSettings.blackPoint,
        whitePoint: defaultVisualizerSettings.whitePoint,
        glowEnabled: defaultVisualizerSettings.glowEnabled,
        glowIntensity: defaultVisualizerSettings.glowIntensity,
        invert: defaultVisualizerSettings.invert,
        showAngularGuides: defaultVisualizerSettings.showAngularGuides,
        showQuadrantGuides: defaultVisualizerSettings.showQuadrantGuides,
        showColumnGrid: defaultVisualizerSettings.showColumnGrid,
        showBaselineGrid: defaultVisualizerSettings.showBaselineGrid,
    }));
  };

  const handleResetAutoThresholds = () => {
    setAutoThresholdSettings(defaultAutoThresholdSettings);
  };
  
  const handleEngineChange = (engine: Engine) => {
    trackEvent('change_engine', { engine_name: engine });
    setCurrentEngine(engine);
  };

  const handleSetSleepTimer = (mode: SleepTimerState['mode'], value: number) => {
    let endTime: number | null = null;
    let finalCount = value;

    if (mode === 'timer' && value > 0) {
        endTime = Date.now() + value * 60 * 1000;
    }

    if (mode === 'songs' && playlist.length > 1) {
        const songsRemaining = playlist.length - (currentTrackIndex + 1);
        if (value > songsRemaining) {
            finalCount = Math.max(0, songsRemaining);
        }
    }

    setSleepTimer({
        mode,
        isActive: true,
        count: mode !== 'timer' ? finalCount : 0,
        endTime,
        playedCount: 0,
    });
    setIsSleepTimerMenuOpen(false);
    trackEvent('set_sleep_timer', { mode, value, final_count: finalCount });
  };

  const handleCancelSleepTimer = () => {
    setSleepTimer(defaultSleepTimerState);
    setIsSleepTimerMenuOpen(false);
    if (sleepTimerTimeoutRef.current) {
        clearTimeout(sleepTimerTimeoutRef.current);
        sleepTimerTimeoutRef.current = null;
    }
    trackEvent('cancel_sleep_timer');
  };

  useEffect(() => {
    if (sleepTimerTimeoutRef.current) {
        clearTimeout(sleepTimerTimeoutRef.current);
        sleepTimerTimeoutRef.current = null;
    }

    if (sleepTimer.isActive && sleepTimer.mode === 'timer' && sleepTimer.endTime) {
        const timeRemaining = sleepTimer.endTime - Date.now();
        if (timeRemaining <= 0) {
            setIsPlaying(false);
            setSleepTimer(defaultSleepTimerState);
        } else {
            sleepTimerTimeoutRef.current = setTimeout(() => {
                setIsPlaying(false);
                setSleepTimer(defaultSleepTimerState);
            }, timeRemaining);
        }
    }
    // This effect should only re-run when the sleep timer settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepTimer]);
  
    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        setCurrentTime(audioRef.current.currentTime);

        if (
            sleepTimer.isActive &&
            sleepTimer.mode === 'songs' &&
            !isCurrentTrackListened &&
            isPlaying &&
            audioRef.current
        ) {
            const audio = audioRef.current;
            const currentSegmentDuration = lastPlayTimestampRef.current > 0 ? performance.now() - lastPlayTimestampRef.current : 0;
            const totalListenTimeMs = listenTimeAccumulatorRef.current + currentSegmentDuration;
            
            // Mark as listened if it's a short song that has finished playing. Use a 0.1s buffer.
            const isShortSongCompleted = audio.duration > 0 && audio.duration < 40 && audio.currentTime >= audio.duration - 0.1;

            if (totalListenTimeMs >= 40000 || isShortSongCompleted) {
                setIsCurrentTrackListened(true);
            }
        }
    };
    
    const handlePlay = () => {
        lastPlayTimestampRef.current = performance.now();
    };

    const handlePause = () => {
        if (lastPlayTimestampRef.current > 0) {
            listenTimeAccumulatorRef.current += performance.now() - lastPlayTimestampRef.current;
        }
        lastPlayTimestampRef.current = 0;
    };

    const handleSeeking = () => {
         if (lastPlayTimestampRef.current > 0) {
            listenTimeAccumulatorRef.current += performance.now() - lastPlayTimestampRef.current;
        }
        lastPlayTimestampRef.current = 0;
    };
    
    const handleSeeked = () => {
        if (isPlaying) {
            lastPlayTimestampRef.current = performance.now();
        }
    };

  const handleSelectTrack = (trackUrl: string, isShiftPressed: boolean) => {
      if (isShiftPressed && lastSelectedTrackUrlRef.current) {
          const startIdx = playlist.findIndex(t => t.url === lastSelectedTrackUrlRef.current);
          const endIdx = playlist.findIndex(t => t.url === trackUrl);
          
          if (startIdx !== -1 && endIdx !== -1) {
              const minIdx = Math.min(startIdx, endIdx);
              const maxIdx = Math.max(startIdx, endIdx);
              
              setSelectedTracks(prev => {
                  const newSelection = new Set(prev);
                  for (let i = minIdx; i <= maxIdx; i++) {
                      newSelection.add(playlist[i].url);
                  }
                  return newSelection;
              });
              lastSelectedTrackUrlRef.current = trackUrl;
              return;
          }
      }

      setSelectedTracks(prev => {
          const newSelection = new Set(prev);
          if (newSelection.has(trackUrl)) {
              newSelection.delete(trackUrl);
          } else {
              newSelection.add(trackUrl);
          }
          return newSelection;
      });
      lastSelectedTrackUrlRef.current = trackUrl;
  };

  const handleSelectAll = () => {
      if (selectedTracks.size > 0) {
          setSelectedTracks(new Set());
      } else {
          setSelectedTracks(new Set(playlist.map(t => t.url)));
      }
  };

  const handleDeleteSelected = () => {
      if (selectedTracks.size === 0) return;

      trackEvent('delete_from_queue', { count: selectedTracks.size, method: 'ui_button' });

      const currentTrackUrl = playlist[currentTrackIndex]?.url;
      
      const newPlaylist = playlist.filter(track => !selectedTracks.has(track.url));
      const newOriginalPlaylist = originalPlaylist.filter(track => !selectedTracks.has(track.url));

      let newTrackIndex = -1;

      if (newPlaylist.length > 0) {
          if (currentTrackUrl && !selectedTracks.has(currentTrackUrl)) {
              newTrackIndex = newPlaylist.findIndex(t => t.url === currentTrackUrl);
          } else {
              newTrackIndex = Math.min(currentTrackIndex, newPlaylist.length - 1);
          }
      }

      setPlaylist(newPlaylist);
      setOriginalPlaylist(newOriginalPlaylist);
      setCurrentTrackIndex(newTrackIndex);
      setSelectedTracks(new Set());
      lastSelectedTrackUrlRef.current = null;

      if (newPlaylist.length === 0) {
          setIsPlaying(false);
      }
  };

  const handleReorderPlaylist = (startIndex: number, endIndex: number) => {
      const currentTrackUrl = playlist[currentTrackIndex]?.url;
      const newPlaylist = [...playlist];
      const [removed] = newPlaylist.splice(startIndex, 1);
      newPlaylist.splice(endIndex, 0, removed);

      setPlaylist(newPlaylist);

      if (currentTrackUrl) {
          const newIndex = newPlaylist.findIndex(t => t.url === currentTrackUrl);
          if (newIndex !== -1) {
              setCurrentTrackIndex(newIndex);
          }
      }
  };

  const handlePlayTrack = (trackIndex: number) => {
      if (trackIndex >= 0 && trackIndex < playlist.length) {
          setCurrentTrackIndex(trackIndex);
          if (!isPlaying) {
              setIsPlaying(true);
          }
      }
  };

  const handlePlayNextSelected = () => {
      if (selectedTracks.size === 0 || currentTrackIndex < 0) return;
      trackEvent('play_next_selected', { count: selectedTracks.size });
      
      const currentTrack = playlist[currentTrackIndex];
      const selectedItems = playlist.filter(t => selectedTracks.has(t.url));
      const otherItems = playlist.filter(t => !selectedTracks.has(t.url));
      
      // Find where the current track is among the non-selected items
      const currentIndexInOthers = otherItems.findIndex(t => t.url === currentTrack.url);
      
      // Construct the new playlist
      const newPlaylist = [
          ...otherItems.slice(0, currentIndexInOthers + 1),
          ...selectedItems,
          ...otherItems.slice(currentIndexInOthers + 1)
      ];
      
      setPlaylist(newPlaylist);
      
      // If shuffle is off, the original playlist order should also be updated
      if (!shuffle) {
          setOriginalPlaylist(newPlaylist);
      }
      
      const newCurrentIndex = newPlaylist.findIndex(t => t.url === currentTrack.url);
      if (newCurrentIndex !== -1) {
          setCurrentTrackIndex(newCurrentIndex);
      }
      
      setSelectedTracks(new Set()); // Clear selection
      lastSelectedTrackUrlRef.current = null;
  };
  
  const handleRemoveTrack = (trackUrlToRemove: string) => {
      trackEvent('delete_from_queue', { count: 1, method: 'swipe' });

      const oldCurrentTrackUrl = playlist[currentTrackIndex]?.url;
      const newPlaylist = playlist.filter(t => t.url !== trackUrlToRemove);
      const newOriginalPlaylist = originalPlaylist.filter(t => t.url !== trackUrlToRemove);
      
      if (newPlaylist.length === 0) {
          setIsPlaying(false);
          setCurrentTrackIndex(-1);
      } else {
          const newIndex = newPlaylist.findIndex(t => t.url === oldCurrentTrackUrl);
          if (newIndex !== -1) {
              setCurrentTrackIndex(newIndex);
          } else {
              // Current track was removed, stay at the same index
              setCurrentTrackIndex(prev => Math.min(prev, newPlaylist.length - 1));
          }
      }
      
      setPlaylist(newPlaylist);
      setOriginalPlaylist(newOriginalPlaylist);
      setSelectedTracks(prev => {
          const newSelection = new Set(prev);
          newSelection.delete(trackUrlToRemove);
          return newSelection;
      });
      if (lastSelectedTrackUrlRef.current === trackUrlToRemove) {
          lastSelectedTrackUrlRef.current = null;
      }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isDark = theme === 'dark';
  const showSleepTimer = hasPlaylist && (playlist.length > 1 || repeat === 'one');


  // --- Responsive Scaling Logic ---
  const REFERENCE_VISUALIZER_SIZE = 356; // The size on desktop which is used as a reference
  // Scale the pulse size based on the current visualizer size relative to the reference size.
  const scaledPulseSize = highSpotSize > 0 
      ? (visualizerSize / REFERENCE_VISUALIZER_SIZE) * highSpotSize 
      : 0;

  return (
    <div className={`min-h-screen ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
      {visualizerSettings.showColumnGrid && <ColumnGrid />}
      {visualizerSettings.showBaselineGrid && <BaselineGrid />}
      {/* Headless engine components for logic processing */}
      {currentEngine === 'Ripple' && (
          <RippleEngine
              ref={rippleEngineRef}
              isPlaying={isPlaying}
              settings={visualizerSettings}
              onRenderBufferChange={setRenderBuffer}
              onHighSpotSizeChange={setHighSpotSize}
              bassHitCount={bassHitCount}
              isHighsActive={isHighsActive}
          />
      )}
      {currentEngine === 'Shooter' && <ShooterEngine onRenderBufferChange={setRenderBuffer} onHighSpotSizeChange={setHighSpotSize} />}
      
      {/* Headless component for Picture-in-Picture rendering */}
      <PipRenderer
          compositeImageData={compositeImageData}
          settings={{
            glowEnabled: visualizerSettings.glowEnabled,
            glowIntensity: visualizerSettings.glowIntensity,
          }}
          theme={theme}
          pipEnabled={pipEnabled}
          isPlaying={isPlaying}
          hasPlaylist={hasPlaylist}
          onPipEnabledChange={setPipEnabled}
          audioStream={audioStream}
      />

      <header 
        className={`sticky top-0 z-[60] border-b ${isDark ? 'border-white/10 bg-black/60' : 'border-black/10 bg-white/60'}`}
        style={{
            backdropFilter: `blur(25px)`,
            WebkitBackdropFilter: `blur(25px)`,
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <AudioPlayer
                onFilesSelect={handleFilesSelect}
                currentTrackName={playlist[currentTrackIndex]?.name || null}
                currentTrackTitle={playlist[currentTrackIndex]?.title || null}
                albumArtUrl={playlist[currentTrackIndex]?.albumArtUrl || null}
                playlistLength={playlist.length}
                theme={theme}
                onThemeToggle={toggleTheme}
                onShowSupportModal={handleShowSupportModal}
            />
        </div>
      </header>

      {/* Floating Player Controls */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-4">
          {hasPlaylist && (
              <div className={`relative w-14 h-14 shadow-2xl ${isDark ? 'shadow-black/50' : 'shadow-gray-400/50'} rounded-full border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  <div className={`absolute inset-0 rounded-full ${isDark ? 'bg-black/60' : 'bg-white/60'}`}></div>
                  <div
                      className="absolute inset-0 rounded-full"
                      style={{
                          backdropFilter: `blur(25px)`,
                          WebkitBackdropFilter: `blur(25px)`,
                      }}
                  ></div>
                  <button
                      onClick={handleToggleQueue}
                      className={`relative z-10 w-full h-full flex items-center justify-center rounded-full transition-colors ${isDark ? 'text-white' : 'text-gray-800'} ${isQueueOpen ? 'text-brand-accent' : ''}`}
                      aria-label="Toggle Queue"
                      aria-pressed={isQueueOpen}
                  >
                      <span className="material-symbols-rounded text-2xl">queue_music</span>
                  </button>
              </div>
          )}

          {/* Main Controls Dock */}
          <div className={`relative w-fit shadow-2xl ${isDark ? 'shadow-black/50' : 'shadow-gray-400/50'} rounded-full border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              {/* Layer 1: Uniform Tint */}
              <div className={`absolute inset-0 rounded-full ${isDark ? 'bg-black/60' : 'bg-white/60'}`}></div>
              
              {/* Layer 2: Outer Ring Blur */}
              <div
                  className="absolute inset-0 rounded-full"
                  style={{
                      backdropFilter: `blur(25px)`,
                      WebkitBackdropFilter: `blur(25px)`,
                      maskImage: `radial-gradient(circle 22px at center, transparent 100%, black 101%)`,
                      WebkitMaskImage: `radial-gradient(circle 22px at center, transparent 100%, black 101%)`,
                  }}
              ></div>

              {/* Layer 3: Inner Circle Blur */}
              <div
                  className="absolute inset-0 rounded-full"
                  style={{
                      backdropFilter: `blur(2px)`,
                      WebkitBackdropFilter: `blur(2px)`,
                      maskImage: `radial-gradient(circle 22px at center, black 100%, transparent 101%)`,
                      WebkitMaskImage: `radial-gradient(circle 22px at center, black 100%, transparent 101%)`,
                  }}
              ></div>

              {/* Layer 4: Buttons, on top of the background layers */}
              <div className="relative z-10 flex items-center h-14">
                  {/* Left Side Buttons */}
                  <div className="flex items-center gap-4 pl-5 pr-3">
                      <button onClick={() => handleShuffleToggle()} className={`p-1 rounded-full transition-colors focus:outline-none ${shuffle ? 'text-brand-accent' : `${isDark ? 'text-white' : 'text-gray-800'} hover:text-brand-accent`}`} aria-label="Shuffle" aria-pressed={shuffle}><span className="material-symbols-rounded text-xl">shuffle</span></button>
                      <button onClick={() => handlePlayPrevious()} className={`${isDark ? 'text-white' : 'text-gray-800'} hover:text-brand-accent transition-colors disabled:text-gray-600 disabled:cursor-not-allowed focus:outline-none rounded-full p-1`} aria-label="Previous track" disabled={!hasPlaylist}><span className="material-symbols-rounded text-2xl">skip_previous</span></button>
                  </div>
                  
                  {/* Center Play Button Area */}
                  <div className="w-14 h-14 flex items-center justify-center group">
                      <button 
                          onClick={() => togglePlayPause()} 
                          className={`w-full h-full flex items-center justify-center ${isDark ? 'text-white' : 'text-gray-800'} disabled:text-gray-600 disabled:cursor-not-allowed focus:outline-none`}
                          aria-label={isPlaying ? 'Pause' : 'Play'} 
                          disabled={!hasPlaylist}
                      >
                          <span className="relative">
                              {isPlaying ? <span className="material-symbols-rounded text-3xl">pause</span> : <span className="material-symbols-rounded text-3xl">play_arrow</span>}
                          </span>
                      </button>
                  </div>

                  {/* Right Side Buttons */}
                  <div className="flex items-center gap-4 pl-3 pr-5">
                      <button onClick={() => handlePlayNext()} className={`${isDark ? 'text-white' : 'text-gray-800'} hover:text-brand-accent transition-colors disabled:text-gray-600 disabled:cursor-not-allowed focus:outline-none rounded-full p-1`} aria-label="Next track" disabled={!hasPlaylist}><span className="material-symbols-rounded text-2xl">skip_next</span></button>
                      <button onClick={() => handleRepeatToggle()} className={`p-1 rounded-full transition-colors focus:outline-none ${repeat !== 'off' ? 'text-brand-accent' : `${isDark ? 'text-white' : 'text-gray-800'} hover:text-brand-accent`}`} aria-label={`Repeat mode: ${repeat}`}>
                          {repeat === 'one' ? <span className="material-symbols-rounded text-xl">repeat_one</span> : <span className="material-symbols-rounded text-xl">repeat</span>}
                      </button>
                  </div>
              </div>
          </div>
          {showSleepTimer && (
              <SleepTimer
                  theme={theme}
                  isOpen={isSleepTimerMenuOpen}
                  onToggle={() => setIsSleepTimerMenuOpen(prev => !prev)}
                  onSetTimer={handleSetSleepTimer}
                  onCancelTimer={handleCancelSleepTimer}
                  activeTimer={sleepTimer}
                  isSingleSong={isSingleSong}
                  repeatMode={repeat}
              />
          )}
      </div>
      
      {/* Full-width Progress Bar */}
      <div 
          className={`fixed bottom-0 left-0 right-0 z-[60] border-t ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/60 border-black/10'}`}
          style={{
              backdropFilter: `blur(25px)`,
              WebkitBackdropFilter: `blur(25px)`,
          }}
      >
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 py-3">
                  <span className={`font-mono text-sm w-12 ${isDark ? 'text-gray-400' : 'text-gray-600'} text-center`} aria-live="polite">{formatTime(currentTime)}</span>
                  <input
                      type="range"
                      value={isNaN(currentTime) ? 0 : currentTime}
                      min="0"
                      max={isNaN(duration) ? 0 : duration}
                      onChange={handleSliderChange}
                      className="w-full h-4 appearance-none cursor-pointer custom-slider disabled:cursor-not-allowed"
                      style={{ '--progress-percent': `${progress}%` } as React.CSSProperties}
                      aria-label="Audio progress"
                      disabled={!hasPlaylist}
                  />
                  <span className={`font-mono text-sm w-12 ${isDark ? 'text-gray-400' : 'text-gray-600'} text-center`}>{formatTime(isNaN(duration) ? 0 : duration)}</span>
              </div>
          </div>
      </div>
    
      <main className="py-8 px-4 sm:px-6 lg:px-8 space-y-12">
        <section aria-labelledby="visualizer-heading" className="max-w-screen-2xl mx-auto">
             <h2 id="visualizer-heading" className="sr-only">Music Visualizers and Controls</h2>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12 items-start">
                {/* Col 1: Pixel Matrix (Common) */}
                <div ref={visualizerContainerRef} className="relative flex justify-center items-center lg:col-span-1">
                    <PixelMatrix
                        sourceImageData={compositeImageData}
                        settings={visualizerSettings}
                        size={visualizerSize}
                    />
                    {/* --- DEV GUIDES --- */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[9998]">
                        {visualizerSettings.showQuadrantGuides && <QuadrantGuides size={visualizerSize} />}
                        {visualizerSettings.showAngularGuides && <AngularGuides size={visualizerSize} orbitalRadius={visualizerSettings.orbitalRadius} />}
                    </div>
                </div>

                {/* Col 2: High-res Visualizer (Common) */}
                <div className="relative flex justify-center items-center lg:col-span-1">
                    <div className="relative rounded-full overflow-hidden" style={{ width: visualizerSize, height: visualizerSize }}>
                        <Visualizer
                            renderBuffer={renderBuffer}
                            settings={visualizerSettings}
                            pulseSize={scaledPulseSize}
                            onCompositeUpdate={setCompositeImageData}
                            size={visualizerSize}
                        />
                    </div>
                     {/* --- DEV GUIDES --- */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[9998]">
                        {visualizerSettings.showQuadrantGuides && <QuadrantGuides size={visualizerSize} />}
                        {visualizerSettings.showAngularGuides && <AngularGuides size={visualizerSize} orbitalRadius={visualizerSettings.orbitalRadius} />}
                    </div>
                </div>

                {/* Col 3: Controls */}
                <div className="w-full max-w-sm mx-auto lg:max-w-none lg:col-span-1">
                    <ControlPanel
                        thresholds={thresholds}
                        onThresholdChange={setThresholds}
                        settings={visualizerSettings}
                        onSettingsChange={setVisualizerSettings}
                        onResetEngine={handleResetEngineSettings}
                        onResetDisplay={handleResetDisplaySettings}
                        frequencyMute={frequencyMute}
                        onFrequencyMuteChange={handleFrequencyMuteChange}
                        autoThresholdSettings={autoThresholdSettings}
                        onAutoThresholdSettingsChange={setAutoThresholdSettings}
                        onResetAutoThresholds={handleResetAutoThresholds}
                        theme={theme}
                        currentEngine={currentEngine}
                        onEngineChange={handleEngineChange}
                        pipEnabled={pipEnabled}
                        onPipEnabledChange={setPipEnabled}
                        pipSupported={pipSupported}
                    />
                </div>
             </div>
        </section>
        
        <section aria-labelledby="analysis-heading" className="max-w-screen-2xl mx-auto">
            <h2 id="analysis-heading" className="sr-only">Audio Analysis Panels</h2>
            <WaveformContainer 
                ref={waveformContainerRef}
                analysers={analysers} 
                sampleRate={sampleRate}
                thresholds={thresholds}
                theme={theme}
            />
        </section>
      </main>

      {/* Hidden elements for main app functionality */}
      <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={handleSongEnd}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
          crossOrigin="anonymous"
          aria-hidden="true"
      />
      
      <Queue
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
          playlist={playlist}
          currentTrackIndex={currentTrackIndex}
          onReorder={handleReorderPlaylist}
          selectedTracks={selectedTracks}
          onSelectTrack={handleSelectTrack}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleDeleteSelected}
          onPlayTrack={handlePlayTrack}
          onPlayNextSelected={handlePlayNextSelected}
          onRemoveTrack={handleRemoveTrack}
          theme={theme}
      />
      <SupportModal 
        show={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
        theme={theme}
      />
    </div>
  );
};

export default App;