import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface LogoutTransitionProps {
    visible: boolean;
    position: { x: number; y: number };
}

const LogoutTransition: React.FC<LogoutTransitionProps> = ({ visible, position }) => {
    if (!visible) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
            {/* 扩散波纹 */}
            <div
                className="absolute rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 animate-ripple-expand"
                style={{
                    left: position.x,
                    top: position.y,
                    width: '0px',
                    height: '0px',
                    transform: 'translate(-50%, -50%)',
                }}
            />

            {/* 文字提示 (延迟出现) */}
            <div className="relative z-10 text-white text-2xl font-light tracking-widest animate-fade-in-delayed opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                GOODBYE
            </div>
        </div>,
        document.body
    );
};

export default LogoutTransition;
