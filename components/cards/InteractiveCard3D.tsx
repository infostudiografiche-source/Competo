import React, { useRef, useState } from 'react';

export type Card3DVariant =
    | 'blessing'
    | 'misfortune'
    | 'treasure'
    | 'player'
    | 'enemy'
    | 'quest'
    | 'wish';

interface InteractiveCard3DProps {
    front: React.ReactNode;
    back?: React.ReactNode;
    isFlipped?: boolean;
    onCardClick?: () => void;
    variant?: Card3DVariant;
    accentColor?: string;
    className?: string;
    enableTilt?: boolean;
    ariaLabel?: string;
}

export const InteractiveCard3D: React.FC<InteractiveCard3DProps> = ({
    front,
    back,
    isFlipped = false,
    onCardClick,
    variant = 'player',
    accentColor,
    className = '',
    enableTilt = true,
    ariaLabel,
}) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [tilt, setTilt] = useState({ rx: 0, ry: 0, sx: 50, sy: 50, hovering: false });

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!enableTilt || !wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;

        const maxTilt = 7.5;
        const ry = (px - 0.5) * 2 * maxTilt;
        const rx = (0.5 - py) * 2 * maxTilt;

        setTilt({
            rx,
            ry,
            sx: Math.round(px * 100),
            sy: Math.round(py * 100),
            hovering: true,
        });
    };

    const handlePointerLeave = () => {
        setTilt({ rx: 0, ry: 0, sx: 50, sy: 50, hovering: false });
    };

    const styleVars = {
        '--card-accent': accentColor || undefined,
        '--tilt-rx': `${tilt.rx.toFixed(2)}deg`,
        '--tilt-ry': `${tilt.ry.toFixed(2)}deg`,
        '--shine-x': `${tilt.sx}%`,
        '--shine-y': `${tilt.sy}%`,
    } as React.CSSProperties;

    return (
        <div
            ref={wrapperRef}
            className={`card3d-scene variant-${variant} ${tilt.hovering ? 'is-hovering' : ''} ${className}`}
            style={styleVars}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onClick={onCardClick}
            aria-label={ariaLabel}
        >
            <div className={`card3d-tilt-layer ${isFlipped ? 'is-flipped' : ''}`}>
                <div className="card3d-flip-body">
                    <div className="card3d-face card3d-face-front">
                        <div className="card3d-foil-sheen" aria-hidden="true" />
                        <div className="card3d-inner-frame">{front}</div>
                    </div>
                    {back && (
                        <div className="card3d-face card3d-face-back">
                            <div className="card3d-foil-sheen" aria-hidden="true" />
                            <div className="card3d-inner-frame">{back}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
