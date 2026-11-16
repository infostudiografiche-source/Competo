import React from 'react';
import { CombatRollResultType } from '../gameLogic';
import { preloadedAssets } from '../assets/preloadedAssets';

interface AnimatedCombatDieProps {
    rollType: CombatRollResultType;
    isRolling: boolean;
    animationDelay: number;
    dieColor?: string;
}

export const AnimatedCombatDie: React.FC<AnimatedCombatDieProps> = ({ rollType, isRolling, animationDelay, dieColor }) => {
    const getResultClass = () => {
        if (isRolling) return '';
        switch (rollType) {
            case 'crit': return 'show-face-crit';
            case 'hit': return 'show-face-hit';
            case 'miss': return 'show-face-miss';
            default: return '';
        }
    };
    const dieClass = `combat-die-3d ${isRolling ? 'rolling' : ''} ${getResultClass()}`;
    
    const wrapperStyle: React.CSSProperties = { animationDelay: `${animationDelay}ms` };
    if (dieColor) {
        wrapperStyle['--die-face-color'] = dieColor;
    }

    return (
        <div className="combat-die-3d-wrapper" style={wrapperStyle}>
            <div className={dieClass}>
                <div className="face face-1"><img src={preloadedAssets.diceFaces.crit} alt="Critico" /></div>
                <div className="face face-2"><img src={preloadedAssets.diceFaces.hit} alt="Colpo" /></div>
                <div className="face face-3"><img src={preloadedAssets.diceFaces.hit} alt="Colpo" /></div>
                <div className="face face-4"><img src={preloadedAssets.diceFaces.miss} alt="Mancato" /></div>
                <div className="face face-5"><img src={preloadedAssets.diceFaces.miss} alt="Mancato" /></div>
                <div className="face face-6"><img src={preloadedAssets.diceFaces.miss} alt="Mancato" /></div>
            </div>
        </div>
    );
};