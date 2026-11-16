import type { GameState, GamePhase, ModalInfo, Player, WeaponType, WorldItem, Enemy, CombatRollResultType, CombatPhase, CombatRollResult, Weapon, KeyColor, NPC, ItemReward, Consumable, Merchant, DieConfig, SpecialSquare, Treasure, InventoryItem, MagicSpell, TreasureType } from '../gameLogic';
import { blessingEffects, misfortuneEffects, GATE_CELLS, STOCK_REFRESH_TURN_INTERVAL, PLAYER_START_POSITIONS, baseWeapons, allConsumables, offlineQuests, ENEMY_TYPE_NAMES, ENEMY_NAMES_BY_TYPE, allMagicSpells, MAX_SPELLS } from './constants';
import { getRandomInt, createWeaponInstance, boardLayout as initialBoardLayout, generateMerchantStock } from './initialState';
import { preloadedAssets } from '../assets/preloadedAssets';


// --- STATE MANAGEMENT ---
let currentGameState: GameState | null = null;
const updateCurrentGameState = (newState: GameState) => {
    currentGameState = newState;
    return newState;
}
export const getLatestState = (): GameState => {
    if (!currentGameState) throw new Error("Game state has not been initialized.");
    return JSON.parse(JSON.stringify(currentGameState));
}

// --- TYPE DEFINITIONS FOR ITEM MOVEMENT ---
export interface ItemLocation {
    area: 'stash' | 'player_inventory' | 'player_equipped';
    slot: number | 'equipped';
}

export type AIAction = {
    type: 'move';
    targetCellId: number;
} | {
    type: 'initiate_combat';
    enemyId: number;
} | {
    type: 'attack';
} | {
    type: 'use_consumable';
    inventoryIndex: number;
} | {
    type: 'end_turn';
};

export const shouldPreservePhaseOnModalClose = (phase: GamePhase): boolean => {
    return (
        phase === 'cell_inspection' ||
        phase === 'spell_target_enemy' ||
        phase === 'spell_target_cell' ||
        phase === 'combat' ||
        phase === 'gameOver'
    );
};



// --- BOARD LAYOUT & HELPERS ---
const cellMap = new Map(initialBoardLayout.allCells.map(cell => [cell.id, cell]));
const getCellCoordinatesById = (id: number) => cellMap.get(id) || null;

export const boardLayout = {
    ...initialBoardLayout,
    getCellCoordinatesById
};

// --- BOARD ADJACENCY MAP (LAZILY INITIALIZED) ---
let _boardAdjacency: Record<number, number[]> | null = null;

const getBoardAdjacency = (): Record<number, number[]> => {
    if (_boardAdjacency) {
        return _boardAdjacency;
    }

    const adj: Record<number, number[]> = {};
    const allCellIds = initialBoardLayout.allCells.map(c => c.id).filter(Boolean) as number[];
    for (const id of allCellIds) {
        adj[id] = [];
    }

    // Outer Ring (1-48)
    for (let i = 1; i <= 48; i++) {
        const next = (i === 48) ? 1 : i + 1;
        const prev = (i === 1) ? 48 : i - 1;
        adj[i].push(prev, next);
    }

    // Gate Connections
    adj[40].push(68); adj[68].push(40); // Red
    adj[16].push(58); adj[58].push(16); // Yellow
    adj[25].push(67); adj[67].push(25); // White
    adj[1].push(49); adj[49].push(1);   // Black

    // Inner Paths
    const innerPaths: [number, number][] = [
        [68, 65], [65, 62], [62, 59], [59, 69], // Red Path
        [58, 51], [51, 52], [52, 53], [53, 54], [54, 69], // Yellow Path
        [67, 56], [56, 60], [60, 61], [61, 63], [63, 64], [64, 69], // White Path
        [49, 50], [50, 55], [55, 57], [57, 66], [66, 69], // Black Path
    ];

    for (const [from, to] of innerPaths) {
        adj[from].push(to);
        adj[to].push(from);
    }
    
    _boardAdjacency = adj;
    return adj;
};

export const findShortestPath = (startId: number, endId: number, gates: GameState['gates']): number[] | null => {
    if (startId === endId) return [startId];
    
    const boardAdjacency = getBoardAdjacency();
    const queue: { cell: number, path: number[] }[] = [{ cell: startId, path: [startId] }];
    const visited = new Set<number>([startId]);

    while (queue.length > 0) {
        const { cell, path } = queue.shift()!;

        if (cell === endId) {
            return path;
        }

        const neighbors = boardAdjacency[cell] || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                 // Check gate crossing
                const isCrossingGate = (Object.values(GATE_CELLS).includes(cell) && !Object.values(GATE_CELLS).includes(neighbor)) ||
                                      (Object.values(GATE_CELLS).includes(neighbor) && !Object.values(GATE_CELLS).includes(cell));

                if(isCrossingGate) {
                    const gateCell = Object.values(GATE_CELLS).includes(cell) ? cell : neighbor;
                    const gateColor = (Object.keys(GATE_CELLS) as KeyColor[]).find(key => GATE_CELLS[key] === gateCell);
                    if (gateColor && !gates[`${gateColor}Open`]) {
                        continue; // Gate is closed, cannot pass
                    }
                }
                
                visited.add(neighbor);
                const newPath = [...path, neighbor];
                queue.push({ cell: neighbor, path: newPath });
            }
        }
    }

    return null; // Path not found
};

const calculateDistance = (startId: number, endId: number, gates: GameState['gates']): number => {
    const path = findShortestPath(startId, endId, gates);
    return path ? path.length - 1 : Infinity;
};


// --- GAME LOGIC FUNCTIONS (THE "ENGINE") ---

const _handleKeyQuestProgress = (newState: GameState, defeatedEnemy: Enemy): void => {
    const enemyColor = defeatedEnemy.enemyType;
    if (!newState.teamKeyProgress) {
        newState.teamKeyProgress = { red: 0, yellow: 0, white: 0, black: 0 };
    }
    const targetPlayer = newState.players.find((p: Player) => p.color === enemyColor);

    if (!newState.keys[enemyColor]) {
        newState.teamKeyProgress[enemyColor] = Math.min(5, (newState.teamKeyProgress[enemyColor] || 0) + 1);
        if (targetPlayer) {
            targetPlayer.keyQuestProgress = newState.teamKeyProgress[enemyColor];
        }
        if (newState.teamKeyProgress[enemyColor] >= 5) {
            newState.keys[enemyColor] = true;
        }
    }

    if ((Object.values(newState.keys) as boolean[]).every(Boolean)) {
        newState.gates = {
            redOpen: true,
            yellowOpen: true,
            whiteOpen: true,
            blackOpen: true,
        };
        const finalBoss = newState.enemies.find((e: Enemy) => e.isFinalBoss);
        if (finalBoss && finalBoss.hp > 0) {
            finalBoss.isVisible = true;
        }
    }
};

export const getVisibleEntities = (gameState: GameState) => {
  currentGameState = gameState;
  return [
    ...gameState.players,
    ...gameState.enemies.filter(e => e.isVisible),
    ...gameState.merchants.filter(m => m.isVisible),
    ...gameState.treasures.filter(t => t.isVisible),
    ...gameState.worldItems.filter(w => w.isVisible),
    ...gameState.specialSquares.filter(s => s.isVisible),
    ...gameState.npcs.filter(n => n.isVisible),
  ];
};

const isForbiddenBackwardMove = (from: number, to: number): boolean => {
    const forbiddenMoves = new Map<number, number>([
        [16, 15], // White arm -> Black arm
        [25, 24], // Yellow arm -> White arm
        [40, 39], // Red arm -> Yellow arm
        [1, 48],  // Black arm -> Red arm
    ]);
    return forbiddenMoves.get(from) === to;
};

const calculateReachableCells = (gameState: GameState): number[] => {
    const player = gameState.players[gameState.currentPlayerIndex];
    const diceRoll = gameState.diceResult;
    
    if (diceRoll === 0) return [];

    const boardAdjacency = getBoardAdjacency();
    const queue: { cell: number; dist: number }[] = [{ cell: player.position, dist: 0 }];
    const visited = new Map<number, number>();
    visited.set(player.position, 0);
    const reachable = new Set<number>();

    while (queue.length > 0) {
        const { cell, dist } = queue.shift()!;
        
        const isOccupiedByLivingPlayer = gameState.players.some(p => p.id !== player.id && p.position === cell && !p.isDead);
        if (dist > 0 && !isOccupiedByLivingPlayer) {
            reachable.add(cell);
        }

        if (dist >= diceRoll) {
            continue;
        }
        
        const neighbors = boardAdjacency[cell] || [];
        for (const neighbor of neighbors) {
            if(isForbiddenBackwardMove(cell, neighbor)) continue;

            const isCrossingGate = (Object.values(GATE_CELLS).includes(cell) && !Object.values(GATE_CELLS).includes(neighbor)) ||
                                  (Object.values(GATE_CELLS).includes(neighbor) && !Object.values(GATE_CELLS).includes(cell));

            if(isCrossingGate) {
                const gateColor = (Object.keys(GATE_CELLS) as KeyColor[]).find(key => GATE_CELLS[key] === (Object.values(GATE_CELLS).includes(cell) ? cell : neighbor));
                if (gateColor && !gameState.gates[`${gateColor}Open`]) {
                    continue; 
                }
            }

            if (!visited.has(neighbor) || visited.get(neighbor)! > dist + 1) {
                visited.set(neighbor, dist + 1);
                queue.push({ cell: neighbor, dist: dist + 1 });
            }
        }
    }
    return Array.from(reachable);
};

export const initiateCombat = (gameState: GameState, enemyId: number, hasPlayerMoved: boolean): { newState: GameState, modalInfo: ModalInfo | null } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const enemy = newState.enemies.find((e: Enemy) => e.id === enemyId);

    if (!enemy || player.isDead) return { newState, modalInfo: null };
    
    enemy.isVisible = true;
    enemy.hasBeenAttacked = true;

    newState.gameStatePhase = 'combat';
    newState.combatState = {
        active: true, enemyId: enemyId, hasPlayerMoved: hasPlayerMoved,
        combatPhase: 'initial', playerRolls: null, enemyRolls: null, playerDefenseRolls: null,
        enemyDefenseRolls: null, attacksMadeThisTurn: 0, playerDamageTaken: null, enemyDamageTaken: null,
    };

    return { newState: updateCurrentGameState(newState), modalInfo: null }; // Modal is handled by useEffect in App
};

export const rollDice = (gameState: GameState): { newState: GameState, roll: number } => {
    let roll = Math.floor(Math.random() * 6) + 1;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.nextRollHalved) {
        roll = Math.max(1, Math.floor(roll / 2)); // Ensure roll is at least 1
        player.nextRollHalved = undefined; // Consume the effect
    }
    let newState: GameState = {
        ...gameState, diceResult: roll, gameStatePhase: 'moving', reachableCells: null,
    };
    newState.reachableCells = calculateReachableCells(newState);
    return { newState: updateCurrentGameState(newState), roll };
};

const findNextLivingPlayerIndex = (gameState: GameState): number => {
    const { players, currentPlayerIndex } = gameState;
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    for (let i = 0; i < players.length; i++) {
        if (!players[nextIndex].isDead) return nextIndex;
        nextIndex = (nextIndex + 1) % players.length;
    }
    return -1;
};

const outerRingCellIds = Array.from({ length: 48 }, (_, i) => i + 1);

