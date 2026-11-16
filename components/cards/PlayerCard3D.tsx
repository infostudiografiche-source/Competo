import React, { useState } from 'react';
import { Backpack, Sparkles, ScrollText, RotateCw } from 'lucide-react';
import type {
    Consumable,
    DieConfig,
    GameState,
    InventoryItem,
    MagicSpell,
    Player,
    Weapon,
} from '../../gameLogic';
import { MAX_SPELLS } from '../../game/constants';
import { preloadedAssets } from '../../assets/preloadedAssets';
import { InteractiveCard3D } from './InteractiveCard3D';

export type PlayerCardBackTab = 'inventory' | 'magic' | 'quest';

interface PlayerCard3DProps {
    player: Player;
    isActiveTurn: boolean;
    activeBackTab: PlayerCardBackTab | null;
    onSetBackTab: (playerId: number, tab: PlayerCardBackTab | null) => void;
    openContextMenu: (e: React.MouseEvent, options: any[]) => void;
    onEquipWeapon: (playerId: number, inventoryIndex: number) => void;
    onUnequipWeapon: (playerId: number) => void;
    onDropWeapon: (playerId: number, inventoryIndex: number) => void;
    onDropEquippedWeapon: (playerId: number) => void;
    onUseConsumable: (playerId: number, inventoryIndex: number) => void;
    onCastSpell: (playerId: number, spellId: string) => void;
    gameState: GameState;
}

const PLAYER_COLOR_HEX: Record<string, string> = {
    red: '#c0392b',
    yellow: '#f1c40f',
    white: '#e2e8f0',
    black: '#3b4252',
};

const CLASS_LABEL: Record<string, string> = {
    determinato: 'Determinato',
    intuitivo: 'Intuitivo',
    pacifico: 'Pacifico',
};

const DieIcon: React.FC<{ color: string; className?: string }> = ({ color, className }) => {
    const dotColor = color === '#3b4252' || color === '#c0392b' ? '#ffffff' : '#111111';
    return (
        <svg viewBox="0 0 24 24" width="1em" height="1em" className={className} style={{ verticalAlign: 'middle' }}>
            <rect x="3" y="3" width="18" height="18" rx="4" fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="2.6" fill={dotColor} />
        </svg>
    );
};

