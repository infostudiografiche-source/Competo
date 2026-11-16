import React from 'react';
import { CombatRollResult } from '../gameLogic';
import { AnimatedCombatDie } from './AnimatedCombatDie';

interface CombatDiceDisplayProps {
    rolls: CombatRollResult | null;
    title: string;
    isRolling: boolean;
    dieColor?: string;
    isDefense?: boolean;
    className?: string;
}

export const CombatDiceDisplay: React.FC<CombatDiceDisplayProps> = ({ rolls, title, isRolling, dieColor, isDefense = false, className }) => {
    if (!rolls || rolls.rolls.length === 0) return null;

    return (
        <div className={`combat-dice-area ${isRolling ? 'rolling' : ''} ${className || ''}`}>
            <h5>{title}</h5>
            <div className="combat-dice-container">
                 {rolls.rolls.map((rollType, index) => (
                    <AnimatedCombatDie
                        key={index}
                        rollType={rollType}
                        isRolling={isRolling}
                        animationDelay={index * 100}
                        dieColor={dieColor}
                    />
                ))}
            </div>
            {!isRolling && (
                <div className="combat-damage-total">
                    {isDefense ? `Stabilità: ${rolls.totalDamage}` : `${title}: ${rolls.totalDamage}`}
                </div>
            )}
        </div>
    );
};