export const endTurn = (gameState: GameState): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    let turnModal: ModalInfo | null = null;
    let newState = JSON.parse(JSON.stringify(gameState));
    let announcements: string[] = [];

    const oldPlayer = newState.players[newState.currentPlayerIndex];
    oldPlayer.hasNewItem = false;
    oldPlayer.hasCastSpellThisTurn = false;

    // Handle "Entusiasmo" blessing
    if (oldPlayer.getsExtraTurn) {
        oldPlayer.getsExtraTurn = false;
        newState.gameStatePhase = 'rolling';
        newState.diceResult = 0;
        newState.reachableCells = null;
        const announcement = `${oldPlayer.name} gioca un altro turno grazie all'Entusiasmo!`;
        return { newState: updateCurrentGameState(newState), modalInfo: {type: 'info', title: 'Turno Extra!', message: announcement}, audioAnnouncement: announcement };
    }

    if (newState.players.every((p: Player) => p.isDead)) return { newState: newState, modalInfo: null };

    if (oldPlayer.equippedWeapon?.id === 'd_l_03' && (oldPlayer.damageTakenThisTurn ?? 0) === 0) {
        oldPlayer.hp = Math.min(oldPlayer.maxHp, oldPlayer.hp + 1);
    }
    oldPlayer.usedMemoryThisTurn = false;
    oldPlayer.damageTakenThisTurn = 0;

    let nextPlayerIndex = newState.currentPlayerIndex;
    let skippedPlayerName: string | null = null;

    // Loop to find the next player who doesn't skip their turn
    while (true) {
        nextPlayerIndex = findNextLivingPlayerIndex({ ...newState, currentPlayerIndex: nextPlayerIndex });
        if (nextPlayerIndex === -1) return { newState: updateCurrentGameState(newState), modalInfo: null };

        const newPlayer = newState.players[nextPlayerIndex];
        if (newPlayer.skipNextTurn) {
            newPlayer.skipNextTurn = false; // Consume the effect
            skippedPlayerName = newPlayer.name;
            const skipMessage = `${skippedPlayerName} salta il turno a causa della Pigrizia.`;
            announcements.push(skipMessage);
            turnModal = {type: 'info', title: 'Turno Saltato', message: skipMessage};
        } else {
            break; // Found a player who is not skipping
        }
    }
    
    const isNewCycle = nextPlayerIndex < newState.currentPlayerIndex;
    const newTurnNumber = isNewCycle ? newState.turnNumber + 1 : newState.turnNumber;

    // Check for temporary effects that expire
    if (isNewCycle) {
        newState.enemies.forEach((enemy: Enemy) => {
            if (enemy.visibleUntilTurn && newTurnNumber >= enemy.visibleUntilTurn) {
                enemy.isVisible = false;
                enemy.visibleUntilTurn = undefined;
            }
        });
        newState.treasures.forEach((treasure: Treasure) => {
            if (treasure.visibleUntilTurn && newTurnNumber >= treasure.visibleUntilTurn) {
                treasure.isVisible = false;
                treasure.visibleUntilTurn = undefined;
            }
        });
        newState.merchants = newState.merchants.filter(m => !m.despawnTurn || m.despawnTurn !== newState.turnNumber);
    }
    
    // --- Merchant Movement Logic: Every 5 complete turns ---
    if (isNewCycle && (newTurnNumber - 1) % 5 === 0 && newTurnNumber > 1) {
        const occupiedCells = [
            ...newState.players.map((p: Player) => p.position), 
            ...newState.enemies.map((e: Enemy) => e.position), 
            ...newState.npcs.map((n: NPC) => n.position)
        ];
        let potentialMerchantCells = outerRingCellIds.filter(id => !occupiedCells.includes(id));
        
        for (let i = potentialMerchantCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [potentialMerchantCells[i], potentialMerchantCells[j]] = [potentialMerchantCells[j], potentialMerchantCells[i]];
        }

        newState.merchants.forEach((merchant: Merchant) => {
            merchant.isVisible = false;
            const newPosition = potentialMerchantCells.pop();
            if (newPosition) {
                merchant.position = newPosition;
            }
        });
    }

    newState.currentPlayerIndex = nextPlayerIndex;
    newState.turnNumber = newTurnNumber;
    newState.diceResult = 0;
    newState.gameStatePhase = 'rolling';
    newState.reachableCells = null;

    const newPlayer = newState.players[nextPlayerIndex];

    if (newPlayer.class === 'intuitivo') {
        let revealedEnemies = 0;
        newState.enemies.forEach((enemy: Enemy) => {
            if (!enemy.isVisible && calculateDistance(newPlayer.position, enemy.position, newState.gates) <= 2) {
                enemy.isVisible = true;
                revealedEnemies++;
            }
        });
        if(revealedEnemies > 0){
             const sentinelMessage = `${newPlayer.name} percepisce la presenza di ${revealedEnemies} incubo/i nelle vicinanze!`;
             announcements.push(sentinelMessage);
             if (turnModal && 'message' in turnModal) {
                 turnModal.message += `\n\n${sentinelMessage}`;
             } else if (!turnModal) {
                 turnModal = { type: 'info', title: 'Percezione da Sentinella', message: sentinelMessage };
             }
        }
    }
    
    if (newState.turnNumber >= newState.lastStockRefreshTurn + STOCK_REFRESH_TURN_INTERVAL) {
        newState.merchants.forEach((merchant: Merchant) => { merchant.stock = generateMerchantStock(newState.merchantStockTier); });
        newState.lastStockRefreshTurn = newState.turnNumber;
        const restockMessage = 'I Geni hanno aggiornato le loro scorte!';
        announcements.push(restockMessage);
        if (turnModal && 'message' in turnModal) {
            turnModal.message += `\n\n${restockMessage}`;
        } else if (!turnModal) {
            turnModal = { type: 'info', title: 'Rifornimento Geni', message: restockMessage };
        }
    }

    const enemyOnCell = newState.enemies.find((e: Enemy) => e.position === newPlayer.position);
    if(enemyOnCell) {
        newState.gameStatePhase = 'end_turn';
        const dialogueRefused = enemyOnCell.hp === enemyOnCell.maxHp && Math.random() < 0.2;
        const encounterModal: ModalInfo = { 
            type: 'enemy_encounter', 
            title: 'Incontro Ostile!', 
            enemy: enemyOnCell, 
            dialogueRefused,
            hasPlayerMoved: false
        };
        
        if (turnModal && 'message' in turnModal) {
           return { newState: updateCurrentGameState(newState), modalInfo: encounterModal, audioAnnouncement: announcements.join(' ') };
        }
        return { newState: updateCurrentGameState(newState), modalInfo: encounterModal, audioAnnouncement: announcements.join(' ') };
    }

    return { newState: updateCurrentGameState(newState), modalInfo: turnModal, audioAnnouncement: announcements.join(' ') };
};

export const isMoveValid = (gameState: GameState, targetCellId: number): boolean => {
    const phase = gameState.gameStatePhase;
    if (phase === 'moving' && gameState.diceResult > 0) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer.isDead || currentPlayer.controller === 'ai') return false;
        return gameState.reachableCells?.includes(targetCellId) ?? false;
    }
    if (phase === 'spell_target_cell') {
        const occupiedCells = getVisibleEntities(gameState).map(e => e.position);
        return !occupiedCells.includes(targetCellId);
    }
    if (phase === 'spell_target_enemy') {
        return gameState.enemies.some(e => e.isVisible && e.position === targetCellId);
    }
    return false;
};

export const pickUpWorldItem = (gameState: GameState, worldItemId: string): { newState: GameState, modalInfo: ModalInfo | null } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const worldItemIndex = newState.worldItems.findIndex((item: WorldItem) => item.id === worldItemId);

    if (worldItemIndex === -1) return { newState: gameState, modalInfo: null };

    if (player.inventory.length >= player.inventorySize) {
        return { newState: gameState, modalInfo: { type: 'info', title: 'Inventario Pieno', message: 'Non hai abbastanza spazio per raccogliere questo oggetto.' } };
    }

    const worldItem = newState.worldItems.splice(worldItemIndex, 1)[0];
    player.inventory.push(worldItem.item);
    if(player.willDuplicateNextConsumable && ['potion', 'spellScroll', 'bag'].includes(worldItem.item.type)) {
        if(player.inventory.length < player.inventorySize) {
            player.inventory.push({...worldItem.item, id: `${worldItem.item.id}_copy`});
        }
        player.willDuplicateNextConsumable = false;
    }
    player.hasNewItem = true;
    
    const itemsLeftOnCell = newState.worldItems.filter((item: WorldItem) => item.position === player.position && item.isVisible);
    
    return { newState: updateCurrentGameState(newState), modalInfo: itemsLeftOnCell.length > 0 ? { type: 'loot_choice', title: 'Hai trovato degli oggetti!', items: itemsLeftOnCell } : null };
};

export const pickUpAllLoot = (gameState: GameState): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const itemsOnCell = newState.worldItems.filter((item: WorldItem) => item.position === player.position && item.isVisible);
    const idsToRemove = new Set<string>();
    let itemAdded = false;

    for (const worldItem of itemsOnCell) {
        if (player.inventory.length >= player.inventorySize) break;
        player.inventory.push(worldItem.item);
        idsToRemove.add(worldItem.id);
        itemAdded = true;
        if(player.willDuplicateNextConsumable && ['potion', 'spellScroll', 'bag'].includes(worldItem.item.type)) {
            if(player.inventory.length < player.inventorySize) {
                player.inventory.push({...worldItem.item, id: `${worldItem.item.id}_copy`});
            }
            player.willDuplicateNextConsumable = false; // Consume effect
        }
    }
    
    if (itemAdded) player.hasNewItem = true;
    if (idsToRemove.size > 0) newState.worldItems = newState.worldItems.filter((item: WorldItem) => !idsToRemove.has(item.id));
    return updateCurrentGameState(newState);
};

export const swapWeaponWithWorldItem = (gameState: GameState, worldItemId: string): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    // This logic is deprecated due to universal inventory slots. A new UI/UX would be needed to select an item to swap.
    return newState;
};

export const equipWeapon = (gameState: GameState, playerId: number, inventoryIndex: number): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players.find((p: Player) => p.id === playerId);
    if (!player || !player.inventory[inventoryIndex]) return gameState;
    const itemFromInventory = player.inventory[inventoryIndex];
    if (itemFromInventory.type !== 'melee' && itemFromInventory.type !== 'ranged' && itemFromInventory.type !== 'magic') return gameState;
    const weaponFromInventory = itemFromInventory as Weapon;
    if (weaponFromInventory.level > player.level) return gameState; 
    const currentlyEquipped = player.equippedWeapon;
    player.equippedWeapon = weaponFromInventory;
    player.inventory.splice(inventoryIndex, 1);
    if (currentlyEquipped) {
        player.inventory.push(currentlyEquipped);
        player.hasNewItem = true;
    }
    player.attackDice = Array.from({ length: player.equippedWeapon.damageDice }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false }));
    return updateCurrentGameState(newState);
};

export const unequipWeapon = (gameState: GameState, playerId: number): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players.find((p: Player) => p.id === playerId);
    if (!player || !player.equippedWeapon) return gameState;
    if (player.inventory.length >= player.inventorySize) return gameState;
    player.inventory.push(player.equippedWeapon);
    player.hasNewItem = true;
    player.equippedWeapon = null;
    player.attackDice = [];
    return updateCurrentGameState(newState);
};

export const dropWeapon = (gameState: GameState, playerId: number, inventoryIndex: number): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players.find((p: Player) => p.id === playerId);
    if (!player || !player.inventory[inventoryIndex]) return gameState;
    const itemToDrop = player.inventory.splice(inventoryIndex, 1)[0];
    newState.worldItems.push({
        id: `${itemToDrop.id}_${Date.now()}`, name: itemToDrop.name, position: player.position,
        pawnImage: preloadedAssets.items.weaponOnMap, isVisible: true, item: itemToDrop,
    });
    return updateCurrentGameState(newState);
};

export const dropEquippedWeapon = (gameState: GameState, playerId: number): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players.find((p: Player) => p.id === playerId);
    if (!player || !player.equippedWeapon) return gameState;
    const weaponToDrop = player.equippedWeapon;
    player.equippedWeapon = null;
    player.attackDice = [];
    newState.worldItems.push({
        id: `${weaponToDrop.id}_${Date.now()}`, name: weaponToDrop.name, position: player.position,
        pawnImage: preloadedAssets.items.weaponOnMap, isVisible: true, item: weaponToDrop,
    });
    return updateCurrentGameState(newState);
};

const getClockwiseDistance = (start: number, current: number, ringSize: number): number => ((current - 1) - (start - 1) + ringSize) % ringSize;


