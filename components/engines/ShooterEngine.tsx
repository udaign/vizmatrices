
import React, { useEffect } from 'react';

interface ShooterEngineProps {
    onRenderBufferChange: (buffer: Float32Array | null) => void;
    onHighSpotSizeChange: (size: number) => void;
}
const ShooterEngine: React.FC<ShooterEngineProps> = ({ onRenderBufferChange, onHighSpotSizeChange }) => {
    useEffect(() => {
        // Clear the visualizers when this engine becomes active
        onRenderBufferChange(null);
        onHighSpotSizeChange(0);
    }, [onRenderBufferChange, onHighSpotSizeChange]);

    return null;
};

export default ShooterEngine;
