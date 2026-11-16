// FIX: Moved all type definitions here to create a single source of truth and resolve circular dependencies.

export type GamePhase =
  | 'rolling'
  | 'moving'
  | 'combat'
  | 'dialogue'
  | 'end_turn'
  | 'cell_inspection'
  | 'ai_turn'
  | 'gameOver'
  | 'spell_target_enemy'
  | 'spell_target_cell';
export type PlayerClass = 'determinato' | 'intuitivo' | 'pacifico';
export type KeyColor = 'red' | 'yellow' | 'white' | 'black';
export type WeaponType = 'melee' | 'ranged' | 'magic';
export type GameMode = 'online' | 'offline';
export type CombatRollResultType = 'miss' | 'hit' | 'crit';
export type CombatPhase =
  | 'initial'
  | 'attack_rolls'
  | 'defense_rolls'
  | 'results_display'
  | 'round_over';
export type TreasureType = 'coins' | 'questItem' | 'consumable' | 'intention';

export interface CombatRollResult {
  totalDamage: number;
  rolls: CombatRollResultType[];
}

export interface CombatState {
  active: boolean;
  enemyId: number | null;
  hasPlayerMoved: boolean;
  combatPhase: CombatPhase;
  playerRolls: CombatRollResult | null;
  enemyRolls: CombatRollResult | null;
  playerDefenseRolls: CombatRollResult | null;
  enemyDefenseRolls: CombatRollResult | null;
  attacksMadeThisTurn: number;
  playerDamageTaken: number | null;
  enemyDamageTaken: number | null;
}
export interface WeaponBonusEffect {
  name: string;
  description: string;
}
export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  level: number;
  damageDice: number;
  costsByLevel: number[];
  bonusEffect: WeaponBonusEffect;
}
export interface Consumable {
  id: string;
  name: string;
  type: 'potion' | 'spellScroll' | 'bag';
  description: string;
  effectTag: 'heal' | 'damage_enemy' | 'expand_inventory';
  value: number;
  cost: number;
}
export interface QuestItem {
  id: string;
  name: string;
  type: 'questItem';
}
export interface MagicSpell {
    id: string;
    name: string;
    type: 'intention';
    category: 'Risonanza' | 'Utilità';
    costToBuy: number;
    costToUse: number;
    description: string;
    effectTag: string;
    value?: number;
    targetType: 'self' | 'other_player' | 'enemy_on_map' | 'cell_on_map' | 'none';
}
export type InventoryItem = Weapon | Consumable | QuestItem | MagicSpell;
export interface DieConfig {
  id: number;
  hits: number;
  bonusHits: number;
  hasCrit: boolean;
}
export interface Player {
  id: number;
  name: string;
  color: KeyColor;
  class: PlayerClass;
  controller: 'human' | 'ai';
  position: number;
  level: number;
  hp: number;
  maxHp: number;
  toughness: number;
  isDead: boolean;
  pawnImage: string;
  avatar: string;
  equippedWeapon: Weapon | null;
  inventory: InventoryItem[];
  inventorySize: number;
  spells: MagicSpell[];
  coins: number;
  enemiesDefeatedCount: number;
  keyQuestProgress: number;
  hasSpawnedMiniBoss: boolean;
  activeQuestId: string | null;
  activeQuestHint: string | null;
  farthestCellReached: number;
  pendingUpgrades: number;
  attackDice: DieConfig[];
  defenseDice: DieConfig[];
  psychologicalProfile: string | null;
  hasNewItem?: boolean;
  hasCastSpellThisTurn?: boolean;
  nextCombatAttackDiceModifier?: number;
  skipNextTurn?: boolean;
  nextRollHalved?: boolean;
  negateNextDamage?: boolean;
  nextPurchaseDiscount?: number;
  getsExtraTurn?: boolean;
  usedMemoryThisTurn?: boolean;
  damageTakenThisTurn?: number;
  castingSpellId?: string;
  willDuplicateNextConsumable?: boolean;
  isCopyingNextSpell?: boolean;
  questItemRevealTurnEnd?: number;
}
export interface Enemy {
  id: number;
  name: string;
  position: number;
  isVisible: boolean;
  pawnImage: string;
  avatar: string;
  hp: number;
  maxHp: number;
  level: number;
  toughness: number;
  bootyValue: 'low' | 'medium' | 'high';
  hasBeenAttacked: boolean;
  enemyType: KeyColor;
  ownerId: number | null;
  isFinalBoss?: boolean;
  isWanderingTitan?: boolean;
  visibleUntilTurn?: number;
  skipNextAttack?: boolean;
}
export interface ItemReward {
  type: 'item';
  item: Weapon;
}
export interface CoinReward {
  type: 'coins';
  baseValue: number;
  levelBonus: number;
}
export interface Quest {
  id: string;
  title: string;
  description: string;
  requiredItemName: string;
  reward: CoinReward | ItemReward;
}
export interface NPC {
  id: number;
  name: string;
  position: number;
  isVisible: boolean;
  pawnImage: string;
  quest: Quest;
  questAssignedToPlayerId: number | null;
}
export interface Merchant {
  id: number;
  name: string;
  position: number;
  isVisible: boolean;
  pawnImage: string;
  stock: (Weapon | Consumable | MagicSpell)[];
  despawnTurn?: number;
}
export interface Treasure {
  id: number;
  name: string;
  position: number;
  isVisible: boolean;
  pawnImage: string;
  type: TreasureType;
  value?: number;
  itemName?: QuestItem['name'];
  consumableId?: Consumable['name'];
  visibleUntilTurn?: number;
}
export interface WorldItem {
  id: string;
  name: string;
  position: number;
  isVisible: boolean;
  pawnImage: string;
  item: InventoryItem;
}
export interface SpecialSquare {
  id: number;
  type: 'blessing' | 'misfortune' | 'randomEncounter';
  name: string;
  position: number;
  isVisible: boolean;
  pawnImage: string;
}
export interface PawnVisualPositions {
  [key: string]: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
export interface PlayerCustomization {
  name: string;
  playerClass: PlayerClass;
  controller: 'human' | 'ai';
}
export interface Cell {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
}
// FIX: Refactored ModalInfo to be a proper discriminated union.
export type ModalInfo =
  | {
      type: 'info';
      title: string;
      message: string;
      enemy?: Enemy;
      hasPlayerMoved?: boolean;
    }
  | {
      type: 'swap_confirmation';
      title: string;
      message: string;
      oldWeapon: Weapon;
      newWeapon: Weapon;
      targetItemId: string;
    }
  | {
      type: 'mage_encounter';
      title: string;
      message: string;
      enemy: Enemy;
    }
  | {
      type: 'titan_encounter';
      title: string;
      message: string;
    }
  | {
      type: 'enemy_encounter';
      title: string;
      enemy: Enemy;
      dialogueRefused: boolean;
      hasPlayerMoved: boolean;
    }
  | {
      type: 'loot_choice';
      title: string;
      items?: WorldItem[];
    }
  | {
      type: 'combat';
      title: string;
      enemy: Enemy;
      isContinuation?: boolean;
    }
  | {
      type: 'merchant';
      title: string;
      merchant: Merchant;
    }
  | {
      type: 'shared_stash';
      title: string;
    }
  | {
      type: 'menu';
      title: string;
    }
  | {
      type: 'rules';
      title: string;
    }
  | {
      type: 'quest_offer';
      title: string;
      npc: NPC;
    }
  | {
      type: 'dialogue';
      title: string;
      enemy: Enemy;
      hasPlayerMoved: boolean;
    }
  | {
      type: 'treasure_reveal';
      title: string;
      message: string;
  }
  | {
      type: 'special_square_reveal';
      title: string;
      message: string;
      squareType: 'blessing' | 'misfortune';
  }
  | {
      type: 'choose_enemy_type_for_spell';
      title: string;
      spellId: string;
  }
  | {
      type: 'hp_sacrifice_choice';
      title: string;
      spellId: string;
      spellValue: number;
  }
  | {
      type: 'copy_spell_prompt';
      title: string;
      spell: MagicSpell;
      castingPlayerId: number;
      copyingPlayerId: number;
  };

export interface GameState {
  gameMode: GameMode;
  players: Player[];
  enemies: Enemy[];
  merchants: Merchant[];
  treasures: Treasure[];
  worldItems: WorldItem[];
  specialSquares: SpecialSquare[];
  npcs: NPC[];
  sharedStash: (InventoryItem | null)[];
  keys: { [key in KeyColor]: boolean };
  teamKeyProgress?: { [key in KeyColor]: number };
  gates: { [key in `${KeyColor}Open`]: boolean };
  winner: number | null;
  reachableCells: number[] | null;
  merchantStockTier: number;
  lastStockRefreshTurn: number;
  currentPlayerIndex: number;
  turnNumber: number;
  diceResult: number;
  gameStatePhase: GamePhase;
  combatState: CombatState;
  trust: number;
  trustLevel: string;
  pendingScroll?: {
      playerId: number;
      inventoryIndex: number;
      name: string;
      damage: number;
  };
  pendingSpellReturnPhase?: GamePhase;
  copySpellState?: {
      spell: MagicSpell;
      castingPlayerId: number;
      copyingPlayerId: number;
  };
  pendingCopiedSpell?: {
      playerId: number;
      spellId: string;
  };
}

// Dummy export to keep the file as a valid ESM module with at least one value.
export const GAME_LOGIC_VERSION = '1.0.0';