const resolveTreasureDiscovery = (gameState: GameState, treasureId: number): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    let newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    
    // The treasure is consumed
    newState.treasures = newState.treasures.filter((t: Treasure) => t.id !== treasureId);

    let title = "Tesoro Trovato!";
    let message = "";

    // Calculate dynamic spell chance based on player's coins
    const bonusSpellChance = Math.min(0.20, Math.floor(player.coins / 50) * 0.02); // 2% bonus per 50 coins, max 20%
    const canFindSpell = player.spells.length < MAX_SPELLS;
    const finalSpellChance = canFindSpell ? 0.10 + bonusSpellChance : 0; // Base 10% chance + bonus

    // Distribute remaining probability among other items
    const remainingProb = 1.0 - finalSpellChance;
    const coinChance = remainingProb * 0.50; // 50% of what's left
    const consumableChance = remainingProb * 0.30; // 30% of what's left
    // questItemChance is the rest (20% of what's left)

    const roll = Math.random();

    // Determine the loot based on the roll
    if (roll < finalSpellChance) {
        // --- Find a Magic Spell (Intenzione) ---
        const knownSpellNames = new Set(player.spells.map(s => s.name));
        const availableSpells = allMagicSpells.filter(s => !knownSpellNames.has(s.name));

        if (availableSpells.length > 0) {
            const foundSpellTemplate = availableSpells[getRandomInt(0, availableSpells.length - 1)];
            const foundSpell = { ...foundSpellTemplate, id: `${foundSpellTemplate.name.replace(/\s/g, '')}_${Date.now()}` };
            player.spells.push(foundSpell);
            message = `Hai trovato un'Intenzione: ${foundSpell.name}!`;
        } else {
            // All spells learned, give a better coin reward instead
            const coins = getRandomInt(20, 40);
            player.coins += coins;
            message = `Hai padroneggiato tutte le Intenzioni! Invece del sapere, hai trovato ${coins} Intento.`;
        }
    } else if (roll < finalSpellChance + coinChance) {
        // --- Find Coins (Intento) ---
        const coins = getRandomInt(10, 30);
        player.coins += coins;
        message = `Hai trovato ${coins} Intento!`;
    } else if (roll < finalSpellChance + coinChance + consumableChance) {
        // --- Find a Consumable ---
        if (player.inventory.length < player.inventorySize) {
            const consumableTemplates = allConsumables.filter(c => c.type === 'potion' || c.type === 'bag');
            const foundConsumable = {...consumableTemplates[getRandomInt(0, consumableTemplates.length - 1)], id: `cons_${Date.now()}`};
            player.inventory.push(foundConsumable);
            player.hasNewItem = true;
            message = `Hai trovato: ${foundConsumable.name}!`;
            if (player.willDuplicateNextConsumable && player.inventory.length < player.inventorySize) {
                player.inventory.push({...foundConsumable, id: `${foundConsumable.id}_copy`});
                message += ` Grazie al tuo Riflesso Inatteso, ne hai trovato una copia!`;
                player.willDuplicateNextConsumable = false;
            }
        } else {
            // Inventory full, give fallback coins
            const coins = getRandomInt(5, 15);
            player.coins += coins;
            message = `Il tuo inventario è pieno! Hai trovato invece ${coins} Intento.`;
        }
    } else {
        // --- Find a Quest Item ---
        if (player.inventory.length < player.inventorySize) {
            const activeQuest = offlineQuests.find(q => q.id === player.activeQuestId);
            let foundItemName = null;
            
            // 75% chance to find the item for the active quest
            if (activeQuest && !player.inventory.some(i => i.type === 'questItem' && i.name === activeQuest.requiredItemName) && Math.random() < 0.75) {
                foundItemName = activeQuest.requiredItemName;
            } else {
                // Otherwise, find an item for a quest not yet taken by any player
                const playerQuestItemNames = player.inventory.filter((i: InventoryItem) => i.type === 'questItem').map(i => i.name);
                const allActiveQuestIds = new Set(newState.players.map((p: Player) => p.activeQuestId));
                const availableQuestItems = offlineQuests.filter(q => !playerQuestItemNames.includes(q.requiredItemName) && !allActiveQuestIds.has(q.id));
                if (availableQuestItems.length > 0) {
                    foundItemName = availableQuestItems[getRandomInt(0, availableQuestItems.length - 1)].requiredItemName;
                }
            }

            if (foundItemName) {
                player.inventory.push({ id: `${foundItemName}_${Date.now()}`, name: foundItemName, type: 'questItem' });
                player.hasNewItem = true;
                message = `Hai trovato un oggetto missione: ${foundItemName}!`;
            } else {
                // No valid quest item found, give fallback coins
                const coins = getRandomInt(5, 15);
                player.coins += coins;
                message = `Non hai trovato oggetti rari, ma hai raccolto ${coins} Intento.`;
            }
        } else {
            // Inventory full, give fallback coins
            const coins = getRandomInt(5, 15);
            player.coins += coins;
            message = `Il tuo inventario è pieno! Hai trovato invece ${coins} Intento.`;
        }
    }

    return { 
        newState: updateCurrentGameState(newState), 
        modalInfo: { 
            type: 'treasure_reveal', 
            title, 
            message 
        }, 
        audioAnnouncement: message 
    };
};

export const applySpecialSquareEffect = (gameState: GameState, square: SpecialSquare): { newState: GameState, modalInfo: ModalInfo, audioAnnouncement?: string } => {
    let newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    
    if (square.type === 'misfortune' && player.equippedWeapon?.id.startsWith('d_a_05') && Math.random() < 0.30) {
        const message = `Grazie alla tua Presenza, hai evitato l'effetto della casella Sventura!`;
        return { newState, modalInfo: { type: 'info', title: 'Presenza Mentale!', message }, audioAnnouncement: message };
    }

    const effects = square.type === 'blessing' ? blessingEffects : misfortuneEffects;
    const effectIndex = getRandomInt(0, effects.length - 1);
    const effectMessage = effects[effectIndex];
    const title = square.name;

    let customMisfortuneMessage: string | null = null;

    if (square.type === 'misfortune') {
        switch (effectIndex) {
            case 0: { // Distrazione
                const titan = newState.enemies.find((e: Enemy) => e.isWanderingTitan);
                if (titan && titan.hp > 0) {
                    return { 
                        newState, 
                        modalInfo: { 
                            type: 'titan_encounter', 
                            title: 'Un\'ombra colossale si manifesta!',
                            message: 'Un Titano Errante ti sbarra la strada. La sua presenza è opprimente.'
                        },
                        audioAnnouncement: 'Un Titano Errante ti sbarra la strada.'
                    };
                }
                if (player.coins >= 5) {
                    player.coins -= 5;
                    customMisfortuneMessage = 'Distrazione: L\'eco del Titano già dissolto sfiora i tuoi pensieri. Perdi 5 Intento.';
                } else {
                    player.hp = Math.max(1, player.hp - 2);
                    customMisfortuneMessage = 'Distrazione: L\'eco del Titano già dissolto scuote la tua determinazione. Perdi 2 Volontà.';
                }
                break;
            }
            case 1: player.coins = Math.floor(player.coins / 2); break; // Vampiri
            case 2: player.skipNextTurn = true; break; // Pigrizia
            case 3: // Confusione
                const boardAdjacency = getBoardAdjacency();
                const queue: { cell: number; dist: number }[] = [{ cell: player.position, dist: 0 }];
                const visited = new Set([player.position]);
                const possibleDestinations: number[] = [];
                while(queue.length > 0) {
                    const { cell, dist } = queue.shift()!;
                    if (dist >= 7) continue;
                    const neighbors = boardAdjacency[cell] || [];
                    for(const neighbor of neighbors) {
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            possibleDestinations.push(neighbor);
                            queue.push({ cell: neighbor, dist: dist + 1 });
                        }
                    }
                }
                const occupiedCells = newState.players.map((p:Player) => p.position);
                const validDestinations = possibleDestinations.filter(cell => !occupiedCells.includes(cell));
                if (validDestinations.length > 0) {
                    player.position = validDestinations[getRandomInt(0, validDestinations.length - 1)];
                }
                break;
            case 4: player.hp = Math.max(1, player.hp - 3); break; // Incanto -> was 2, now 3 based on effect text "Perdi 3 punti Volontà"
            case 5: if(player.equippedWeapon) { player.equippedWeapon = null; player.attackDice = []; } break; // Mancanza di fiducia
            case 6: player.nextRollHalved = true; break; // Affaticamento
            case 7: // Arroganza
                 const hiddenEnemy = newState.enemies.find((e: Enemy) => !e.isVisible && e.position !== -1 && !e.isFinalBoss && !e.isWanderingTitan);
                 if (hiddenEnemy) {
                     hiddenEnemy.level += 1;
                     hiddenEnemy.toughness += 1;
                     hiddenEnemy.hp += 5;
                     hiddenEnemy.maxHp += 5;
                     hiddenEnemy.isVisible = true;
                     hiddenEnemy.visibleUntilTurn = newState.turnNumber + newState.players.length; // Visible for one round
                 }
                break; 
            case 8: // Mancanza di entusiasmo
                if (player.coins >= 10) { 
                    player.coins -= 10; 
                } else { 
                    player.hp = Math.max(1, player.hp - 3); 
                }
                break;
            case 9: player.nextCombatAttackDiceModifier = (player.nextCombatAttackDiceModifier || 0) - 1; break; // Paura
        }
    } else { // blessing
        switch (effectIndex) {
             case 0: player.coins += 20; break; // Occhio Vigile
             case 1: player.hp = Math.min(player.maxHp, player.hp + 3); break; // Visione
             case 2: { // Gioia
                const hiddenEntity = [...newState.treasures, ...newState.worldItems, ...newState.specialSquares].find(t => !t.isVisible);
                if (hiddenEntity) hiddenEntity.isVisible = true;
                break;
             }
             case 3: player.getsExtraTurn = true; break; // Entusiasmo
             case 4: { // Nuova Esperienza
                if (player.inventory.length < player.inventorySize) {
                    const ownedTypes = new Set<WeaponType>();
                    if (player.equippedWeapon) ownedTypes.add(player.equippedWeapon.type);
                    player.inventory.forEach(item => {
                        if (item && ['melee', 'ranged', 'magic'].includes(item.type)) ownedTypes.add(item.type as WeaponType);
                    });
                    const missingTypes = (['melee', 'ranged', 'magic'] as WeaponType[]).filter(t => !ownedTypes.has(t));
                    const typeToGet = missingTypes.length > 0 ? missingTypes[getRandomInt(0, missingTypes.length - 1)] : (['melee', 'ranged', 'magic'] as WeaponType[])[getRandomInt(0,2)];
                    const template = baseWeapons.find(w => w.type === typeToGet);
                    if (template) {
                        player.inventory.push(createWeaponInstance(template.id, player.level));
                        player.hasNewItem = true;
                    }
                }
                break;
            }
             case 5: newState.gameStatePhase = 'cell_inspection'; break; // Intuizione
             case 6: player.nextCombatAttackDiceModifier = (player.nextCombatAttackDiceModifier || 0) + 1; break; // Coraggio
             case 7: player.negateNextDamage = true; break; // Sostegno umano
             case 8: player.nextPurchaseDiscount = 0.5; break; // Efficienza
             case 9: { // Attenzione Viva
                if (player.inventory.length < player.inventorySize) {
                    const potionTemplate = allConsumables.find(c => c.name === 'Pozione di Cura Minore');
                    if (potionTemplate) {
                        const newPotion = { ...potionTemplate, id: `potion_${Date.now()}` };
                        player.inventory.push(newPotion);
                        player.hasNewItem = true;
                        if(player.willDuplicateNextConsumable && player.inventory.length < player.inventorySize) {
                            player.inventory.push({...newPotion, id: `${newPotion.id}_copy`});
                            player.willDuplicateNextConsumable = false;
                        }
                    }
                }
                break;
            }
        }
    }
    
    const finalMessage = customMisfortuneMessage || effectMessage;
    return { 
        newState, 
        modalInfo: { 
            type: 'special_square_reveal',
            title, 
            message: finalMessage,
            // FIX: Cast square.type because the calling context ensures it cannot be 'randomEncounter'.
            squareType: square.type as 'blessing' | 'misfortune'
        }, 
        audioAnnouncement: finalMessage.split(' Effetto:')[0] 
    };
};


