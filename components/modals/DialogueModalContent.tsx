import React, { useState, useEffect, useRef } from 'react';
import type { GameState, ModalInfo, Enemy } from '../../gameLogic';
import * as gameEngine from '../../game/engine';
import { getDialogueResponse, prepareDialogueAI, getRecomposedDialogueResponse } from '../../game/master';
import { ENEMY_TYPE_NAMES } from '../../game/constants';
import { preloadedAssets } from '../../assets/preloadedAssets';

interface DialogueModalContentProps {
    // FIX: Narrow the ModalInfo type to what this component actually receives.
    modalInfo: Extract<ModalInfo, { type: 'dialogue' }>;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    setModalInfo: React.Dispatch<React.SetStateAction<ModalInfo | null>>;
    onChoice: (enemyId: number, choice: 'talk' | 'fight') => void;
    onDialogueFail: (enemyId: number) => void;
    trustLevel: string;
}

interface DialogueTurn {
    speaker: 'player' | 'enemy';
    text: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
}

const RAPPORT_WIN_THRESHOLD = 10;
const RAPPORT_FAIL_THRESHOLD = -5;

const AnimaFragment: React.FC<{ score: number }> = ({ score }) => {
    const [flash, setFlash] = useState<'increase' | 'decrease' | null>(null);
    const prevScoreRef = useRef(score);

    useEffect(() => {
        if (score > prevScoreRef.current) {
            setFlash('increase');
        } else if (score < prevScoreRef.current) {
            setFlash('decrease');
        }
        prevScoreRef.current = score;
        
        if (flash) {
            const timer = setTimeout(() => setFlash(null), 500); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [score, flash]);

    const getImageAndAnimation = () => {
        let tooltipText = "L'entità è instabile e diffidente. Ogni parola è cruciale.";
        
        if (score >= RAPPORT_WIN_THRESHOLD) {
            tooltipText = "L'incubo è stato ricomposto in un sogno sereno.";
            return { src: preloadedAssets.dialogueCrystal.on, animClass: 'pulse-calm', tooltipText };
        }
        if (score > 5) {
             tooltipText = "L'incubo sembra placarsi. Le tue parole lo stanno raggiungendo.";
            return { src: preloadedAssets.dialogueCrystal.on, animClass: 'pulse-calm', tooltipText };
        }
        if (score > 0) {
            tooltipText = "L'entità mostra i primi segni di calma.";
            return { src: preloadedAssets.dialogueCrystal.on, animClass: 'pulse-calm', tooltipText };
        }
        if (score <= RAPPORT_FAIL_THRESHOLD) {
            tooltipText = "L'anima dell'incubo si è infranta nella rabbia!";
            return { src: preloadedAssets.dialogueCrystal.irritated, animClass: 'pulse-erratic', tooltipText }; // Shattered state can use irritated crystal
        }
        if (score < 0) {
            tooltipText = "L'incubo è irritato. La sua sofferenza si sta trasformando in rabbia.";
            return { src: preloadedAssets.dialogueCrystal.irritated, animClass: 'pulse-erratic', tooltipText };
        }
        
        return { src: preloadedAssets.dialogueCrystal.off, animClass: 'pulse-uneasy', tooltipText }; // Neutral
    };

    const { src, animClass, tooltipText } = getImageAndAnimation();
    const flashClass = flash === 'increase' ? 'flash-gold' : flash === 'decrease' ? 'flash-red' : '';
    
    return (
        <div className="dialogue-header-center" title={tooltipText}>
            <img 
                src={src} 
                className={`anima-fragment ${animClass} ${flashClass}`} 
                alt="Frammento d'Anima" 
            />
        </div>
    );
};


export const DialogueModalContent: React.FC<DialogueModalContentProps> = ({ modalInfo, setGameState, setModalInfo, onChoice, onDialogueFail, trustLevel }) => {
    const enemy = modalInfo.enemy;
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState<DialogueTurn[]>([]);
    const [playerInput, setPlayerInput] = useState('');
    const [aiProfile, setAiProfile] = useState<any>(null);
    const [rapportScore, setRapportScore] = useState(0);
    const [isWon, setIsWon] = useState(false);
    const [lastTurnInfo, setLastTurnInfo] = useState<{ score: number; reasoning: string } | null>(null);
    const chatEndRef = useRef<null | HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    // FIX: Removed incorrect access to `modalInfo.player`. The current player is always derived from the game state.
    const player = gameEngine.getLatestState().players[gameEngine.getLatestState().currentPlayerIndex];


    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [history]);

    // Auto-focus input when loading finishes or component mounts
    useEffect(() => {
        if (!isLoading) {
            // Small timeout to allow DOM updates before focusing
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isLoading]);

    useEffect(() => {
        const initDialogue = async () => {
             // Set initial rapport based on trust
            let initialRapport = 0;
            switch(trustLevel) {
                case 'amichevole': initialRapport = 1; break;
                case 'alleato': initialRapport = 2; break;
                case 'diffidenti': initialRapport = -1; break;
                case 'ostili': initialRapport = -2; break;
            }
            setRapportScore(initialRapport);
            
            const gameState = gameEngine.getLatestState();
            const shadowOwner = gameState.players.find(p => p.id === enemy.ownerId);
            const ownerProfile = shadowOwner?.psychologicalProfile || null;

            const profile = await prepareDialogueAI(enemy, ownerProfile);
            if (profile) {
                setAiProfile(profile);
                setHistory([{ speaker: 'enemy', text: profile.initialLament, sentiment: 'neutral' }]);
            } else {
                // FALLBACK: Se l'IA fallisce nel generare il profilo, forza il combattimento con il titolo corretto
                setModalInfo({ type: 'info', title: 'Connessione Ombra Fallita!', message: 'L\'Ombra è troppo densa per comunicare. Si prepara a respingerti!', enemy: enemy, hasPlayerMoved: modalInfo.hasPlayerMoved });
            }
            setIsLoading(false);
        };
        initDialogue();
    }, [enemy, setModalInfo, modalInfo.hasPlayerMoved, trustLevel]);

    const handleCloseWonDialogue = () => {
        setGameState(gs => {
            const { newState, modalInfo } = gameEngine.recomposeEnemy(gs, enemy.id);
            setModalInfo(modalInfo);
            return newState;
        });
    };

    const handleSend = async () => {
        if (!playerInput.trim() || isLoading) return;

        const newHistory: DialogueTurn[] = [...history, { speaker: 'player', text: playerInput }];
        setHistory(newHistory);
        setPlayerInput('');
        setIsLoading(true);

        if (isWon) {
            // Post-victory conversation
            const response = await getRecomposedDialogueResponse(enemy, newHistory, aiProfile);
            if (response) {
                setHistory(prev => [...prev, { speaker: 'enemy', text: response.nextLine, sentiment: 'positive' }]);
            } else {
                setHistory(prev => [...prev, { speaker: 'enemy', text: "...", sentiment: 'neutral' }]);
            }
            setIsLoading(false);
        } else {
            // Pre-victory dialogue logic
            const gameState = gameEngine.getLatestState();
            const shadowOwner = gameState.players.find(p => p.id === enemy.ownerId);
            const ownerProfile = shadowOwner?.psychologicalProfile || null;

            const response = await getDialogueResponse(enemy, newHistory, aiProfile, ownerProfile);
            
            if (!response) {
                setHistory(prev => [...prev, { speaker: 'enemy', text: "...", sentiment: 'neutral' }]);
                setTimeout(() => {
                    // FALLBACK: Se l'IA fallisce nel generare la risposta, forza il combattimento con il titolo corretto
                    setModalInfo({ type: 'info', title: 'Dialogo Fallito!', message: 'L\'Ombra ruggisce in un linguaggio incomprensibile. Il rimosso diventa furia cieca!', enemy: enemy, hasPlayerMoved: modalInfo.hasPlayerMoved });
                }, 2000);
                return;
            }

            const { nextLine, empathyScore, reasoning } = response;
            
            // Determine Sentiment for Color Coding
            let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
            if (empathyScore >= 7) sentiment = 'positive';
            else if (empathyScore <= 3) sentiment = 'negative';

            setHistory(prev => [...prev, { speaker: 'enemy', text: nextLine, sentiment }]);
            setLastTurnInfo({ score: empathyScore, reasoning: reasoning });
            
            // Dynamic Difficulty based on HP
            const hpPercent = enemy.hp / enemy.maxHp;
            const isArrogant = hpPercent > 0.5; // Healthy = Arrogant
            
            let finalChange = 0;

            if (empathyScore <= 3) {
                // Low Score (1-3): Aggressive/Banal
                finalChange = isArrogant ? -3 : -2; 
            } else if (empathyScore >= 4 && empathyScore <= 6) {
                // Mid Score (4-6): Abstract/Vague -> Now Penalized
                finalChange = isArrogant ? -2 : -1;
            } else if (empathyScore >= 7) {
                // High Score (7-10): Detective/Sensory
                // Bonus is smaller if enemy is arrogant (harder to convince)
                if (empathyScore === 7 || empathyScore === 8) finalChange = isArrogant ? 2 : 3;
                if (empathyScore >= 9) finalChange = isArrogant ? 3 : 4;
            }
            
            const newRapportScore = Math.max(RAPPORT_FAIL_THRESHOLD, Math.min(RAPPORT_WIN_THRESHOLD, rapportScore + finalChange));
            setRapportScore(newRapportScore);

            if (newRapportScore <= RAPPORT_FAIL_THRESHOLD) {
                setIsLoading(true);
                setTimeout(() => {
                    onDialogueFail(enemy.id);
                }, 3000);
            } else if (newRapportScore >= RAPPORT_WIN_THRESHOLD) {
                setIsLoading(false); // Keep input enabled
                setIsWon(true);
                setHistory(prev => [...prev, { speaker: 'enemy', text: "L'immagine distorta si dissolve... Vedo me stessa. Ti vedo. Grazie per non aver voltato lo sguardo.", sentiment: 'positive' }]);
            } else {
                setIsLoading(false);
            }
        }
    };

    const renderFooter = () => {
        return (
             <div className="dialogue-input-area">
                <textarea
                    ref={inputRef}
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    placeholder="Scrivi la tua risposta..."
                    rows={2}
                    disabled={isLoading}
                    onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button onClick={handleSend} disabled={isLoading || !playerInput.trim()} className="modal-action-button confirm">
                    Parla
                </button>
                {isWon ? (
                    <button onClick={handleCloseWonDialogue} className="modal-action-button">
                        Congedati
                    </button>
                ) : (
                    <button onClick={() => onChoice(enemy.id, 'fight')} disabled={isLoading} className="modal-action-button">
                        Entra in Risonanza
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="dialogue-container">
            <div className="dialogue-header">
                <div className="dialogue-header-info player-info">
                    <img src={player.avatar} alt={player.name} className="dialogue-avatar" />
                    <div className="dialogue-name-class">
                        <h4>{player.name}</h4>
                        <span>{player.class.charAt(0).toUpperCase() + player.class.slice(1)}</span>
                    </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <AnimaFragment score={rapportScore} />
                    <span style={{fontWeight: 'bold', marginTop: '5px', fontSize: '0.9rem', color: rapportScore < 0 ? '#c0392b' : '#2980b9'}}>
                        Rapporto: {rapportScore > 0 ? '+' : ''}{rapportScore}
                    </span>
                </div>
                <div className="dialogue-header-info enemy-info">
                     <div className="dialogue-name-class">
                        <h4>{enemy.name}</h4>
                        <span>{isWon ? 'Sogno Ricomposto' : ENEMY_TYPE_NAMES[enemy.enemyType].singular}</span>
                     </div>
                     <img src={enemy.avatar} alt={enemy.name} className="dialogue-avatar" />
                </div>
            </div>
            
            <details className="archaeologist-journal">
                <summary>
                    <span>Diario dell'Archeologo · Analisi Emotiva</span>
                    <span className="tabular-nums">Voto Empatia: {lastTurnInfo ? `${lastTurnInfo.score}/10` : '—'}</span>
                </summary>
                <div className="archaeologist-journal-body">
                    {lastTurnInfo && (
                        <p className="journal-reasoning">
                            <em>Nota di risonanza: "{lastTurnInfo.reasoning}"</em>
                        </p>
                    )}
                    {aiProfile ? (
                        <div className="journal-profile-grid">
                            <p><strong>Identità Originaria:</strong> {aiProfile.humanIdentity}</p>
                            <p><strong>Origine:</strong> {aiProfile.originLocation} ({aiProfile.originEra})</p>
                            <p><strong>Trauma:</strong> {aiProfile.tragicEvent}</p>
                            <p><strong>Bisogno Nascosto:</strong> {aiProfile.hiddenNeed}</p>
                            <p><strong>Dettagli Sensoriali:</strong> {aiProfile.sensoryDetails.join(', ')}</p>
                        </div>
                    ) : (
                        <p className="journal-loading">Decifrazione frammento onirico in corso...</p>
                    )}
                </div>
            </details>

            <div className="dialogue-history">
                {history.map((turn, index) => (
                    <div key={index} className={`dialogue-turn ${turn.speaker} ${turn.sentiment || ''}`}>
                        <p>{turn.text}</p>
                    </div>
                ))}
                 {isLoading && <div className="dialogue-turn enemy"><p><i>...</i></p></div>}
                 <div ref={chatEndRef} />
            </div>
            {renderFooter()}
        </div>
    );
};