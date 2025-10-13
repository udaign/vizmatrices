
import React, { useState, useRef, useEffect } from 'react';
import type { PlaylistItem } from '../App';
import QueueItem from './QueueItem';

interface QueueProps {
    isOpen: boolean;
    onClose: () => void;
    playlist: PlaylistItem[];
    currentTrackIndex: number;
    onReorder: (startIndex: number, endIndex: number) => void;
    selectedTracks: Set<string>;
    onSelectTrack: (trackUrl: string) => void;
    onSelectAll: () => void;
    onDeleteSelected: () => void;
    onPlayTrack: (trackIndex: number) => void;
    onPlayNextSelected: () => void;
    onRemoveTrack: (trackUrl: string) => void;
    theme: 'dark' | 'light';
}

const Queue: React.FC<QueueProps> = ({
    isOpen,
    onClose,
    playlist,
    currentTrackIndex,
    onReorder,
    selectedTracks,
    onSelectTrack,
    onSelectAll,
    onDeleteSelected,
    onPlayTrack,
    onPlayNextSelected,
    onRemoveTrack,
    theme,
}) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';
    const allSelected = selectedTracks.size > 0 && selectedTracks.size === playlist.length;
    
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        const handleClickOutside = (event: MouseEvent) => {
            if (isMoreMenuOpen && moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, isMoreMenuOpen]);
    
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragEnter = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) return;
        onReorder(draggedIndex, index);
        setDraggedIndex(index);
    };
    
    const handleDragEnd = () => {
        setDraggedIndex(null);
    };
    
    const handlePlayNext = () => {
        onPlayNextSelected();
        setIsMoreMenuOpen(false);
    };

    if (!isOpen) return null;

    const panelContent = (
        <>
            {/* Header */}
            <div className={`flex items-center p-3 border-b ${isDark ? 'border-white/10' : 'border-black/10'} flex-shrink-0`}>
                <div className="flex-1 flex justify-start items-center gap-3">
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 w-10 h-10 flex items-center justify-center"><span className="material-symbols-rounded">close</span></button>
                    <button onClick={onSelectAll} className={`w-6 h-6 border-2 rounded-full flex items-center justify-center transition-colors ${allSelected ? 'border-brand-accent bg-brand-accent' : (isDark ? 'border-gray-400' : 'border-gray-600')}`} aria-label="Select All">
                        {allSelected && <span className="material-symbols-rounded text-base text-white">check</span>}
                    </button>
                </div>
                <h2 className="text-xl font-bold">Queue</h2>
                <div className="flex-1 flex justify-end items-center gap-2">
                    <button onClick={onDeleteSelected} disabled={selectedTracks.size === 0} className="p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"><span className="material-symbols-rounded">remove_circle_outline</span></button>
                    <div ref={moreMenuRef} className="relative">
                        <button onClick={() => setIsMoreMenuOpen(prev => !prev)} disabled={selectedTracks.size === 0} className="p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"><span className="material-symbols-rounded">more_vert</span></button>
                        {isMoreMenuOpen && (
                            <div className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl z-10 py-1 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                <button onClick={handlePlayNext} className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${isDark ? 'text-gray-200 hover:bg-brand-accent/20' : 'text-gray-800 hover:bg-brand-accent/10'}`}>
                                    Play Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* List */}
            <div className="overflow-y-auto" onDragEnd={handleDragEnd}>
                {playlist.map((track, index) => (
                    <QueueItem
                        key={track.url}
                        track={track}
                        index={index}
                        isCurrent={index === currentTrackIndex}
                        isSelected={selectedTracks.has(track.url)}
                        isDragged={draggedIndex === index}
                        onSelect={() => onSelectTrack(track.url)}
                        onPlay={() => onPlayTrack(index)}
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onRemove={() => onRemoveTrack(track.url)}
                        theme={theme}
                    />
                ))}
            </div>
        </>
    );

    return (
        <>
            {/* Mobile View with Backdrop */}
            <div 
                className="fixed inset-0 z-50 bg-black/30 lg:hidden"
                onClick={onClose}
                aria-modal="true"
                role="dialog"
            >
                <div 
                    ref={panelRef}
                    className={`fixed inset-x-0 bottom-0 top-16 border-t flex flex-col ${isDark ? 'border-white/10 bg-black/60' : 'border-black/10 bg-white/60'}`}
                    style={{ backdropFilter: `blur(25px)`, WebkitBackdropFilter: `blur(25px)` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {panelContent}
                </div>
            </div>

            {/* Desktop View */}
            <div
                ref={panelRef}
                className={`hidden lg:fixed lg:top-[57px] lg:bottom-[41px] lg:right-0 lg:w-[calc((100vw-2rem)/3)] lg:flex flex-col border-l z-50 ${isDark ? 'border-white/10 bg-black/60' : 'border-black/10 bg-white/60'}`}
                style={{ backdropFilter: `blur(25px)`, WebkitBackdropFilter: `blur(25px)` }}
            >
                {panelContent}
            </div>
        </>
    );
};

export default Queue;