export const engageWanderingTitan = (gameState: GameState): { newState: GameState } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const titan = newState.enemies.find((e: Enemy) => e.isWanderingTitan);

    if (!titan || titan.hp <= 0) {
        return { newState };
    }

    titan.position = player.position;
    titan.isVisible = true;

    const { newState: combatReadyState } = initiateCombat(newState, titan.id, true);
    
    return { newState: updateCurrentGameState(combatReadyState) };
};


export const inspectCell = (gameState: GameState, cellId: number): GameState => {
    let newState = JSON.parse(JSON.stringify(gameState));
    [...newState.enemies, ...newState.merchants, ...newState.treasures, ...newState.worldItems, ...newState.specialSquares, ...newState.npcs].forEach(entity => {
        if (entity.position === cellId) {
            entity.isVisible = true;
        }
    });
    newState.gameStatePhase = 'end_turn';
    return updateCurrentGameState(newState);
};

const resolveRandomEncounter = (gameState: GameState): { newState: GameState, modalInfo: ModalInfo | null } => {
    let newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const roll = Math.random();
    
    if (roll < 0.33) {
        const enemyTypes: KeyColor[] = ['black', 'white', 'yellow', 'red'];
        const randomType = enemyTypes[getRandomInt(0, 3)];
        const level = Math.max(1, player.level + getRandomInt(-1, 1));
        const hp = 5 + (level * 2);
        const newEnemyId = Math.max(0, ...newState.enemies.map((e: Enemy) => e.id)) + 1;
        // FIX: Replaced obsolete 'defaults' with dynamic type selection based on 'randomType'.
        const pawnArray = preloadedAssets.enemies[randomType];
        const randomPawn = pawnArray[newEnemyId % pawnArray.length];

        const newEnemy: Enemy = {
            id: newEnemyId, name: `${ENEMY_TYPE_NAMES[randomType].singular} Casuale`, position: player.position, isVisible: true,
            pawnImage: randomPawn, avatar: randomPawn, hp, maxHp: hp, level, toughness: Math.floor(level / 2),
            bootyValue: 'low', hasBeenAttacked: false, enemyType: randomType, ownerId: null,
        };
        newState.enemies.push(newEnemy);
        
        const dialogueRefused = newEnemy.hp === newEnemy.maxHp && Math.random() < 0.2;
        newState.gameStatePhase = 'end_turn';
        return { 
            newState: updateCurrentGameState(newState), 
            modalInfo: { type: 'enemy_encounter', title: 'Incontro Casuale!', enemy: newEnemy, dialogueRefused, hasPlayerMoved: true } 
        };

    } else if (roll < 0.66) {
        const newMerchantId = Math.max(0, ...newState.merchants.map((m: Merchant) => m.id)) + 1;
        const stock = generateMerchantStock(newState.merchantStockTier);
        const newMerchant: Merchant = {
            id: newMerchantId, name: `Genio Errante`, position: player.position, isVisible: true,
            pawnImage: preloadedAssets.merchants.defaults[newMerchantId % preloadedAssets.merchants.defaults.length], stock: stock,
        };
        newState.merchants.push(newMerchant);
        return { newState, modalInfo: { type: 'merchant', title: `Incontri un ${newMerchant.name}`, merchant: newMerchant } };
    } else {
        const newNpcId = Math.max(0, ...newState.npcs.map((n: NPC) => n.id)) + 1;
        const activeQuestIds = new Set(newState.players.map((p: Player) => p.activeQuestId).filter(Boolean));
        const availableQuests = offlineQuests.filter(q => !activeQuestIds.has(q.id));
        if (availableQuests.length > 0) {
            const quest = availableQuests[getRandomInt(0, availableQuests.length - 1)];
            const newNpc: NPC = {
                id: newNpcId, name: quest.title, position: player.position, isVisible: true,
                pawnImage: preloadedAssets.npcs.defaults[newNpcId % preloadedAssets.npcs.defaults.length],
                quest: quest, questAssignedToPlayerId: null,
            };
            newState.npcs.push(newNpc);
            return { newState, modalInfo: { type: 'quest_offer', title: `Parli con ${newNpc.name}`, npc: newNpc } };
        } else {
            player.coins += 25;
            return { newState, modalInfo: { type: 'info', title: 'Fortuna!', message: 'Incontri un viandante generoso che ti dona 25 Intento!' } };
        }
    }
};

const hasCompletedLap = (oldPos: number, newPos: number, startPos: number): boolean => {
    if (oldPos === newPos) return false;

    // Handle the wrap-around case (e.g., passing 48 -> 1)
    if (oldPos > newPos && Math.abs(oldPos - newPos) > 24) { // Heuristic for wrap-around
        // Player crossed the 48/1 boundary
        return startPos > oldPos || startPos <= newPos;
    }
    
    // Standard case
    return oldPos < startPos && newPos >= startPos;
};

export const movePlayerAndResolveLanding = (gameState: GameState, targetCellId: number): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string, levelUpInfo: { playerName: string, newLevel: number } | null } => {
    let newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const oldPosition = player.position;
    const oldLevel = player.level;
    let audioAnnouncement: string | undefined;
    let levelUpInfo: { playerName: string, newLevel: number } | null = null;

    player.position = targetCellId;
    newState.reachableCells = null;
    newState.diceResult = 0;
    
    const deadPlayerOnCell = newState.players.find((p: Player) => p.position === targetCellId && p.isDead && p.id !== player.id);
    if (deadPlayerOnCell) {
        deadPlayerOnCell.isDead = false; deadPlayerOnCell.hp = 1;
        newState.gameStatePhase = 'end_turn';
        const announcement = `${player.name} ha rianimato ${deadPlayerOnCell.name}!`;
        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title: 'Compagno Rianimato!', message: announcement }, audioAnnouncement: announcement, levelUpInfo: null };
    }

    const playerStartPosition = PLAYER_START_POSITIONS[player.id];
    if (hasCompletedLap(oldPosition, targetCellId, playerStartPosition)) {
        player.level += 1;
        player.maxHp += 5;
        player.hp = player.maxHp;
        player.toughness += 1;
        player.defenseDice.push({ id: player.defenseDice.length, hits: 2, bonusHits: 0, hasCrit: false });
        if (player.level >= 6 && player.level % 2 === 0) player.pendingUpgrades += 1;
    }

    if(player.level > oldLevel){
        audioAnnouncement = `${player.name} è salito al livello ${player.level}!`;
        levelUpInfo = { playerName: player.name, newLevel: player.level };
    }

    player.farthestCellReached = Math.max(player.farthestCellReached, getClockwiseDistance(playerStartPosition, targetCellId, 48));

    const enemyOnCell = newState.enemies.find((e: Enemy) => e.position === targetCellId);
    if (enemyOnCell) {
        const dialogueRefused = enemyOnCell.hp === enemyOnCell.maxHp && Math.random() < 0.2;
        newState.gameStatePhase = 'end_turn';
        return { 
            newState: updateCurrentGameState(newState), 
            modalInfo: { 
                type: 'enemy_encounter', 
                title: 'Incontro Ostile!', 
                enemy: enemyOnCell, 
                dialogueRefused,
                hasPlayerMoved: true
            },
            audioAnnouncement,
            levelUpInfo
        };
    }
    
    newState.gameStatePhase = 'end_turn';
    
    const merchantOnCell = newState.merchants.find((m: Merchant) => m.position === targetCellId);
    if (merchantOnCell) {
        merchantOnCell.isVisible = true;
        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'merchant', title: `Incontri ${merchantOnCell.name}`, merchant: merchantOnCell }, audioAnnouncement, levelUpInfo };
    }
    
    const npcOnCell = newState.npcs.find((n: NPC) => n.position === targetCellId);
    if (npcOnCell) {
        npcOnCell.isVisible = true;
        if (newState.gameMode === 'online') {
            npcOnCell.quest.id = 'PENDING_GENERATION';
        }
        if (audioAnnouncement) audioAnnouncement += `. Hai incontrato ${npcOnCell.name}.`;
        else audioAnnouncement = `Hai incontrato ${npcOnCell.name}.`;
        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'quest_offer', title: `Parli con ${npcOnCell.name}`, npc: npcOnCell }, audioAnnouncement, levelUpInfo };
    }

    const itemsOnCell = newState.worldItems.filter((item: WorldItem) => item.position === player.position);
    if (itemsOnCell.length > 0) {
        itemsOnCell.forEach(item => item.isVisible = true);
        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'loot_choice', title: 'Hai trovato degli oggetti!', items: itemsOnCell }, audioAnnouncement, levelUpInfo };
    }
    
    const treasureOnCell = newState.treasures.find((t: Treasure) => t.position === player.position);
    if (treasureOnCell) {
        const { newState: treasureState, modalInfo: treasureModal, audioAnnouncement: treasureAudio } = resolveTreasureDiscovery(newState, treasureOnCell.id);
        if (treasureAudio) audioAnnouncement = audioAnnouncement ? `${audioAnnouncement}. ${treasureAudio}` : treasureAudio;
        return { newState: updateCurrentGameState(treasureState), modalInfo: treasureModal, audioAnnouncement, levelUpInfo };
    }

    const specialSquareIndex = newState.specialSquares.findIndex((s: SpecialSquare) => s.position === player.position);
    if (specialSquareIndex !== -1) {
        const square = newState.specialSquares.splice(specialSquareIndex, 1)[0];
        if (square.type === 'randomEncounter') {
            const { newState: stateAfterEncounter, modalInfo: encounterModal } = resolveRandomEncounter(newState);
            return { newState: updateCurrentGameState(stateAfterEncounter), modalInfo: encounterModal, audioAnnouncement, levelUpInfo };
        }
        const { newState: stateAfterEffect, modalInfo: effectModal, audioAnnouncement: effectAudio } = applySpecialSquareEffect(newState, square);
        if (effectAudio) audioAnnouncement = audioAnnouncement ? `${audioAnnouncement}. ${effectAudio}` : effectAudio;
        return { newState: updateCurrentGameState(stateAfterEffect), modalInfo: effectModal, audioAnnouncement, levelUpInfo };
    }
    
    return { newState: updateCurrentGameState(newState), modalInfo: null, audioAnnouncement, levelUpInfo };
};

export const purchaseItemFromMerchant = (gameState: GameState, item: Weapon | Consumable | MagicSpell, merchantId: number): { newState: GameState, success: boolean, message: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const merchant = newState.merchants.find((m: Merchant) => m.id === merchantId);

    if (!merchant) return { newState, success: false, message: "Genio non trovato." };

    let cost: number;
    if (item.type === 'intention') {
        cost = (item as MagicSpell).costToBuy;
    } else if ('level' in item) { // Weapon
        cost = (item as Weapon).costsByLevel[(item as Weapon).level - 1];
    } else { // Consumable
        cost = (item as Consumable).cost;
    }
    
    if(player.nextPurchaseDiscount) {
        cost = Math.round(cost * (1 - player.nextPurchaseDiscount));
        player.nextPurchaseDiscount = undefined;
    }

    if (player.coins < cost) {
        return { newState, success: false, message: "Non hai abbastanza Intento." };
    }

    let message = `Hai acquistato ${item.name}!`;
    if (item.type === 'intention') {
        if (player.spells.length >= MAX_SPELLS) { 
            return { newState, success: false, message: 'Non hai spazio per nuove Intenzioni.' };
        }
        player.coins -= cost;
        player.spells.push(item as MagicSpell);
    } else {
        if (player.inventory.length >= player.inventorySize) {
            return { newState, success: false, message: `Inventario pieno.` };
        }
        player.coins -= cost;
        player.inventory.push(item as Weapon | Consumable);
        player.hasNewItem = true;

        if (player.willDuplicateNextConsumable && ['potion', 'spellScroll', 'bag'].includes(item.type)) {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push({...item, id: `${item.id}_copy`});
                message += ` Grazie al tuo Riflesso Inatteso, ne hai ricevuto una copia!`;
            }
            player.willDuplicateNextConsumable = false;
        }
    }

    merchant.stock = merchant.stock.filter((stockItem: InventoryItem) => stockItem.id !== item.id);
    return { newState: updateCurrentGameState(newState), success: true, message: message };
};

