
import React from 'react';

const ColumnGrid: React.FC = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[9999]" aria-hidden="true">
            <div className="max-w-screen-2xl mx-auto h-full px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12 h-full">
                    <div className="bg-red-500/10 h-full"></div>
                    <div className="hidden lg:block bg-red-500/10 h-full"></div>
                    <div className="hidden lg:block bg-red-500/10 h-full"></div>
                </div>
            </div>
        </div>
    );
};

export default ColumnGrid;
