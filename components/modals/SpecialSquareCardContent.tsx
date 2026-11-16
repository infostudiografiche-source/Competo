import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { preloadedAssets } from '../../assets/preloadedAssets';
import { InteractiveCard3D } from '../cards/InteractiveCard3D';

interface SpecialSquareCardContentProps {
    squareType: 'blessing' | 'misfortune';
    message: string;
    onClose: () => void;
}

export const SpecialSquareCardContent: React.FC<SpecialSquareCardContentProps> = ({
    squareType,
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

    const handleCardClick = () => {
        if (!isFlipped && !isClosing) {
            setIsFlipped(true);
        }
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isClosing) return;
        setIsClosing(true);
        setIsFlipped(false);
        setTimeout(onClose, 580);
    };

    const cardData = {
        blessing: {
            kicker: 'Presagio Luminoso',
            title: 'Benedizione!',
            introText: 'La perseveranza dà sempre ottimi frutti. Una luce guida il tuo passo.',
            image: preloadedAssets.specials.cardImages.blessing,
            accent: '#f0bd17',
        },
        misfortune: {
            kicker: 'Ombra Improvvisa',
            title: 'Sventura!',
            introText: 'Occhio a dove metti i piedi... qualcosa si muove nel buio.',
            image: preloadedAssets.specials.cardImages.misfortune,
            accent: '#c0392b',
        },
    };

    const data = cardData[squareType];

    const frontFace = (
        <div className="event-card-content">
            <div className="event-card-header">
                <span className="event-card-kicker">{data.kicker}</span>
                <h3>{data.title}</h3>
            </div>
            <p className="event-card-intro">{data.introText}</p>
            <div className={`event-card-artwork ${squareType}`}>
                <img src={data.image} alt={data.title} className="event-card-img" />
            </div>
            <div className="event-card-hint">
                <RotateCw size={14} />
                <span>Tocca la carta per girarla</span>
            </div>
        </div>
    );

    const backFace = (
        <div className="event-card-content back">
            <div className="event-card-header">
                <span className="event-card-kicker">{data.title}</span>
                <h3>Effetto</h3>
            </div>
            <div className="event-card-effect-scroll">
                <p className="event-card-effect-text">{message}</p>
            </div>
            <button
                type="button"
                className="modal-action-button confirm event-card-cta"
                onClick={handleClose}
                disabled={isClosing}
            >
                Ho Capito
            </button>
        </div>
    );

    return (
        <div className={`event-card-stage ${isVisible ? 'is-visible' : ''}`}>
            <InteractiveCard3D
                className="event-card-3d"
                variant={squareType}
                accentColor={data.accent}
                front={frontFace}
                back={backFace}
                isFlipped={isFlipped}
                onCardClick={handleCardClick}
            />
        </div>
    );
};