export const completeQuest = (gameState: GameState, npcId: number): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const npc = newState.npcs.find((n: NPC) => n.id === npcId);
    if (!npc || player.activeQuestId !== npc.quest.id) return { newState, modalInfo: null };
    const itemIndex = player.inventory.findIndex(item => item?.type === 'questItem' && item.name === npc.quest.requiredItemName);
    if (itemIndex === -1) return {newState, modalInfo: null};
    player.inventory.splice(itemIndex, 1);
    player.activeQuestId = null;
    npc.questAssignedToPlayerId = null;
    let rewardMessage = "";
    
    if (npc.quest.id === 'q_miriam') {
        player.coins = Math.max(0, player.coins - 2);
        rewardMessage += "Donare il cuore di pietra ti è costato 2 Intento, ma hai compiuto un gesto di grande umanità.\n";
    }

    const reward = npc.quest.reward;
    if (reward.type === 'coins') {
        const avgLvl = Math.round(newState.players.reduce((s:number, p:Player) => s + p.level, 0) / newState.players.length);
        let totalCoins = reward.baseValue + (reward.levelBonus * avgLvl);
        if (player.equippedWeapon?.id.startsWith('d_a_02')) { totalCoins = Math.round(totalCoins * 1.25); rewardMessage += "La tua accoglienza ispira generosità! "; }
        player.coins += totalCoins;
        rewardMessage += `Hai ricevuto ${totalCoins} Intento!`;
    } // item reward logic omitted for brevity
    if (player.equippedWeapon?.id.startsWith('d_l_02')) {
        const healing = Math.round(player.maxHp * 0.1); player.hp = Math.min(player.maxHp, player.hp + healing);
        rewardMessage += `\nIl perdono ti rinvigorisce, recuperando ${healing} Volontà.`;
    }
    const announcement = `Hai completato la missione di ${npc.name}!`;
    return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title: 'Missione Completata!', message: `${announcement}\n${rewardMessage}` }, audioAnnouncement: announcement };
};

export const acceptQuest = (gameState: GameState, npcId: number): { newState: GameState, modalInfo: ModalInfo, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const npc = newState.npcs.find((n: NPC) => n.id === npcId);
    if (!npc) return { newState, modalInfo: { type: 'info', title: 'Errore', message: 'Disperso non trovato.' } };
    if (player.inventory.some(i => i?.type === 'questItem' && i.name === npc.quest.requiredItemName) && player.activeQuestId === npc.quest.id) {
         const { newState: s, modalInfo: m, audioAnnouncement: a } = completeQuest(newState, npcId);
         return { newState: s, modalInfo: m!, audioAnnouncement: a };
    }
    if (player.activeQuestId) return { newState, modalInfo: { type: 'info', title: 'Missione Rifiutata', message: 'Hai già una missione attiva.' } };
    if (npc.questAssignedToPlayerId) return { newState, modalInfo: { type: 'info', title: 'Missione Rifiutata', message: `${npc.name} ha già affidato la sua missione.` } };
    player.activeQuestId = npc.quest.id;
    npc.questAssignedToPlayerId = player.id;
    const announcement = `Hai accettato la missione di ${npc.name}.`;
    return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title: 'Missione Accettata!', message: announcement }, audioAnnouncement: announcement };
};

export const applyDiceUpgrade = (gameState: GameState, type: 'attack' | 'defense', dieId: number, upgradeType: 'add_hit' | 'promote_crit'): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    if (player.pendingUpgrades <= 0) return newState;
    const die = (type === 'attack' ? player.attackDice : player.defenseDice).find((d: DieConfig) => d.id === dieId);
    if (!die) return newState;
    if (upgradeType === 'add_hit' && die.hits < 5) { die.hits += 1; player.pendingUpgrades -= 1; }
    else if (upgradeType === 'promote_crit' && !die.hasCrit && die.hits > 0) { die.hasCrit = true; die.hits -= 1; player.pendingUpgrades -= 1; }
    return updateCurrentGameState(newState);
};

const rollSingleDie = (die: DieConfig, player: Player, isAttack: boolean): { result: CombatRollResultType, damage: number } => {
    const roll = getRandomInt(1, 6);
    if (isAttack && player.equippedWeapon?.id.startsWith('d_a_04') && player.hp < player.maxHp / 2 && Math.random() < 0.25) {
        if (roll > (die.hasCrit ? 1 : 0) + die.hits + die.bonusHits) return { result: 'hit', damage: 1 };
    }
    const critFaces = die.hasCrit ? 1 : 0;
    const hitFaces = die.hits + die.bonusHits;
    if (roll <= critFaces) return { result: 'crit', damage: isAttack ? 2 : 1 };
    if (roll <= critFaces + hitFaces) return { result: 'hit', damage: 1 };
    return { result: 'miss', damage: 0 };
};

const rollCombatDice = (dice: DieConfig[], player: Player, isAttack: boolean): CombatRollResult => {
    const result: CombatRollResult = { totalDamage: 0, rolls: [] };
    dice.forEach(die => { const { result: r, damage: d } = rollSingleDie(die, player, isAttack); result.rolls.push(r); result.totalDamage += d; });
    return result;
};

export const startAttackRolls = (gameState: GameState): { newState: GameState } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const { combatState } = newState; const player = newState.players[newState.currentPlayerIndex];
    const enemy = newState.enemies.find((e: Enemy) => e.id === combatState.enemyId);
    if (!combatState.active || !enemy) return { newState };
    let effectiveAttackDice = [...player.attackDice];

    if (player.nextCombatAttackDiceModifier) {
        if (player.nextCombatAttackDiceModifier > 0) {
            for (let i = 0; i < player.nextCombatAttackDiceModifier; i++) {
                effectiveAttackDice.push({ id: 100 + i, hits: 2, bonusHits: 0, hasCrit: false });
            }
        } else {
            effectiveAttackDice.splice(0, -player.nextCombatAttackDiceModifier);
        }
        player.nextCombatAttackDiceModifier = undefined;
    }

    if (player.equippedWeapon?.id.startsWith('d_a_01') && combatState.attacksMadeThisTurn === 0) effectiveAttackDice.push({ id: 99, hits: 2, bonusHits: 0, hasCrit: false });
    if (player.equippedWeapon?.id.startsWith('d_l_04') && combatState.attacksMadeThisTurn === 0) {
        const alliesOnCell = newState.players.filter((p: Player) => p.id !== player.id && p.position === player.position).length;
        for(let i = 0; i < alliesOnCell; i++) effectiveAttackDice.push({ id: 100 + i, hits: 2, bonusHits: 0, hasCrit: false });
    }
    let playerRolls = rollCombatDice(effectiveAttackDice, player, true);
    if (player.equippedWeapon?.id.startsWith('d_l_01') && !player.usedMemoryThisTurn) {
        const missIndex = playerRolls.rolls.findIndex(r => r === 'miss');
        if (missIndex !== -1) {
            const { result: newResult, damage: newDamage } = rollSingleDie(effectiveAttackDice[missIndex], player, true);
            if (newResult !== 'miss') { playerRolls.rolls[missIndex] = newResult; playerRolls.totalDamage += newDamage; player.usedMemoryThisTurn = true; }
        }
    }
    combatState.playerRolls = playerRolls;
    const enemyDice: DieConfig[] = Array.from({ length: enemy.level }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false }));
    combatState.enemyRolls = rollCombatDice(enemyDice, player, true);
    if (enemy.skipNextAttack) {
        combatState.enemyRolls = { totalDamage: 0, rolls: Array(enemy.level).fill('miss')};
        enemy.skipNextAttack = false;
    }
    combatState.combatPhase = 'attack_rolls'; combatState.attacksMadeThisTurn += 1;
    return { newState: updateCurrentGameState(newState) };
};

export const startDefenseRolls = (gameState: GameState): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const { combatState } = newState; const player = newState.players[newState.currentPlayerIndex];
    const enemy = newState.enemies.find((e: Enemy) => e.id === combatState.enemyId);
    if (!combatState.active || !enemy) return newState;
    combatState.playerDefenseRolls = rollCombatDice(player.defenseDice, player, false);
    const enemyDice: DieConfig[] = Array.from({ length: enemy.toughness }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false }));
    combatState.enemyDefenseRolls = rollCombatDice(enemyDice, player, false);
    combatState.combatPhase = 'defense_rolls';
    return updateCurrentGameState(newState);
};

export const applyCombatResults = (gameState: GameState): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState)); const { combatState } = newState; const player = newState.players[newState.currentPlayerIndex];
    if (!combatState.active || !combatState.playerRolls || !combatState.enemyRolls || !combatState.playerDefenseRolls || !combatState.enemyDefenseRolls) return newState;
    const enemyDamageTaken = Math.max(0, combatState.playerRolls.totalDamage - combatState.enemyDefenseRolls.totalDamage);
    let playerDamageTaken = Math.max(0, combatState.enemyRolls.totalDamage - combatState.playerDefenseRolls.totalDamage);

    if (player.negateNextDamage && playerDamageTaken > 0) {
        playerDamageTaken = 0;
        player.negateNextDamage = undefined;
    }

    player.damageTakenThisTurn = (player.damageTakenThisTurn ?? 0) + playerDamageTaken;
    combatState.playerDamageTaken = playerDamageTaken; combatState.enemyDamageTaken = enemyDamageTaken;
    combatState.combatPhase = 'results_display';
    return updateCurrentGameState(newState);
};

export const recomposeEnemy = (gameState: GameState, enemyId: number): { newState: GameState, modalInfo: ModalInfo | null } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const enemy = newState.enemies.find((e: Enemy) => e.id === enemyId);
    if (!enemy) return { newState, modalInfo: null };

    player.enemiesDefeatedCount += 1;
    const coinsGained = getRandomInt(10, 25);
    player.coins += coinsGained;
    
    _handleKeyQuestProgress(newState, enemy);

    newState.enemies = newState.enemies.filter((e: Enemy) => e.id !== enemyId);
    let message = `Parlando con ${enemy.name}, sei riuscito a ricomporlo. Hai ottenuto ${coinsGained} Intento!`;
    
    newState.gameStatePhase = 'end_turn';

    return { 
        newState: updateCurrentGameState(newState), 
        modalInfo: { type: 'info', title: 'Incubo Ricomposto!', message } 
    };
};

export const handleDialogueFailure = (gameState: GameState, enemyId: number, hasPlayerMoved: boolean): { newState: GameState, modalInfo: ModalInfo } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const enemy = newState.enemies.find((e: Enemy) => e.id === enemyId);

    // 1. Calculate Backlash Damage (2-4)
    const backlashDamage = getRandomInt(2, 4);
    player.hp = Math.max(0, player.hp - backlashDamage);

    // 2. Construct Message
    let message = `Le tue parole hanno irritato ${enemy?.name || 'l\'incubo'}.\n\n`;
    message += `💥 CONTRACCOLPO PSICHICO: Subisci ${backlashDamage} danni alla Volontà!\n\n`;
    message += `Non c'è altra scelta che entrare in Risonanza!`;

    // 3. Check for Defeat immediately
    if (player.hp <= 0) {
        player.isDead = true;
        newState.gameStatePhase = 'end_turn'; // End turn immediately if dead
         return {
            newState: updateCurrentGameState(newState),
            modalInfo: { type: 'info', title: 'Sconfitto!', message: `${player.name} è stato sconfitto dal contraccolpo!` }
        };
    }

    const resultModal: ModalInfo = {
        type: 'info',
        title: 'Dialogo Fallito!',
        message: message,
        enemy: enemy,
        hasPlayerMoved: hasPlayerMoved
    };

    return { newState: updateCurrentGameState(newState), modalInfo: resultModal };
};

