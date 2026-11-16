import type { GameState, Player, Weapon, PlayerCustomization, Enemy, Treasure, WorldItem, SpecialSquare, NPC, Quest, Merchant, Cell, DieConfig, InventoryItem, Consumable, KeyColor, GameMode, MagicSpell, PlayerClass, TreasureType } from '../gameLogic';
import { DEV_MODE_SHOW_ALL, PLAYER_START_POSITIONS, baseWeapons, offlineQuests, allTreasures, allConsumables, misfortuneEffects, blessingEffects, BASE_INVENTORY_SIZE, ENEMY_TYPE_NAMES, ENEMY_NAMES_BY_TYPE, allMagicSpells, GATE_CELLS, MAX_SPELLS } from './constants';
import { preloadedAssets } from '../assets/preloadedAssets';
import { generateEnemyNamesFromAI } from './master';

// --- FUNZIONI HELPER PER LA CREAZIONE DELLO STATO ---
export const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const createWeaponInstance = (templateId: string, level: number): Weapon => {
    const template = baseWeapons.find(w => w.id === templateId)!;
    return {
        ...template,
        id: `${template.id}_${Date.now()}_${Math.random()}`,
        level: level,
        damageDice: level,
    };
};

export const generateMerchantStock = (tier: number): (Weapon | Consumable | MagicSpell)[] => {
    const stock: (Weapon | Consumable | MagicSpell)[] = [];
    const itemCount = getRandomInt(3, 5);
    const minLevel = tier === 1 ? 1 : tier === 2 ? 2 : 4;
    const maxLevel = tier === 1 ? 2 : tier === 2 ? 4 : 6;

    const availableWeaponTemplates = [...baseWeapons];
    
    // Add weapons
    for (let i = 0; i < itemCount - 1; i++) {
        if (availableWeaponTemplates.length === 0) break;
        const templateIndex = getRandomInt(0, availableWeaponTemplates.length - 1);
        const weaponTemplate = availableWeaponTemplates.splice(templateIndex, 1)[0];
        const level = getRandomInt(minLevel, maxLevel);
        stock.push(createWeaponInstance(weaponTemplate.id, level));
    }
    
    // Add a chance for a spell
    if (Math.random() > 0.3 && allMagicSpells.length > 0) {
        const spellTemplate = allMagicSpells[getRandomInt(0, allMagicSpells.length - 1)];
        stock.push({ ...spellTemplate, id: `${spellTemplate.name.replace(/\s/g, '')}_${Date.now()}` });
    }

    // Add a chance for a bag
    const bagConsumables = allConsumables.filter(c => c.type === 'bag');
    if (Math.random() > 0.5 && bagConsumables.length > 0) {
        const bagToAdd = bagConsumables[getRandomInt(0, bagConsumables.length - 1)];
        stock.push({ ...bagToAdd, id: `${bagToAdd.name}_${Date.now()}` });
    }
    
    return stock;
};


const longArm1_Cells = Array.from({ length: 14 }, (_, i) => i + 2);
const longArm2_Cells = Array.from({ length: 14 }, (_, i) => i + 26);
const shortArm1_Cells = Array.from({ length: 8 }, (_, i) => i + 17);
const shortArm2_Cells = Array.from({ length: 8 }, (_, i) => i + 41);
const outerRingCellIds = Array.from({ length: 48 }, (_, i) => i + 1);
const cornerCellIds = Object.values(PLAYER_START_POSITIONS);

