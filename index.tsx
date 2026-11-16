import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Flame,
  AlertTriangle,
  Scale,
  HeartHandshake,
  Crown,
  Menu,
  Maximize2,
  Minimize2,
  Eye,
  Crosshair,
  X,
} from 'lucide-react';

// Component Imports
import { SplashScreen } from './components/SplashScreen';
import { SelectionScreen, GameSettings } from './components/SelectionScreen';
import { CustomizationModal } from './components/CustomizationModal';
import { LoadingScreen } from './components/LoadingScreen';
import { ContextMenu, ContextMenuProps } from './components/ContextMenu';
import { KeyDisplay } from './components/KeyDisplay';
import { DiceUpgradeModal } from './components/DiceUpgradeModal';
import { ModalWrapper } from './components/ModalWrapper';
import { Board3D, ActivePawnMove } from './components/Board3D';
import { PlayerCard3D, PlayerCardBackTab } from './components/cards/PlayerCard3D';
import { DebugPanelModal } from './components/DebugPanelModal';

// Modal Content Components
import { InfoModalContent } from './components/modals/InfoModalContent';
import { LootModalContent } from './components/modals/LootModalContent';
import { SwapConfirmationModalContent } from './components/modals/SwapConfirmationModalContent';
import { CombatModalContent } from './components/modals/CombatModalContent';
import { MerchantModalContent } from './components/modals/MerchantModalContent';
import { StashModalContent } from './components/modals/StashModalContent';
import { QuestModalContent } from './components/modals/QuestModalContent';
import { DialogueModalContent } from './components/modals/DialogueModalContent';
import { EnemyEncounterModalContent } from './components/modals/EnemyEncounterModalContent';
import { SpecialSquareCardContent } from './components/modals/SpecialSquareCardContent';
import { TreasureCardContent } from './components/modals/TreasureCardContent';
import { MenuModalContent } from './components/modals/MenuModalContent';
import { RulesModalContent } from './components/modals/RulesModalContent';


// Game Logic & Type Imports
import type { GameState, ModalInfo, Weapon, PlayerCustomization, Consumable, Enemy, MagicSpell, KeyColor } from './gameLogic';
import * as gameEngine from './game/engine';
import { PLAYER_START_POSITIONS, ENEMY_TYPE_NAMES } from './game/constants';
import { initialGameState, createInitialGameState } from './game/initialState';
import { PsychologicalTest } from './components/PsychologicalTest';

// UI & Asset Imports
export const GITHUB_ASSETS_BASE_URL = 'https://raw.githubusercontent.com/vincenzoaiello/competo-assets/main/';
import { showDiceRoll } from './ui';
import { preloadedAssets } from './assets/preloadedAssets';
import { AudioManager } from './services/AudioManager';