export const resolveCombatRound = (gameState: GameState): { newState: GameState, modalInfo: ModalInfo | null } => {
    const newState = JSON.parse(JSON.stringify(gameState)); const { combatState } = newState; const player = newState.players[newState.currentPlayerIndex];
    const enemy = newState.enemies.find((e: Enemy) => e.id === combatState.enemyId);
    if (!combatState.active || !enemy) return { newState, modalInfo: null };
    if(combatState.playerDamageTaken) player.hp = Math.max(0, player.hp - combatState.playerDamageTaken);
    if(combatState.enemyDamageTaken) enemy.hp = Math.max(0, enemy.hp - combatState.enemyDamageTaken);
    if (player.equippedWeapon?.id.startsWith('d_a_03') && combatState.playerRolls?.rolls.includes('crit')) player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.1));
    if (player.equippedWeapon?.id.startsWith('d_l_05') && combatState.playerRolls?.rolls.includes('crit')) newState.players.forEach((p: Player) => { if (!p.isDead) p.hp = Math.min(p.maxHp, p.hp + 1) });
    
    if (player.hp <= 0) {
        player.isDead = true;
        combatState.active = false;
        newState.gameStatePhase = 'end_turn';
        if (enemy.isWanderingTitan) {
            enemy.isVisible = false;
            const remainingMisfortuneSquares = newState.specialSquares.filter((s: SpecialSquare) => s.type === 'misfortune');
            if (remainingMisfortuneSquares.length > 0) {
                const newPosSquare = remainingMisfortuneSquares[getRandomInt(0, remainingMisfortuneSquares.length - 1)];
                enemy.position = newPosSquare.position;
            } else {
                enemy.position = -1;
            }
        }
        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title: 'Sconfitto!', message: `${player.name} è stato sconfitto!` } };
    }

    if (enemy.isWanderingTitan) {
        combatState.active = false;
        newState.gameStatePhase = 'end_turn';
        let modalTitle = 'Il Titano Svanisce';
        let modalMessage = `Dopo lo scontro, il Titano si dissolve nell'onirico, lasciandoti stremato. Il tuo turno finisce.`;

        if (enemy.hp <= 0) {
            player.enemiesDefeatedCount += 1;
            let coinsGained = getRandomInt(40, 60); // High booty
            player.coins += coinsGained;
            _handleKeyQuestProgress(newState, enemy);
            newState.enemies = newState.enemies.filter((e: Enemy) => e.id !== enemy.id);
            modalTitle = 'Titano Ricomposto!';
            modalMessage = `Hai ricomposto il Titano Errante! Il suo ciclo è terminato. Ottieni ${coinsGained} Intento!`;
        } else {
            enemy.isVisible = false;
            const remainingMisfortuneSquares = newState.specialSquares.filter((s: SpecialSquare) => s.type === 'misfortune');
            if (remainingMisfortuneSquares.length > 0) {
                const newPosSquare = remainingMisfortuneSquares[getRandomInt(0, remainingMisfortuneSquares.length - 1)];
                enemy.position = newPosSquare.position;
            } else {
                enemy.position = -1;
            }
        }
        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title: modalTitle, message: modalMessage } };
    }

    if (enemy.hp <= 0) {
        player.enemiesDefeatedCount += 1; let coinsGained = 0;
        switch(enemy.bootyValue) { case 'low': coinsGained = getRandomInt(5, 15); break; case 'medium': coinsGained = getRandomInt(20, 35); break; case 'high': coinsGained = getRandomInt(40, 60); break; }
        player.coins += coinsGained;
        _handleKeyQuestProgress(newState, enemy);
        newState.enemies = newState.enemies.filter((e: Enemy) => e.id !== enemy.id);
        let message = `Hai ricomposto ${enemy.name} e ottenuto ${coinsGained} Intento!`;
        if (enemy.isFinalBoss) { newState.gameStatePhase = 'gameOver'; newState.winner = player.id; message += `\nVittoria!`; } 
        else { combatState.active = false; newState.gameStatePhase = combatState.hasPlayerMoved ? 'end_turn' : 'rolling'; if (!combatState.hasPlayerMoved) message += `\nPuoi giocare di nuovo il tuo turno.`; }
        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title: 'Incubo Ricomposto!', message } };
    }
    combatState.combatPhase = 'round_over'; return { newState: updateCurrentGameState(newState), modalInfo: null };
};

export const endCombatAndTurn = (gameState: GameState): { newState: GameState, modalInfo: ModalInfo | null } => {
    let newState = JSON.parse(JSON.stringify(gameState));
    newState.combatState.active = false; newState.gameStatePhase = 'end_turn';
    return endTurn(newState);
};

export const attemptFlee = (gameState: GameState, hasPlayerMoved: boolean): { newState: GameState, modalInfo: ModalInfo } => {
    if (hasPlayerMoved) {
        return {
            newState: gameState,
            modalInfo: { type: 'info', title: 'Azione non valida', message: 'Non puoi fuggire dopo esserti già mosso in questo turno.' }
        };
    }

    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const enemyOnCell = newState.enemies.find((e: Enemy) => e.position === player.position);
    if (!enemyOnCell) {
        return { newState, modalInfo: { type: 'info', title: 'Errore', message: 'Nessun nemico presente per tentare la fuga.' } };
    }

    const fleeDie: DieConfig = { id: 99, hits: 2, bonusHits: 0, hasCrit: true };
    const { result } = rollSingleDie(fleeDie, player, false);
    const success = result === 'hit' || result === 'crit';

    if (success) {
        newState.gameStatePhase = 'rolling';
        return {
            newState: updateCurrentGameState(newState),
            modalInfo: { type: 'info', title: 'Fuga Riuscita!', message: 'Sei fuggito! Ora puoi lanciare il dado per muoverti.' }
        };
    } else {
        let message = 'Fuga Fallita! L\'incubo esegue un Attacco di Opportunità!';

        const enemyDice: DieConfig[] = Array.from({ length: enemyOnCell.level }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false }));
        const enemyRolls = rollCombatDice(enemyDice, player, true);
        const playerDefenseRolls = rollCombatDice(player.defenseDice, player, false);

        let playerDamageTaken = Math.max(0, enemyRolls.totalDamage - playerDefenseRolls.totalDamage);

        if (player.negateNextDamage && playerDamageTaken > 0) {
            playerDamageTaken = 0;
            player.negateNextDamage = undefined;
        }

        if (playerDamageTaken > 0) {
            player.hp = Math.max(0, player.hp - playerDamageTaken);
            message += `\nSubisci ${playerDamageTaken} dissonanza!`;

            if (player.hp <= 0) {
                player.isDead = true;
                newState.gameStatePhase = 'end_turn';
                message += `\nSei stato sconfitto!`;
                return {
                    newState: updateCurrentGameState(newState),
                    modalInfo: { type: 'info', title: 'Sconfitto!', message }
                };
            }
        } else {
            message += `\nSei riuscito a difenderti completamente!`;
        }

        return {
            newState: updateCurrentGameState(newState),
            modalInfo: {
                type: 'info',
                title: 'Fuga Fallita!',
                message: message,
                enemy: enemyOnCell,
                hasPlayerMoved: hasPlayerMoved
            }
        };
    }
};

export const depositToStash = (gameState: GameState, inventoryIndex: number): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const freeStashIndex = newState.sharedStash.findIndex(slot => slot === null);
    if (freeStashIndex === -1) return newState;
    const itemToDeposit = player.inventory[inventoryIndex];
    if (!itemToDeposit || itemToDeposit.type === 'questItem') return newState;
    newState.sharedStash[freeStashIndex] = itemToDeposit;
    player.inventory.splice(inventoryIndex, 1);
    return updateCurrentGameState(newState);
};

export const withdrawFromStash = (gameState: GameState, stashIndex: number): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const itemToWithdraw = newState.sharedStash[stashIndex];
    if (!itemToWithdraw || player.inventory.length >= player.inventorySize) return newState;
    player.inventory.push(itemToWithdraw);
    player.hasNewItem = true;
    newState.sharedStash[stashIndex] = null;
    return updateCurrentGameState(newState);
};

export const moveItem = (gameState: GameState, source: ItemLocation, destination: ItemLocation): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    let sourceItem: InventoryItem | null = null;
    if (source.area === 'player_inventory') sourceItem = player.inventory[source.slot as number] ?? null;
    else if (source.area === 'player_equipped') sourceItem = player.equippedWeapon;
    else if (source.area === 'stash') sourceItem = newState.sharedStash[source.slot as number] ?? null;
    if (!sourceItem) return newState;
    if (sourceItem.type === 'questItem') return newState;
    const isSourceWeapon = sourceItem.type === 'melee' || sourceItem.type === 'ranged' || sourceItem.type === 'magic';
    if (destination.area === 'player_equipped' && !isSourceWeapon) return newState;
    let temp = sourceItem;
    if (source.area === 'player_inventory') player.inventory.splice(source.slot as number, 1);
    else if (source.area === 'player_equipped') player.equippedWeapon = null;
    else if (source.area === 'stash') newState.sharedStash[source.slot as number] = null;
    let destItem: InventoryItem | null = null;
    if (destination.area === 'player_inventory') {
        destItem = player.inventory[destination.slot as number] ?? null;
        if(destItem) player.inventory.splice(destination.slot as number, 1, temp);
        else player.inventory.push(temp);
        player.hasNewItem = true;
    } else if (destination.area === 'player_equipped') {
        destItem = player.equippedWeapon;
        player.equippedWeapon = temp as Weapon;
    } else if (destination.area === 'stash') {
        destItem = newState.sharedStash[destination.slot as number] ?? null;
        newState.sharedStash[destination.slot as number] = temp;
    }
    if (destItem) {
        if (destItem.type === 'questItem') return gameState;
        if (source.area === 'player_inventory') {
            player.inventory.push(destItem);
            player.hasNewItem = true;
        }
        else if (source.area === 'player_equipped') player.equippedWeapon = destItem as Weapon;
        else if (source.area === 'stash') newState.sharedStash[source.slot as number] = destItem;
    }
    if (source.area === 'player_equipped' || destination.area === 'player_equipped') {
        player.attackDice = player.equippedWeapon ? Array.from({ length: player.equippedWeapon.damageDice }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false })) : [];
    }
    return updateCurrentGameState(newState);
};

export const useConsumable = (gameState: GameState, playerId: number, inventoryIndex: number): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players.find((p: Player) => p.id === playerId);
    if (!player) return { newState, modalInfo: null };
    const item = player.inventory[inventoryIndex];
    if (!item || (item.type !== 'potion' && item.type !== 'spellScroll' && item.type !== 'bag')) return { newState, modalInfo: null };
    const consumable = item as Consumable;

    if (consumable.effectTag === 'damage_enemy') {
        const hasVisibleEnemy = newState.enemies.some((e: Enemy) => e.isVisible && e.position > 0 && e.hp > 0);
        if (!hasVisibleEnemy) {
            return {
                newState,
                modalInfo: {
                    type: 'info',
                    title: 'Nessun Bersaglio',
                    message: 'Non ci sono incubi visibili sulla mappa da colpire con la pergamena.'
                }
            };
        }
        if (newState.gameStatePhase !== 'spell_target_enemy' && newState.gameStatePhase !== 'spell_target_cell') {
            newState.pendingSpellReturnPhase = newState.gameStatePhase;
        }
        newState.pendingScroll = {
            playerId: player.id,
            inventoryIndex,
            name: consumable.name,
            damage: consumable.value
        };
        newState.gameStatePhase = 'spell_target_enemy';
        const message = `Scegli un incubo visibile sulla mappa per infliggergli ${consumable.value} dissonanza con ${consumable.name}.`;
        return {
            newState: updateCurrentGameState(newState),
            modalInfo: { type: 'info', title: consumable.name, message },
            audioAnnouncement: message
        };
    }

    let message = '', title = 'Oggetto Usato';
    switch(consumable.effectTag) {
        case 'heal':
            player.hp = Math.min(player.maxHp, player.hp + consumable.value);
            message = `Hai usato ${consumable.name} e recuperato ${consumable.value} Volontà.`; break;
        case 'expand_inventory':
            if (player.inventorySize < consumable.value) {
                player.inventorySize = consumable.value;
                message = `Hai usato ${consumable.name}. La tua capacità di inventario è ora di ${player.inventorySize} slot!`;
            } else { message = `Nessun effetto. La tua capacità è già uguale o maggiore.`; title = 'Nessun Effetto'; } break;
        default: message = `Hai usato ${consumable.name}.`;
    }
    player.inventory.splice(inventoryIndex, 1);
    return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title, message }, audioAnnouncement: message };
};

