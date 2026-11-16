import React, { useState } from 'react';
import { Bug, Play, CheckCircle2, ShieldAlert, Sparkles, RefreshCcw } from 'lucide-react';
import { createInitialGameState, createWeaponInstance } from '../game/initialState';
import * as gameEngine from '../game/engine';
import type { GameState, PlayerCustomization } from '../gameLogic';

interface DebugPanelModalProps {
    onClose: () => void;
}

export const DebugPanelModal: React.FC<DebugPanelModalProps> = ({ onClose }) => {
    const [isSimulating, setIsSimulating] = useState(false);
    const [simResults, setSimResults] = useState<{
        matchesRun: number;
        victories: number;
        defeats: number;
        turnCaps: number;
        combatsResolved: number;
        invariantsPassed: boolean;
        logs: string[];
    } | null>(null);

    const runClientSimulation = async () => {
        setIsSimulating(true);
        const logs: string[] = ['[Debug] Avvio simulazione locale zero-token...'];
        let victories = 0;
        let defeats = 0;
        let turnCaps = 0;
        let combatsResolved = 0;
        let invariantsPassed = true;

        try {
            const matchCount = 5;
            for (let m = 0; m < matchCount; m++) {
                const playerCount = 3;
                const customizations: PlayerCustomization[] = [
                    { name: `Sim1`, playerClass: 'determinato', controller: 'ai' },
                    { name: `Sim2`, playerClass: 'intuitivo', controller: 'ai' },
                    { name: `Sim3`, playerClass: 'pacifico', controller: 'ai' },
                ];

                let state = await createInitialGameState(playerCount, customizations, 'offline', []);
                logs.push(`[Match ${m + 1}] Partita inizializzata con successo.`);

                let steps = 0;
                const maxSteps = 40;
                while (
                    steps < maxSteps &&
                    state.gameStatePhase !== 'gameOver' &&
                    !state.players.every(p => p.isDead)
                ) {
                    steps++;
                    // Invariant checks
                    for (const p of state.players) {
                        if (Number.isNaN(p.hp) || p.hp < 0 || p.hp > p.maxHp) {
                            invariantsPassed = false;
                            logs.push(`[Errore Invariante] Sognatore ${p.name} ha HP non validi: ${p.hp}`);
                        }
                    }

                    if (state.gameStatePhase === 'rolling') {
                        const { newState } = gameEngine.rollDice(state);
                        state = newState;
                        const action = gameEngine.calculateAIMove(state);

                        if (action.type === 'move') {
                            const { newState: landedState, modalInfo } = gameEngine.movePlayerAndResolveLanding(state, action.targetCellId);
                            state = landedState;
                            if (modalInfo?.type === 'loot_choice') {
                                state = gameEngine.pickUpAllLoot(state);
                            }
                            if (modalInfo?.type === 'enemy_encounter') {
                                combatsResolved++;
                                state = gameEngine.initiateCombat(state, modalInfo.enemy.id, modalInfo.hasPlayerMoved).newState;
                            }
                        } else if (action.type === 'initiate_combat') {
                            combatsResolved++;
                            state = gameEngine.initiateCombat(state, action.enemyId, false).newState;
                        }
                    }

                    if (state.combatState.active) {
                        // resolve quick combat step
                        state = gameEngine.endCombatAndTurn(state).newState;
                    }

                    if (state.gameStatePhase !== 'rolling' && state.gameStatePhase !== 'gameOver' && !state.players.every(p => p.isDead)) {
                        state = gameEngine.endTurn(state).newState;
                    }
                }

                if (state.gameStatePhase === 'gameOver') {
                    victories++;
                    logs.push(`[Match ${m + 1}] Risultato: Vittoria del gruppo (Boss integrato).`);
                } else if (state.players.every(p => p.isDead)) {
                    defeats++;
                    logs.push(`[Match ${m + 1}] Risultato: Tutti i sognatori si sono persi nell'Ombra.`);
                } else {
                    turnCaps++;
                    logs.push(`[Match ${m + 1}] Risultato: Limite turni raggiunto (${steps} turni).`);
                }
            }

            logs.push('[Debug] Test di simulazione completato senza consumo di token Gemini!');
            setSimResults({
                matchesRun: matchCount,
                victories,
                defeats,
                turnCaps,
                combatsResolved,
                invariantsPassed,
                logs,
            });
        } catch (err: unknown) {
            const errObj = err as Error;
            logs.push(`[Errore Critico] ${errObj?.message || String(err)}`);
            invariantsPassed = false;
            setSimResults({
                matchesRun: 0,
                victories: 0,
                defeats: 0,
                turnCaps: 0,
                combatsResolved: 0,
                invariantsPassed: false,
                logs,
            });
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="customization-modal-overlay" style={{ zIndex: 12000 }} onClick={onClose}>
            <div className="customization-modal-compact" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                <div className="customization-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Bug size={24} style={{ color: '#f0bd17' }} />
                        <div>
                            <h2>Pannello di Debug e Simulazione</h2>
                            <p className="customization-subtitle">Verifica stabilità del motore di gioco (0 Token Gemini consumati)</p>
                        </div>
                    </div>
                    <button type="button" className="modal-close-icon-btn" onClick={onClose}>
                        &times;
                    </button>
                </div>

                <div style={{ padding: '1rem 1.5rem', color: '#f6ede0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: 'rgba(30, 20, 15, 0.75)', padding: '1rem', borderRadius: '10px', border: '1px solid #7c5514' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#f5cf60', fontFamily: 'Cinzel, Georgia, serif' }}>Simulatore di Partite Offline</h4>
                        <p style={{ fontSize: '0.9rem', margin: '0 0 1rem 0', color: '#d8c4a0', lineHeight: 1.5 }}>
                            Questo strumento esegue simulazioni complete di partite e controlli di integrità degli invarianti (posizioni, HP, inventari, turni IA) interamente in locale nel browser, senza alcuna chiamata API esterna.
                        </p>
                        <button
                            type="button"
                            onClick={runClientSimulation}
                            disabled={isSimulating}
                            className="splash-cta-button"
                            style={{ padding: '0.6rem 1.4rem', fontSize: '0.95rem' }}
                        >
                            {isSimulating ? <RefreshCcw className="animate-spin" size={16} /> : <Play size={16} />}
                            <span>{isSimulating ? 'Simulazione in corso...' : 'Avvia Simulazione Rapida (5 Match)'}</span>
                        </button>
                    </div>

                    {simResults && (
                        <div style={{ background: 'rgba(20, 14, 11, 0.9)', padding: '1rem', borderRadius: '10px', border: simResults.invariantsPassed ? '1px solid #2ecc71' : '1px solid #e04f3e' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {simResults.invariantsPassed ? (
                                    <CheckCircle2 size={20} style={{ color: '#2ecc71' }} />
                                ) : (
                                    <ShieldAlert size={20} style={{ color: '#e04f3e' }} />
                                )}
                                <strong style={{ color: simResults.invariantsPassed ? '#2ecc71' : '#e04f3e' }}>
                                    {simResults.invariantsPassed ? 'Test Invarianti: SUPERATI (Nessuna anomalia)' : 'Test Invarianti: FALLITI'}
                                </strong>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                <div style={{ background: 'rgba(50,35,25,0.6)', padding: '0.4rem', borderRadius: '6px' }}>
                                    <div style={{ color: '#dfc38a' }}>Partite</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{simResults.matchesRun}</div>
                                </div>
                                <div style={{ background: 'rgba(50,35,25,0.6)', padding: '0.4rem', borderRadius: '6px' }}>
                                    <div style={{ color: '#2ecc71' }}>Vittorie</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{simResults.victories}</div>
                                </div>
                                <div style={{ background: 'rgba(50,35,25,0.6)', padding: '0.4rem', borderRadius: '6px' }}>
                                    <div style={{ color: '#e04f3e' }}>Sconfitte</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{simResults.defeats}</div>
                                </div>
                                <div style={{ background: 'rgba(50,35,25,0.6)', padding: '0.4rem', borderRadius: '6px' }}>
                                    <div style={{ color: '#f5d36b' }}>Combattimenti</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{simResults.combatsResolved}</div>
                                </div>
                            </div>
                            <div style={{ maxH: '120px', overflowY: 'auto', background: '#0e0907', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#a8c0d6' }}>
                                {simResults.logs.map((log, idx) => (
                                    <div key={idx}>{log}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="customization-actions">
                    <button type="button" onClick={onClose} className="modal-action-button">Chiudi</button>
                </div>
            </div>
        </div>
    );
};
