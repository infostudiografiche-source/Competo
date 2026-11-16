import React from 'react';
import { GameState, KeyColor } from '../gameLogic';
import { preloadedAssets } from '../assets/preloadedAssets';

interface KeyDisplayProps {
    keys: GameState['keys'];
    teamKeyProgress?: GameState['teamKeyProgress'];
}

export const KeyDisplay: React.FC<KeyDisplayProps> = ({ keys, teamKeyProgress }) => {
    const keyOrder: KeyColor[] = ['red', 'yellow', 'white', 'black'];
    const keyData: Record<KeyColor, { src: string; name: string }> = {
        red: { src: preloadedAssets.items.redKey, name: 'Chiave Rossa' },
        yellow: { src: preloadedAssets.items.yellowKey, name: 'Chiave Gialla' },
        white: { src: preloadedAssets.items.whiteKey, name: 'Chiave Bianca' },
        black: { src: preloadedAssets.items.blackKey, name: 'Chiave Nera' },
    };

    return (
        <div className="key-display-container">
            <h3>Chiavi del Risveglio</h3>
            <div className="key-icons">
                {keyOrder.map(color => {
                    const isCollected = keys[color];
                    const progress = Math.min(5, teamKeyProgress?.[color] ?? 0);
                    return (
                        <div key={color} className="key-slot-column">
                            <div
                                className={`key-icon-wrapper ${isCollected ? 'collected' : ''}`}
                                title={`${keyData[color].name} (${isCollected ? 'Forgiata' : `${progress}/5 incubi`})`}
                            >
                                <img src={keyData[color].src} alt={keyData[color].name} />
                            </div>
                            <span className={`key-progress-caption tabular-nums ${isCollected ? 'collected' : ''}`}>
                                {isCollected ? 'Attiva' : `${progress}/5`}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};