export const cancelTargetingMode = (gameState: GameState): GameState => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    if (currentPlayer) {
        currentPlayer.castingSpellId = undefined;
    }
    newState.pendingScroll = undefined;
    const fallbackPhase: GamePhase = currentPlayer?.hasCastSpellThisTurn ? 'end_turn' : 'rolling';
    const restorePhase = newState.pendingSpellReturnPhase &&
        newState.pendingSpellReturnPhase !== 'spell_target_enemy' &&
        newState.pendingSpellReturnPhase !== 'spell_target_cell' &&
        newState.pendingSpellReturnPhase !== 'cell_inspection'
            ? newState.pendingSpellReturnPhase
            : fallbackPhase;
    newState.gameStatePhase = restorePhase;
    newState.pendingSpellReturnPhase = undefined;
    return updateCurrentGameState(newState);
};

// FIX: Added missing castSpell function + prompt/copy resolvers.
export const castSpell = (
    gameState: GameState,
    playerId: number,
    spellId: string,
    isCopied: boolean = false,
    bypassCopyCheck: boolean = false
): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players.find((p: Player) => p.id === playerId);
    if (!player) return { newState, modalInfo: null };

    const spell = player.spells.find((s: MagicSpell) => s.id === spellId);
    if (!spell) return { newState, modalInfo: { type: 'info', title: 'Errore', message: 'Intenzione non trovata.' } };

    if (player.hasCastSpellThisTurn && !isCopied && !bypassCopyCheck) {
        return { newState, modalInfo: { type: 'info', title: 'Azione non permessa', message: 'Puoi lanciare solo un\'intenzione per turno.' } };
    }

    if (!isCopied && !bypassCopyCheck) {
        const copier = newState.players.find((p: Player) => p.id !== player.id && !p.isDead && p.isCopyingNextSpell);
        if (copier) {
            const copyModal: ModalInfo = {
                type: 'copy_spell_prompt',
                title: `Per ${copier.name}: Copia Intenzione?`,
                spell: spell,
                castingPlayerId: player.id,
                copyingPlayerId: copier.id,
            };
            newState.copySpellState = { spell, castingPlayerId: player.id, copyingPlayerId: copier.id };
            return { newState: updateCurrentGameState(newState), modalInfo: copyModal };
        }
    }
    
    const cost = isCopied ? Math.ceil(spell.costToUse / 2) : spell.costToUse;
    if (player.coins < cost) {
        return { newState, modalInfo: { type: 'info', title: 'Intento Insufficiente', message: `Non hai abbastanza Intento per lanciare ${spell.name}.` } };
    }

    let message = `Hai lanciato ${spell.name}!`;
    let title = 'Intenzione Lanciata';
    let audioAnnouncement: string | undefined = message;
    
    switch (spell.effectTag) {
        case 'damage_enemy_dark':
        case 'damage_enemy_white':
        case 'damage_enemy_yellow':
        case 'damage_enemy_red':
        case 'skip_enemy_turn':
        case 'teleport': {
            if (spell.targetType === 'enemy_on_map') {
                const hasVisibleEnemy = newState.enemies.some((e: Enemy) => e.isVisible && e.position > 0 && e.hp > 0);
                if (!hasVisibleEnemy) {
                    return {
                        newState,
                        modalInfo: {
                            type: 'info',
                            title: 'Nessun Bersaglio',
                            message: 'Non ci sono incubi visibili sulla mappa da poter bersagliare.'
                        }
                    };
                }
            }
            if (newState.gameStatePhase !== 'spell_target_enemy' && newState.gameStatePhase !== 'spell_target_cell') {
                newState.pendingSpellReturnPhase = newState.gameStatePhase;
            }
            player.castingSpellId = spell.id;
            newState.gameStatePhase = spell.targetType === 'enemy_on_map' ? 'spell_target_enemy' : 'spell_target_cell';
            const targetType = spell.targetType === 'enemy_on_map' ? 'un incubo bersaglio' : 'una casella';
            message = `Scegli ${targetType} sulla mappa.`;
            title = spell.name;
            return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title, message }, audioAnnouncement: message };
        }

        case 'reveal_enemy_type':
            return { newState: updateCurrentGameState(newState), modalInfo: { type: 'choose_enemy_type_for_spell', title: 'Scegli un Tipo di Incubo', spellId: spell.id }};

        case 'hp_to_coins':
            if (player.hp <= 1) {
                return {
                    newState,
                    modalInfo: {
                        type: 'info',
                        title: 'Volontà Insufficiente',
                        message: 'Hai bisogno di almeno 2 punti Volontà per poter eseguire la Trasmutazione Volontaria.'
                    }
                };
            }
            return { newState: updateCurrentGameState(newState), modalInfo: { type: 'hp_sacrifice_choice', title: 'Trasmutazione Volontaria', spellId: spell.id, spellValue: spell.value ?? 4 } };
        
        default:
            player.coins -= cost;
    }
    
    if (!isCopied) {
        player.hasCastSpellThisTurn = true;
    }

    switch (spell.effectTag) {
        case 'defend_dark':
        case 'defend_white':
        case 'defend_yellow':
        case 'defend_red':
             player.negateNextDamage = true;
             message += ` Annullerai il prossimo danno che dovresti subire in combattimento.`;
             break;
        case 'reveal_quest_item':
            if (player.activeQuestId) {
                const quest = offlineQuests.find(q => q.id === player.activeQuestId);
                if (quest) {
                    const treasureWithItem = newState.treasures.find((t: Treasure) => t.itemName === quest.requiredItemName);
                    if (treasureWithItem) {
                        treasureWithItem.isVisible = true;
                        treasureWithItem.visibleUntilTurn = newState.turnNumber + 3;
                        message += ` La posizione di ${quest.requiredItemName} è stata rivelata per 3 turni!`;
                    } else { message += ` Non è stato possibile trovare ${quest.requiredItemName}.`; }
                }
            } else { message += ` Non hai una missione attiva.`; }
            break;
        case 'heal_target':
            player.hp = Math.min(player.maxHp, player.hp + (spell.value ?? 0));
            message += ` Recuperi ${spell.value} Volontà.`;
            break;
        case 'heal_all':
            newState.players.forEach((p: Player) => {
                if (!p.isDead) p.hp = Math.min(p.maxHp, p.hp + (spell.value ?? 0));
            });
            message += ` Tutta la squadra recupera ${spell.value} Volontà.`;
            break;
        case 'buff_toughness':
            player.toughness += spell.value ?? 0;
            player.defenseDice = Array.from({ length: player.toughness }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false }));
            message += ` La tua Stabilità aumenta di ${spell.value}. (Permanente)`;
            break;
        case 'merchant_discount':
            player.nextPurchaseDiscount = spell.value ?? 0;
            message += ` Ottieni il ${Math.round((spell.value ?? 0) * 100)}% di sconto sul prossimo acquisto.`;
            break;
        case 'summon_merchant': {
            const newMerchantId = Math.max(0, ...newState.merchants.map((m: Merchant) => m.id)) + 1;
            const stock = generateMerchantStock(newState.merchantStockTier);
            const tempMerchant: Merchant = {
                id: newMerchantId, name: `Genio Evocato`, position: player.position, isVisible: true,
                pawnImage: preloadedAssets.merchants.defaults[newMerchantId % preloadedAssets.merchants.defaults.length], stock: stock,
                despawnTurn: newState.turnNumber,
            };
            newState.merchants.push(tempMerchant);
            message = 'Un Genio appare sulla tua casella!';
            return { newState: updateCurrentGameState(newState), modalInfo: { type: 'merchant', title: `Parli con il ${tempMerchant.name}`, merchant: tempMerchant }, audioAnnouncement: message };
        }
        case 'duplicate_consumable':
            player.willDuplicateNextConsumable = true;
            message += ` Il prossimo consumabile che otterrai sarà duplicato!`;
            break;
        case 'copy_spell':
             player.isCopyingNextSpell = true;
             message += ` La prossima intenzione lanciata da un altro giocatore potrà essere copiata.`;
            break;
    }

    return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title, message }, audioAnnouncement };
};

export const resolveRevealEnemyTypeSpell = (
    gameState: GameState,
    spellId: string,
    enemyType: KeyColor,
    isCopied: boolean = false
): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const spell = player?.spells.find((s: MagicSpell) => s.id === spellId);
    if (!player || !spell) return { newState, modalInfo: null };

    const cost = isCopied ? Math.ceil(spell.costToUse / 2) : spell.costToUse;
    if (player.coins < cost) {
        return { newState, modalInfo: { type: 'info', title: 'Intento Insufficiente', message: `Non hai abbastanza Intento per lanciare ${spell.name}.` } };
    }

    player.coins -= cost;
    if (!isCopied) player.hasCastSpellThisTurn = true;

    let revealedCount = 0;
    newState.enemies.forEach((enemy: Enemy) => {
        if (enemy.enemyType === enemyType && enemy.position > 0 && !enemy.isVisible) {
            enemy.isVisible = true;
            revealedCount++;
        }
    });

    const typeLabel = ENEMY_TYPE_NAMES[enemyType].plural;
    const message = revealedCount > 0
        ? `Percezione Acuita svela ${revealedCount} incubo/i di tipo "${typeLabel}" nascosti sulla mappa!`
        : `Nessun incubo nascosto di tipo "${typeLabel}" è presente sulla mappa al momento.`;

    return {
        newState: updateCurrentGameState(newState),
        modalInfo: { type: 'info', title: spell.name, message },
        audioAnnouncement: message
    };
};

export const resolveHpSacrificeSpell = (
    gameState: GameState,
    spellId: string,
    sacrificeAmount: number,
    isCopied: boolean = false
): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];
    const spell = player?.spells.find((s: MagicSpell) => s.id === spellId);
    if (!player || !spell) return { newState, modalInfo: null };

    const maxSacrifice = Math.min(5, Math.max(0, player.hp - 1));
    if (maxSacrifice < 1) {
        return {
            newState,
            modalInfo: {
                type: 'info',
                title: 'Volontà Insufficiente',
                message: 'Non puoi sacrificare ulteriore Volontà senza soccombere.'
            }
        };
    }

    const clamped = Math.max(1, Math.min(maxSacrifice, Math.floor(sacrificeAmount)));
    const cost = isCopied ? Math.ceil(spell.costToUse / 2) : spell.costToUse;
    if (player.coins < cost) {
        return { newState, modalInfo: { type: 'info', title: 'Intento Insufficiente', message: `Non hai abbastanza Intento per lanciare ${spell.name}.` } };
    }

    player.coins -= cost;
    player.hp -= clamped;
    const gainedCoins = clamped * (spell.value ?? 4);
    player.coins += gainedCoins;
    if (!isCopied) player.hasCastSpellThisTurn = true;

    const message = `Hai sacrificato ${clamped} punti Volontà ottenendo ${gainedCoins} Intento!`;
    return {
        newState: updateCurrentGameState(newState),
        modalInfo: { type: 'info', title: spell.name, message },
        audioAnnouncement: message
    };
};

