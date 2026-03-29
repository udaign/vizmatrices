
import React, { useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ShortcutEntry {
    keys: string[];
    action: string;
}

interface ShortcutGroup {
    title: string;
    icon: string;
    shortcuts: ShortcutEntry[];
}

const shortcutGroups: ShortcutGroup[] = [
    {
        title: 'Playback',
        icon: 'play_circle',
        shortcuts: [
            { keys: ['Space'], action: 'Play / Pause' },
            { keys: ['Ctrl', '→'], action: 'Next Track' },
            { keys: ['Ctrl', '←'], action: 'Previous Track' },
            { keys: ['←'], action: 'Seek backward 5s' },
            { keys: ['→'], action: 'Seek forward 5s' },
            { keys: ['0'], action: 'Restart track' },
            { keys: ['1', '–', '9'], action: 'Seek to 10%–90%' },
        ],
    },
    {
        title: 'Modes',
        icon: 'tune',
        shortcuts: [
            { keys: ['Ctrl', 'S'], action: 'Toggle Shuffle' },
            { keys: ['Ctrl', 'R'], action: 'Toggle Repeat' },
            { keys: ['I'], action: 'Toggle Picture-in-Picture' },
            { keys: ['F'], action: 'Toggle Fullscreen' },
            { keys: ['T'], action: 'Toggle Theme' },
        ],
    },
    {
        title: 'Queue',
        icon: 'queue_music',
        shortcuts: [
            { keys: ['Q'], action: 'Open / Close Queue' },
            { keys: ['Ctrl', 'A'], action: 'Select / Deselect All' },
            { keys: ['Ctrl', 'D'], action: 'Deselect selections' },
            { keys: ['Delete'], action: 'Remove selected songs' },
            { keys: ['Shift', '↑'], action: 'Play selected next' },
        ],
    },
    {
        title: 'General',
        icon: 'info',
        shortcuts: [
            { keys: ['?'], action: 'Show this legend' },
            { keys: ['Esc'], action: 'Close panel / modal' },
        ],
    },
];

const KeyBadge: React.FC<{ label: string; isDark: boolean }> = ({ label, isDark }) => (
    <span
        className={`inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md text-xs font-bold border ${
            isDark
                ? 'bg-white/10 border-white/20 text-gray-200'
                : 'bg-black/5 border-black/15 text-gray-700'
        }`}
        style={{ fontFamily: 'inherit' }}
    >
        {label}
    </span>
);

export const KeyboardShortcutsModal: React.FC<{
    show: boolean;
    onClose: () => void;
    theme: Theme;
}> = ({ show, onClose, theme }) => {
    const isDark = theme === 'dark';

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (show) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-modal-title"
        >
            <div
                className={`relative w-full max-w-md m-4 rounded-lg shadow-2xl overflow-hidden ${
                    isDark ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    <h2 id="shortcuts-modal-title" className="text-xl font-bold">Keyboard Shortcuts</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                        aria-label="Close keyboard shortcuts"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto max-h-[70vh] p-4 space-y-5">
                    {shortcutGroups.map((group) => (
                        <section key={group.title}>
                            <div className="flex items-center gap-2 mb-2.5">
                                <span className={`material-symbols-rounded text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {group.icon}
                                </span>
                                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {group.title}
                                </h3>
                            </div>
                            <div className="space-y-0">
                                {group.shortcuts.map((shortcut, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between py-2 px-2 rounded-md ${
                                            isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                                        }`}
                                    >
                                        <span className="text-sm">{shortcut.action}</span>
                                        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                                            {shortcut.keys.map((key, kidx) => (
                                                <KeyBadge key={kidx} label={key} isDark={isDark} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};
