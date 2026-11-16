import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { GameState, Weapon, Consumable, InventoryItem } from '../../gameLogic';
import { ItemLocation } from '../../game/engine';
import { PLAYER_START_POSITIONS } from '../../game/constants';
import { ContextMenuProps } from '../ContextMenu';
import { preloadedAssets } from '../../assets/preloadedAssets';


interface StashModalContentProps {
    gameState: GameState;
    openContextMenu: (e: React.MouseEvent, options: ContextMenuProps['options']) => void;
    onDepositItem: (inventoryIndex: number) => void;
    onWithdrawItem: (stashIndex: number) => void;
    onMoveItem: (source: ItemLocation, destination: ItemLocation) => void;
}

export const StashModalContent: React.FC<StashModalContentProps> = ({
    gameState, openContextMenu, onDepositItem, onWithdrawItem, onMoveItem
}) => {
    const [stashSort, setStashSort] = useState<{ key: 'level' | 'value', order: 'asc' | 'desc' } | null>(null);
    const [draggedItemInfo, setDraggedItemInfo] = useState<ItemLocation | null>(null);
    const [dragOverInfo, setDragOverInfo] = useState<ItemLocation | null>(null);

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const canInteract = Object.values(PLAYER_START_POSITIONS).includes(currentPlayer.position);

    const getDisplayInfoForItem = (item: InventoryItem | null) => {
        if (!item) return { image: preloadedAssets.items.emptySlot, level: null, name: 'Slot vuoto' };
        
        if ('level' in item) { // Weapon
             const weapon = item as Weapon;
             return { image: preloadedAssets.items.weapons[weapon.name] || preloadedAssets.items.weapons.generic, level: weapon.level, name: weapon.name };
        }
        if (item.type === 'questItem') {
             const questItem = item as { name: string, type: 'questItem' };
             return { image: preloadedAssets.items.questItems[questItem.name] || preloadedAssets.items.treasure, level: null, name: questItem.name };
        }
        if (item.type === 'potion' || item.type === 'spellScroll' || item.type === 'bag') {
            const consumable = item as Consumable;
            return { image: preloadedAssets.items.consumables[consumable.name] || preloadedAssets.items.weapons.generic, level: null, name: consumable.name };
        }
        return { image: preloadedAssets.items.emptySlot, level: null, name: 'Slot vuoto' };
    }


    const handleSort = (key: 'level' | 'value') => {
        setStashSort(prev => {
            if (prev?.key === key) {
                return prev.order === 'asc' ? { key, order: 'desc' } : null;
            }
            return { key, order: 'asc' };
        });
    };
    
    const getWeaponValue = (weapon: Weapon) => weapon.costsByLevel[weapon.level - 1] || 0;

    const sortedStash = useMemo(() => {
        const stashWithIndices = gameState.sharedStash.map((item, index) => ({ item, originalIndex: index }));
        if (!stashSort) {
            return stashWithIndices;
        }
        // FIX: Correctly sort items by handling different types (Weapon, Consumable, QuestItem)
        // using type guards before accessing properties like `level` or `cost`.
        stashWithIndices.sort((a, b) => {
            if (!a.item) return 1;
            if (!b.item) return -1;

            const getComparableValue = (item: InventoryItem): number => {
                if (stashSort.key === 'level') {
                    // Only weapons have a level.
                    if ('level' in item) {
                        return item.level;
                    }
                } else { // 'value'
                    // Weapons have value based on level cost
                    if ('costsByLevel' in item && 'level' in item) {
                        return getWeaponValue(item as Weapon);
                    }
                    // Consumables have a cost
                    if ('cost' in item) {
                        return item.cost;
                    }
                }
                return 0; // Other items have no sortable value here
            };

            const valueA = getComparableValue(a.item);
            const valueB = getComparableValue(b.item);

            if (valueA === valueB) return 0;
            return stashSort.order === 'asc' ? valueA - valueB : valueB - valueA;
        });
        return stashWithIndices;
    }, [gameState.sharedStash, stashSort]);

    const onDragStart = (e: React.DragEvent, source: ItemLocation) => {
        if (!canInteract) { e.preventDefault(); return; }
        e.dataTransfer.setData('application/json', JSON.stringify(source));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedItemInfo(source);
    };

    const onDragOver = (e: React.DragEvent, destination: ItemLocation) => {
        e.preventDefault();
        if (draggedItemInfo && (draggedItemInfo.area !== destination.area || draggedItemInfo.slot !== destination.slot)) {
            setDragOverInfo(destination);
        }
    };
    
    const onDrop = (e: React.DragEvent, destination: ItemLocation) => {
        e.preventDefault();
        if (!canInteract) return;
        const source = JSON.parse(e.dataTransfer.getData('application/json')) as ItemLocation;
        onMoveItem(source, destination);
        setDraggedItemInfo(null);
        setDragOverInfo(null);
    };

    const onDragEnd = () => {
        setDraggedItemInfo(null);
        setDragOverInfo(null);
    };

    const getSlotClassName = (baseClass: string, location: ItemLocation, item: InventoryItem | Weapon | null) => {
        let classes = [baseClass];
        if (draggedItemInfo?.area === location.area && draggedItemInfo?.slot === location.slot) classes.push('dragging');
        if (dragOverInfo?.area === location.area && dragOverInfo?.slot === location.slot) classes.push('drag-over');
        if (!item) classes.push('empty');
        return classes.join(' ');
    };

    const renderEquippedSlot = () => {
        const item = currentPlayer.equippedWeapon;
        const displayInfo = getDisplayInfoForItem(item);
        const isClickable = !!item && canInteract && currentPlayer.inventory.length < currentPlayer.inventorySize;
        const location: ItemLocation = { area: 'player_equipped', slot: 'equipped' };
        
        return (
            <div
                className={getSlotClassName('inventory-slot-wrapper', location, item)}
                title={isClickable ? "Click per depositare, Trascina per spostare" : displayInfo.name}
                draggable={isClickable}
                onDragStart={(e) => onDragStart(e, location)}
                onDragOver={(e) => onDragOver(e, location)}
                onDrop={(e) => onDrop(e, location)}
                onDragEnd={onDragEnd}
                onDragLeave={() => setDragOverInfo(null)}
                onClick={() => { if (isClickable && item) onMoveItem(location, { area: 'player_inventory', slot: currentPlayer.inventory.length }) }}
            >
                <div className="slot-level-indicator-container">{displayInfo.level !== null && <span className="slot-level-indicator">Liv: {displayInfo.level}</span>}</div>
                <div className="inventory-slot equipped-slot"><img src={displayInfo.image} alt={displayInfo.name} /></div>
                <span className="player-equipped-section-label">Equip</span>
            </div>
        );
    };
    
    return (
        <div className="stash-modal-content">
            <div className={`stash-info-banner ${canInteract ? 'can-interact' : 'view-only'}`}>{canInteract ? "Sei in una casella 'Casa': puoi gestire la cassa." : "Non sei in una casella 'Casa': sola visualizzazione."}</div>
            <div className="stash-container">
                <div className="stash-section player-inventory">
                    <h4>Il tuo Inventario ({currentPlayer.name})</h4>
                    <div className="player-stash-layout">
                        <div className="player-equipped-section"><h5>Desiderio Equipaggiato</h5>{renderEquippedSlot()}</div>
                        <div className="player-backpack-section"><h5>Zaino ({currentPlayer.inventory.length}/{currentPlayer.inventorySize})</h5>
                            <div className={`stash-grid ${!canInteract ? 'disabled' : ''}`}>
                                {Array.from({ length: currentPlayer.inventorySize }).map((_, index) => {
                                    const item = currentPlayer.inventory[index] || null;
                                    const displayInfo = getDisplayInfoForItem(item);
                                    const isQuestItem = item?.type === 'questItem';
                                    const isClickable = !!item && canInteract && !isQuestItem;
                                    const location: ItemLocation = { area: 'player_inventory', slot: index };

                                    return (
                                        <div
                                            key={`player-inv-${index}`}
                                            className={getSlotClassName('inventory-slot-wrapper', location, item)}
                                            title={isClickable ? "Click per depositare, Trascina per spostare" : displayInfo.name}
                                            draggable={isClickable}
                                            onDragStart={(e) => onDragStart(e, location)}
                                            onDragOver={(e) => onDragOver(e, location)}
                                            onDrop={(e) => onDrop(e, location)}
                                            onDragEnd={onDragEnd}
                                            onDragLeave={() => setDragOverInfo(null)}
                                            onClick={() => { if (isClickable) onDepositItem(index) }}
                                        >
                                            <div className="slot-level-indicator-container">{displayInfo.level !== null && <span className="slot-level-indicator">Liv: {displayInfo.level}</span>}</div>
                                            <div className="inventory-slot"><img src={displayInfo.image} alt={displayInfo.name} /></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="stash-section shared-stash">
                    <div className="stash-header">
                        <h4>Cassa Condivisa</h4>
                        <div className="stash-filters">
                            <button type="button" onClick={() => handleSort('level')} className={stashSort?.key === 'level' ? 'active' : ''}>
                                <span>Livello</span>
                                {stashSort?.key === 'level' && (stashSort.order === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                            </button>
                            <button type="button" onClick={() => handleSort('value')} className={stashSort?.key === 'value' ? 'active' : ''}>
                                <span>Valore</span>
                                {stashSort?.key === 'value' && (stashSort.order === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                            </button>
                        </div>
                    </div>
                    <div className={`stash-grid ${!canInteract ? 'disabled' : ''}`} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        {sortedStash.map(({ item, originalIndex }) => {
                            const displayInfo = getDisplayInfoForItem(item);
                            const isClickable = !!item && canInteract;
                            const location: ItemLocation = { area: 'stash', slot: originalIndex };
                            
                            return (
                                <div
                                    key={item?.id || `empty-stash-${originalIndex}`}
                                    className={getSlotClassName('inventory-slot-wrapper', location, item)}
                                    title={isClickable ? "Click per prelevare, Trascina per spostare" : displayInfo.name}
                                    draggable={isClickable}
                                    onDragStart={(e) => onDragStart(e, location)}
                                    onDragOver={(e) => onDragOver(e, location)}
                                    onDrop={(e) => onDrop(e, location)}
                                    onDragEnd={onDragEnd}
                                    onDragLeave={() => setDragOverInfo(null)}
                                    onClick={() => { if (isClickable) onWithdrawItem(originalIndex) }}
                                    onContextMenu={(e) => { if (isClickable && item) openContextMenu(e, [{ label: 'Preleva', action: () => onWithdrawItem(originalIndex) }]) }}
                                >
                                    <div className="slot-level-indicator-container">{displayInfo.level !== null && <span className="slot-level-indicator">Liv: {displayInfo.level}</span>}</div>
                                    <div className="inventory-slot"><img src={displayInfo.image} alt={displayInfo.name} /></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};