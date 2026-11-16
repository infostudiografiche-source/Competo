import React, { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { GameState, ModalInfo } from '../../gameLogic';
import { generateQuestForNPC } from '../../game/master';
import { preloadedAssets } from '../../assets/preloadedAssets';
import { InteractiveCard3D } from '../cards/InteractiveCard3D';

interface QuestModalContentProps {
    modalInfo: Extract<ModalInfo, { type: 'quest_offer' }>;
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const QuestModalContent: React.FC<QuestModalContentProps> = ({
    modalInfo,
    gameState,
    setGameState,
}) => {
    const npc = modalInfo.npc;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const hasStartedGeneration = useRef(false);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        if (npc && npc.quest.id === 'PENDING_GENERATION' && !hasStartedGeneration.current) {
            hasStartedGeneration.current = true;
            generateQuestForNPC(gameState).then(generatedQuest => {
                if (generatedQuest) {
                    setGameState(prev => {
                        const newNpcs = prev.npcs.map(n => {
                            if (n.id === npc.id) {
                                return { ...n, quest: generatedQuest, name: generatedQuest.title };
                            }
                            return n;
                        });
                        return { ...prev, npcs: newNpcs };
                    });
                } else {
                    console.error('Quest generation failed.');
                }
            });
        }
    }, [npc, gameState, setGameState]);

    if (!npc) return <p>Dati missione non trovati.</p>;

    if (npc.quest.id === 'PENDING_GENERATION') {
        return <p><i>Il Disperso sta formulando i suoi pensieri...</i></p>;
    }

    const hasItem = currentPlayer.inventory.some(
        item => item?.type === 'questItem' && item.name === npc.quest.requiredItemName
    );
    const isQuestActive = currentPlayer.activeQuestId === npc.quest.id;

    const rewardSummary =
        npc.quest.reward.type === 'coins'
            ? `+${npc.quest.reward.baseValue} Intento (con bonus livello)`
            : `Desiderio: ${npc.quest.reward.item.name}`;

    const frontFace = (
        <div className="quest-card-content">
            <div className="event-card-header">
                <span className="event-card-kicker">Richiesta di un Disperso</span>
                <h3>{npc.name}</h3>
            </div>
            <div className="quest-card-quote">
                <p>{npc.quest.description}</p>
            </div>
            {hasItem && isQuestActive && (
                <p className="quest-completion-note">
                    <strong>Nota:</strong> Hai già l'oggetto richiesto! Puoi completare subito la missione.
                </p>
            )}
            <div className="event-card-hint">
                <RotateCw size={14} />
                <span>Clicca la carta per vedere oggetto e ricompensa</span>
            </div>
        </div>
    );

    const backFace = (
        <div className="quest-card-content back">
            <div className="event-card-header">
                <span className="event-card-kicker">Dettagli Missione</span>
                <h3>{npc.quest.title}</h3>
            </div>
            <div className="quest-card-details">
                <div className="quest-artifact-preview">
                    <img
                        src={preloadedAssets.items.questItems[npc.quest.requiredItemName] || preloadedAssets.items.treasure}
                        alt={npc.quest.requiredItemName}
                    />
                    <div>
                        <span className="quest-detail-label">Oggetto Richiesto</span>
                        <strong>{npc.quest.requiredItemName}</strong>
                    </div>
                </div>
                <div className="quest-reward-box">
                    <span className="quest-detail-label">Ricompensa Promessa</span>
                    <strong className="tabular-nums">{rewardSummary}</strong>
                </div>
            </div>
            <div className="event-card-hint">
                <RotateCw size={14} />
                <span>Clicca per rileggere il racconto</span>
            </div>
        </div>
    );

    return (
        <div className="quest-card-stage">
            <InteractiveCard3D
                className="quest-card-3d"
                variant="quest"
                accentColor="#7fb3d5"
                front={frontFace}
                back={backFace}
                isFlipped={isFlipped}
                onCardClick={() => setIsFlipped(f => !f)}
            />
        </div>
    );
};