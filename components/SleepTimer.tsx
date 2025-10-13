
import React, { useState, useEffect, useRef } from 'react';
import type { SleepTimerState } from '../App';

interface SleepTimerProps {
    theme: 'dark' | 'light';
    isOpen: boolean;
    onToggle: () => void;
    onSetTimer: (mode: SleepTimerState['mode'], value: number) => void;
    onCancelTimer: () => void;
    activeTimer: SleepTimerState;
    isSingleSong: boolean;
    repeatMode: 'off' | 'all' | 'one';
}

const SleepTimer: React.FC<SleepTimerProps> = ({
    theme, isOpen, onToggle, onSetTimer, onCancelTimer, activeTimer, isSingleSong, repeatMode,
}) => {
    const [view, setView] = useState<'main' | 'count' | 'timer'>('main');
    const [countMode, setCountMode] = useState<'songs' | 'repetitions'>('songs');
    const [countInput, setCountInput] = useState('1');
    const [timeInput, setTimeInput] = useState('');
    const [minutesLeft, setMinutesLeft] = useState<string | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!activeTimer.isActive || activeTimer.mode !== 'timer' || !activeTimer.endTime) {
            setMinutesLeft(null);
            return;
        }

        const updateMinutes = () => {
            const remainingMs = activeTimer.endTime! - Date.now();
            if (remainingMs <= 0) {
                setMinutesLeft('0');
            } else {
                const remainingMinutes = Math.ceil(remainingMs / 60000);
                setMinutesLeft(String(remainingMinutes));
            }
        };
        
        updateMinutes(); // Run once immediately
        const interval = setInterval(updateMinutes, 15000); // Update every 15s

        return () => clearInterval(interval);
    }, [activeTimer.isActive, activeTimer.mode, activeTimer.endTime]);

    useEffect(() => {
        if (!isOpen) {
            // Reset view when menu is closed
            setTimeout(() => setView('main'), 200);
        }
    }, [isOpen]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onToggle();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    const handleSetCount = () => {
        const count = parseInt(countInput, 10);
        if (!isNaN(count) && count > 0) {
            onSetTimer(countMode, count);
        }
    };

    const handleSetTimer = () => {
        const totalMinutes = parseInt(timeInput, 10);
        if (!isNaN(totalMinutes) && totalMinutes > 0) {
            onSetTimer('timer', totalMinutes);
            setTimeInput('');
        }
    };
    
    const renderActiveState = () => {
        if (!activeTimer.isActive) return <span className="material-symbols-rounded text-2xl">sleep</span>;

        switch(activeTimer.mode) {
            case 'timer': 
                return (
                    <div className="flex items-baseline pointer-events-none">
                        <span className="font-mono text-base font-bold leading-none">{minutesLeft ?? ''}</span>
                        <span className="font-mono text-[10px] font-bold leading-none">m</span>
                    </div>
                );
            case 'songs': return <span className="font-mono text-xs font-bold">{activeTimer.playedCount}/{activeTimer.count}</span>
            case 'repetitions': return <span className="font-mono text-xs font-bold">{activeTimer.playedCount}/{activeTimer.count}</span>
            case 'end_of_playlist': return <span className="material-symbols-rounded text-2xl">last_page</span>
            default: return <span className="material-symbols-rounded text-2xl">sleep</span>;
        }
    }

    const showRepetitionsOption = isSingleSong || repeatMode === 'one';
    const showSongsOption = !isSingleSong && repeatMode !== 'one';

    const menuContent = () => {
        const buttonClasses = `w-full font-medium py-2 px-4 rounded-full transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/10 hover:bg-black/20 text-black'}`;

        if (activeTimer.isActive) {
            return (
                 <div className="p-4 space-y-3">
                    <p className={`text-center font-medium ${isDark ? 'text-white' : 'text-black'}`}>Sleep Timer Active</p>
                    <button 
                        onClick={onCancelTimer}
                        className={buttonClasses}
                    >
                        Cancel Timer
                    </button>
                </div>
            )
        }
        
        if (view === 'count') {
            return (
                 <div className="p-4 space-y-3">
                    <button onClick={() => setView('main')} className={`absolute top-2 left-2 p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <p className={`text-center font-medium pt-4 ${isDark ? 'text-white' : 'text-black'}`}>Stop after...</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            value={countInput}
                            onChange={(e) => setCountInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSetCount();
                                }
                            }}
                            className={`w-full p-2 rounded-md text-center font-mono ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'}`}
                        />
                        <span className={`flex-shrink-0 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{countMode}</span>
                    </div>
                    <button onClick={handleSetCount} className={buttonClasses}>Done</button>
                </div>
            )
        }

        if (view === 'timer') {
             return (
                 <div className="p-4 space-y-3">
                    <button onClick={() => setView('main')} className={`absolute top-2 left-2 p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <p className={`text-center font-medium pt-4 ${isDark ? 'text-white' : 'text-black'}`}>Stop after...</p>
                    <div className="relative">
                        <input
                            type="text"
                            maxLength={2}
                            value={timeInput}
                            onChange={(e) => setTimeInput(e.target.value.replace(/[^0-9]/g, ''))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSetTimer();
                                }
                            }}
                            className={`w-full p-2 rounded-md text-center font-mono text-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'}`}
                            placeholder="MM"
                        />
                    </div>
                    <button onClick={handleSetTimer} className={buttonClasses}>Done</button>
                </div>
            )
        }

        const menuButtonClasses = `text-left w-full p-2 transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`;
        return (
            <div className={`p-1 flex flex-col ${isDark ? 'divide-y divide-white/10' : 'divide-y divide-black/10'}`}>
                {showRepetitionsOption && <button onClick={() => { setView('count'); setCountMode('repetitions'); setCountInput('1'); }} className={menuButtonClasses}>N Repetitions</button>}
                {showSongsOption && <button onClick={() => { setView('count'); setCountMode('songs'); setCountInput('10'); }} className={menuButtonClasses}>N Songs</button>}
                {showSongsOption && <button onClick={() => onSetTimer('end_of_playlist', 0)} className={menuButtonClasses}>End of Playlist</button>}
                <button onClick={() => setView('timer')} className={menuButtonClasses}>Timer</button>
            </div>
        )
    };

    return (
        <div ref={menuRef} className="relative">
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
                    onClick={onToggle}
                    className={`relative z-10 w-full h-full flex items-center justify-center rounded-full transition-colors ${isDark ? 'text-white' : 'text-gray-800'} ${activeTimer.isActive ? 'text-brand-accent' : ''}`}
                    aria-label="Open sleep timer"
                >
                    {renderActiveState()}
                </button>
            </div>

            {isOpen && (
                 <div 
                    className={`absolute bottom-full right-0 mb-4 w-52 rounded-xl border ${isDark ? 'border-white/10 bg-black/60 text-white' : 'border-black/10 bg-white/60 text-black'}`}
                    style={{
                        backdropFilter: `blur(25px)`,
                        WebkitBackdropFilter: `blur(25px)`,
                    }}
                >
                    {menuContent()}
                </div>
            )}
        </div>
    )
};

export default SleepTimer;
