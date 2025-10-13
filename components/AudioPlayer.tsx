
import React, { useState, useRef, useEffect } from 'react';

type LoadMethod = 'file_select' | 'folder_select';

interface AudioPlayerProps {
  onFilesSelect: (files: FileList, method: LoadMethod) => void;
  currentTrackName: string | null;
  albumArtUrl: string | null;
  playlistLength: number;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const formatTrackName = (name: string | null): string => {
    if (!name) return 'No music loaded.';
    // Remove stuff in brackets and the file extension
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\.[^/.]+$/, '')
      .trim();
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
    onFilesSelect, currentTrackName, albumArtUrl, playlistLength, theme, onThemeToggle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const loadMusicContainerRef = useRef<HTMLDivElement>(null);
  const [showLoadOptions, setShowLoadOptions] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loadMusicContainerRef.current && !loadMusicContainerRef.current.contains(event.target as Node)) {
        setShowLoadOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, method: LoadMethod) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelect(files, method);
    }
    setShowLoadOptions(false);
    if (event.target) {
        event.target.value = ''; // Reset input to allow re-loading the same folder
    }
  };

  const isDark = theme === 'dark';

  return (
    <>
      {/* Top Bar */}
      <div className="w-full py-2" role="region" aria-label="Audio Player Header">
        <div className="flex items-center justify-between gap-4">
            <div className={`flex items-center gap-3 min-w-0 ${playlistLength > 0 ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`w-10 h-10 rounded-md ${isDark ? 'bg-gray-800' : 'bg-gray-200'} flex-shrink-0 overflow-hidden flex items-center justify-center`}>
                    {albumArtUrl ? (
                        <img src={albumArtUrl} alt="Album Art" className="w-full h-full object-cover" />
                    ) : (
                        <span className={`material-symbols-rounded text-3xl ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>music_note</span>
                    )}
                </div>
                <p className={`min-w-0 text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {formatTrackName(currentTrackName)}
                </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
                <div ref={loadMusicContainerRef} className="relative">
                  <button
                    onClick={() => setShowLoadOptions(prev => !prev)}
                    className="whitespace-nowrap bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-2 px-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-opacity-75 flex items-center gap-2"
                    aria-haspopup="true"
                    aria-expanded={showLoadOptions}
                    aria-label="Load music options"
                  >
                    Load Music
                    <span className="material-symbols-rounded text-xl transition-transform duration-200" style={{ transform: showLoadOptions ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                    </span>
                  </button>
                  {showLoadOptions && (
                      <div className={`absolute top-full right-0 mt-2 w-48 rounded-lg shadow-xl z-10 py-1 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                          <button
                              onClick={() => { fileInputRef.current?.click(); }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${theme === 'dark' ? 'text-gray-200 hover:bg-brand-accent/20' : 'text-gray-800 hover:bg-brand-accent/10'}`}
                          >
                              <span className="material-symbols-rounded text-xl">audio_file</span>
                              <span>Select File(s)</span>
                          </button>
                          <button
                              onClick={() => { folderInputRef.current?.click(); }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${theme === 'dark' ? 'text-gray-200 hover:bg-brand-accent/20' : 'text-gray-800 hover:bg-brand-accent/10'}`}
                          >
                              <span className="material-symbols-rounded text-xl">folder_open</span>
                              <span>Select Folder</span>
                          </button>
                      </div>
                  )}
                </div>
                <button
                    onClick={onThemeToggle}
                    className={`p-2 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-opacity-75 ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-gray-800 hover:bg-black/10'}`}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    <span className="material-symbols-rounded text-2xl">
                        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>
            </div>
        </div>
      </div>

      {/* Hidden elements for functionality */}
      <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e, 'file_select')}
          className="hidden"
          aria-hidden="true"
          multiple
      />
      <input
          type="file"
          accept="audio/*"
          ref={folderInputRef}
          onChange={(e) => handleFileChange(e, 'folder_select')}
          className="hidden"
          aria-hidden="true"
          // @ts-ignore
          webkitdirectory=""
      />
    </>
  );
};

export default AudioPlayer;