
import React, { useState, useRef } from 'react';
import type { PlaylistItem } from '../App';

interface QueueItemProps {
    track: PlaylistItem;
    index: number;
    isCurrent: boolean;
    isSelected: boolean;
    isDragged: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onPlay: () => void;
    onDragStart: () => void;
    onDragEnter: () => void;
    onRemove: () => void;
    theme: 'dark' | 'light';
}

const formatTrackName = (name: string | null): string => {
    if (!name) return 'Unknown Track';
    return name.replace(/\[.*?\]/g, '').replace(/\.[^/.]+$/, '').trim();
};

const QueueItem: React.FC<QueueItemProps> = ({
    track,
    isCurrent,
    isSelected,
    isDragged,
    onSelect,
    onPlay,
    onDragStart,
    onDragEnter,
    onRemove,
    theme,
}) => {
    const isDark = theme === 'dark';
    const itemRef = useRef<HTMLDivElement>(null);
    const [translateX, setTranslateX] = useState(0);
    const isSwiping = useRef(false);
    const startX = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        isSwiping.current = true;
        if (itemRef.current) {
            itemRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping.current) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        if (diff > 0) { // Only allow swiping right
            setTranslateX(diff);
        }
    };

    const handleTouchEnd = () => {
        if (!isSwiping.current) return;
        isSwiping.current = false;
        
        if (itemRef.current) {
            itemRef.current.style.transition = 'transform 0.3s ease';
            const threshold = itemRef.current.clientWidth / 3;
            if (translateX > threshold) {
                // Animate out and remove
                setTranslateX(itemRef.current.clientWidth);
                setTimeout(() => {
                    onRemove();
                    // Reset position for potential re-render of same item if un-removed
                    setTimeout(() => setTranslateX(0), 50); 
                }, 300);
            } else {
                // Animate back
                setTranslateX(0);
            }
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        // Prevent click if it was a swipe
        if (Math.abs(translateX) > 5) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onPlay();
    };

    const baseClasses = `flex items-center gap-3 p-3 cursor-pointer select-none`;
    const themeClasses = isDark ? 'hover:bg-white/10' : 'hover:bg-black/10';
    const currentClasses = isCurrent ? (isDark ? 'bg-white/20' : 'bg-black/20') : '';
    const draggedClasses = isDragged ? 'opacity-50' : '';

    return (
        <div
            ref={itemRef}
            className={`${baseClasses} ${themeClasses} ${currentClasses} ${draggedClasses}`}
            style={{ transform: `translateX(${translateX}px)` }}
            draggable
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
        >
            <span
                className={`cursor-grab touch-none ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                onMouseDown={(e) => e.stopPropagation()} // Prevent playing when grabbing handle
                onTouchStart={(e) => e.stopPropagation()} // Prevent swipe from starting on handle
            >
                <span className="material-symbols-rounded">drag_indicator</span>
            </span>

            <div
                className={`w-6 h-6 border-2 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'border-brand-accent bg-brand-accent' : (isDark ? 'border-gray-400' : 'border-gray-600')}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(e);
                }}
                 onTouchStart={(e) => e.stopPropagation()}
            >
                {isSelected && <span className="material-symbols-rounded text-base text-white">check</span>}
            </div>

            <div className={`w-12 h-12 rounded-md ${isDark ? 'bg-gray-800' : 'bg-gray-200'} flex-shrink-0 overflow-hidden flex items-center justify-center`}>
                {track.albumArtUrl ? (
                    <img src={track.albumArtUrl} alt="Album Art" className="w-full h-full object-cover" />
                ) : (
                    <span className={`material-symbols-rounded text-3xl ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>music_note</span>
                )}
            </div>

            <div className="min-w-0 flex-grow">
                <p className={`font-medium truncate ${isCurrent ? 'text-brand-accent' : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>
                    {formatTrackName(track.name)}
                </p>
                <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {track.artist || 'Unknown Artist'}
                </p>
            </div>
        </div>
    );
};

export default QueueItem;
