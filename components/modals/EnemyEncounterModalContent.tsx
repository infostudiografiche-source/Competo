import React, { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import type { GameState, ModalInfo } from '../../gameLogic';
import { ENEMY_TYPE_NAMES } from '../../game/constants';
import { InteractiveCard3D } from '../cards/InteractiveCard3D';

interface EnemyEncounterModalContentProps {
    modalInfo: ModalInfo & { type: 'enemy_encounter' };
    gameState: GameState;
}

const PLAYER_ACCENTS: Record<string, string> = {
    red: '#c0392b',
    yellow: '#f1c40f',
    white: '#cbd5e1',
    black: '#64748b',
};

const ENEMY_ACCENTS: Record<string, string> = {
    red: '#e74c3c',
    yellow: '#a3c928',
    white: '#e2e8f0',
    black: '#9b59b6',
};

export const EnemyEncounterModalContent: React.FC<EnemyEncounterModalContentProps> = ({
    modalInfo,
    gameState,
}) => {
    const [animate, setAnimate] = useState(false);
    const [playerFlipped, setPlayerFlipped] = useState(false);
    const [enemyFlipped, setEnemyFlipped] = useState(false);

    const enemy = modalInfo.enemy;
    const player = gameState.players[gameState.currentPlayerIndex];

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 40);
        return () => clearTimeout(timer);
    }, []);

    if (!enemy || !player) return null;

    const shadowOwner = gameState.players.find(p => p.id === enemy.ownerId);
    const ownerName = shadowOwner ? shadowOwner.name : 'una Coscienza Collettiva';

    const dialogueMessage = modalInfo.dialogueRefused
        ? "L'Ombra ruggisce in un linguaggio incomprensibile, rifiutando ogni contatto!"
        : `Senti che questa Ombra appartiene a ${ownerName}. Che esigenza cela?`;

    const playerClassLabel = player.class.charAt(0).toUpperCase() + player.class.slice(1);

    const playerFront = (
        <div className="duel-card-content">
            <div className="duel-card-header">
                <span className="duel-card-kicker">{playerClassLabel}</span>
                <h3>{player.name}</h3>
            </div>
            <div className="duel-card-stats">
                <span className="tabular-nums">Stabilità: {player.toughness}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Integrità: {player.hp}/{player.maxHp}</span>
            </div>
            <div className="duel-card-art">
                <img src={player.avatar} alt={player.name} className="duel-card-img" />
            </div>
            <div className="duel-card-box">
                <strong>{player.equippedWeapon?.name || 'Nessun Desiderio'}</strong>
                <span className="tabular-nums">
                    {player.equippedWeapon ? `Livello ${player.equippedWeapon.level} · ${player.attackDice.length} dadi` : 'Disarmato'}
                </span>
            </div>
            <div className="duel-card-flip-cue">
                <RotateCw size={12} />
                <span>Clicca per dettagli</span>
            </div>
        </div>
    );

    const playerBack = (
        <div className="duel-card-content back">
            <div className="duel-card-header">
                <span className="duel-card-kicker">Scheda Combattente</span>
                <h3>{player.name}</h3>
            </div>
            <div className="duel-card-back-body">
                {player.equippedWeapon ? (
                    <>
                        <p className="duel-back-title">{player.equippedWeapon.name}</p>
                        <p className="duel-back-sub">"{player.equippedWeapon.bonusEffect.name}"</p>
                        <p className="duel-back-desc">{player.equippedWeapon.bonusEffect.description}</p>
                    </>
                ) : (
                    <p className="duel-back-desc">Nessun desiderio equipaggiato per questo scontro.</p>
                )}
                <div className="duel-back-metrics tabular-nums">
                    <span>Dadi Armonia: {player.attackDice.length}</span>
                    <span>Dadi Stabilizzazione: {player.defenseDice.length}</span>
                </div>
            </div>
            <div className="duel-card-flip-cue">
                <RotateCw size={12} />
                <span>Torna al fronte</span>
            </div>
        </div>
    );

    const enemyFront = (
        <div className="duel-card-content">
            <div className="duel-card-header">
                <span className="duel-card-kicker">{ENEMY_TYPE_NAMES[enemy.enemyType].singular}</span>
                <h3>{enemy.name}</h3>
            </div>
            <div className="duel-card-stats">
                <span className="tabular-nums">Stabilità: {enemy.toughness}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Paura: {enemy.hp}/{enemy.maxHp}</span>
            </div>
            <div className="duel-card-art">
                <img src={enemy.avatar} alt={enemy.name} className="duel-card-img" />
            </div>
            <div className="duel-card-box">
                <strong className="tabular-nums">Intento: {enemy.level}</strong>
                <span>
                    {enemy.isFinalBoss
                        ? "L'Ombra Ancestrale"
                        : enemy.isWanderingTitan
                        ? 'Titano Errante'
                        : `Frammento di ${ownerName}`}
                </span>
            </div>
            <div className="duel-card-flip-cue">
                <RotateCw size={12} />
                <span>Clicca per dettagli</span>
            </div>
        </div>
    );

    const enemyBack = (
        <div className="duel-card-content back">
            <div className="duel-card-header">
                <span className="duel-card-kicker">Natura dell'Incubo</span>
                <h3>{enemy.name}</h3>
            </div>
            <div className="duel-card-back-body">
                <p className="duel-back-title">Tipo: {ENEMY_TYPE_NAMES[enemy.enemyType].singular}</p>
                <p className="duel-back-desc">
                    {enemy.isFinalBoss
                        ? 'Il guardiano del Risveglio al centro del tabellone. Richiede determinazione e coordinazione.'
                        : `Un frammento d'ombra proiettato da ${ownerName}. Puoi tentare il dialogo o entrare in risonanza.`}
                </p>
                <div className="duel-back-metrics tabular-nums">
                    <span>Bottino potenziale: {enemy.bootyValue}</span>
                    <span>Determinazione: {enemy.level}</span>
                </div>
            </div>
            <div className="duel-card-flip-cue">
                <RotateCw size={12} />
                <span>Torna al fronte</span>
            </div>
        </div>
    );

    return (
        <div className={`enemy-encounter-content ${animate ? 'is-ready' : ''}`}>
            <InteractiveCard3D
                className="duel-card-3d"
                variant="player"
                accentColor={PLAYER_ACCENTS[player.color] || '#f0bd17'}
                front={playerFront}
                back={playerBack}
                isFlipped={playerFlipped}
                onCardClick={() => setPlayerFlipped(f => !f)}
            />

            <div className="encounter-dialogue-prompt">{dialogueMessage}</div>

            <InteractiveCard3D
                className="duel-card-3d"
                variant="enemy"
                accentColor={ENEMY_ACCENTS[enemy.enemyType] || '#9b59b6'}
                front={enemyFront}
                back={enemyBack}
                isFlipped={enemyFlipped}
                onCardClick={() => setEnemyFlipped(f => !f)}
            />
        </div>
    );
};