const initializeTreasures = (existingPositions: number[]): Treasure[] => {
    const treasures: Treasure[] = [];
    let treasureIdCounter = 1;
    let availableCells = outerRingCellIds.filter(id => !existingPositions.includes(id) && !cornerCellIds.includes(id));
    
    // Prioritize placing one of each quest item type for active quests if any are defined, for simplicity just place some random ones
    const questItemTemplates = allTreasures.filter(t => t.type === 'questItem');
    for (let i = 0; i < 4; i++) {
        if (availableCells.length === 0 || questItemTemplates.length === 0) break;
        const position = availableCells.splice(getRandomInt(0, availableCells.length - 1), 1)[0];
        const treasureData = questItemTemplates[getRandomInt(0, questItemTemplates.length - 1)];
        const pawnImage = preloadedAssets.items.questItems[treasureData.itemName!] || preloadedAssets.items.treasure;
        treasures.push({ id: treasureIdCounter++, position, isVisible: DEV_MODE_SHOW_ALL || false, pawnImage, name: treasureData.name, type: 'questItem', itemName: treasureData.itemName });
    }
    
    // Place other treasures
    const nonQuestTreasures = allTreasures.filter(t => t.type !== 'questItem');
    for (let i = 0; i < 6; i++) {
        if (availableCells.length === 0 || nonQuestTreasures.length === 0) break;
        const position = availableCells.splice(getRandomInt(0, availableCells.length - 1), 1)[0];
        const treasureData = nonQuestTreasures[getRandomInt(0, nonQuestTreasures.length - 1)];
        treasures.push({ id: treasureIdCounter++, position, isVisible: DEV_MODE_SHOW_ALL || false, pawnImage: preloadedAssets.items.treasure, name: treasureData.name, type: treasureData.type, value: treasureData.value, consumableId: treasureData.consumableId });
    }
    return treasures;
};

const initializeWorldItems = (existingPositions: number[]): WorldItem[] => {
    const items: WorldItem[] = [];
    let worldItemIdCounter = 1;
    let availableCellsOnRing = outerRingCellIds.filter(id => !existingPositions.includes(id) && !cornerCellIds.includes(id));
    const placeWeaponsOnArm = (armCells: number[], count: number) => {
        let availableCellsInArm = armCells.filter(id => availableCellsOnRing.includes(id));
        for (let i = 0; i < count; i++) {
            if (availableCellsInArm.length === 0) break;
            const position = availableCellsInArm.splice(getRandomInt(0, availableCellsInArm.length - 1), 1)[0];
            const globalIndex = availableCellsOnRing.indexOf(position);
            if(globalIndex > -1) availableCellsOnRing.splice(globalIndex, 1);
            const weapon = createWeaponInstance(baseWeapons[getRandomInt(0, baseWeapons.length - 1)].id, 1);
            items.push({ id: `${weapon.id}_${worldItemIdCounter++}`, name: weapon.name, position, isVisible: DEV_MODE_SHOW_ALL || false, pawnImage: preloadedAssets.items.weaponOnMap, item: weapon });
        }
    };
    placeWeaponsOnArm(longArm1_Cells, 2);
    placeWeaponsOnArm(longArm2_Cells, 2);
    placeWeaponsOnArm(shortArm1_Cells, 1);
    placeWeaponsOnArm(shortArm2_Cells, 1);
    return items;
};

const initializeSpecialSquares = (existingPositions: number[]): SpecialSquare[] => {
    const squares: SpecialSquare[] = [];
    let squareIdCounter = 1;
    let availableCells = outerRingCellIds.filter(id => !existingPositions.includes(id) && !cornerCellIds.includes(id));
    
    for (let i = 0; i < 4; i++) {
        if (availableCells.length === 0) break;
        const position = availableCells.splice(getRandomInt(0, availableCells.length - 1), 1)[0];
        squares.push({ id: squareIdCounter++, type: 'misfortune', name: 'Sventura', position, pawnImage: preloadedAssets.specials.misfortune, isVisible: DEV_MODE_SHOW_ALL || false });
    }
    for (let i = 0; i < 4; i++) {
        if (availableCells.length === 0) break;
        const position = availableCells.splice(getRandomInt(0, availableCells.length - 1), 1)[0];
        squares.push({ id: squareIdCounter++, type: 'blessing', name: 'Benedizione', position, pawnImage: preloadedAssets.specials.blessing, isVisible: DEV_MODE_SHOW_ALL || false });
    }
    for (let i = 0; i < 2; i++) {
      if (availableCells.length === 0) break;
      const position = availableCells.splice(getRandomInt(0, availableCells.length - 1), 1)[0];
      squares.push({
        id: squareIdCounter++, type: 'randomEncounter', name: 'Incontro Casuale',
        position, pawnImage: preloadedAssets.specials.randomEncounter, isVisible: DEV_MODE_SHOW_ALL || false
      });
    }

    return squares;
};

