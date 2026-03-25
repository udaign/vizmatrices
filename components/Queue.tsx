
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { PlaylistItem } from '../App';
import QueueItem from './QueueItem';

interface QueueProps {
    isOpen: boolean;
    onClose: () => void;
    playlist: PlaylistItem[];
    currentTrackIndex: number;
    onReorder: (startIndex: number, endIndex: number) => void;
    selectedTracks: Set<string>;
    onSelectTrack: (trackUrl: string, isShiftPressed: boolean) => void;
    onSelectAll: () => void;
    onDeleteSelected: () => void;
    onPlayTrack: (trackIndex: number) => void;
    onPlayNextSelected: () => void;
    onRemoveTrack: (trackUrl: string) => void;
    theme: 'dark' | 'light';
}

/** Strips bracketed tags and file extensions – must stay in sync with QueueItem's formatTrackName */
const formatTrackName = (name: string | null): string => {
    if (!name) return 'Unknown Track';
    return name.replace(/\[.*?\]/g, '').replace(/\.[^/.]+$/, '').trim();
};

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
    const listRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';
    const allSelected = selectedTracks.size > 0 && selectedTracks.size === playlist.length;
    const someSelected = selectedTracks.size > 0 && selectedTracks.size < playlist.length;
    const noneSelected = selectedTracks.size === 0;

    // --- Search state ---
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Compute matching playlist indices (searches name, artist, album)
    const matchingIndices = useMemo(() => {
        if (!searchQuery.trim()) return [] as number[];
        const q = searchQuery.toLowerCase();
        const indices: number[] = [];
        playlist.forEach((track, idx) => {
            const haystack = [
                track.title || formatTrackName(track.name),
                track.artist || '',
                track.album || '',
            ].join(' ').toLowerCase();
            if (haystack.includes(q)) {
                indices.push(idx);
            }
        });
        return indices;
    }, [searchQuery, playlist]);

    // Scroll to the currently-focused match
    const scrollToMatch = useCallback((matchIdx: number) => {
        const playlistIdx = matchingIndices[matchIdx];
        if (playlistIdx == null) return;
        const el = itemRefs.current.get(playlistIdx);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [matchingIndices]);

    // When searchQuery changes, reset to the first match
    useEffect(() => {
        setCurrentMatchIndex(0);
        if (matchingIndices.length > 0) {
            // Delay slightly so the DOM has rendered updated items
            requestAnimationFrame(() => scrollToMatch(0));
        }
    }, [searchQuery, matchingIndices.length]);

    // When currentMatchIndex changes (from arrow nav), scroll
    useEffect(() => {
        if (matchingIndices.length > 0) {
            scrollToMatch(currentMatchIndex);
        }
    }, [currentMatchIndex]);

    const handleSearchNext = () => {
        if (matchingIndices.length === 0) return;
        setCurrentMatchIndex(prev => (prev + 1) % matchingIndices.length);
    };

    const handleSearchPrev = () => {
        if (matchingIndices.length === 0) return;
        setCurrentMatchIndex(prev => (prev - 1 + matchingIndices.length) % matchingIndices.length);
    };

    const openSearch = () => {
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    const closeSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setCurrentMatchIndex(0);
    };

    // Register / unregister item refs
    const setItemRef = useCallback((index: number, el: HTMLDivElement | null) => {
        if (el) {
            itemRefs.current.set(index, el);
        } else {
            itemRefs.current.delete(index);
        }
    }, []);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isInputFocus = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (event.key === 'Escape') {
                if (isSearchOpen) {
                    closeSearch();
                } else {
                    onClose();
                }
            } else if (!isInputFocus && (event.key === 'Delete' || event.code === 'NumpadSubtract')) {
                if (selectedTracks.size > 0) {
                    event.preventDefault();
                    onDeleteSelected();
                    setIsMoreMenuOpen(false);
                }
            } else if (!isInputFocus && event.shiftKey && event.key === 'ArrowUp') {
                if (selectedTracks.size > 0) {
                    event.preventDefault();
                    onPlayNextSelected();
                    setIsMoreMenuOpen(false);
                }
            } else if (event.ctrlKey && (event.key === 'a' || event.code === 'KeyA')) {
                event.preventDefault();
                onSelectAll();
            }
        };
        const handleClickOutside = (event: MouseEvent) => {
            if (isMoreMenuOpen && moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, isMoreMenuOpen, isSearchOpen, selectedTracks.size, onPlayNextSelected, onDeleteSelected]);

    // Auto-scroll to the now-playing track when the queue opens
    useEffect(() => {
        if (isOpen && listRef.current && currentTrackIndex >= 0) {
            requestAnimationFrame(() => {
                const container = listRef.current;
                if (!container) return;
                const currentItem = container.children[currentTrackIndex] as HTMLElement | undefined;
                if (currentItem) {
                    container.scrollTop = currentItem.offsetTop - container.offsetTop;
                }
            });
        }
    }, [isOpen]);

    // Close search when queue closes
    useEffect(() => {
        if (!isOpen && isSearchOpen) {
            closeSearch();
        }
    }, [isOpen]);
    
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

    // The focused playlist index (the one that should have the highlight row)
    const focusedPlaylistIndex = matchingIndices[currentMatchIndex] ?? -1;

    const panelContent = (
        <>
            {/* Header */}
            <div className={`flex items-center p-3 border-b ${isDark ? 'border-white/10' : 'border-black/10'} flex-shrink-0`}>
                {isSearchOpen ? (
                    /* --- Search bar mode --- */
                    <div className="flex items-center w-full gap-2 animate-fade-in">
                        <button
                            onClick={closeSearch}
                            className="p-1 rounded-full hover:bg-white/10 w-10 h-10 flex items-center justify-center flex-shrink-0"
                        >
                            <span className="material-symbols-rounded">arrow_back</span>
                        </button>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.shiftKey ? handleSearchPrev() : handleSearchNext();
                                }
                            }}
                            placeholder="Search queue…"
                            className={`flex-grow bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                        />
                        {searchQuery && (
                            <span className={`text-xs whitespace-nowrap flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {matchingIndices.length > 0
                                    ? `${currentMatchIndex + 1} of ${matchingIndices.length}`
                                    : '0 results'}
                            </span>
                        )}
                        <button
                            onClick={handleSearchPrev}
                            disabled={matchingIndices.length === 0}
                            className="p-1 rounded-full disabled:opacity-30 hover:bg-white/10 flex-shrink-0"
                        >
                            <span className="material-symbols-rounded text-xl">keyboard_arrow_up</span>
                        </button>
                        <button
                            onClick={handleSearchNext}
                            disabled={matchingIndices.length === 0}
                            className="p-1 rounded-full disabled:opacity-30 hover:bg-white/10 flex-shrink-0"
                        >
                            <span className="material-symbols-rounded text-xl">keyboard_arrow_down</span>
                        </button>
                    </div>
                ) : (
                    /* --- Normal header mode --- */
                    <>
                        <div className="flex-1 flex justify-start items-center gap-3">
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 w-10 h-10 flex items-center justify-center"><span className="material-symbols-rounded">close</span></button>
                            <button onClick={onSelectAll} className={`w-6 h-6 border-2 rounded-full flex items-center justify-center transition-colors ${noneSelected ? (isDark ? 'border-gray-400' : 'border-gray-600') : 'border-brand-accent bg-brand-accent'}`} aria-label={noneSelected ? 'Select All' : 'Deselect All'}>
                                {allSelected && <span className="material-symbols-rounded text-base text-white">check</span>}
                                {someSelected && <span className="material-symbols-rounded text-base text-white">check</span>}
                            </button>
                        </div>
                        <h2 className="text-xl font-bold">Queue</h2>
                        <div className="flex-1 flex justify-end items-center gap-2">
                            <button onClick={openSearch} className="p-1 rounded-full hover:bg-white/10"><span className="material-symbols-rounded">search</span></button>
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
                    </>
                )}
            </div>
            {/* List */}
            <div ref={listRef} className="overflow-y-auto" onDragEnd={handleDragEnd}>
                {playlist.map((track, index) => (
                    <div key={track.url} ref={(el) => setItemRef(index, el)}>
                        <QueueItem
                            track={track}
                            index={index}
                            isCurrent={index === currentTrackIndex}
                            isSelected={selectedTracks.has(track.url)}
                            isDragged={draggedIndex === index}
                            onSelect={(e) => onSelectTrack(track.url, e.shiftKey)}
                            onPlay={() => onPlayTrack(index)}
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onRemove={() => onRemoveTrack(track.url)}
                            theme={theme}
                            isSearchFocused={isSearchOpen && index === focusedPlaylistIndex}
                        />
                    </div>
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
