import React from 'react';
import type { ModalInfo, WorldItem, Weapon, Consumable } from '../../gameLogic';
import { preloadedAssets } from '../../assets/preloadedAssets';

interface LootModalContentProps {
    // FIX: Narrow the ModalInfo type to what this component actually receives.
    modalInfo: Extract<ModalInfo, { type: 'loot_choice' }>;
    onLootItemSelect: (item: WorldItem) => void;
}

export const LootModalContent: React.FC<LootModalContentProps> = ({ modalInfo, onLootItemSelect }) => {
    if (!modalInfo.items || modalInfo.items.length === 0) {
        return <p>Hai raccolto tutto!</p>;
    }

    return (
        <ul className="loot-list-modal">
            {modalInfo.items?.map(worldItem => {
                const item = worldItem.item;
                // FIX: Added type guards to safely access properties that only exist on certain item types.
                const isWeapon = 'level' in item && 'bonusEffect' in item;
                const weapon = isWeapon ? (item as Weapon) : null;
                const consumable = !isWeapon && 'description' in item ? (item as Consumable) : null;

                return (
                    <li key={worldItem.id} className="loot-item-modal">
                        <img src={weapon ? (preloadedAssets.items.weapons[weapon.name] || preloadedAssets.items.weapons.generic) : preloadedAssets.items.treasure} alt={item.name} />
                        <div className="loot-item-info">
                            <span>{item.name} {weapon ? `(Liv: ${weapon.level})` : ''}</span>
                            {weapon && <small>{weapon.bonusEffect.description}</small>}
                            {consumable && <small>{consumable.description}</small>}
                        </div>
                        <button onClick={() => onLootItemSelect(worldItem)} className="modal-action-button confirm">Raccogli</button>
                    </li>
                );
            })}
        </ul>
    );
};