const initializeNPCs = (existingPositions: number[], gameMode: GameMode, boardAdjacency: Record<number, number[]>): NPC[] => {
    const findShortestPathForInit = (startId: number, endId: number): number[] | null => {
        if (startId === endId) return [startId];
        const queue: { cell: number, path: number[] }[] = [{ cell: startId, path: [startId] }];
        const visited = new Set<number>([startId]);
        while (queue.length > 0) {
            const { cell, path } = queue.shift()!;
            if (cell === endId) return path;
            const neighbors = boardAdjacency[cell] || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ cell: neighbor, path: [...path, neighbor] });
                }
            }
        }
        return null;
    };

    const calculateDistanceForInit = (startId: number, endId: number): number => {
        const path = findShortestPathForInit(startId, endId);
        return path ? path.length - 1 : Infinity;
    };

    const npcs: NPC[] = [];
    let availableCells = outerRingCellIds.filter(id => !existingPositions.includes(id) && !cornerCellIds.includes(id));
    let availableQuests = [...offlineQuests];
    
    for (let i = 0; i < 3; i++) {
        if (availableCells.length === 0) break;
        
        let position: number;

        if (npcs.length > 0) {
            const lastNpc = npcs[npcs.length - 1];
            availableCells.sort((a, b) => {
                const distA = calculateDistanceForInit(lastNpc.position, a);
                const distB = calculateDistanceForInit(lastNpc.position, b);
                return distB - distA; // Sort descending to place far away
            });
            position = availableCells.shift()!;
        } else {
            const positionIndex = getRandomInt(0, availableCells.length - 1);
            position = availableCells.splice(positionIndex, 1)[0];
        }

        let quest: Quest;
        let name: string;
        if (gameMode === 'online') {
            name = `Disperso ${i + 1}`;
            quest = {
                id: 'PENDING_GENERATION',
                title: '... ... ...',
                description: '...',
                requiredItemName: '...',
                reward: { type: 'coins', baseValue: 0, levelBonus: 0 }
            };
        } else {
            quest = availableQuests.splice(getRandomInt(0, availableQuests.length - 1), 1)[0];
            name = quest.title;
        }

        npcs.push({ 
            id: i + 1, 
            name: name, 
            position, 
            isVisible: true, 
            pawnImage: preloadedAssets.npcs.defaults[i % preloadedAssets.npcs.defaults.length], 
            quest, 
            questAssignedToPlayerId: null 
        });
    }
    return npcs;
};

const initializeMerchants = (existingPositions: number[]): Merchant[] => {
    const merchants: Merchant[] = [];
    let availableCells = outerRingCellIds.filter(id => !existingPositions.includes(id) && !cornerCellIds.includes(id));
    for (let i = 0; i < 2; i++) {
        if (availableCells.length === 0) break;
        const position = availableCells.splice(getRandomInt(0, availableCells.length - 1), 1)[0];
        merchants.push({ id: i + 1, name: `Genio ${i + 1}`, position, isVisible: DEV_MODE_SHOW_ALL || false, pawnImage: preloadedAssets.merchants.defaults[i % preloadedAssets.merchants.defaults.length], stock: generateMerchantStock(1) });
    }
    return merchants;
};