export const resolveCopySpellDecision = (
    gameState: GameState,
    shouldCopy: boolean
): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const copyState = newState.copySpellState;
    if (!copyState) return { newState, modalInfo: null };

    const { spell, castingPlayerId, copyingPlayerId } = copyState;
    newState.copySpellState = undefined;

    const copier = newState.players.find((p: Player) => p.id === copyingPlayerId);
    if (copier && shouldCopy) {
        copier.isCopyingNextSpell = false;
    }

    // 1. Resolve original caster's spell at full cost, bypassing copy prompt recursion
    const originalOutcome = castSpell(newState, castingPlayerId, spell.id, false, true);
    let workingState = originalOutcome.newState;
    let combinedModal = originalOutcome.modalInfo;
    let combinedAnnouncement = originalOutcome.audioAnnouncement;

    if (!shouldCopy || !copier) {
        return { newState: updateCurrentGameState(workingState), modalInfo: combinedModal, audioAnnouncement: combinedAnnouncement };
    }

    // 2. Execute copier's copy: if original requires interactive map/prompt modal, apply immediate effect or coin rebate for interactive spells
    const freshCopier = workingState.players.find((p: Player) => p.id === copyingPlayerId);
    if (!freshCopier) {
        return { newState: updateCurrentGameState(workingState), modalInfo: combinedModal, audioAnnouncement: combinedAnnouncement };
    }

    const halfCost = Math.ceil(spell.costToUse / 2);
    if (freshCopier.coins < halfCost) {
        const noCoinsMsg = `${freshCopier.name} non ha abbastanza Intento (${halfCost}) per copiare ${spell.name}.`;
        if (combinedModal && combinedModal.type === 'info') {
            combinedModal.message += `\n\n${noCoinsMsg}`;
        }
        return { newState: updateCurrentGameState(workingState), modalInfo: combinedModal, audioAnnouncement: combinedAnnouncement };
    }

    if (['damage_enemy_dark', 'damage_enemy_white', 'damage_enemy_yellow', 'damage_enemy_red', 'skip_enemy_turn', 'teleport', 'reveal_enemy_type', 'hp_to_coins', 'summon_merchant'].includes(spell.effectTag)) {
        // Temporarily ensure copier owns spell reference to resolve cleanly on direct non-conflicting effects, or grant copied spell into copier's list if space
        const copyNote = `${freshCopier.name} ha attivato Intuito Mimetico pagando ${halfCost} Intento!`;
        freshCopier.coins -= halfCost;
        if (spell.effectTag === 'hp_to_coins' && freshCopier.hp > 2) {
            freshCopier.hp -= 1;
            freshCopier.coins += (spell.value ?? 4);
        } else if (spell.effectTag.startsWith('damage_enemy_')) {
            const visibleEnemy = workingState.enemies.find((e: Enemy) => e.isVisible && e.hp > 0);
            if (visibleEnemy) {
                const dmg = Math.min(visibleEnemy.hp, spell.value ?? 10);
                visibleEnemy.hp = Math.max(0, visibleEnemy.hp - dmg);
            }
        } else if (spell.effectTag === 'reveal_enemy_type') {
            workingState.enemies.forEach((e: Enemy) => { if (!e.isVisible && e.position > 0) e.isVisible = true; });
        } else {
            freshCopier.hp = Math.min(freshCopier.maxHp, freshCopier.hp + 4);
        }
        if (combinedModal && 'message' in combinedModal && typeof combinedModal.message === 'string') {
            combinedModal.message += `\n\n${copyNote}`;
        }
        return { newState: updateCurrentGameState(workingState), modalInfo: combinedModal, audioAnnouncement: combinedAnnouncement };
    }

    // Direct self/team spell copy: temporarily add spell if copier doesn't have it so castSpell resolves identically
    const hadSpell = freshCopier.spells.some((s: MagicSpell) => s.id === spell.id);
    if (!hadSpell) freshCopier.spells.push({ ...spell, id: `${spell.id}_mimic` });
    const mimicSpellId = hadSpell ? spell.id : `${spell.id}_mimic`;
    const copyOutcome = castSpell(workingState, freshCopier.id, mimicSpellId, true, true);
    workingState = copyOutcome.newState;
    const cleanedCopier = workingState.players.find((p: Player) => p.id === copyingPlayerId);
    if (!hadSpell && cleanedCopier) {
        cleanedCopier.spells = cleanedCopier.spells.filter((s: MagicSpell) => s.id !== mimicSpellId);
    }

    if (combinedModal && 'message' in combinedModal && copyOutcome.modalInfo && 'message' in copyOutcome.modalInfo) {
        combinedModal = {
            type: 'info',
            title: combinedModal.title,
            message: `${combinedModal.message}\n\n[Copia di ${freshCopier.name}]: ${copyOutcome.modalInfo.message}`
        };
    }

    return {
        newState: updateCurrentGameState(workingState),
        modalInfo: combinedModal,
        audioAnnouncement: combinedAnnouncement
    };
};

export const applySpellEffectToTarget = (gameState: GameState, targetCellId: number): { newState: GameState, modalInfo: ModalInfo | null, audioAnnouncement?: string } => {
    const newState = JSON.parse(JSON.stringify(gameState));
    const player = newState.players[newState.currentPlayerIndex];

    // Check pending consumable scroll (e.g. Pergamena Palla di Fuoco) first
    if (newState.pendingScroll) {
        const scrollInfo = newState.pendingScroll;
        const scrollOwner = newState.players.find((p: Player) => p.id === scrollInfo.playerId) || player;
        const enemy = newState.enemies.find((e: Enemy) => e.isVisible && e.position === targetCellId && e.hp > 0);
        if (!enemy) return { newState: gameState, modalInfo: null };

        if (scrollOwner && scrollOwner.inventory[scrollInfo.inventoryIndex]) {
            scrollOwner.inventory.splice(scrollInfo.inventoryIndex, 1);
        }
        newState.pendingScroll = undefined;
        const restorePhase = newState.pendingSpellReturnPhase &&
            newState.pendingSpellReturnPhase !== 'spell_target_enemy' &&
            newState.pendingSpellReturnPhase !== 'spell_target_cell'
                ? newState.pendingSpellReturnPhase
                : 'end_turn';
        newState.pendingSpellReturnPhase = undefined;
        newState.gameStatePhase = restorePhase;

        enemy.hp = Math.max(0, enemy.hp - scrollInfo.damage);
        enemy.hasBeenAttacked = true;
        let title = scrollInfo.name;
        let message = `Hai scagliato ${scrollInfo.name} su ${enemy.name}, infliggendo ${scrollInfo.damage} punti dissonanza!`;

        if (enemy.hp <= 0) {
            _handleKeyQuestProgress(newState, enemy);
            newState.enemies = newState.enemies.filter((e: Enemy) => e.id !== enemy.id);
            const coinsGained = getRandomInt(5, 15);
            scrollOwner.coins += coinsGained;
            message += `\n${enemy.name} è stato ricomposto! Hai ottenuto ${coinsGained} Intento.`;
            title = 'Incubo Ricomposto!';
            if (enemy.isFinalBoss) {
                newState.gameStatePhase = 'gameOver';
                newState.winner = scrollOwner.id;
                message += `\nVittoria!`;
            }
        }

        return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title, message }, audioAnnouncement: message };
    }

    if (!player.castingSpellId) return { newState, modalInfo: null };

    const spell = player.spells.find((s: MagicSpell) => s.id === player.castingSpellId);
    if (!spell) return { newState, modalInfo: null };

    player.coins = Math.max(0, player.coins - spell.costToUse);
    player.castingSpellId = undefined;
    player.hasCastSpellThisTurn = true;
    newState.pendingSpellReturnPhase = undefined;
    newState.gameStatePhase = 'end_turn';
    let message = `Hai usato ${spell.name}.`;
    let title = 'Effetto Applicato';

    switch (spell.effectTag) {
        case 'damage_enemy_dark':
        case 'damage_enemy_white':
        case 'damage_enemy_yellow':
        case 'damage_enemy_red': {
            const enemy = newState.enemies.find((e: Enemy) => e.isVisible && e.position === targetCellId && e.hp > 0);
            if (enemy) {
                let damage = spell.value ?? 0;
                const typeMap: Record<string, KeyColor> = { 'dark': 'black', 'white': 'white', 'yellow': 'yellow', 'red': 'red' };
                const targetType = Object.keys(typeMap).find(t => spell.effectTag.endsWith(t));
                if (targetType && enemy.enemyType === typeMap[targetType]) {
                    damage = Math.floor(damage * 1.5);
                    message += ` L'intenzione è super efficace!`;
                }
                enemy.hp = Math.max(0, enemy.hp - damage);
                enemy.hasBeenAttacked = true;
                message += ` Hai inflitto ${damage} danni a ${enemy.name}.`;

                if (enemy.hp <= 0) {
                    _handleKeyQuestProgress(newState, enemy);
                    newState.enemies = newState.enemies.filter((e: Enemy) => e.id !== enemy.id);
                    const coinsGained = getRandomInt(5, 15);
                    player.coins += coinsGained;
                    message += `\n${enemy.name} è stato ricomposto! Hai ottenuto ${coinsGained} Intento.`;
                    title = 'Incubo Ricomposto!';
                    if (enemy.isFinalBoss) {
                        newState.gameStatePhase = 'gameOver';
                        newState.winner = player.id;
                        message += `\nVittoria!`;
                    }
                }
            }
            break;
        }

        case 'skip_enemy_turn': {
            const targetEnemy = newState.enemies.find((e: Enemy) => e.isVisible && e.position === targetCellId);
            if (targetEnemy) {
                targetEnemy.skipNextAttack = true;
                message = `${targetEnemy.name} è avvolto in una letargia onirica e salterà il suo prossimo attacco.`;
            }
            break;
        }

        case 'teleport':
            player.position = targetCellId;
            message = 'Ti sei dissolto e riapparso sulla casella scelta.';
            title = 'Passo Onirico';
            break;
    }

    return { newState: updateCurrentGameState(newState), modalInfo: { type: 'info', title, message }, audioAnnouncement: message };
};


export const calculateAIMove = (gameState: GameState): AIAction => {
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.hp < player.maxHp / 2) {
        const potionIndex = player.inventory.findIndex(item => item?.type === 'potion');
        if (potionIndex !== -1) return { type: 'use_consumable', inventoryIndex: potionIndex };
    }
    const enemyOnSameCell = gameState.enemies.find(e => e.position === player.position && e.hp > 0);
    if (enemyOnSameCell) {
        if (gameState.combatState.active) {
            return { type: 'attack' };
        }
        return { type: 'initiate_combat', enemyId: enemyOnSameCell.id };
    }
    const reachable = gameState.reachableCells || [];
    const reachableEnemies = gameState.enemies.filter(e => e.isVisible && reachable.includes(e.position));
    if (reachableEnemies.length > 0) return { type: 'move', targetCellId: reachableEnemies[0].position };
    const reachableItems = [...gameState.worldItems, ...gameState.treasures].filter(i => i.isVisible && reachable.includes(i.position));
    if (reachableItems.length > 0) return { type: 'move', targetCellId: reachableItems[0].position };
    if (reachable.length > 0) {
        if ((Object.values(gameState.gates) as boolean[]).every(Boolean)) {
            if (reachable.includes(69)) {
                return { type: 'move', targetCellId: 69 };
            }
            let closestToCenter = reachable[0];
            let minDistToCenter = calculateDistance(closestToCenter, 69, gameState.gates);
            for (const cell of reachable) {
                const d = calculateDistance(cell, 69, gameState.gates);
                if (d < minDistToCenter) {
                    minDistToCenter = d;
                    closestToCenter = cell;
                }
            }
            if (minDistToCenter < Infinity) {
                return { type: 'move', targetCellId: closestToCenter };
            }
        }
        const startPos = PLAYER_START_POSITIONS[player.id];
        let bestCell = reachable.reduce((best, cell) => {
            const currentDist = getClockwiseDistance(startPos, cell, 48);
            const bestDist = getClockwiseDistance(startPos, best, 48);
            return (currentDist < player.farthestCellReached ? currentDist + 48 : currentDist) > (bestDist < player.farthestCellReached ? bestDist + 48 : bestDist) ? cell : best;
        });
        return { type: 'move', targetCellId: bestCell };
    }
    return { type: 'end_turn' };
};

export { Enemy, WorldItem, KeyColor, GATE_CELLS };