const DicePoolDisplay: React.FC<{ dice: DieConfig[]; title: string; playerColor?: string }> = ({
    dice,
    title,
    playerColor,
}) => {
    if (!dice || dice.length === 0) return null;
    return (
        <div className="dice-pool-display">
            <span className="dice-pool-title">{title}</span>
            <div className="dice-pool-icons">
                {dice.map(die => (
                    <div
                        key={die.id}
                        className="dice-pool-icon"
                        title={`Dado ${die.id + 1} · Risonanze: ${die.hits} · Profonde: ${die.hasCrit ? 1 : 0}`}
                    >
                        <DieIcon color={playerColor || '#333'} />
                        {die.hasCrit && <span className="dice-crit-indicator">★</span>}
                        {die.bonusHits > 0 && <span className="dice-upgrade-badge">{die.bonusHits}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatusEffects: React.FC<{ player: Player }> = ({ player }) => {
    const effects: { key: string; text: string; title: string; type: 'positive' | 'negative' }[] = [];

    if (player.nextCombatAttackDiceModifier && player.nextCombatAttackDiceModifier > 0) {
        effects.push({
            key: 'coraggio',
            text: `+${player.nextCombatAttackDiceModifier} Coraggio`,
            title: `Lanci ${player.nextCombatAttackDiceModifier} dado/i attacco in più nel prossimo combattimento.`,
            type: 'positive',
        });
    }
    if (player.nextCombatAttackDiceModifier && player.nextCombatAttackDiceModifier < 0) {
        effects.push({
            key: 'paura',
            text: `${player.nextCombatAttackDiceModifier} Paura`,
            title: `Lanci ${Math.abs(player.nextCombatAttackDiceModifier)} dado/i attacco in meno nel prossimo combattimento.`,
            type: 'negative',
        });
    }
    if (player.skipNextTurn) {
        effects.push({ key: 'pigrizia', text: 'Pigrizia', title: 'Salterai il tuo prossimo turno.', type: 'negative' });
    }
    if (player.nextRollHalved) {
        effects.push({
            key: 'affaticamento',
            text: '½ Dado',
            title: 'Il risultato del tuo prossimo lancio di dado sarà dimezzato.',
            type: 'negative',
        });
    }
    if (player.negateNextDamage) {
        effects.push({
            key: 'sostegno',
            text: 'Sostegno',
            title: 'Annullerai il prossimo danno che dovresti subire in combattimento.',
            type: 'positive',
        });
    }
    if (player.nextPurchaseDiscount) {
        effects.push({
            key: 'efficienza',
            text: 'Sconto Genio',
            title: `Il prossimo acquisto da un Genio costerà il ${player.nextPurchaseDiscount * 100}% in meno.`,
            type: 'positive',
        });
    }

    if (effects.length === 0) return null;

    return (
        <div className="pcard-effects-row">
            {effects.map((effect, i) => (
                <React.Fragment key={effect.key}>
                    {i > 0 && <span className="pcard-sep">·</span>}
                    <span className={`pcard-effect-text ${effect.type}`} title={effect.title}>
                        {effect.text}
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
};

export const PlayerCard3D: React.FC<PlayerCard3DProps> = ({
    player,
    isActiveTurn,
    activeBackTab,
    onSetBackTab,
    openContextMenu,
    onEquipWeapon,
    onUnequipWeapon,
    onDropWeapon,
    onDropEquippedWeapon,
    onUseConsumable,
    onCastSpell,
    gameState,
}) => {
    const [hoveredItem, setHoveredItem] = useState<InventoryItem | null>(null);
    const isFlipped = activeBackTab !== null;
    const accentColor = PLAYER_COLOR_HEX[player.color] || '#f0bd17';

    const getDisplayInfoForItem = (item: InventoryItem | null) => {
        if (!item) return { image: preloadedAssets.items.emptySlot, level: null, name: 'Slot vuoto', description: '' };
        switch (item.type) {
            case 'melee':
            case 'ranged':
            case 'magic': {
                const weapon = item as Weapon;
                return {
                    image: preloadedAssets.items.weapons[weapon.name] || preloadedAssets.items.weapons.generic,
                    level: weapon.level,
                    name: weapon.name,
                    description: weapon.bonusEffect.description,
                };
            }
            case 'potion':
            case 'spellScroll':
            case 'bag': {
                const consumable = item as Consumable;
                return {
                    image: preloadedAssets.items.consumables[consumable.name] || preloadedAssets.items.weapons.generic,
                    level: null,
                    name: consumable.name,
                    description: consumable.description,
                };
            }
            case 'questItem': {
                const questItem = item as { name: string; type: 'questItem' };
                return {
                    image: preloadedAssets.items.questItems[questItem.name] || preloadedAssets.items.treasure,
                    level: null,
                    name: questItem.name,
                    description: 'Oggetto necessario per una missione.',
                };
            }
            case 'intention': {
                const spell = item as MagicSpell;
                return {
                    image: preloadedAssets.magicSpells[spell.name] || preloadedAssets.items.weapons.generic,
                    level: null,
                    name: spell.name,
                    description: spell.description,
                };
            }
            default:
                return { image: preloadedAssets.items.emptySlot, level: null, name: 'Slot vuoto', description: '' };
        }
    };

    const openBackTab = (e: React.MouseEvent, tab: PlayerCardBackTab) => {
        e.stopPropagation();
        setHoveredItem(null);
        onSetBackTab(player.id, tab);
    };

    const closeBack = (e: React.MouseEvent) => {
        e.stopPropagation();
        setHoveredItem(null);
        onSetBackTab(player.id, null);
    };

    const hpPct = player.maxHp > 0 ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
    const intentMax = player.coins > 20 ? player.coins : 20;
    const intentPct = intentMax > 0 ? Math.max(0, Math.min(100, (player.coins / intentMax) * 100)) : 0;

    const frontFace = (
        <div
            className="pcard-face-content"
            onClick={() => onSetBackTab(player.id, 'inventory')}
            title="Clicca per girare la carta su Zaino e Equipaggiamento"
        >
            <div className="pcard-header">
                <div className="pcard-avatar-ring" style={{ borderColor: accentColor }}>
                    <img src={player.avatar} alt={player.name} className="pcard-avatar-img" />
                </div>
                <div className="pcard-title-block">
                    <div className="pcard-name-row">
                        <h3 className="pcard-name">
                            {player.name}
                            {player.isDead ? ' (Sconfitto)' : ''}
                        </h3>
                    </div>
                    <div className="pcard-meta-line">
                        <span>{CLASS_LABEL[player.class] || player.class}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">Liv {player.level}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums" title="Stabilità">
                            Stab. {player.toughness}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums" title={`Incubi ${player.color} ricomposti`}>
                            Chiave {player.keyQuestProgress}/5
                        </span>
                    </div>
                </div>

                <div className="pcard-flip-actions" onClick={e => e.stopPropagation()}>
                    <button
                        type="button"
                        className={`pcard-icon-btn ${player.hasNewItem ? 'has-new' : ''}`}
                        onClick={e => openBackTab(e, 'inventory')}
                        title="Gira su Zaino ed Equipaggiamento"
                    >
                        <Backpack size={15} />
                    </button>
                    <button
                        type="button"
                        className="pcard-icon-btn"
                        onClick={e => openBackTab(e, 'magic')}
                        title="Gira su Intenzioni"
                    >
                        <Sparkles size={15} />
                    </button>
                    {player.activeQuestId && (
                        <button
                            type="button"
                            className="pcard-icon-btn quest"
                            onClick={e => openBackTab(e, 'quest')}
                            title="Gira su Missione Attiva"
                        >
                            <ScrollText size={15} />
                        </button>
                    )}
                </div>
            </div>

            <div className="pcard-bars">
                <div className="pcard-bar-row" title={`Integrità Onirica: ${player.hp} / ${player.maxHp}`}>
                    <span className="pcard-bar-label">Integrità</span>
                    <div className="pcard-bar-track">
                        <div className="pcard-bar-fill hp" style={{ width: `${hpPct}%` }} />
                        <span className="pcard-bar-value tabular-nums">
                            {player.hp}/{player.maxHp}
                        </span>
                    </div>
                </div>
                <div className="pcard-bar-row" title={`Intento: ${player.coins}`}>
                    <span className="pcard-bar-label">Intento</span>
                    <div className="pcard-bar-track">
                        <div className="pcard-bar-fill intent" style={{ width: `${intentPct}%` }} />
                        <span className="pcard-bar-value tabular-nums">
                            {player.coins > 20 ? player.coins : `${player.coins}/20`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="pcard-wish-strip">
                <span className="pcard-wish-label">Desiderio:</span>
                <span className="pcard-wish-name">
                    {player.equippedWeapon
                        ? `${player.equippedWeapon.name} (Liv ${player.equippedWeapon.level})`
                        : 'Nessuno equipaggiato'}
                </span>
            </div>

            <div className="pcard-footer-row">
                <div className="dice-pools-container">
                    <DicePoolDisplay dice={player.attackDice} title="Arm." playerColor={accentColor} />
                    <DicePoolDisplay dice={player.defenseDice} title="Stab." playerColor={accentColor} />
                </div>
            </div>

            <StatusEffects player={player} />
        </div>
    );

    const renderBackTabContent = () => {
        if (activeBackTab === 'quest') {
            const activeQuestNpc = gameState.npcs.find(npc => npc.quest.id === player.activeQuestId);
            return (
                <div className="pcard-back-scroll">
                    {activeQuestNpc ? (
                        <div className="quest-info-panel pcard-quest-box">
                            <h4>{activeQuestNpc.quest.title}</h4>
                            <p>{activeQuestNpc.quest.description}</p>
                            {player.activeQuestHint && <p className="quest-hint">{player.activeQuestHint}</p>}
                            <p className="quest-giver">— {activeQuestNpc.name}</p>
                        </div>
                    ) : (
                        <p className="preview-placeholder">Nessuna missione attiva.</p>
                    )}
                </div>
            );
        }

        if (activeBackTab === 'magic') {
            const spellSlots = [...player.spells];
            const emptySpellSlotsCount = Math.max(0, MAX_SPELLS - spellSlots.length);

            return (
                <div className="pcard-back-scroll" onMouseLeave={() => setHoveredItem(null)}>
                    <div className={`inventory-grid inventory-grid-${MAX_SPELLS}`}>
                        {spellSlots.map(spell => {
                            const displayInfo = getDisplayInfoForItem(spell);
                            const canCast = player.coins >= spell.costToUse;
                            const isCastDisabled = !canCast || player.hasCastSpellThisTurn;

                            const contextMenuOptions = [
                                {
                                    label: 'Lancia Intenzione',
                                    action: () => onCastSpell(player.id, spell.id),
                                    disabled: isCastDisabled,
                                },
                            ];

                            return (
                                <div
                                    key={spell.id}
                                    className="inventory-slot-wrapper clickable"
                                    onClick={e => {
                                        e.stopPropagation();
                                        openContextMenu(e, contextMenuOptions);
                                    }}
                                    onContextMenu={e => openContextMenu(e, contextMenuOptions)}
                                    onMouseEnter={() => setHoveredItem(spell)}
                                    title={spell.name}
                                >
                                    <div className="slot-level-indicator-container">
                                        <span className="slot-level-indicator tabular-nums">{spell.costToUse}</span>
                                    </div>
                                    <div className={`inventory-slot magic-slot ${isCastDisabled ? 'disabled' : ''}`}>
                                        <img src={displayInfo.image} alt={displayInfo.name} />
                                    </div>
                                </div>
                            );
                        })}
                        {Array.from({ length: emptySpellSlotsCount }).map((_, idx) => (
                            <div key={`empty-spell-${idx}`} className="inventory-slot-wrapper">
                                <div className="slot-level-indicator-container" />
                                <div className="inventory-slot empty" />
                            </div>
                        ))}
                    </div>
                    <div className="weapon-preview-panel">
                        {hoveredItem && hoveredItem.type === 'intention' ? (
                            <>
                                <h4>{hoveredItem.name}</h4>
                                <strong className="tabular-nums">Costo: {(hoveredItem as MagicSpell).costToUse} Intento</strong>
                                <p className="weapon-effect-description">{(hoveredItem as MagicSpell).description}</p>
                            </>
                        ) : (
                            <p className="preview-placeholder">Passa o clicca su un'intenzione per lanciare o ispezionare.</p>
                        )}
                    </div>
                </div>
            );
        }

        // Inventory + Equipped Tab
        const weapon = player.equippedWeapon;
        const equippedInfo = getDisplayInfoForItem(weapon);
        const inventoryItems = [...player.inventory];
        const emptySlotsCount = Math.max(0, player.inventorySize - inventoryItems.length);
        const equippedMenuOptions = weapon
            ? [
                  { label: 'Riponi', action: () => onUnequipWeapon(player.id) },
                  { label: 'Lascia', action: () => onDropEquippedWeapon(player.id) },
              ]
            : [];

        return (
            <div className="pcard-back-scroll" onMouseLeave={() => setHoveredItem(null)}>
                <div className="equipped-weapon-display">
                    <div
                        className={`inventory-slot-wrapper equipped-slot-wrapper ${weapon ? 'clickable' : ''}`}
                        onClick={e => {
                            if (weapon) {
                                e.stopPropagation();
                                openContextMenu(e, equippedMenuOptions);
                            }
                        }}
                        onContextMenu={e => {
                            if (weapon) openContextMenu(e, equippedMenuOptions);
                        }}
                        onMouseEnter={() => weapon && setHoveredItem(weapon)}
                    >
                        <div className="slot-level-indicator-container">
                            {equippedInfo.level !== null && (
                                <span className="slot-level-indicator tabular-nums">Liv {equippedInfo.level}</span>
                            )}
                        </div>
                        <div className={`inventory-slot equipped-slot ${!weapon ? 'empty' : ''}`}>
                            <img src={equippedInfo.image} alt={equippedInfo.name} title={equippedInfo.name} />
                        </div>
                        <span className="equipped-slot-label">Equip</span>
                    </div>
                    <div className="equipped-weapon-info">
                        {weapon ? (
                            <>
                                <h4>{weapon.name}</h4>
                                <p>
                                    <strong>"{weapon.bonusEffect.name}"</strong>
                                </p>
                            </>
                        ) : (
                            <h4>Nessun desiderio equip.</h4>
                        )}
                    </div>
                </div>

                <div className={`inventory-grid inventory-grid-${player.inventorySize}`}>
                    {inventoryItems.map((item, index) => {
                        const isWeapon = item.type === 'melee' || item.type === 'ranged' || item.type === 'magic';
                        const isConsumable = item.type === 'potion' || item.type === 'spellScroll' || item.type === 'bag';
                        const contextMenuOptions: any[] = [];
                        if (!player.isDead) {
                            if (isWeapon) contextMenuOptions.push({ label: 'Equipaggia', action: () => onEquipWeapon(player.id, index) });
                            if (isConsumable) contextMenuOptions.push({ label: 'Usa', action: () => onUseConsumable(player.id, index) });
                            contextMenuOptions.push({ label: 'Lascia', action: () => onDropWeapon(player.id, index) });
                        }
                        const displayInfo = getDisplayInfoForItem(item);
                        return (
                            <div
                                key={item.id || `item-${index}`}
                                className="inventory-slot-wrapper clickable"
                                onClick={e => {
                                    if (contextMenuOptions.length > 0) {
                                        e.stopPropagation();
                                        openContextMenu(e, contextMenuOptions);
                                    }
                                }}
                                onContextMenu={e => {
                                    if (contextMenuOptions.length > 0) openContextMenu(e, contextMenuOptions);
                                }}
                                onMouseEnter={() => setHoveredItem(item)}
                            >
                                <div className="slot-level-indicator-container">
                                    {displayInfo.level !== null && (
                                        <span className="slot-level-indicator tabular-nums">Liv {displayInfo.level}</span>
                                    )}
                                </div>
                                <div className="inventory-slot">
                                    <img src={displayInfo.image} alt={displayInfo.name} title={displayInfo.name} />
                                </div>
                            </div>
                        );
                    })}
                    {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                        <div key={`empty-slot-${idx}`} className="inventory-slot-wrapper">
                            <div className="slot-level-indicator-container" />
                            <div className="inventory-slot empty" />
                        </div>
                    ))}
                </div>

                <div className="weapon-preview-panel">
                    {hoveredItem ? (
                        (() => {
                            const info = getDisplayInfoForItem(hoveredItem);
                            const isWeapon =
                                hoveredItem.type === 'melee' ||
                                hoveredItem.type === 'ranged' ||
                                hoveredItem.type === 'magic';
                            return (
                                <>
                                    <h4>
                                        {info.name} {info.level !== null ? `(Liv ${info.level})` : ''}
                                    </h4>
                                    {isWeapon && <strong>"{(hoveredItem as Weapon).bonusEffect.name}"</strong>}
                                    <p className="weapon-effect-description">{info.description}</p>
                                </>
                            );
                        })()
                    ) : (
                        <p className="preview-placeholder">Passa o clicca su uno slot per azioni e dettagli.</p>
                    )}
                </div>
            </div>
        );
    };

    const backFace = (
        <div className="pcard-face-content pcard-back-face" onClick={e => e.stopPropagation()}>
            <div className="pcard-back-topbar">
                <div className="pcard-segmented-tabs">
                    <button
                        type="button"
                        className={`pcard-tab-btn ${activeBackTab === 'inventory' ? 'active' : ''}`}
                        onClick={e => openBackTab(e, 'inventory')}
                    >
                        Zaino
                    </button>
                    <button
                        type="button"
                        className={`pcard-tab-btn ${activeBackTab === 'magic' ? 'active' : ''}`}
                        onClick={e => openBackTab(e, 'magic')}
                    >
                        Intenzioni
                    </button>
                    {player.activeQuestId && (
                        <button
                            type="button"
                            className={`pcard-tab-btn ${activeBackTab === 'quest' ? 'active' : ''}`}
                            onClick={e => openBackTab(e, 'quest')}
                        >
                            Missione
                        </button>
                    )}
                </div>
                <button type="button" className="pcard-return-btn" onClick={closeBack} title="Torna al fronte">
                    <RotateCw size={13} />
                    <span>Fronte</span>
                </button>
            </div>
            {renderBackTabContent()}
        </div>
    );

    return (
        <div className={`player-card-3d-shell ${isFlipped ? 'is-flipped' : ''} ${isActiveTurn ? 'is-active-turn' : ''}`}>
            <InteractiveCard3D
                front={frontFace}
                back={backFace}
                isFlipped={isFlipped}
                variant="player"
                accentColor={accentColor}
                enableTilt={true}
            />
        </div>
    );
};