const App = () => {
  const AI_THINK_DELAY = 1500; // ms

  const [view, setView] = useState<'splash' | 'selection' | 'test' | 'loading' | 'game'>('splash');
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [playerCustomizations, setPlayerCustomizations] = useState<PlayerCustomization[]>([]);
  const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [backTabState, setBackTabState] = useState<Record<number, PlayerCardBackTab | null>>({});
  const [contextMenuInfo, setContextMenuInfo] = useState<ContextMenuProps | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [hpSacrificeAmount, setHpSacrificeAmount] = useState(1);
  const [toastInfo, setToastInfo] = useState<{ message: string; id: number } | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const previousKeysRef = useRef<GameState['keys']>(gameState.keys); // for key notifications
  const previousTrustLevelRef = useRef<string>(gameState.trustLevel); // for trust notifications
  const modalTokenRef = useRef(0);
  const modalInfoRef = useRef<ModalInfo | null>(null);
  modalInfoRef.current = modalInfo;

  useEffect(() => {
    if (modalInfo) {
      modalTokenRef.current += 1;
      setIsModalClosing(false);
      if (modalInfo.type === 'hp_sacrifice_choice') {
        setHpSacrificeAmount(1);
      }
    }
  }, [modalInfo]);

  // --- STATO PER ANIMAZIONE 3D ---
  const [isAnimating, setIsAnimating] = useState(false); // Usato per animazioni di movimento e turni IA
  const [activePawnMove, setActivePawnMove] = useState<ActivePawnMove | null>(null);
  const [isGameReady, setIsGameReady] = useState(false);

  const playerColorHex: Record<string, string> = {
    red: '#c0392b',
    yellow: '#f1c40f',
    white: '#aeb6bf',
    black: '#2c3e50',
  };


  // --- App Flow ---
  const handleSplashClick = () => {
    document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Errore nell'attivare la modalità schermo intero: ${err.message} (${err.name})`);
    });
    // Initialize AudioContext on first user interaction
    AudioManager.initialize();
    setView('selection');
  };

  const handleSettingsConfirm = (settings: GameSettings) => {
    AudioManager.setAudioEnabled(settings.audio);
    setGameSettings(settings);
    setShowCustomization(true);
  };

  const handleCustomizationConfirm = (customizations: PlayerCustomization[]) => {
      console.log("Customization confirmed, moving to Psychological Test view");
      setPlayerCustomizations(customizations);
      setShowCustomization(false);
      setView('test');
  };

  const handlePsychologicalTestComplete = async (profiles: string[]) => {
      console.log("Psychological Test complete, profiles generated:", profiles.length);
      if (!gameSettings) {
          console.error("Missing game settings during initialization");
          return;
      }
      setView('loading');
      
      try {
        const newGameState = await createInitialGameState(gameSettings.players, playerCustomizations, gameSettings.mode, profiles);
        setGameState(newGameState);
        setView('game');
      } catch (error) {
          console.error("Failed to initialize game:", error);
          setToastInfo({ message: "Errore nell'inizializzazione del Sogno. Riprova a configurare la partita.", id: Date.now() });
          setView('selection');
      }
  };

  // --- Game Actions ---
  const handleRollDice = async () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isDead || isAnimating || currentPlayer.controller === 'ai') return;

    setGameState(gs => {
        const { newState, roll } = gameEngine.rollDice(gs);
        showDiceRoll([roll], `Lancio per ${currentPlayer.name}...`, playerColorHex[currentPlayer.color]);
        return newState;
    });
  };

  const handleEndTurn = () => {
    if (isAnimating) return;
    setGameState(gs => {
        const { newState, modalInfo: turnModal, audioAnnouncement } = gameEngine.endTurn(gs);
        if (turnModal) {
            setModalInfo(turnModal);
        }
        if (audioAnnouncement) {
            AudioManager.playAnnouncement(audioAnnouncement);
        }
        return newState;
    });
    setBackTabState({});
  };

  const handleMoveAnimationComplete = (finalTargetId: number) => {
    setActivePawnMove(null);
    setGameState(gs => {
        const { newState, modalInfo: landingModalInfo, audioAnnouncement, levelUpInfo } = gameEngine.movePlayerAndResolveLanding(gs, finalTargetId);
        if (landingModalInfo) {
            if (audioAnnouncement) {
                AudioManager.playAnnouncement(audioAnnouncement);
            }
            setModalInfo(landingModalInfo);
        } else if (audioAnnouncement) {
            AudioManager.playAnnouncement(audioAnnouncement);
        }
        if (levelUpInfo) {
            setToastInfo({ message: `${levelUpInfo.playerName} è salito al Livello ${levelUpInfo.newLevel}!`, id: Date.now() });
        }
        return newState;
    });
    setIsAnimating(false);
  };

  const startPawnMoveAnimation = (playerId: number, path: number[], finalTargetId: number) => {
    setIsAnimating(true);
    setActivePawnMove({
        pawnKey: `player_${playerId}`,
        path,
        targetCellId: finalTargetId,
    });
  };

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const handleCellClick = (cellId: number | undefined) => {
    if (!cellId || isAnimating) return;

    if (gameState.gameStatePhase === 'spell_target_enemy' || gameState.gameStatePhase === 'spell_target_cell') {
        if (gameEngine.isMoveValid(gameState, cellId)) {
            setGameState(gs => {
                const { newState, modalInfo, audioAnnouncement } = gameEngine.applySpellEffectToTarget(gs, cellId);
                if (modalInfo) setModalInfo(modalInfo);
                if (audioAnnouncement) AudioManager.playAnnouncement(audioAnnouncement);
                return newState;
            });
        }
        return;
    }

    if (gameState.gameStatePhase === 'cell_inspection') {
        setGameState(gs => gameEngine.inspectCell(gs, cellId));
        immediateCloseModal();
        setToastInfo({ message: `Casella ${cellId} rivelata dall'Intuizione.`, id: Date.now() });
        return;
    }

    if (Object.values(PLAYER_START_POSITIONS).includes(cellId) && !gameEngine.isMoveValid(gameState, cellId)) {
        setModalInfo({
            type: 'shared_stash',
            title: 'Cassa Condivisa della Squadra',
        });
        return;
    }

    if (!gameEngine.isMoveValid(gameState, cellId)) return;

    const path = gameEngine.findShortestPath(currentPlayer.position, cellId, gameState.gates);
    if (path && path.length >= 2) {
        startPawnMoveAnimation(currentPlayer.id, path, cellId);
    } else {
        setIsAnimating(true);
        handleMoveAnimationComplete(cellId);
    }
  };

  const immediateCloseModal = () => {
    modalTokenRef.current += 1;
    setIsModalClosing(false);
    setModalInfo(null);
  };

  const closeModal = () => {
    if (isModalClosing) return;

    const closingToken = ++modalTokenRef.current;
    const closingModal = modalInfoRef.current;
    setIsModalClosing(true);
    setTimeout(() => {
        if (modalTokenRef.current !== closingToken) return;
        if (closingModal && ['loot_choice', 'merchant', 'quest_offer', 'mage_encounter', 'swap_confirmation', 'titan_encounter', 'dialogue', 'enemy_encounter', 'treasure_reveal', 'special_square_reveal'].includes(closingModal.type)) {
            setGameState(gs => gameEngine.shouldPreservePhaseOnModalClose(gs.gameStatePhase) ? gs : { ...gs, gameStatePhase: 'end_turn' });
        }
        setModalInfo(null);
        setIsModalClosing(false);
    }, 300);
  };

  const handleSetPlayerBackTab = (playerId: number, tab: PlayerCardBackTab | null) => {
    if (tab === 'inventory') {
        setGameState(gs => {
            const newPlayers = [...gs.players];
            const player = newPlayers.find(p => p.id === playerId);
            if (player && player.hasNewItem) {
                player.hasNewItem = false;
                return { ...gs, players: newPlayers };
            }
            return gs;
        });
    }

    setBackTabState(prev => {
        if (tab === null) {
            return { ...prev, [playerId]: null };
        }
        return { [playerId]: tab };
    });
  };

  const handleLootItemSelect = (item: gameEngine.WorldItem) => {
    setGameState(gs => {
      const { newState, modalInfo } = gameEngine.pickUpWorldItem(gs, item.id);
      if (modalInfo) {
        setModalInfo(modalInfo);
      }
      return newState;
    });
  };

  const handleLootAll = () => {
      setGameState(gs => gameEngine.pickUpAllLoot(gs));
  };

  const handleSwapConfirm = (itemId: string) => {
      setGameState(gs => gameEngine.swapWeaponWithWorldItem(gs, itemId));
      setModalInfo(null);
  };

  const handlePurchaseItem = (item: Weapon | Consumable | MagicSpell, merchantId: number) => {
    setGameState(gs => {
        const { newState, success, message } = gameEngine.purchaseItemFromMerchant(gs, item, merchantId);
        setModalInfo({
            type: 'info',
            title: success ? 'Acquisto Effettuato' : 'Acquisto Fallito',
            message: message
        });
        return newState;
    });
  };

  const handleToggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
              setToastInfo({ message: 'Modalità schermo intero non consentita dal browser in questo riquadro.', id: Date.now() });
          });
      } else {
          if (document.exitFullscreen) {
              document.exitFullscreen();
          }
      }
  };

  const handleAcceptQuest = (npcId: number) => {
    setGameState(gs => {
        const { newState, modalInfo: resultModal, audioAnnouncement } = gameEngine.acceptQuest(gs, npcId);
        setModalInfo(resultModal);
        if (audioAnnouncement) {
            AudioManager.playAnnouncement(audioAnnouncement);
        }
        return newState;
    });
  };

  const handleApplyDiceUpgrade = (type: 'attack' | 'defense', dieId: number, upgradeType: 'add_hit' | 'promote_crit') => {
    setGameState(gs => gameEngine.applyDiceUpgrade(gs, type, dieId, upgradeType));
    const player = gameEngine.getLatestState().players[gameState.currentPlayerIndex];
    if (player.pendingUpgrades === 0) {
        setIsUpgradeModalOpen(false);
    }
  };

  const handleEngageTitan = () => {
    setModalInfo(null);
    setGameState(gs => {
        const { newState } = gameEngine.engageWanderingTitan(gs);
        return newState;
    });
  };

    const handleDialogueChoice = (enemyId: number, choice: 'talk' | 'fight') => {
        if (choice === 'fight') {
            setGameState(gs => {
                if (modalInfo?.type === 'dialogue') {
                    // FIX: Removed extra argument 'dialogue_abandon' from initiateCombat call.
                    const { newState } = gameEngine.initiateCombat(gs, enemyId, modalInfo.hasPlayerMoved);
                    return newState;
                }
                return gs;
            });
        }
        // La logica per 'talk' è gestita all'interno di DialogueModalContent
    };
    
    const handleDialogueFailure = (enemyId: number) => {
        setGameState(gs => {
            if (modalInfo?.type === 'dialogue') {
                const { newState, modalInfo: resultModal } = gameEngine.handleDialogueFailure(gs, enemyId, modalInfo.hasPlayerMoved);
                setModalInfo(resultModal);
                return newState;
            }
            return gs;
        });
    };


  // --- Combat Actions ---
  const handleStartAttackRolls = () => {
    setGameState(gs => {
        if(modalInfo?.type === 'mage_encounter' && modalInfo.enemy){
            const { newState: initiatedState } = gameEngine.initiateCombat(gs, modalInfo.enemy.id, true);
            const { newState: finalState } = gameEngine.startAttackRolls(initiatedState);
            return finalState;
        }
        const { newState } = gameEngine.startAttackRolls(gs);
        return newState;
    });
  };

  const handleStartDefenseRolls = () => {
    setGameState(gs => gameEngine.startDefenseRolls(gs));
  };
  
  const handleApplyCombatResults = () => {
    setGameState(gs => gameEngine.applyCombatResults(gs));
  };
  
  const handleResolveCombatRound = () => {
     setGameState(gs => {
        const { newState, modalInfo: resultModal } = gameEngine.resolveCombatRound(gs);
        if (resultModal) {
          setModalInfo(resultModal);
        }
        return newState;
    });
  };
  
  const handleEndCombatTurn = () => {
    setGameState(gs => {
        const {newState, modalInfo: endTurnModal } = gameEngine.endCombatAndTurn(gs);
        if(endTurnModal){
            setModalInfo(endTurnModal);
        } else {
            setModalInfo(null);
        }
        return newState;
    });
  };

  const handleFlee = (hasPlayerMoved: boolean) => {
      setGameState(gs => {
          const { newState, modalInfo: resultModal } = gameEngine.attemptFlee(gs, hasPlayerMoved);
          setModalInfo(resultModal);
          return newState;
      });
  };

  // --- Stash Actions ---
    const handleDepositItem = (inventoryIndex: number) => {
        setGameState(gs => gameEngine.depositToStash(gs, inventoryIndex));
    };

    const handleWithdrawItem = (stashIndex: number) => {
        setGameState(gs => gameEngine.withdrawFromStash(gs, stashIndex));
    };

    const handleMoveItem = (source: gameEngine.ItemLocation, destination: gameEngine.ItemLocation) => {
        setGameState(gs => gameEngine.moveItem(gs, source, destination));
    };
    
    // --- Consumable Actions ---
    const handleUseConsumable = (playerId: number, inventoryIndex: number) => {
        setGameState(gs => {
            const { newState, modalInfo: resultModal, audioAnnouncement } = gameEngine.useConsumable(gs, playerId, inventoryIndex);
            if (resultModal) {
                setModalInfo(resultModal);
            }
            if (audioAnnouncement) {
                AudioManager.playAnnouncement(audioAnnouncement);
            }
            return newState;
        });
    };

    // --- Magic Spell Actions ---
    const handleCastSpell = (playerId: number, spellId: string) => {
        setGameState(gs => {
            const { newState, modalInfo: resultModal, audioAnnouncement } = gameEngine.castSpell(gs, playerId, spellId);
             if (resultModal) {
                setModalInfo(resultModal);
            }
            if (audioAnnouncement) {
                AudioManager.playAnnouncement(audioAnnouncement);
            }
            return newState;
        });
    };
    
    // --- Encounter Actions ---
    const handleChooseToTalk = (enemy: Enemy, hasPlayerMoved: boolean) => {
        setModalInfo({ type: 'dialogue', title: `Parli con ${enemy.name}`, enemy, hasPlayerMoved });
    };

    const handleChooseToFight = (enemy: Enemy, hasPlayerMoved: boolean) => {
        setGameState(gs => {
            const { newState } = gameEngine.initiateCombat(gs, enemy.id, hasPlayerMoved);
            return newState;
        });
        setModalInfo(null);
    };


  // Effect to manage combat start and updates
  useEffect(() => {
    if (gameState.gameStatePhase === 'combat' && gameState.combatState.active) {
      const enemy = gameState.enemies.find(e => e.id === gameState.combatState.enemyId);
      if (!enemy) return;

      setModalInfo(prevModal => {
        // Aggiorna o crea la modale di combattimento
        if (prevModal?.type === 'combat' && prevModal.enemy?.id === enemy.id) {
            return { ...prevModal, enemy: enemy };
        }
        return {
            type: 'combat',
            title: 'Entrare in Risonanza!',
            enemy: enemy,
            isContinuation: !gameState.combatState.hasPlayerMoved,
        };
      });
    } else if (
        gameState.gameStatePhase !== 'combat' && 
        gameState.gameStatePhase !== 'dialogue' && 
        modalInfo && (modalInfo.type === 'combat' || modalInfo.type === 'mage_encounter' || modalInfo.type === 'dialogue')
    ) {
        // Chiudi la modale se non siamo più in una fase che la richiede
        setModalInfo(null);
    }
  }, [gameState.gameStatePhase, gameState.combatState.active, gameState.combatState.enemyId, gameState.enemies]);

    // Effect to check for Game Over
    useEffect(() => {
        const allPlayersDead = gameState.players.every(p => p.isDead);
        if (allPlayersDead && gameState.players.length > 0 && modalInfo?.title !== 'Game Over') {
            const gameOverMessage = 'Tutti i giocatori sono stati sconfitti!';
            setModalInfo({ type: 'info', title: 'Game Over', message: gameOverMessage });
            AudioManager.playAnnouncement(gameOverMessage);
        }
    }, [gameState.players, modalInfo]);

    // Effect for Victory
    useEffect(() => {
        if (gameState.gameStatePhase === 'gameOver' && modalInfo?.title !== 'Vittoria!') {
            const winner = gameState.players.find(p => p.id === gameState.winner);
            const message = winner ? `La squadra ha vinto! ${winner.name} ha sferrato il colpo di grazia!` : 'La squadra ha trionfato!';
            setModalInfo({ type: 'info', title: 'Vittoria!', message: message });
            AudioManager.playAnnouncement(message);
        }
    }, [gameState.gameStatePhase, gameState.winner, modalInfo]);

    // Effect to track fullscreen state
    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // Effect to enable animations after initial game load
    useEffect(() => {
        if (view === 'game') {
            const timer = setTimeout(() => setIsGameReady(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsGameReady(false);
        }
    }, [view]);
    
    // Effect to sync the loot modal after an item has been picked up.
    useEffect(() => {
        if (modalInfo?.type === 'loot_choice') {
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            const itemsOnCell = gameState.worldItems.filter(item => item.position === currentPlayer.position && item.isVisible);
            if (itemsOnCell.length !== modalInfo.items?.length) {
                if (itemsOnCell.length > 0) {
                    setModalInfo(prev => ({ ...prev!, type: 'loot_choice', items: itemsOnCell }));
                } else {
                    closeModal(); // Close modal if all items are gone
                }
            }
        }
    }, [gameState.worldItems, modalInfo, gameState.players, gameState.currentPlayerIndex]);

    useEffect(() => {
        // Sync quest offer modal when AI generates quest
        if (modalInfo?.type === 'quest_offer') {
            const freshNpc = gameState.npcs.find(n => n.id === modalInfo.npc.id);
            // If the quest ID has changed from PENDING to a real ID, update the modal
            if (freshNpc && freshNpc.quest.id !== modalInfo.npc.quest.id) {
                setModalInfo({
                    ...modalInfo,
                    npc: freshNpc 
                });
            }
        }
    }, [gameState.npcs, modalInfo]);

     // --- AI TURN MANAGEMENT ---
    useEffect(() => {
        if (view !== 'game' || !currentPlayer || currentPlayer.controller !== 'ai' || gameState.gameStatePhase !== 'rolling' || isAnimating) {
            return;
        }

        const executeAITurn = async () => {
            setIsAnimating(true);
            let movedPawn = false;
            try {
                setGameState(gs => ({ ...gs, gameStatePhase: 'ai_turn' }));
                await new Promise(resolve => setTimeout(resolve, AI_THINK_DELAY));

                const latestSnapshot = gameEngine.getLatestState();
                const { newState: rolledState, roll } = gameEngine.rollDice(latestSnapshot);
                setGameState(rolledState);

                const aiActor = rolledState.players[rolledState.currentPlayerIndex];
                await showDiceRoll([roll], `L'IA ${aiActor.name} lancia il dado...`, playerColorHex[aiActor.color]);
                await new Promise(resolve => setTimeout(resolve, 450));

                const action = gameEngine.calculateAIMove(rolledState);
                if (action.type === 'move') {
                    const path = gameEngine.findShortestPath(aiActor.position, action.targetCellId, rolledState.gates);
                    if (path && path.length >= 2) {
                        movedPawn = true;
                        startPawnMoveAnimation(aiActor.id, path, action.targetCellId);
                    } else {
                        setGameState(gs => ({ ...gs, gameStatePhase: 'end_turn' }));
                    }
                } else if (action.type === 'use_consumable') {
                    handleUseConsumable(aiActor.id, action.inventoryIndex);
                    setGameState(gs => ({ ...gs, gameStatePhase: 'end_turn' }));
                } else if (action.type === 'initiate_combat') {
                    setGameState(gs => gameEngine.initiateCombat(gs, action.enemyId, false).newState);
                } else if (action.type === 'attack') {
                    handleStartAttackRolls();
                } else {
                    setGameState(gs => ({ ...gs, gameStatePhase: 'end_turn' }));
                }
            } catch (err) {
                console.error('Errore turno IA:', err);
                setGameState(gs => ({ ...gs, gameStatePhase: 'end_turn' }));
            } finally {
                if (!movedPawn) {
                    setIsAnimating(false);
                }
            }
        };
        executeAITurn();
    }, [gameState.currentPlayerIndex, gameState.gameStatePhase, isAnimating, view, currentPlayer]);


    // Effect to automatically end AI turn after it has moved or acted
    useEffect(() => {
        if (!currentPlayer || currentPlayer.controller !== 'ai' || gameState.gameStatePhase !== 'end_turn' || isAnimating) {
            return;
        }

        if (modalInfo?.type === 'enemy_encounter') {
            const encounterTimer = setTimeout(() => {
                setGameState(gs => gameEngine.initiateCombat(gs, modalInfo.enemy.id, modalInfo.hasPlayerMoved).newState);
                immediateCloseModal();
            }, 600);
            return () => clearTimeout(encounterTimer);
        }

        const isInteractiveModal = modalInfo && ['loot_choice', 'swap_confirmation', 'merchant', 'quest_offer', 'mage_encounter', 'titan_encounter', 'dialogue', 'treasure_reveal', 'special_square_reveal'].includes(modalInfo.type);
        const timer = setTimeout(() => {
            if (modalInfo) immediateCloseModal();
            handleEndTurn();
        }, isInteractiveModal ? 120 : 900);
        return () => clearTimeout(timer);
    }, [gameState.gameStatePhase, isAnimating, modalInfo, currentPlayer]);

    // Effect to automate all AI actions during combat
    useEffect(() => {
        if (!currentPlayer || currentPlayer.controller !== 'ai' || !gameState.combatState.active || isAnimating) {
            return;
        }

        const { combatPhase, attacksMadeThisTurn } = gameState.combatState;
        let actionTimeout: ReturnType<typeof setTimeout>;

        if (combatPhase === 'initial' || combatPhase === 'round_over') {
            actionTimeout = setTimeout(() => {
                const enemy = gameState.enemies.find(e => e.id === gameState.combatState.enemyId);
                if (attacksMadeThisTurn < 3 && enemy && enemy.hp > 0) {
                    handleStartAttackRolls();
                } else {
                    handleEndCombatTurn();
                }
            }, AI_THINK_DELAY);
        } else if (combatPhase === 'attack_rolls') {
             actionTimeout = setTimeout(() => handleStartDefenseRolls(), 1800);
        } else if (combatPhase === 'defense_rolls') {
             actionTimeout = setTimeout(() => handleApplyCombatResults(), 1800);
        } else if (combatPhase === 'results_display') {
            actionTimeout = setTimeout(() => handleResolveCombatRound(), 2000);
        } 
        return () => { if (actionTimeout) clearTimeout(actionTimeout); };
    }, [gameState.combatState, gameState.currentPlayerIndex, isAnimating, currentPlayer]);


    // Effect to show Dice Upgrade Modal
    useEffect(() => {
        const player = gameState.players[gameState.currentPlayerIndex];
        if (player && player.pendingUpgrades > 0 && !isUpgradeModalOpen && player.controller === 'human') {
            setIsUpgradeModalOpen(true);
        } else if ((!player || player.pendingUpgrades === 0) && isUpgradeModalOpen) {
            setIsUpgradeModalOpen(false);
        }
    }, [gameState.players, gameState.currentPlayerIndex, isUpgradeModalOpen]);


    // Effect for Toast
    useEffect(() => {
        if (toastInfo) {
            const timer = setTimeout(() => {
                setToastInfo(null);
            }, 3900);
            return () => clearTimeout(timer);
        }
    }, [toastInfo]);
    
    // Effect for Key Award Notifications
    useEffect(() => {
        const previousKeys = previousKeysRef.current;
        const newlyAwardedKeys = (Object.keys(gameState.keys) as KeyColor[]).filter(
            key => gameState.keys[key] && !previousKeys[key]
        );

        if (newlyAwardedKeys.length > 0) {
            const keyColor = newlyAwardedKeys[0];
            const player = gameState.players.find(p => p.color === keyColor);
            const keyNameMapping: Record<KeyColor, string> = { red: 'Rossa', yellow: 'Gialla', white: 'Bianca', black: 'Nera' };
            const keyName = keyNameMapping[keyColor];
            setToastInfo({ message: `${player?.name || 'La squadra'} ha ottenuto la Chiave ${keyName}!`, id: Date.now() });
        }

        previousKeysRef.current = gameState.keys;
    }, [gameState.keys, gameState.players]);
    
    // Effect for Trust Level Notifications
    useEffect(() => {
        const oldLevel = previousTrustLevelRef.current;
        const newLevel = gameState.trustLevel;

        if (newLevel !== oldLevel) {
            const trustData: Record<string, string> = {
                ostili: 'Ostili',
                diffidenti: 'Diffidenti',
                neutrale: 'Neutrale',
                amichevole: 'Amichevole',
                alleato: 'Alleato',
            };
            setToastInfo({ message: `Livello Fiducia cambiato in: ${trustData[newLevel]}!`, id: Date.now() });
        }

        previousTrustLevelRef.current = newLevel;
    }, [gameState.trustLevel]);


  // --- Context Menu Actions ---
  const handleEquipWeapon = (playerId: number, inventoryIndex: number) => {
    setGameState(gs => gameEngine.equipWeapon(gs, playerId, inventoryIndex));
    setContextMenuInfo(null);
  };
  
  const handleUnequipWeapon = (playerId: number) => {
    setGameState(gs => gameEngine.unequipWeapon(gs, playerId));
    setContextMenuInfo(null);
  };

  const handleDropWeapon = (playerId: number, inventoryIndex: number) => {
    setGameState(gs => gameEngine.dropWeapon(gs, playerId, inventoryIndex));
    setContextMenuInfo(null);
  };

  const handleDropEquippedWeapon = (playerId: number) => {
    setGameState(gs => gameEngine.dropEquippedWeapon(gs, playerId));
    setContextMenuInfo(null);
  };

  const openContextMenu = (e: React.MouseEvent, options: ContextMenuProps['options']) => {
    e.preventDefault();
    e.stopPropagation();
    const boundClose = () => setContextMenuInfo(null);
    options.forEach(opt => {
        const originalAction = opt.action;
        opt.action = () => {
            originalAction();
            boundClose(); // Close menu after action
        };
    });
    setContextMenuInfo({ x: e.clientX, y: e.clientY, options, onClose: boundClose });
  };

  // --- Main Render ---
  const handleRestart = () => {
    window.location.reload();
  };
  
  const TrustDisplay: React.FC<{ trust: number; trustLevel: string }> = ({ trust, trustLevel }) => {
    const trustData: Record<string, { icon: React.ReactNode; title: string; description: string }> = {
        ostili: { icon: <Flame size={22} />, title: 'Ostili', description: 'Le entità del sogno sono ostili. I prezzi sono più alti e le ricompense minori.' },
        diffidenti: { icon: <AlertTriangle size={22} />, title: 'Diffidenti', description: 'La tua reputazione è bassa. I mercanti sono sospettosi e i PNG meno generosi.' },
        neutrale: { icon: <Scale size={22} />, title: 'Neutrale', description: 'La tua reputazione nel mondo onirico è neutrale.' },
        amichevole: { icon: <HeartHandshake size={22} />, title: 'Amichevole', description: 'Sei visto con favore. Ottieni sconti e ricompense migliori.' },
        alleato: { icon: <Crown size={22} />, title: 'Alleato', description: 'Sei un faro di speranza. Gli abitanti del sogno si fidano ciecamente di te.' },
    };

    const data = trustData[trustLevel] || trustData.neutrale;

    return (
        <div className="trust-display-container" title={`${data.description} (Punteggio: ${trust})`}>
            <div className="trust-icon">{data.icon}</div>
            <div className="trust-info">
                <h4>Fiducia: {data.title}</h4>
                <small>La reputazione della squadra.</small>
            </div>
        </div>
    );
  };
  
  const renderModal = () => {
    if (!modalInfo) return null;

    let content: React.ReactNode = null;
    let footer: React.ReactNode = null;

    // Modals that require a specific user action and should not be closed by clicking the overlay.
    const isActionRequiredModal = [
        'treasure_reveal',
        'special_square_reveal',
        'swap_confirmation',
        'loot_choice',
        'quest_offer',
        'enemy_encounter',
        'titan_encounter',
        'combat',
        'mage_encounter',
        'dialogue',
        'choose_enemy_type_for_spell',
        'hp_sacrifice_choice',
        'copy_spell_prompt'
    ].includes(modalInfo.type);

    switch (modalInfo.type) {
        case 'info':
            content = <InfoModalContent modalInfo={modalInfo} />;
            const handleInfoClick = () => {
                if (modalInfo.title === 'Vittoria!' || modalInfo.title === 'Game Over') {
                    handleRestart();
                } else if (modalInfo.title === 'Fuga Fallita!' && modalInfo.enemy) {
                    handleChooseToFight(modalInfo.enemy as Enemy, modalInfo.hasPlayerMoved ?? false);
                } else if ((modalInfo.title === 'Dialogo Fallito!' || modalInfo.title === 'Dialogo Fallito') && modalInfo.enemy) {
                    // CRITICAL CHANGE: Transition directly to combat on failure acknowledgment
                    handleChooseToFight(modalInfo.enemy as Enemy, modalInfo.hasPlayerMoved ?? true);
                }
                else {
                    closeModal();
                }
            };
            footer = <button onClick={handleInfoClick} className="modal-action-button">OK</button>;
            break;
        case 'loot_choice':
            content = <LootModalContent modalInfo={modalInfo} onLootItemSelect={handleLootItemSelect} />;
            const hasItems = modalInfo.items && modalInfo.items.length > 0;
            footer = (<>
                <button onClick={closeModal} className="modal-action-button">{hasItems ? 'Ignora Oggetti' : 'Chiudi'}</button>
                {hasItems && <button onClick={handleLootAll} className="modal-action-button confirm">Raccogli tutto</button>}
            </>);
            break;
        case 'swap_confirmation':
            content = <SwapConfirmationModalContent modalInfo={modalInfo} />;
            footer = (<>
                <button onClick={() => handleSwapConfirm(modalInfo.targetItemId)} className="modal-action-button confirm">Sostituisci</button>
                <button onClick={closeModal} className="modal-action-button">Annulla</button>
            </>);
            break;
        case 'treasure_reveal': {
            content = (
                <TreasureCardContent
                    title={modalInfo.title}
                    message={modalInfo.message}
                    onClose={closeModal}
                />
            );
            footer = null;
            break;
        }
        case 'special_square_reveal': {
            content = (
                <SpecialSquareCardContent 
                    squareType={modalInfo.squareType}
                    message={modalInfo.message}
                    onClose={closeModal}
                />
            );
            footer = null;
            break;
        }
        case 'titan_encounter':
            content = <InfoModalContent modalInfo={modalInfo} />;
            footer = (<button onClick={handleEngageTitan} className="modal-action-button confirm">Entra in Risonanza</button>);
            break;
        case 'enemy_encounter': {
            const encounterEnemy = modalInfo.enemy;
            const hasPlayerMoved = modalInfo.hasPlayerMoved;
            const isMage = currentPlayer.class === 'mago';
            const handleForcedFight = () => {
                handleChooseToFight(encounterEnemy, hasPlayerMoved);
                setModalInfo(null);
            };

            content = <EnemyEncounterModalContent modalInfo={modalInfo} gameState={gameState} />;
            footer = (<>
                {modalInfo.dialogueRefused ? (
                    <>
                        {!hasPlayerMoved && <button onClick={() => handleFlee(hasPlayerMoved)} className="modal-action-button">Fuggi</button>}
                        <button onClick={handleForcedFight} className="modal-action-button confirm">Entra in Risonanza</button>
                    </>
                ) : (
                    <>
                        {!hasPlayerMoved && <button onClick={() => handleFlee(hasPlayerMoved)} className="modal-action-button">Fuggi</button>}
                        {gameState.gameMode === 'online' && (
                            <button onClick={() => handleChooseToTalk(encounterEnemy, hasPlayerMoved)} className="modal-action-button">Parla</button>
                        )}
                        <button onClick={() => handleChooseToFight(encounterEnemy, hasPlayerMoved)} className="modal-action-button confirm">Entra in Risonanza</button>
                    </>
                )}
                {isMage && hasPlayerMoved && <button onClick={closeModal} className="modal-action-button">Prosegui</button>}
            </>);
            break;
        }
        case 'dialogue':
            content = <DialogueModalContent modalInfo={modalInfo} setGameState={setGameState} setModalInfo={setModalInfo} onChoice={handleDialogueChoice} onDialogueFail={handleDialogueFailure} trustLevel={gameState.trustLevel} />;
            // Footer is managed inside the component
            break;
        case 'combat':
        case 'mage_encounter':
            content = <CombatModalContent gameState={gameState} modalInfo={modalInfo} currentPlayerColor={playerColorHex[currentPlayer.color]} />;
            const { combatPhase, attacksMadeThisTurn } = gameState.combatState;
            const maxAttacks = 3;
            if (modalInfo.type === 'mage_encounter' && combatPhase === 'initial') {
                footer = (<>
                    <button onClick={handleEndCombatTurn} className="modal-action-button">Prosegui</button>
                    <button onClick={handleStartAttackRolls} className="modal-action-button confirm">Attacca</button>
                </>);
            } else {
                 switch (combatPhase) {
                    case 'initial': footer = (<button onClick={handleStartAttackRolls} className="modal-action-button confirm">Attacca</button>); break;
                    case 'attack_rolls': footer = <button onClick={handleStartDefenseRolls} className="modal-action-button">Lancia Difesa</button>; break;
                    case 'defense_rolls': footer = <button onClick={handleApplyCombatResults} className="modal-action-button">Mostra Risultati</button>; break;
                    case 'results_display': footer = <button onClick={handleResolveCombatRound} className="modal-action-button confirm">Continua</button>; break;
                    case 'round_over':
                        if (attacksMadeThisTurn < maxAttacks) {
                            footer = (<><button onClick={handleEndCombatTurn} className="modal-action-button">Termina Turno</button><button onClick={handleStartAttackRolls} className="modal-action-button confirm">Attacca di nuovo</button></>);
                        } else {
                            footer = <button onClick={handleEndCombatTurn} className="modal-action-button">Termina Turno</button>;
                        }
                        break;
                }
            }
            break;
        case 'merchant':
            content = <MerchantModalContent modalInfo={modalInfo} gameState={gameState} onPurchaseItem={handlePurchaseItem} />;
            footer = <button onClick={closeModal} className="modal-action-button">Vattene</button>;
            break;
        case 'shared_stash':
            content = <StashModalContent gameState={gameState} openContextMenu={openContextMenu} onDepositItem={handleDepositItem} onWithdrawItem={handleWithdrawItem} onMoveItem={handleMoveItem} />;
            footer = <button onClick={closeModal} className="modal-action-button">Chiudi</button>;
            break;
        case 'quest_offer':
             const npc = modalInfo.npc;
             const canComplete = currentPlayer.inventory.some(item => item?.type === 'questItem' && item.name === npc.quest.requiredItemName) && currentPlayer.activeQuestId === npc.quest.id;
             content = (
                <QuestModalContent 
                    modalInfo={modalInfo} 
                    gameState={gameState}
                    setGameState={setGameState}
                />
            );
             footer = (<>
                <button onClick={closeModal} className="modal-action-button">Rifiuta</button>
                <button 
                    onClick={() => handleAcceptQuest(npc.id)} 
                    className="modal-action-button confirm"
                    disabled={npc.quest.id === 'PENDING_GENERATION'}
                >
                    {canComplete ? "Completa Missione" : "Accetta"}
                </button>
            </>);
            break;
        case 'menu':
            content = <MenuModalContent 
                        gameState={gameState} 
                        onOpenRules={() => setModalInfo({ type: 'rules', title: 'Regolamento' })} 
                        onOpenDebug={() => { setShowDebugPanel(true); closeModal(); }}
                        onClose={closeModal} 
                      />;
            footer = null;
            break;
        case 'rules':
            content = <RulesModalContent />;
            footer = <button onClick={() => setModalInfo({ type: 'menu', title: 'Menu di Gioco' })} className="modal-action-button">Torna al Menu</button>;
            break;
        case 'choose_enemy_type_for_spell': {
            const spell = modalInfo.spell;
            const keyColors: KeyColor[] = ['black', 'white', 'yellow', 'red'];
            const keyIcons: Record<KeyColor, string> = {
                red: preloadedAssets.items.redKey,
                yellow: preloadedAssets.items.yellowKey,
                white: preloadedAssets.items.whiteKey,
                black: preloadedAssets.items.blackKey,
            };
            const pickEnemyType = (enemyType: KeyColor) => {
                setGameState(gs => {
                    const { newState, modalInfo: resultModal, audioAnnouncement } = gameEngine.resolveRevealEnemyTypeSpell(gs, spell.id, enemyType);
                    setModalInfo(resultModal);
                    if (audioAnnouncement) AudioManager.playAnnouncement(audioAnnouncement);
                    return newState;
                });
            };
            content = (
                <div className="spell-choice-modal">
                    <p>{modalInfo.message}</p>
                    <div className="enemy-type-choice-grid">
                        {keyColors.map(color => (
                            <button
                                key={color}
                                type="button"
                                className="enemy-type-choice-btn"
                                onClick={() => pickEnemyType(color)}
                            >
                                <img src={keyIcons[color]} alt={ENEMY_TYPE_NAMES[color].plural} />
                                <span>{ENEMY_TYPE_NAMES[color].plural}</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
            footer = <button type="button" onClick={closeModal} className="modal-action-button">Annulla</button>;
            break;
        }
        case 'hp_sacrifice_choice': {
            const maxSacrifice = Math.min(5, Math.max(1, (currentPlayer?.hp || 2) - 1));
            const clampedAmount = Math.max(1, Math.min(maxSacrifice, hpSacrificeAmount));
            const confirmSacrifice = () => {
                setGameState(gs => {
                    const { newState, modalInfo: resultModal, audioAnnouncement } = gameEngine.resolveHpSacrificeSpell(gs, modalInfo.spellId, clampedAmount);
                    setModalInfo(resultModal);
                    if (audioAnnouncement) AudioManager.playAnnouncement(audioAnnouncement);
                    return newState;
                });
            };
            content = (
                <div className="spell-choice-modal">
                    <p>{modalInfo.message}</p>
                    <div className="sacrifice-stepper">
                        <button
                            type="button"
                            className="modal-action-button"
                            disabled={clampedAmount <= 1}
                            onClick={() => setHpSacrificeAmount(a => Math.max(1, a - 1))}
                        >
                            -1
                        </button>
                        <div className="sacrifice-readout tabular-nums">
                            <strong>-{clampedAmount} Volontà</strong>
                            <span>+{clampedAmount * modalInfo.valuePerHp} Intento</span>
                        </div>
                        <button
                            type="button"
                            className="modal-action-button"
                            disabled={clampedAmount >= maxSacrifice}
                            onClick={() => setHpSacrificeAmount(a => Math.min(maxSacrifice, a + 1))}
                        >
                            +1
                        </button>
                    </div>
                </div>
            );
            footer = (
                <>
                    <button type="button" onClick={closeModal} className="modal-action-button">Annulla</button>
                    <button type="button" onClick={confirmSacrifice} className="modal-action-button confirm">Conferma Sacrificio</button>
                </>
            );
            break;
        }
        case 'copy_spell_prompt': {
            const halfCost = Math.ceil(modalInfo.spell.costToUse / 2);
            const resolveCopy = (shouldCopy: boolean) => {
                setGameState(gs => {
                    const { newState, modalInfo: resultModal, audioAnnouncement } = gameEngine.resolveCopySpellDecision(gs, shouldCopy);
                    setModalInfo(resultModal);
                    if (audioAnnouncement) AudioManager.playAnnouncement(audioAnnouncement);
                    return newState;
                });
            };
            content = (
                <div className="spell-choice-modal">
                    <p>
                        <strong>{modalInfo.copyingPlayer.name}</strong> percepisce l'eco di <strong>{modalInfo.spell.name}</strong>.
                    </p>
                    <p>
                        Vuoi attivarne una copia spendendo <strong className="tabular-nums">{halfCost} Intento</strong>?
                    </p>
                </div>
            );
            footer = (
                <>
                    <button type="button" onClick={() => resolveCopy(false)} className="modal-action-button">Non Copiare</button>
                    <button type="button" onClick={() => resolveCopy(true)} className="modal-action-button confirm">Copia Intenzione</button>
                </>
            );
            break;
        }
    }

    const finalOnClose = isActionRequiredModal ? () => {} : closeModal;

    return (
        <ModalWrapper title={modalInfo.title} onClose={finalOnClose} footerContent={footer} isClosing={isModalClosing}>
            {content}
        </ModalWrapper>
    );
};


  return (
    <>
      {view === 'splash' && <SplashScreen onStart={handleSplashClick} />}
      {view === 'selection' && <SelectionScreen onSettingsConfirm={handleSettingsConfirm} />}
      {view === 'test' && (
        <PsychologicalTest 
          players={playerCustomizations} 
          onComplete={handlePsychologicalTestComplete} 
        />
      )}

      {view === 'loading' && <LoadingScreen />}

      {view === 'game' && (
        <div className={`app-container ${view === 'game' ? 'game-fade-in' : ''} ${isGameReady ? 'is-ready' : ''}`}>
          <div className="game-area">
            <div className="game-board-3d-stage">
                <Board3D
                    gameState={gameState}
                    activeMove={activePawnMove}
                    onMoveAnimationComplete={handleMoveAnimationComplete}
                    onCellClick={handleCellClick}
                    isAnimating={isAnimating}
                />
                {(gameState.gameStatePhase === 'cell_inspection' ||
                  gameState.gameStatePhase === 'spell_target_enemy' ||
                  gameState.gameStatePhase === 'spell_target_cell') && (
                    <div className="targeting-banner" role="status">
                        {gameState.gameStatePhase === 'cell_inspection' ? (
                            <>
                                <Eye size={17} />
                                <span>Intuizione attiva: clicca una casella del tabellone per rivelarne il segreto.</span>
                            </>
                        ) : gameState.gameStatePhase === 'spell_target_enemy' ? (
                            <>
                                <Crosshair size={17} />
                                <span>Seleziona un Incubo visibile sul tabellone per scatenare l'effetto.</span>
                                <button
                                    type="button"
                                    className="targeting-cancel-btn"
                                    onClick={() => setGameState(gs => gameEngine.cancelTargetingMode(gs))}
                                >
                                    <X size={14} />
                                    <span>Annulla</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Crosshair size={17} />
                                <span>Seleziona una casella libera del tabellone per completare il teletrasporto.</span>
                                <button
                                    type="button"
                                    className="targeting-cancel-btn"
                                    onClick={() => setGameState(gs => gameEngine.cancelTargetingMode(gs))}
                                >
                                    <X size={14} />
                                    <span>Annulla</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div className="turn-controls" style={{ '--turn-accent': currentPlayer ? playerColorHex[currentPlayer.color] : '#888' } as React.CSSProperties}>
                <div className="turn-info">
                    {currentPlayer ? (
                         <>
                            <span className="turn-text">Turno <span className="tabular-nums">{gameState.turnNumber}</span> · Tocca a <strong>{currentPlayer.name} {currentPlayer.isDead ? '(Sconfitto)' : ''}</strong></span>
                            {gameState.diceResult > 0 && <span className="dice-result tabular-nums">Dado: {gameState.diceResult}</span>}
                        </>
                    ) : (
                         <span className="turn-text">Caricamento...</span>
                    )}
                </div>
                <div className="turn-actions">
                    <button onClick={handleRollDice} disabled={!currentPlayer || gameState.gameStatePhase !== 'rolling' || currentPlayer.isDead || isAnimating} className="action-button">Lancia il Dado</button>
                    <button onClick={handleEndTurn} disabled={!currentPlayer || gameState.gameStatePhase === 'rolling' || gameState.gameStatePhase === 'combat' || gameState.gameStatePhase === 'cell_inspection' || gameState.gameStatePhase === 'spell_target_enemy' || gameState.gameStatePhase === 'spell_target_cell' || currentPlayer.isDead || isAnimating} className="action-button">Termina Turno</button>
                </div>
            </div>
          </div>
          <div className="side-panel">
            <div className="side-panel-header">
                <img src={preloadedAssets.logos.titleSmall} alt="Competo Logo" className="side-panel-logo" />
                <div className="side-panel-controls">
                    <button className="side-panel-button" onClick={() => setModalInfo({ type: 'menu', title: 'Menu di Gioco' })} title="Menu">
                        <Menu size={19} />
                    </button>
                    <button className="side-panel-button" onClick={handleToggleFullscreen} title={isFullscreen ? "Esci da Schermo Intero" : "Schermo Intero"}>
                        {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
                    </button>
                </div>
            </div>
            <TrustDisplay trust={gameState.trust} trustLevel={gameState.trustLevel} />
            {gameState.players.map((player, index) => (
              <PlayerCard3D
                key={player.id}
                player={player}
                isActiveTurn={index === gameState.currentPlayerIndex}
                activeBackTab={backTabState[player.id] || null}
                onSetBackTab={handleSetPlayerBackTab}
                openContextMenu={openContextMenu}
                onEquipWeapon={handleEquipWeapon}
                onUnequipWeapon={handleUnequipWeapon}
                onDropWeapon={handleDropWeapon}
                onDropEquippedWeapon={handleDropEquippedWeapon}
                onUseConsumable={handleUseConsumable}
                onCastSpell={handleCastSpell}
                gameState={gameState}
              />
            ))}
             <KeyDisplay keys={gameState.keys} teamKeyProgress={gameState.teamKeyProgress} />
          </div>
        </div>
      )}

      {renderModal()}

      {showCustomization && gameSettings && (
        <CustomizationModal
          numberOfPlayers={gameSettings.players}
          onClose={() => setShowCustomization(false)}
          onSave={handleCustomizationConfirm}
        />
      )}
      {contextMenuInfo && <ContextMenu {...contextMenuInfo} />}
      {isUpgradeModalOpen && currentPlayer && currentPlayer.pendingUpgrades > 0 && (
          <DiceUpgradeModal 
              player={currentPlayer}
              onUpgrade={handleApplyDiceUpgrade}
          />
      )}
      {showDebugPanel && <DebugPanelModal onClose={() => setShowDebugPanel(false)} />}
      {toastInfo && <div key={toastInfo.id} className="toast-notification">{toastInfo.message}</div>}
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}