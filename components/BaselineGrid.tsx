
import React from 'react';

const BaselineGrid: React.FC = () => {
    const gridColor = 'rgba(128, 128, 128, 0.15)';
    const gridSize = '0.25rem'; // 4pt grid (4px, assuming 1rem = 16px)

    const style: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize} ${gridSize}`,
    };

    return <div style={style} aria-hidden="true" />;
};

export default BaselineGrid;
