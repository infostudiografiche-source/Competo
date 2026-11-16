import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { preloadedAssets } from '../../assets/preloadedAssets';
import { InteractiveCard3D } from '../cards/InteractiveCard3D';

interface TreasureCardContentProps {
    title: string;
    message: string;
    onClose: () => void;
}

export const TreasureCardContent: React.FC<TreasureCardContentProps> = ({
    title,
    message,
    onClose,
}) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 40);
        return () => clearTimeout(timer);
    }, []);

    const handleFlip = () => {
        if (!isFlipped && !isClosing) {
            setIsFlipped(true);
        }
    };

    const handleFinish = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isClosing) return;
        setIsClosing(true);
        setIsFlipped(false);
        setTimeout(onClose, 520);
    };

    const frontFace = (
        <div className="event-card-content">
            <div className="event-card-header">
                <span className="event-card-kicker">Tesoro del Sogno</span>
                <h3>Forziere Sigillato</h3>
            </div>
            <p className="event-card-intro">Un bagliore dorato emerge tra le ombre del sentiero.</p>
            <div className="event-card-artwork treasure">
                <img
                    src={preloadedAssets.items.treasureChestClosed}
                    alt="Scrigno del tesoro"
                    className="event-card-img"
                />
            </div>
            <div className="event-card-hint">
                <RotateCw size={14} />
                <span>Tocca la carta per svelare il tesoro</span>
            </div>
        </div>
    );

    const backFace = (
        <div className="event-card-content back">
            <div className="event-card-header">
                <span className="event-card-kicker">Contenuto Rivelato</span>
                <h3>{title}</h3>
            </div>
            <div className="event-card-effect-scroll">
                <p className="event-card-effect-text">{message}</p>
            </div>
            <button
                type="button"
                className="modal-action-button confirm event-card-cta"
                onClick={handleFinish}
                disabled={isClosing}
            >
                Raccogli e Continua
            </button>
        </div>
    );

    return (
        <div className={`event-card-stage ${isVisible ? 'is-visible' : ''}`}>
            <InteractiveCard3D
                className="event-card-3d"
                variant="treasure"
                accentColor="#f0bd17"
                front={frontFace}
                back={backFace}
                isFlipped={isFlipped}
                onCardClick={handleFlip}
            />
        </div>
    );
};
