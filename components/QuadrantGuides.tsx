import React from 'react';

interface QuadrantGuidesProps {
    size: number;
}

const QuadrantGuides: React.FC<QuadrantGuidesProps> = ({ size }) => {
    if (size === 0) return null;

    const center = size / 2;

    return (
        <svg
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
            viewBox={`0 0 ${size} ${size}`}
        >
            {/* Horizontal Guide */}
            <line
                x1={0}
                y1={center}
                x2={size}
                y2={center}
                stroke="magenta"
                strokeWidth="1"
                strokeDasharray="4 2"
            />
            {/* Vertical Guide */}
            <line
                x1={center}
                y1={0}
                x2={center}
                y2={size}
                stroke="magenta"
                strokeWidth="1"
                strokeDasharray="4 2"
            />
        </svg>
    );
};

export default QuadrantGuides;
