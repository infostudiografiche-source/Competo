import React, { useState, useEffect, useRef } from 'react';
import { Shield } from 'lucide-react';
import type { GameState, ModalInfo } from '../../gameLogic';
import { CombatDiceDisplay } from '../CombatDiceDisplay';
import { ENEMY_TYPE_NAMES } from '../../game/constants';

interface CombatModalContentProps {
    gameState: GameState;
    modalInfo: Extract<ModalInfo, { type: 'combat' | 'mage_encounter' }>;
    currentPlayerColor: string;
}

const HealthBar: React.FC<{ currentHp: number; maxHp: number; isEnemy?: boolean }> = ({ currentHp, maxHp, isEnemy = false }) => {
    const percentage = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
    const title = isEnemy ? `Paura: ${currentHp} / ${maxHp}` : `Volontà: ${currentHp} / ${maxHp}`;
    return (
        <div className="hp-bar-container" title={title}>
            <div className="hp-bar" style={{ width: `${percentage}%` }} />
            <span className="hp-bar-text tabular-nums">{currentHp} / {maxHp}</span>
        </div>
    );
};

export const CombatModalContent: React.FC<CombatModalContentProps> = ({ gameState, modalInfo, currentPlayerColor }) => {
    const [isRolling, setIsRolling] = useState(false);
    const prevCombatPhase = useRef<string | null>(null);

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const enemy = modalInfo.enemy;

    useEffect(() => {
        const combatPhase = gameState.combatState?.combatPhase;
        if (combatPhase && combatPhase !== prevCombatPhase.current) {
            if (combatPhase === 'attack_rolls' || combatPhase === 'defense_rolls') {
                setIsRolling(true);
                const timer = setTimeout(() => setIsRolling(false), 1200);
                return () => clearTimeout(timer);
            }
        }
        prevCombatPhase.current = combatPhase;
    }, [gameState.combatState?.combatPhase]);

    if (!enemy) return <p>Caricamento dati combattimento...</p>;

    const { combatPhase, playerRolls, enemyRolls, playerDefenseRolls, enemyDefenseRolls, playerDamageTaken, enemyDamageTaken } = gameState.combatState;
    const enemyColor = '#9b59b6';

    const showAttackDice = combatPhase === 'attack_rolls' || combatPhase === 'defense_rolls' || combatPhase === 'results_display' || combatPhase === 'round_over';
    const showDefenseDice = combatPhase === 'defense_rolls' || combatPhase === 'results_display' || combatPhase === 'round_over';
    const showResults = combatPhase === 'results_display' || combatPhase === 'round_over';

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
        <>
            {modalInfo.type === 'mage_encounter' && <p className="combat-intro-note">{modalInfo.message}</p>}
            <div className="combat-display">
                <div className="combatant-card">
                    <p className="combatant-subtitle">{capitalize(currentPlayer.class)}</p>
                    <img src={currentPlayer.avatar} alt={currentPlayer.name} />
                    <div className="combatant-info">
                        <h4>{currentPlayer.name}</h4>
                        <p className="combatant-stat-line tabular-nums">
                            <span>Livello {currentPlayer.level}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-stat-icon" title="Stabilità">
                                <Shield size={14} /> {currentPlayer.toughness}
                            </span>
                        </p>
                    </div>
                    <HealthBar currentHp={currentPlayer.hp} maxHp={currentPlayer.maxHp} />
                    <div className="combatant-dice-section">
                        {showAttackDice && <CombatDiceDisplay rolls={playerRolls} title="Armonia" isRolling={isRolling && combatPhase === 'attack_rolls'} dieColor={currentPlayerColor} />}
                        {showDefenseDice && <CombatDiceDisplay className="defense-dice-display" rolls={playerDefenseRolls} title="Stabilizzazione" isRolling={isRolling && combatPhase === 'defense_rolls'} isDefense={true} dieColor={currentPlayerColor} />}
                    </div>
                    {showResults && (<div className="combat-damage-result tabular-nums">Dissonanza subita: {playerDamageTaken ?? 0}</div>)}
                </div>

                <span className="combat-vs">VS</span>

                <div className="combatant-card enemy">
                    <p className="combatant-subtitle">{ENEMY_TYPE_NAMES[enemy.enemyType].singular}</p>
                    <img src={enemy.avatar} alt={enemy.name} />
                    <div className="combatant-info">
                        <h4>{enemy.name}</h4>
                        <p className="combatant-stat-line tabular-nums">
                            <span>Determ. {enemy.level}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-stat-icon" title="Stabilità">
                                <Shield size={14} /> {enemy.toughness}
                            </span>
                        </p>
                    </div>
                    <HealthBar currentHp={enemy.hp} maxHp={enemy.maxHp} isEnemy={true} />
                    <div className="combatant-dice-section">
                        {showAttackDice && <CombatDiceDisplay rolls={enemyRolls} title="Dissonanza" isRolling={isRolling && combatPhase === 'attack_rolls'} dieColor={enemyColor} />}
                        {showDefenseDice && <CombatDiceDisplay className="defense-dice-display" rolls={enemyDefenseRolls} title="Stabilità" isRolling={isRolling && combatPhase === 'defense_rolls'} isDefense={true} dieColor={enemyColor} />}
                    </div>
                    {showResults && (<div className="combat-damage-result tabular-nums">Armonia inflitta: {enemyDamageTaken ?? 0}</div>)}
                </div>
            </div>
            <p className="combat-booty-info">Bottino Potenziale: {enemy.bootyValue}</p>
        </>
    );
};