// --- STATO INIZIALE DEL GIOCO ---
export const createInitialGameState = async (playerCount: number = 4, customizations?: PlayerCustomization[], gameMode: GameMode = 'offline', psychologicalProfiles?: string[]): Promise<GameState> => {
    console.log("Inizio creazione stato iniziale del gioco...");
    
    // --- LOCAL ADJACENCY MAP BUILDER (to avoid circular dependency with engine.ts) ---
    const buildAdjacencyMap = (): Record<number, number[]> => {
        console.log("Creazione mappa delle adiacenze...");
        const adj: Record<number, number[]> = {};
        const allCellIds = boardLayout.allCells.map(c => c.id).filter(Boolean) as number[];
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
        
        return adj;
    };
    const boardAdjacency = buildAdjacencyMap();
    
    let enemyNames: Record<KeyColor, string[]> | null = null;
    if (gameMode === 'online') {
        console.log("Tentativo generazione nomi incubi tramite IA...");
        try {
            enemyNames = await generateEnemyNamesFromAI();
        } catch (e) {
            console.error("Errore IA durante generazione nomi, uso fallback offline.", e);
        }
    }
    // Fallback to offline names if AI fails or mode is offline
    if (!enemyNames) {
        console.log("Uso nomi incubi predefiniti (offline).");
        enemyNames = JSON.parse(JSON.stringify(ENEMY_NAMES_BY_TYPE));
    }

    // Shuffle names
    for (const key in enemyNames) {
        const names = enemyNames[key as KeyColor];
        for (let i = names.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [names[i], names[j]] = [names[j], names[i]];
        }
    }

    const availableNames: Record<KeyColor, string[]> = enemyNames;
    const pawnIndexPools: Record<KeyColor, number[]> = {
        black: Array.from({ length: 6 }, (_, i) => i),
        white: Array.from({ length: 6 }, (_, i) => i),
        yellow: Array.from({ length: 6 }, (_, i) => i),
        red: Array.from({ length: 6 }, (_, i) => i),
    };

    const getUniquePawnForType = (type: KeyColor): string => {
        if (pawnIndexPools[type].length === 0) {
            // Se finiscono le pedine uniche, ricicla l'elenco
            pawnIndexPools[type] = Array.from({ length: 6 }, (_, i) => i);
        }
        const pool = pawnIndexPools[type];
        const randomIndexInPool = getRandomInt(0, pool.length - 1);
        const pawnIndex = pool.splice(randomIndexInPool, 1)[0];
        return preloadedAssets.enemies[type][pawnIndex];
    };

    const initialEnemies: Enemy[] = [];
    let enemyIdCounter = 1;

    // 1. Create the pool of 10 enemy types
    const enemyTypePool: KeyColor[] = ['black', 'black', 'white', 'white', 'yellow', 'yellow', 'red', 'red'];
    const remainingTypes: KeyColor[] = ['black', 'white', 'yellow', 'red'];
    
    const firstRandomIndex = getRandomInt(0, remainingTypes.length - 1);
    enemyTypePool.push(remainingTypes.splice(firstRandomIndex, 1)[0]);
    
    const secondRandomIndex = getRandomInt(0, remainingTypes.length - 1);
    enemyTypePool.push(remainingTypes.splice(secondRandomIndex, 1)[0]);

    for (let i = enemyTypePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [enemyTypePool[i], enemyTypePool[j]] = [enemyTypePool[j], enemyTypePool[i]];
    }
    
    // 2. Define placement areas and rules
    const allPlacementCells = outerRingCellIds.filter(id => !cornerCellIds.includes(id));
  
    const placeEnemiesOnArm = (cells: number[], count: number, availableGlobalCells: number[]) => {
      let armAvailableCells = cells.filter(id => availableGlobalCells.includes(id));
      for (let i = 0; i < count; i++) {
          if (armAvailableCells.length === 0 || enemyTypePool.length === 0) break;

          const cellIndex = getRandomInt(0, armAvailableCells.length - 1);
          const position = armAvailableCells.splice(cellIndex, 1)[0];
          
          const globalIndex = availableGlobalCells.indexOf(position);
          if(globalIndex > -1) availableGlobalCells.splice(globalIndex, 1);
          
          const enemyType = enemyTypePool.pop()!;
          const level = getRandomInt(1, 2);
          const hp = 5 + (level * 2);
          const pawnImage = getUniquePawnForType(enemyType);
          
          let name: string;
          const namesForType = availableNames[enemyType];
          if (namesForType && namesForType.length > 0) {
              name = namesForType.pop()!;
          } else {
              // Fallback if the AI-generated list is exhausted: use a name from the original offline list.
              const fallbackNames = ENEMY_NAMES_BY_TYPE[enemyType];
              name = fallbackNames[getRandomInt(0, fallbackNames.length - 1)];
          }

          // Assign randomly to one of the players as their "Shadow"
          const ownerId = getRandomInt(1, playerCount);

          initialEnemies.push({
              id: enemyIdCounter++, name, position, isVisible: DEV_MODE_SHOW_ALL || false,
              pawnImage: pawnImage, avatar: pawnImage, hp, maxHp: hp, level,
              toughness: Math.floor(level / 2), bootyValue: 'low', hasBeenAttacked: false, enemyType: enemyType,
              ownerId: ownerId
          });
      }
    };
    
    // 3. Place the enemies
    let availableCells = [...allPlacementCells];
    placeEnemiesOnArm(longArm1_Cells, 3, availableCells);
    placeEnemiesOnArm(longArm2_Cells, 3, availableCells);
    placeEnemiesOnArm(shortArm1_Cells, 2, availableCells);
    placeEnemiesOnArm(shortArm2_Cells, 2, availableCells);
    
    // 4. Add the Wandering Titan
    initialEnemies.push({
      id: 100, name: "Titano Errante", position: -1, isVisible: false, pawnImage: preloadedAssets.enemies.finalBoss,
      avatar: preloadedAssets.enemies.finalBoss, hp: 75, maxHp: 75, level: 5, toughness: 2,
      bootyValue: 'high', hasBeenAttacked: false, isWanderingTitan: true, enemyType: 'black', ownerId: null
    });
    
    // 5. Add the final boss
    initialEnemies.push({ 
      id: 99, name: "Boss Finale", position: 69, isVisible: DEV_MODE_SHOW_ALL || false, pawnImage: preloadedAssets.enemies.finalBoss, 
      avatar: preloadedAssets.enemies.finalBoss, hp: 100, maxHp: 100, level: 10, toughness: 3, 
      bootyValue: 'high', hasBeenAttacked: false, isFinalBoss: true, enemyType: 'black', ownerId: null
    });

    let occupiedPositions = initialEnemies.filter(e => e.position !== -1).map(e => e.position);
    const initialNPCs = initializeNPCs(occupiedPositions, gameMode, boardAdjacency);
    occupiedPositions.push(...initialNPCs.map(n => n.position));
    const initialMerchants = initializeMerchants(occupiedPositions);
    occupiedPositions.push(...initialMerchants.map(m => m.position));
    const initialSpecialSquares = initializeSpecialSquares(occupiedPositions);
    occupiedPositions.push(...initialSpecialSquares.map(s => s.position));
    const initialTreasures = initializeTreasures(occupiedPositions);
    occupiedPositions.push(...initialTreasures.map(t => t.position));
    const initialWorldItems = initializeWorldItems(occupiedPositions);
    
    const playerColors: KeyColor[] = ['black', 'white', 'yellow', 'red'];
    const pawnIndexPoolsByClass: Record<PlayerClass, number[]> = {
        determinato: Array.from({length: 6}, (_, i) => i),
        intuitivo: Array.from({length: 6}, (_, i) => i),
        pacifico: Array.from({length: 6}, (_, i) => i),
    };
    
    const getUniquePlayerPawn = (playerClass: PlayerClass): string => {
        const pool = pawnIndexPoolsByClass[playerClass];
        if (pool.length === 0) { // Should not happen with max 4 players
            return preloadedAssets.players[playerClass][getRandomInt(0, 5)];
        }
        const indexInPool = getRandomInt(0, pool.length - 1);
        const pawnIndex = pool.splice(indexInPool, 1)[0];
        return preloadedAssets.players[playerClass][pawnIndex];
    };

    const playersForGame: Player[] = Array.from({ length: playerCount }, (_, i) => {
        const custom = customizations?.[i];
        const playerClass = custom?.playerClass || 'determinato';
        const player: Player = {
            id: i + 1,
            name: custom?.name || `Giocatore ${i + 1}`,
            color: playerColors[i],
            class: playerClass,
            controller: custom?.controller || 'human',
            position: PLAYER_START_POSITIONS[i + 1],
            level: 1,
            hp: 20, maxHp: 20,
            toughness: 0,
            isDead: false,
            pawnImage: getUniquePlayerPawn(playerClass),
            avatar: preloadedAssets.avatars[playerColors[i]],
            equippedWeapon: null,
            inventory: [],
            spells: [],
            inventorySize: BASE_INVENTORY_SIZE,
            coins: 10,
            enemiesDefeatedCount: 0,
            keyQuestProgress: 0,
            hasSpawnedMiniBoss: false,
            activeQuestId: null,
            activeQuestHint: null,
            farthestCellReached: PLAYER_START_POSITIONS[i + 1],
            pendingUpgrades: 0,
            attackDice: [],
            defenseDice: [],
            psychologicalProfile: psychologicalProfiles ? psychologicalProfiles[i] : null,
        };

        switch (player.class) {
            case 'determinato': player.toughness += 1; player.equippedWeapon = createWeaponInstance('d_a_01', 1); break;
            case 'intuitivo': player.equippedWeapon = createWeaponInstance('d_l_01', 1); break;
            case 'pacifico': player.equippedWeapon = createWeaponInstance('d_l_03', 1); break;
        }

        if (player.equippedWeapon) {
            player.attackDice = Array.from({ length: player.equippedWeapon.damageDice }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false }));
        }
        player.defenseDice = Array.from({ length: player.toughness }, (_, i) => ({ id: i, hits: 2, bonusHits: 0, hasCrit: false }));

        return player;
    });
    
    // --- DEBUG: Assegna una magia e intento al primo giocatore per test ---
    if (playersForGame.length > 0) {
        const firstPlayer = playersForGame[0];
        // Assegna tutte le magie per test
        firstPlayer.spells = allMagicSpells.map((spell, index) => ({
            ...spell,
            id: `debug_${spell.name.replace(/\s/g, '')}_${index}`
        }));
        firstPlayer.coins += 1000; // Aggiungi abbastanza Intento per testare
    }


    return {
      gameMode: gameMode,
      players: playersForGame,
      enemies: initialEnemies,
      merchants: initialMerchants,
      treasures: initialTreasures,
      worldItems: initialWorldItems,
      specialSquares: initialSpecialSquares,
      npcs: initialNPCs,
      sharedStash: Array(20).fill(null),
      keys: { red: false, yellow: false, white: false, black: false },
      teamKeyProgress: { red: 0, yellow: 0, white: 0, black: 0 },
      gates: { redOpen: false, yellowOpen: false, whiteOpen: false, blackOpen: false },
      winner: null,
      reachableCells: null,
      merchantStockTier: 1,
      lastStockRefreshTurn: 1,
      currentPlayerIndex: 0,
      turnNumber: 1,
      diceResult: 0,
      gameStatePhase: 'rolling',
      combatState: { active: false, enemyId: null, hasPlayerMoved: false, combatPhase: 'initial', playerRolls: null, enemyRolls: null, playerDefenseRolls: null, enemyDefenseRolls: null, attacksMadeThisTurn: 0, playerDamageTaken: null, enemyDamageTaken: null },
      trust: 15,
      trustLevel: 'neutrale'
    };
};

