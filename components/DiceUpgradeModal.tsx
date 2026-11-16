import React from 'react';
import { Dices, Sparkles } from 'lucide-react';
import { Player, DieConfig } from '../gameLogic';

interface DiceUpgradeModalProps {
    player: Player;
    onUpgrade: (type: 'attack' | 'defense', dieId: number, upgradeType: 'add_hit' | 'promote_crit') => void;
}

export const DiceUpgradeModal: React.FC<DiceUpgradeModalProps> = ({ player, onUpgrade }) => {
    const MAX_HITS = 5; // 2 base + 3 upgrades

    const renderDicePool = (type: 'attack' | 'defense') => {
        const dice = type === 'attack' ? player.attackDice : player.defenseDice;
        const title = type === 'attack' ? 'Dadi Armonia (Desiderio)' : 'Dadi Stabilizzazione (Stabilità)';

        if (dice.length === 0) {
            return (
                <div className="dice-upgrade-pool">
                    <h4>{title}</h4>
                    <p className="no-dice-message">Nessun dado di questo tipo.</p>
                </div>
            );
        }

        return (
            <div className="dice-upgrade-pool">
                <h4>{title}</h4>
                <div className="dice-upgrade-grid">
                    {dice.map((die: DieConfig) => (
                        <div key={`${type}-${die.id}`} className="die-upgrade-item">
                            <div className="die-visual">
                                <div className={`die-sigil-badge ${die.hasCrit ? 'has-crit' : ''}`} title={die.hasCrit ? 'Dado con Risonanza Profonda' : 'Dado Standard'}>
                                    <Dices size={28} />
                                    {die.hasCrit && <Sparkles size={14} className="die-crit-spark" />}
                                </div>
                                <div className="die-upgrade-dots" title={`Facce Risonanza: ${die.hits}`}>
                                    {Array.from({ length: die.hits }).map((_, i) => (
                                        <span key={i} className="upgrade-dot filled" />
                                    ))}
                                    {Array.from({ length: Math.max(0, 6 - die.hits - (die.hasCrit ? 1 : 0)) }).map((_, i) => (
                                        <span key={i} className="upgrade-dot" />
                                    ))}
                                </div>
                            </div>
                            <div className="die-upgrade-actions">
                                <button
                                    type="button"
                                    className="modal-action-button"
                                    disabled={die.hits >= MAX_HITS}
                                    onClick={() => onUpgrade(type, die.id, 'add_hit')}
                                    title={die.hits >= MAX_HITS ? 'Massimo numero di risonanze raggiunto' : "Trasforma una faccia 'Mancato' in 'Risonanza'"}
                                >
                                    + Risonanza
                                </button>
                                {player.level >= 8 && (
                                    <button
                                        type="button"
                                        className="modal-action-button confirm"
                                        disabled={die.hasCrit || die.hits === 0}
                                        onClick={() => onUpgrade(type, die.id, 'promote_crit')}
                                        title={die.hasCrit ? 'Questo dado ha già una risonanza profonda' : "Trasforma una faccia 'Risonanza' in 'Profonda'"}
                                    >
                                        Promuovi a Profonda
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content dice-upgrade-modal">
                <div className="modal-header">
                    <h2>Potenzia un Dado</h2>
                </div>
                <div className="modal-body">
                    <p className="dice-upgrade-info">
                        Hai guadagnato un Punto Potenziamento! Scegli un dado da forgiare.
                        {player.level >= 8 && " Da questo livello puoi anche promuovere una 'Risonanza' a 'Profonda' (massimo 1 per dado)."}
                    </p>
                    {renderDicePool('attack')}
                    {renderDicePool('defense')}
                </div>
            </div>
        </div>
    );
};
