import React from 'react';

interface AngularGuidesProps {
    size: number;
    orbitalRadius: number;
}

const AngularGuides: React.FC<AngularGuidesProps> = ({ size, orbitalRadius }) => {
    if (size === 0) return null;

    const center = size / 2;
    const radius = center * orbitalRadius;
    const sqrt3 = Math.sqrt(3);
    const points = [
        { x: center, y: center + radius }, // bottom point (90 deg)
        { x: center - (radius * sqrt3) / 2, y: center - radius * 0.5 }, // top-left point (210 deg)
        { x: center + (radius * sqrt3) / 2, y: center - radius * 0.5 }, // top-right point (330 deg)
    ];

    return (
        <svg
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
            viewBox={`0 0 ${size} ${size}`}
        >
            {points.map((point, index) => (
                <line
                    key={index}
                    x1={center}
                    y1={center}
                    x2={point.x}
                    y2={point.y}
                    stroke="cyan"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                />
            ))}
        </svg>
    );
};

export default AngularGuides;