const generateBoardLayout = () => {
    const SIDE_CELL_SIZE = 30; const CORNER_CELL_SIZE = 40; const LONG_SIDE_CELLS = 14; const SHORT_SIDE_CELLS = 8; const PADDING = 10;
    const boardWidth = CORNER_CELL_SIZE * 2 + LONG_SIDE_CELLS * SIDE_CELL_SIZE;
    const boardHeight = CORNER_CELL_SIZE * 2 + SHORT_SIDE_CELLS * SIDE_CELL_SIZE;
    const viewBoxWidth = boardWidth + PADDING * 2; const viewBoxHeight = boardHeight + PADDING * 2;
    const outerRingCells: Cell[] = [];
    outerRingCells.push({ x: boardWidth - CORNER_CELL_SIZE, y: boardHeight - CORNER_CELL_SIZE, width: CORNER_CELL_SIZE, height: CORNER_CELL_SIZE });
    for (let i = LONG_SIDE_CELLS - 1; i >= 0; i--) { outerRingCells.push({ x: CORNER_CELL_SIZE + i * SIDE_CELL_SIZE, y: boardHeight - CORNER_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE }); }
    outerRingCells.push({ x: 0, y: boardHeight - CORNER_CELL_SIZE, width: CORNER_CELL_SIZE, height: CORNER_CELL_SIZE });
    for (let i = SHORT_SIDE_CELLS - 1; i >= 0; i--) { outerRingCells.push({ x: 10, y: CORNER_CELL_SIZE + i * SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE }); }
    outerRingCells.push({ x: 0, y: 0, width: CORNER_CELL_SIZE, height: CORNER_CELL_SIZE });
    for (let i = 0; i < LONG_SIDE_CELLS; i++) { outerRingCells.push({ x: CORNER_CELL_SIZE + i * SIDE_CELL_SIZE, y: 10, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE }); }
    outerRingCells.push({ x: boardWidth - CORNER_CELL_SIZE, y: 0, width: CORNER_CELL_SIZE, height: CORNER_CELL_SIZE });
    for (let i = 0; i < SHORT_SIDE_CELLS; i++) { outerRingCells.push({ x: boardWidth - CORNER_CELL_SIZE, y: CORNER_CELL_SIZE + i * SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE }); }
    
    const playerColors = { red: '#ff0000', yellow: '#ffd800', white: '#ffffff', black: '#000000' };
    const playerBorderColors = { red: '#5c4033', yellow: '#5c4033', white: '#5c4033', black: '#5c4033' };

    const numberedOuterRingCells = outerRingCells.map((cell, index) => {
        const id = index + 1;
        let fillColor: string | undefined = undefined;
        let strokeColor: string | undefined = undefined;
        if (id === 1) { fillColor = playerColors.black; strokeColor = playerBorderColors.black; }
        if (id === 16) { fillColor = playerColors.white; strokeColor = playerBorderColors.white; }
        if (id === 25) { fillColor = playerColors.yellow; strokeColor = playerBorderColors.yellow; }
        if (id === 40) { fillColor = playerColors.red; strokeColor = playerBorderColors.red; }
        return { ...cell, id, fillColor, strokeColor, fillOpacity: fillColor ? 0.2 : undefined, strokeOpacity: strokeColor ? 1 : undefined };
    });

    const innerCells: Cell[] = [];
    const CENTER_CELL_SIZE = 60;
    const centerX = (boardWidth - CENTER_CELL_SIZE) / 2;
    const centerY = (boardHeight - CENTER_CELL_SIZE) / 2;
    innerCells.push({ x: centerX, y: centerY, width: CENTER_CELL_SIZE, height: CENTER_CELL_SIZE });
    const top_l_BBoxX = CORNER_CELL_SIZE + 5 * SIDE_CELL_SIZE;
    const top_l_BBoxY = centerY - (SIDE_CELL_SIZE * 4);
    innerCells.push({ x: top_l_BBoxX, y: top_l_BBoxY + SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    innerCells.push({ x: top_l_BBoxX, y: top_l_BBoxY + 2 * SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    innerCells.push({ x: top_l_BBoxX, y: top_l_BBoxY + 3 * SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    innerCells.push({ x: top_l_BBoxX + SIDE_CELL_SIZE, y: top_l_BBoxY + 3 * SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    const bottom_l_corner_x = centerX + CENTER_CELL_SIZE;
    const bottom_l_corner_y = centerY + CENTER_CELL_SIZE;
    innerCells.push({ x: bottom_l_corner_x, y: bottom_l_corner_y, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    innerCells.push({ x: bottom_l_corner_x - SIDE_CELL_SIZE, y: bottom_l_corner_y, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    innerCells.push({ x: bottom_l_corner_x, y: bottom_l_corner_y + SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    innerCells.push({ x: bottom_l_corner_x, y: bottom_l_corner_y + 2 * SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE });
    const armY = centerY;
    const rightArmStartX = centerX + CENTER_CELL_SIZE;
    for (let i = 0; i < 6; i++) { innerCells.push({ x: rightArmStartX + i * SIDE_CELL_SIZE, y: armY, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE }); }
    const leftArmStartX = centerX - SIDE_CELL_SIZE;
    for (let i = 0; i < 6; i++) { innerCells.push({ x: leftArmStartX - i * SIDE_CELL_SIZE, y: armY + SIDE_CELL_SIZE, width: SIDE_CELL_SIZE, height: SIDE_CELL_SIZE }); }
    const centerCellData = innerCells.shift();
    const centerCell = { ...centerCellData, id: 69 };
    const fixedInnerIds = [58, 51, 63, 66, 52, 61, 55, 49, 50, 64, 53, 60, 57, 68, 65, 54, 62, 59, 56, 67];
    const numberedInnerCells = innerCells.map((cell, index) => ({ ...cell, id: fixedInnerIds[index] }));
    
    const allCells = [...numberedOuterRingCells, centerCell, ...numberedInnerCells];
    return { allCells, viewBoxWidth, viewBoxHeight, PADDING };
};

// Add board layout to the exported initial state object
export const boardLayout = generateBoardLayout();
(createInitialGameState as any).boardLayout = boardLayout; // Hack to attach it

export const initialGameState: GameState = {
    gameMode: 'offline',
    players: [],
    enemies: [],
    merchants: [],
    treasures: [],
    worldItems: [],
    specialSquares: [],
    npcs: [],
    sharedStash: Array(20).fill(null),
    keys: { red: false, yellow: false, white: false, black: false },
    teamKeyProgress: { red: 0, yellow: 0, white: 0, black: 0 },
    gates: { redOpen: false, yellowOpen: false, whiteOpen: false, blackOpen: false },
    winner: null,
    reachableCells: null,
    merchantStockTier: 1,
    lastStockRefreshTurn: 1,
    currentPlayerIndex: 0,
    turnNumber: 1,
    diceResult: 0,
    gameStatePhase: 'rolling',
    combatState: { active: false, enemyId: null, hasPlayerMoved: false, combatPhase: 'initial', playerRolls: null, enemyRolls: null, playerDefenseRolls: null, enemyDefenseRolls: null, attacksMadeThisTurn: 0, playerDamageTaken: null, enemyDamageTaken: null },
    trust: 15,
    trustLevel: 'neutrale'
};
// Add board layout to the initial state for the engine to use
(initialGameState as any).boardLayout = boardLayout;